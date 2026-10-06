import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { creators } from './creators.ts'

export const xpEvents = pgTable('xp_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => creators.id, { onDelete: 'cascade' }),
  // kind: 'quest_claim' | 'click_release' | 'first_clicks_bonus' | 'fraud_penalty'
  kind: text('kind').notNull(),
  amount: integer('amount').notNull(),
  refId: text('ref_id'), // click id, quest id etc.
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
