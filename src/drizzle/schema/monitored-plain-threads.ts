import {
	mysqlTable,
	primaryKey,
	varchar,
	datetime,
	int,
	boolean,
} from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

export const monitoredPlainThreads = mysqlTable(
	'MonitoredPlainThreads',
	{
		id: varchar('id', { length: 36 }).primaryKey().notNull(),
		cursor: varchar({ length: 191 }),
		messageCount: int(),
		ageViolation: boolean(),
		createdAt: datetime()
			.default(sql`now()`)
			.notNull(),
		updatedAt: datetime()
			.default(sql`now()`)
			.notNull(),
		reviewed: boolean().default(false).notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.id], name: 'MonitoredPlainThreads_id' }),
	],
)
