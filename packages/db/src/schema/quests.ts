import { pgTable, uuid, text, bigint, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core'
import { campaigns } from './campaigns.ts'
import { creators } from './creators.ts'

export const platformEnum = pgEnum('platform', [
  'whatsapp_status', 'x', 'facebook', 'instagram_story', 'instagram_bio', 'telegram',
])

export const questStatusEnum = pgEnum('quest_status', [
  'active', 'paused', 'exhausted', 'expired',
])

// One quest = one creator claiming one campaign
export const quests = pgTable('quests', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id),
  creatorId: uuid('creator_id').notNull().references(() => creators.id),
  status: questStatusEnum('status').notNull().default('active'),
  claimedAt: timestamp('claimed_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.campaignId, t.creatorId)])

// One referral link per quest per platform (8-char base62 code)
export const referralLinks = pgTable('referral_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  questId: uuid('quest_id').notNull().references(() => quests.id),
  platform: platformEnum('platform').notNull(),
  code: text('code').notNull().unique(), // 8-char base62
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.questId, t.platform)])
