import { sql } from 'drizzle-orm'
import {
	datetime,
	int,
	mysqlTable,
	primaryKey,
	varchar,
} from 'drizzle-orm/mysql-core'

export const attachment = mysqlTable(
	'Attachment',
	{
		/**
		 * Discord attachment ID is a Snowflake
		 * @see https://discord.com/developers/docs/reference#snowflakes
		 */
		id: varchar('id', { length: 65 }).primaryKey(),
		size: int('size').notNull(),
		contentType: varchar({ length: 255 }),
		width: int('width'),
		height: int('height'),
		/**
		 * Chromium URL length limit is 2083 characters
		 * @see https://chromium.googlesource.com/chromium/src/+/main/docs/security/url_display_guidelines/url_display_guidelines.md#url-length
		 */
		url: varchar({
			length: 2083,
		}).notNull(),
		name: varchar({ length: 100 }).notNull(),
		messageId: varchar({ length: 36 }).notNull(),
		threadId: varchar({ length: 36 }).notNull(),
		createdAt: datetime()
			.default(sql`now()`)
			.notNull(),
		updatedAt: datetime()
			.default(sql`now()`)
			.notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.id],
			name: 'Attachment_id',
		}),
	],
)
