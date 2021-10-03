import { token } from '../config'

import { app } from '../index'
import { runSequential, sleep } from './async'

export const postMessage = (
	channel: string,
	blocks?: any[],
	text = '',
	icon_url?: string,
	username?: string
) =>
	icon_url && username
		? app.client.chat.postMessage({
				channel,
				text,
				blocks,
				token,
				username,
				icon_url,
		  })
		: app.client.chat.postMessage({
				channel,
				text,
				blocks,
				token,
		  })

export const postMessageCurry =
	(channel: string) =>
	(blocks?: any[], text = '') =>
		app.client.chat.postMessage({
			channel,
			text,
			blocks,
			token,
		})

export const postEphemeral = (
	channel: string,
	user: string,
	blocks?: any[],
	text = ''
) =>
	app.client.chat.postEphemeral({
		channel,
		text,
		blocks,
		token,
		user,
	})

export const postEphemeralCurry =
	(channel: string) =>
	(user: string, blocks?: any[], text = '') =>
		app.client.chat.postEphemeral({
			channel,
			text,
			blocks,
			token,
			user,
		})

export const postEphemeralUserCurry =
	(channel: string, user: string) =>
	(blocks?: any[], text = '') =>
		app.client.chat.postEphemeral({
			channel,
			text,
			blocks,
			token,
			user,
		})

export const postEphemeralDMCurry =
	(user: string) =>
	(blocks?: any[], text = '') =>
		app.client.chat.postEphemeral({ user, channel: user, token, text, blocks })

export const getPermalink = async (channel, ts): Promise<string> =>
	(
		await app.client.chat.getPermalink({
			token,
			channel,
			message_ts: ts,
		})
	).permalink as string

export const getPermalinkCurry = (channel) => (ts) => getPermalink(channel, ts)

export const blocksAndText = (
	text: string,
	customBlock: (text: string) => any = (text) => [
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text,
			},
		},
	]
): [any, string] => [customBlock(text), text]

export const removeActionsFromMessage = async (blockActionBody: any) => {
	const { ts } = blockActionBody.message

	const channel = blockActionBody.channel.id

	const { text } = blockActionBody.message

	const filteredMessage = (blockActionBody.message.blocks as any[]).filter(
		({ type }) => type !== 'actions'
	)

	return app.client.chat.update({
		token,
		channel,
		ts,
		text,
		blocks: filteredMessage,
	})
}

export const removeActionsFromCustom = async (ts, channel, text, blocks) =>
	app.client.chat.update({
		token,
		channel,
		ts,
		text,
		blocks,
	})

export type MessageString = string | [string, number]

export const sendSequentially = async <T>(
	messages: MessageString[],
	messageFunc: (blocks: Array<any>, text: string) => Promise<T>
) =>
	runSequential(
		messages.map((v) => async () => {
			await messageFunc(
				...blocksAndText(typeof v === 'string' ? v : v[0].toString())
			).then(() => sleep((v[1] as number) || 1500))
		})
	)
