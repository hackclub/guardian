import Airtable from 'airtable'
import { AirtablePlusPlus } from 'airtable-plusplus'

export const linkBase = new Airtable({
	apiKey: process.env.link_db_key,
}).base(process.env.link_db)

const conduct = (tableName: string) =>
	new AirtablePlusPlus({
		apiKey: process.env.conduct_db_key,
		baseId: process.env.conduct_db,
		tableName,
	})

export const userStates = conduct('User States')
export const conductDB = conduct('CoC Reports')

export const conductAirtable = new Airtable({
	apiKey: process.env.conduct_db_key,
}).base(process.env.conduct_db)
