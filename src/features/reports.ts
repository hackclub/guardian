import { App } from '@slack/bolt'
import { FieldSet } from 'airtable'
import { Records } from 'airtable/lib/records'

import { filterNoBotMessages } from '../middleware/index'
import { conductDB, userStates, conductAirtable } from '../shared/base'
import { blocksAndText, postMessageCurry } from '../shared/chat'

const getUser = async (user: string) =>
	conductAirtable
		.table('User States')
		.select({
			filterByFormula: `({user} = '${user}')`,
		})
		.all()

const getActiveReports = async (records: Records<FieldSet>) => {
	const [user] = records

	const reports = await Promise.all(
		(user.fields['CoC Reports'] as string[]).map((s) =>
			conductAirtable.table('CoC Reports').find(s)
		)
	)
	console.log(reports.filter((record) => !record.fields?.complete))
}

const reports = async (app: App) => {
	app.command('/report-test', async ({ ack, command }) => {
		await ack({
			response_type: 'ephemeral',
			text: `I've started a thread in <insert thread link here>`,
		} as any)

		const { user_id, channel_id } = command

		const dm = postMessageCurry(user_id)

		const initialMessage = await dm(
			...blocksAndText(`Thanks for reaching out!
		Here's what you can do to file a report:
		Reply to this message thread with anything you want to tell us.
		Include screenshots, #channels, and @mentions
		Reply DONE in the thread when you're finished
		P.S. Don't worry about making mistakes.. you can edit or delete anything in this thread; we'll figure out what to include.
		`)
		)

		const user = await getUser(user_id)
		const activeReports = await getActiveReports(user)
		console.log(activeReports)

		// Create a new id from hash of thread_ts
	})
}

export default reports
