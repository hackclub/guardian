import { nanoid } from 'nanoid'
import { App } from '@slack/bolt'
import Airtable, * as airtable from 'airtable'
import fetch from 'node-fetch'
import { filterChannel, filterThreaded } from '../middleware/index'

const base = new Airtable({
	apiKey: process.env.link_db_key,
}).base(process.env.link_db)
const linking = async (app: App) => {
	app.message(
		filterChannel(process.env.links),
		filterThreaded(false),
		async ({ message, say }) => {
			const urlRegex =
				/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi
			const match = message.text?.match(urlRegex)?.[0]?.split('|')?.[0]
			if (match) {
				const slug = async () => {
					const tempSlug = nanoid(7)
					return fetch(`https://hack.af/${tempSlug}`)
						.then((e) => {
							if (e.status === 404) {
								console.log('error')
								return tempSlug
							}
							return slug()
						})
						.catch(() => {
							console.log('error')
							return tempSlug
						})
				}

				const generated = await slug()

				const res = await base('Links').create([
					{
						fields: {
							slug: generated,
							destination: match,
							Log: [],
						},
					},
				])

				await say({
					text: `:white_check_mark: wahoo! here's your shortened link, <@${message.user}>: <https://hack.af/${generated}|https://hack.af/${generated}>`,
					thread_ts: message.ts,
				} as any)
			} else {
				await say({
					text: `:grimacing: It doesn't look like that message contained a link, <@${message.user}>. Try again?`,
					thread_ts: message.ts,
				} as any)
			}
		}
	)

	app.command('/shorten', async ({ ack, command, say }) => {
		const urlRegex =
			/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi
		const match = command.text?.match(urlRegex)?.[0]?.split('|')?.[0]
		if (match) {
			const slug = async () => {
				const tempSlug = nanoid(7)
				return fetch(`https://hack.af/${tempSlug}`)
					.then((e) => {
						if (e.status === 404) {
							console.log('error')
							return tempSlug
						}
						return slug()
					})
					.catch(() => {
						console.log('error')
						return tempSlug
					})
			}

			const generated = await slug()

			const res = await base('Links').create([
				{
					fields: {
						slug: generated,
						destination: match,
						Log: [],
					},
				},
			])

			await ack({
				text: `:white_check_mark: wahoo! here's your shortened link, <@${command.user_id}>: <https://hack.af/${generated}|https://hack.af/${generated}>`,
				response_type: 'ephemeral',
			} as any)
		} else {
			await ack({
				text: `:grimacing: It doesn't look like that message contained a link, <@${command.user_id}>. Try again?`,
				response_type: 'ephemeral',
			} as any)
		}
	})
}

export default linking
