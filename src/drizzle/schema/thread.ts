import {
	mysqlTable,
	index,
	primaryKey,
	varchar,
	longtext,
	datetime,
	boolean,
	text,
	json,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

export const thread = mysqlTable(
	'Thread',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.default(sql`UUID()`),
		title: longtext().notNull(),
		slug: varchar({ length: 191 }).notNull(),
		isPublic: boolean().default(false).notNull(),
		toReview: boolean().default(false).notNull(),
		createdAt: datetime()
			.default(sql`now()`)
			.notNull(),
		updatedAt: datetime()
			.default(sql`now()`)
			.notNull(),
		instanceId: varchar({ length: 191 }),
		userId: varchar({ length: 191 }).notNull(),
		summary: text(),
		preview: text(),
		metadata: json(),
	},
	(table) => [
		index('Thread_userId_idx').on(table.userId),
		primaryKey({ columns: [table.id], name: 'Thread_id' }),
	],
)
