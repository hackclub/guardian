import 'reflect-metadata'

import express, { RequestHandler } from 'express'

import { App, ExpressReceiver } from '@slack/bolt'
import { createConnection } from 'typeorm'
import { signing_secret, token, name } from './config'
import * as features from './features/index'

import { User } from './entities/user'
import { Report } from './entities/report'

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
	await app.start(process.env.PORT || 3000)
	// await createConnection({
	// 	url: process.env.DATABASE_URL,
	// 	type: 'postgres',
	// 	entities: [User, Report],
	// 	synchronize: true,

	// 	ssl: true,
	// })
	console.log(`${name} is running! 🔥`)

	for (const [feature, handler] of Object.entries(features)) {
		handler(app, receiver)
		console.log(`Feature "${feature}" has been loaded.`)
	}
})()
