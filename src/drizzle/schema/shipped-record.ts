import {
	mysqlTable,
	primaryKey,
	varchar,
	datetime,
	int,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

export const shippedRecord = mysqlTable(
	'ShippedRecord',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.default(sql`UUID()`),
		name: varchar({ length: 191 }).notNull(),
		type: int().notNull(),
		sent_on: datetime()
			.default(sql`(CURRENT_TIMESTAMP(3))`)
			.notNull(),
	},
	(table) => [primaryKey({ columns: [table.id], name: 'ShippedRecord_id' })],
)
