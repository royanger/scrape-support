import {
	mysqlTable,
	index,
	primaryKey,
	varchar,
	longtext,
	datetime,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

export const message = mysqlTable(
	'Message',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.default(sql`UUID()`),
		content: longtext().notNull(),
		createdAt: datetime()
			.default(sql`now()`)
			.notNull(),
		updatedAt: datetime()
			.default(sql`now()`)
			.notNull(),
		threadId: varchar({ length: 191 }).notNull(),
		userId: varchar({ length: 191 }).notNull(),
	},
	(table) => [
		index('Message_threadId_idx').on(table.threadId),
		index('Message_userId_idx').on(table.userId),
		primaryKey({ columns: [table.id], name: 'Message_id' }),
	],
)
