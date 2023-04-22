import { nanoid } from 'nanoid'
import { App, GenericMessageEvent } from '@slack/bolt'

import axios from 'axios'
import { filterChannel, filterThreaded } from '../middleware/index'
import { linkBase } from '../shared/base'

const linking = async (app: App) => {
	app.message(
		filterChannel(process.env.links),
		filterThreaded(false),
		async ({ say, ...args }) => {
			const message = args.message as GenericMessageEvent
			const urlRegex = "^(https|ftp|file)?://[^\s/$.?#].[^\s]*$"
			const match = message.text?.match(urlRegex)?.[0]
			if (match) {
				const slug = async () => {
					const tempSlug = nanoid(7)
					return axios(`https://hack.af/${tempSlug}`)
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

				const res = await linkBase('Links').create([
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
		const urlRegex = "^(https|ftp|file)?://[^\s/$.?#].[^\s]*$"
		const match = command.text?.match(urlRegex)?.[0]
		if (match) {
			const slug = async () => {
				const tempSlug = nanoid(7)
				return axios(`https://hack.af/${tempSlug}`)
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

			const res = await linkBase('Links').create([
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
