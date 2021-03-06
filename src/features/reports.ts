import { App, ExpressReceiver, SectionBlock } from '@slack/bolt'

import axios from 'axios'
import { Readable } from 'stream'
import {
	postMessage,
	blocksAndText,
	postMessageCurry,
	postEphemeral,
} from '../shared/chat'
import { token } from '../config'

import { filterDM, filterThreaded } from '../middleware/index'
import { conductAirtable } from '../shared/base'

const getUser = async (user: string) =>
	conductAirtable
		.table('User States')
		.select({
			filterByFormula: `({user} = '${user}')`,
		})
		.all()

const getReport = async (user: string, ts: string) =>
	conductAirtable
		.table('CoC Reports')
		.select({
			filterByFormula: `AND({Raw Slack User} = '${user}', {Slack Message Timestamp} = '${ts}')`,
		})
		.all()

const getActiveReports = async (user: any) => {
	console.log(user.fields)

	if (!user.fields['CoC Reports']?.length) {
		return []
	}
	const reports = await Promise.all(
		(user.fields['CoC Reports'] as string[]).map((s) =>
			conductAirtable.table('CoC Reports').find(s)
		)
	)

	return reports.filter((record) => record.fields?.Status === 'Writing')
}

const reports = async (app: App, receiver: ExpressReceiver) => {
	app.command('/report', async ({ ack, command }) => {
		const { user_id, channel_id } = command

		const dm = postMessageCurry(user_id)

		const initialMessage = await dm(
			...blocksAndText(
				`:hyper-dino-wave: Thanks for reaching out!

:report: Here's what you can do to file a report:
Reply to this message thread with anything you want to tell us.
:camera_with_flash: Make sure to include screenshots, #channels, and @mentions!
Reply DONE in the thread when you're finished, and we'll send the whole thread to our team.

*P.S. Don't worry about making mistakes.. you can edit or delete anything in this thread; we'll figure out what to include.*
		`
			)
		)

		await ack({
			response_type: 'ephemeral',
			text: `I've started a thread in <https://hackclub.slack.com/archives/${
				initialMessage.channel
			}/p${initialMessage.message.ts.replace('.', '')}|our DM>.`,
		} as any)

		const users = await getUser(user_id)
		let [user] = users
		if (users.length === 0) {
			const [u] = await conductAirtable.table('User States').create([
				{
					fields: {
						user: user_id,
					},
				},
			])
			user = u
		}

		const activeReports = await getActiveReports(user)

		if (activeReports.length > 0) {
			await postEphemeral(
				user_id,
				user_id,
				...blocksAndText(
					`\n\nYou have ${
						activeReports.length - 1
					} other reports going right now, too. You can find all your current reports ${activeReports
						.map((report) => {
							console.log(report)
							return `<https://hackclub.slack.com/archives/${
								initialMessage.channel
							}/p${(
								report.fields['Slack Message Timestamp'] as unknown as string
							).replace('.', '')}|here>`
						})
						.join(', ')}`
				)
			)
		}

		console.log(initialMessage)

		const ids = await conductAirtable.table('CoC Reports').create([
			{
				fields: {
					Status: 'Writing',
					Notes: '',
					Source: 'Slack',
					'Email Message ID': '',
					'Email Address': '',
					'Slack User': [user.id],
					'Raw Slack User': user_id,
					'Slack Message Timestamp': (initialMessage.message as any).ts,
				},
			},
		] as any)

		console.log(ids)
	})

	app.message(filterDM, filterThreaded(true), async ({ message }: any) => {
		const { thread_ts: ts, user: user_id } = message
		const [report] = await getReport(user_id, ts)
		if (message.text) {
			if (message.text === 'DONE' && report.fields.Status !== 'Writing') {
				await app.client.chat.postMessage({
					text: "You've already completed this thread! Contact community team if you'd like to update your report.",
					thread_ts: ts,
					token,
					channel: user_id,
				})
			}
			if (message.text === 'DONE' && report.fields.Status === 'Writing') {
				await app.client.chat.postMessage({
					text: ":yay: I've sent the compiled thread to Community Team! Stay tuned for updates. Thanks for your report.",
					thread_ts: ts,
					token,
					channel: user_id,
				})

				const notes = report.fields.Notes as string

				const sent = await postMessage(process.env.channel, [
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: `:rotating_light: Attention, commies! A new CoC report has been filed by <@${user_id}>. Here are the deets:`,
						},
					},

					...(notes
						? [
								<SectionBlock>{
									type: 'section',
									text: {
										type: 'mrkdwn',
										text: notes,
									},
								},
						  ]
						: []),
					{
						type: 'context',
						elements: [
							{
								type: 'mrkdwn',
								text: `:building_construction: *Internal ID:* \`${report.id}\`. Submitted by <@${user_id}> to <@U02FUMR2144> through \`/report\`. Airtable URL: <https://airtable.com/${process.env.conduct_db}/tblgSZiVc7haneLtz/viwXcUL2wK7CSfacd/${report.id}?blocks=hide|${report.id} in "CoC Reports">`,
							},
						],
					},
				])
				await conductAirtable.table('CoC Reports').update([
					{
						id: report.id,
						fields: {
							Status: 'New',
							'Channel Link': `https://hackclub.slack.com/archives/${
								process.env.channel
							}/p${sent.message.ts.replace('.', '')}`,
						},
					},
				] as any)
				if (report.fields.Files) {
					await postMessage(
						process.env.channel,
						...blocksAndText(
							':file_folder: Here are the attachments associated with this report:'
						)
					)
					await Promise.all(
						(report.fields.Files as any).map(async ({ url }) => {
							const fetched_file = await axios(url, {
								responseType: 'stream',
							})

							await app.client.files.upload({
								token,
								channels: process.env.channel,
								file: fetched_file.data as Readable,
							})
						})
					)
				}
			}
			await conductAirtable.table('CoC Reports').update([
				{
					id: report.id,
					fields: {
						Notes: `${`${report.fields.Notes ? report.fields.Notes : ''}\n`}${
							message.text
						}`,
					},
				},
			])
		}

		if (message.files) {
			const files = message.files.map((v) => ({
				url: `${process.env.url}/file-proxy?url=${encodeURIComponent(
					v.url_private_download
				)}`,
			}))

			console.log(files)

			await conductAirtable.table('CoC Reports').update([
				{
					id: report.id,
					fields: {
						Files: files,
					},
				},
			])
		}
	})

	receiver.router.get('/file-proxy', async (req, res) => {
		if (!req.query?.url) {
			res.statusCode = 404
			return res.end()
		}
		const { url } = req.query as any

		try {
			const fetched_file = await axios(url, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
				responseType: 'stream',
			})

			res.header('Content-Type', fetched_file.headers['content-type'])

			const stream = fetched_file.data as Readable

			stream.pipe(res)
		} catch (e) {
			res.statusCode = 404
			return res.end()
		}
	})
}

export default reports
