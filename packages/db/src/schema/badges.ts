import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { creators } from './creators.ts'

export const creatorBadges = pgTable('creator_badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => creators.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  refId: text('ref_id'),
  awardedAt: timestamp('awarded_at', { withTimezone: true }).notNull().defaultNow(),
})
