import { App } from '@slack/bolt'
import fetch from 'node-fetch'
import { filterDM } from '../middleware/index'
import { UserState, User } from '../entities/user'

import {
	postMessageCurry,
	blocksAndText,
	postMessage,
	sendSequentially,
} from '../shared/chat'
import { token } from '../config'
import { sample } from '../shared/util'

const reporting = async (app: App) => {
	app.command('/report-test', async ({ command, ack }) => {
		await ack()
		const { user_id } = command

		const [user] = await User.onboardGet(user_id)

		const dm = postMessageCurry(user_id)

		await sendSequentially(
			[
				[
					`${sample([
						':hyper-dino-wave:',
						':wave-pikachu:',
						':wave:',
						':doggo_wave:',
					])} Hey there, <@${
						user.id
					}>! I'm Dionysus (I'm a bot designed to help out around the Slack!), and I'll be helping you create a code of conduct report today.`,
					500,
				],
				[
					"The first priority of the Hack Club community is to make it a safe & welcoming environment. We're all incredibly sorry you've had an experience otherwise.",
					700,
				],
				[
					":heart: To best resolve the issue, we ask that you share any details (and screenshots, preferably) that you're comfortable with; there are just a few short questions I'll be asking.",
					300,
				],
				"Whenever you're ready, can you describe the event in one line?",
			],
			dm
		)
	})

	app.message(filterDM, async ({ message }) => {
		const { user: user_id } = message
		const [user] = await User.onboardGet(user_id)
		const dm = postMessageCurry(user_id)
		console.log('hi')
		const dmAck = () =>
			dm(...blocksAndText(sample(['I see.', 'Hmm, I see.', 'Hmm...'])))
		switch (user.state) {
			case UserState.Creating:
			case UserState.None:
				user.title = message.text
				await dmAck()
				await dm(
					...blocksAndText(
						':eyes: Can you describe any more about the incident?'
					)
				)
				await user.incrementState()
				break
			case UserState.Notes:
				user.notes = message.text
				await dmAck()
				await dm(
					...blocksAndText(
						':round_pushpin: Where did this incident happen? Include any links or channels that are related.'
					)
				)

				await user.incrementState()

				break

			case UserState.Where:
				user.where = message.text
				await dmAck()
				await dm(
					...blocksAndText(
						":frame_with_picture: Are there any screenshots or images you'd like to share? Give us as much context as you're comfortable with. If there aren't any, just respond with 'no'."
					)
				)
				await user.incrementState()
				break

			case UserState.Files:
				if (!message.text && !message.files) {
					break
				}

				await dm(
					...blocksAndText(
						":mailbox: I've forwarded this report to our private review channel; you'll receive a DM when a community team member starts taking action."
					)
				)
				await dm(
					...blocksAndText(
						`Thank you so much, <@${user.id}>! I'm always one slash command away. :blobheart: -Guardian`
					)
				)
				user.state = UserState.None
				user.files = message.files
				await user.save()

				const report = await user.commitReport()

				await postMessage(process.env.channel, [
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: `:rotating_light: Attention, commies! A new CoC report has been filed by <@${user.id}>. Here are the deets:`,
						},
					},
					{
						type: 'context',
						elements: [
							{
								type: 'mrkdwn',
								text: `:building_construction: *Internal ID:* \`${report.id}\``,
							},
						],
					},
					{
						type: 'section',

						fields: [
							{
								type: 'mrkdwn',
								text: `*Summary*: ${report?.title}`,
							},
							{
								type: 'mrkdwn',
								text: `*Where:* ${report.where}`,
							},
						],
					},
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: report.notes
								?.split('\n')
								.map((z) => `> ${z}`)
								.join('\n'),
						},
					},
				])

				const files = []

				if (message.files) {
					await postMessage(
						process.env.channel,
						...blocksAndText(
							':frame_with_picture: Here are some images that describe the context more:'
						)
					)
					await message.files.forEach(async (file: any) => {
						const fetched_file = await fetch(file.url_private_download, {
							headers: {
								Authorization: `Bearer ${token}`,
							},
						})

						const buf = await fetched_file
							.arrayBuffer()
							.then((bu) => Buffer.from(bu))
						console.log('buf', buf.toString())
						const f = await app.client.files.upload({
							token,
							channels: process.env.channel,
							file: buf,
							content: buf.toString(),
						})
						console.log(f)
						files.push(f)
					})
					// Download every file
					// Reupload to channel
					//  append to files
				}

				break
			default:
				break
		}
	})
}

export default reporting
