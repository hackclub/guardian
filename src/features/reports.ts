import { App, ExpressReceiver } from '@slack/bolt'
import { FieldSet } from 'airtable'
import { Records } from 'airtable/lib/records'
import fetch from 'node-fetch'
import { UsingJoinColumnIsNotAllowedError } from 'typeorm'
import {
	postMessage,
	blocksAndText,
	postMessageCurry,
	postEphemeral,
} from '../shared/chat'
import { token } from '../config'

import {
	filterNoBotMessages,
	filterDM,
	filterThreaded,
} from '../middleware/index'
import { conductDB, userStates, conductAirtable } from '../shared/base'

import { receiver } from '../index'

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

	const reports = await Promise.all(
		(user.fields['CoC Reports'] as string[]).map((s) =>
			conductAirtable.table('CoC Reports').find(s)
		)
	)

	return reports.filter((record) => !record.fields?.complete)
}

const reports = async (app: App, receiver: ExpressReceiver) => {
	app.command('/report-test', async ({ ack, command }) => {
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

		const [user] = await getUser(user_id)
		console.log(user)
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
			if (message.text === 'DONE' && report.fields.complete) {
				await app.client.chat.postMessage({
					text: "You've already completed this thread! Contact community team if you'd like to update your report.",
					thread_ts: ts,
					token,
					channel: user_id,
				})
			}
			if (message.text === 'DONE' && !report.fields.complete) {
				await conductAirtable.table('CoC Reports').update([
					{
						id: report.id,
						fields: {
							complete: true,
						},
					},
				] as any)
				await app.client.chat.postMessage({
					text: ":yay: I've sent the compiled thread to Community Team! Stay tuned for updates. Thanks for your report.",
					thread_ts: ts,
					token,
					channel: user_id,
				})
				await postMessage(process.env.channel, [
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: `:rotating_light: Attention, commies! A new CoC report has been filed by <@${user_id}>. Here are the deets:`,
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
						text: {
							type: 'mrkdwn',
							text: report.fields.Notes || ' ',
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
						(report.fields.Files as any).map(async (file) => {
							const { url } = file
							const fetched_file = await fetch(url, {
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
		let err = false
		console.log(url)
		const fetched_file = await fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		}).catch(() => {
			err = true
		})

		if (err) {
			res.statusCode = 404
			return res.end()
		}

		const buf = await (fetched_file as unknown as Response)
			.arrayBuffer()
			.then((bu) => Buffer.from(bu))

		console.log(buf)

		res.end(buf)
	})
}

export default reports
