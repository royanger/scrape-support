import {
	mysqlTable,
	index,
	primaryKey,
	varchar,
	datetime,
	boolean,
	json,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

export const user = mysqlTable(
	'User',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.default(sql`UUID()`),
		userId: varchar({ length: 191 }),
		discordId: varchar({ length: 191 }),
		discordUsername: varchar({ length: 191 }),
		discordAvatarId: varchar({ length: 191 }),
		anonymousUsername: varchar({ length: 191 }).notNull(),
		anonymousAvatarJSON: json()
			.$type<{
				backgroundColor: string
				background: string
			}>()
			.notNull(),
		showUserName: boolean().default(false).notNull(),
		isStaff: boolean().default(false).notNull(),
		createdAt: datetime()
			.default(sql`now()`)
			.notNull(),
		updatedAt: datetime()
			.default(sql`now()`)
			.notNull(),
	},
	(table) => [
		index('User_userId_key').on(table.userId),
		index('User_discordId_key').on(table.discordId),
		index('User_isStaff_key').on(table.isStaff),
		primaryKey({ columns: [table.id], name: 'User_id' }),
	],
)
