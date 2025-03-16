import {
	mysqlTable,
	index,
	primaryKey,
	varchar,
	datetime,
	json,
	boolean,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

export const onboarding = mysqlTable(
	'Onboarding',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.default(sql`UUID()`),
		userId: varchar({ length: 191 }).notNull(),
		heardAbout: varchar({ length: 191 }).notNull(),
		roleOther: varchar({ length: 200 }),
		eap: boolean().notNull(),
		role: varchar({ length: 191 }),
		orgSize: varchar({ length: 191 }),
		projects: json().notNull(),
		frameworks: json().notNull(),
		createdAt: datetime()
			.default(sql`now()`)
			.notNull(),
		updatedAt: datetime()
			.default(sql`now()`)
			.notNull(),
		migration: boolean().default(false).notNull(),
		heardAboutOther: varchar({ length: 200 }),
	},
	(table) => [
		index('Onboarding_userId_key').on(table.userId),
		primaryKey({ columns: [table.id], name: 'Onboarding_id' }),
	],
)
