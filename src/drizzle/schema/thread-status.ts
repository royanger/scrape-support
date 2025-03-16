import {
	mysqlTable,
	index,
	primaryKey,
	varchar,
	datetime,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

export const threadStatus = mysqlTable(
	'ThreadStatus',
	{
		id: varchar({ length: 36 }).notNull().primaryKey(),
		tagId: varchar({ length: 25 }).notNull(),
		createdAt: datetime()
			.default(sql`now()`)
			.notNull(),
		updatedAt: datetime()
			.default(sql`now()`)
			.notNull(),
		userId: varchar({ length: 25 }).notNull(),
	},
	(table) => [
		index('ThreadStatus_tagId_idx').on(table.tagId),
		primaryKey({ columns: [table.id], name: 'ThreadStatus_id' }),
	],
)

export type InsertThreadStatus = typeof threadStatus.$inferInsert
