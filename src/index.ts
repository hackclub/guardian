import 'reflect-metadata'

import { App, ExpressReceiver } from '@slack/bolt'
import { createConnection } from 'typeorm'
import { signing_secret, token, name } from './config'
import {
	filterDM,
	filterNoBotMessages,
	filterChannel,
} from './middleware/index'
import * as features from './features/index'

import { User } from './entities/user'
import { Report } from './entities/report'
export const receiver = new ExpressReceiver({ signingSecret: signing_secret })
export const app = new App({
	signingSecret: signing_secret,
	token,
	receiver,
})
;(async () => {
	// Start your app
	await app.start((process.env.PORT as unknown as number) || 3000)
	console.log(`${name} is running! 🔥`)

	for (const [feature, handler] of Object.entries(features)) {
		handler(app, receiver)
		console.log(`Feature "${feature}" has been loaded.`)
	}
})()
