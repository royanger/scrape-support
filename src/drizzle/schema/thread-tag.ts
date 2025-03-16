import {
	mysqlTable,
	index,
	primaryKey,
	varchar,
	datetime,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

export const threadTag = mysqlTable(
	'ThreadTag',
	{
		tagId: varchar({ length: 191 }).notNull(),
		threadId: varchar({ length: 191 }).notNull(),
		createdAt: datetime()
			.default(sql`now()`)
			.notNull(),
		updatedAt: datetime()
			.default(sql`now()`)
			.notNull(),
	},
	(table) => [
		index('ThreadTag_tagId_threadId_key').on(table.tagId, table.threadId),
		index('ThreadTag_threadId_idx').on(table.threadId),
		primaryKey({
			columns: [table.tagId, table.threadId],
			name: 'ThreadTag_tagId_threadId',
		}),
	],
)
