import { relations } from 'drizzle-orm'
import {
	attachment,
	message,
	onboarding,
	tag,
	thread,
	threadStatus,
	threadTag,
	user,
} from '../schema'

export const userRelations = relations(user, ({ many, one }) => ({
	threadStatus: many(threadStatus),
	thread: many(thread),
	message: many(message),
	onboarding: one(onboarding),
}))

export const threadRelations = relations(thread, ({ one, many }) => ({
	messages: many(message),
	threadTag: many(threadTag),
	user: one(user, {
		fields: [thread.userId],
		references: [user.id],
	}),
	attachments: many(attachment),
}))

export const messageRelations = relations(message, ({ one, many }) => ({
	user: one(user, {
		fields: [message.userId],
		references: [user.id],
	}),
	thread: one(thread, {
		fields: [message.threadId],
		references: [thread.id],
	}),
	attachments: many(attachment),
}))

export const onboardingRelations = relations(onboarding, ({ one }) => ({
	user: one(user, {
		fields: [onboarding.userId],
		references: [user.userId],
	}),
}))

export const tagRelations = relations(tag, ({ many }) => ({
	threadTag: many(threadTag),
	threadStatus: many(threadStatus),
}))

export const threadTagRelations = relations(threadTag, ({ one }) => ({
	tag: one(tag, {
		fields: [threadTag.tagId],
		references: [tag.id],
	}),
	threadId: one(thread, {
		fields: [threadTag.threadId],
		references: [thread.id],
	}),
}))

export const threadStatusRelations = relations(threadStatus, ({ one }) => ({
	user: one(user, {
		fields: [threadStatus.userId],
		references: [user.discordId],
	}),
	tag: one(tag, {
		fields: [threadStatus.tagId],
		references: [tag.id],
	}),
}))

export const attachmentsRelations = relations(attachment, ({ one }) => ({
	message: one(message, {
		fields: [attachment.messageId],
		references: [message.id],
	}),
	thread: one(thread, {
		fields: [attachment.threadId],
		references: [thread.id],
	}),
}))
