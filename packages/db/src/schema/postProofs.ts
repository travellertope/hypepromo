import { pgTable, uuid, text, timestamp, pgEnum, integer } from 'drizzle-orm/pg-core'
import { creators } from './creators.ts'
import { quests } from './quests.ts'

export const proofStatusEnum = pgEnum('proof_status', [
  'pending_review',
  'approved',
  'rejected',
])

export const postProofs = pgTable('post_proofs', {
  id: uuid('id').primaryKey().defaultRandom(),
  questId: uuid('quest_id').notNull().references(() => quests.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id').notNull().references(() => creators.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  postUrl: text('post_url').notNull(),
  screenshotUrl: text('screenshot_url'),
  status: proofStatusEnum('status').notNull().default('pending_review'),
  rejectionReason: text('rejection_reason'),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  xpAwarded: integer('xp_awarded'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
