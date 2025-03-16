import {
	datetime,
	mysqlTable,
	primaryKey,
	varchar,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

export const tag = mysqlTable(
	'Tag',
	{
		id: varchar({ length: 191 }).primaryKey().notNull(),
		name: varchar({ length: 191 }).notNull(),
		type: varchar({ length: 191 }),
		createdAt: datetime()
			.default(sql`now()`)
			.notNull(),
		updatedAt: datetime()
			.default(sql`now()`)
			.notNull(),
	},
	(table) => [primaryKey({ columns: [table.id], name: 'Tag_id' })],
)
