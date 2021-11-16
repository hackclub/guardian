import 'reflect-metadata'

import { App, ExpressReceiver } from '@slack/bolt'

import express, { RequestHandler } from 'express'
import { signing_secret, token, name } from './config'
import * as features from './features/index'

const receiver = new ExpressReceiver({
	signingSecret: signing_secret,
})

receiver.router.use(express.text() as RequestHandler)

export const app = new App({
	token,
	receiver,
})
;(async () => {
	// Start your app
	await app.start(parseInt(process.env.PORT) || 3000)

	console.log(`${name} is running! 🔥`)

	for (const [feature, handler] of Object.entries(features)) {
		handler(app, receiver)
		console.log(`Feature "${feature}" has been loaded.`)
	}
})()
