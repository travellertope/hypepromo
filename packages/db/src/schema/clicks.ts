import {
  pgTable, uuid, text, bigint, boolean, smallint,
  timestamp, pgEnum, index,
} from 'drizzle-orm/pg-core'
import { referralLinks } from './quests.ts'

export const clickStatusEnum = pgEnum('click_status', [
  'pending',   // received, not yet scored
  'held',      // scored valid, in 7-day hold
  'released',  // hold expired, credited to creator
  'rejected',  // fraud or duplicate
  'reversed',  // credited then reversed
])

export const clicks = pgTable('clicks', {
  id: uuid('id').primaryKey().defaultRandom(),
  linkId: uuid('link_id').notNull().references(() => referralLinks.id),
  status: clickStatusEnum('status').notNull().default('pending'),

  // edge signals (stored for fraud scoring)
  ip: text('ip'),
  userAgent: text('user_agent'),
  asn: text('asn'),
  countryCode: text('country_code'),
  ja4: text('ja4'),              // TLS fingerprint
  botScore: smallint('bot_score'), // 0–100 from Cloudflare
  pmVid: text('pm_vid'),         // visitor dedup cookie
  fingerprint: text('fingerprint'), // canvas/audio fingerprint hash

  // billing snapshot
  unitPriceKobo: bigint('unit_price_kobo', { mode: 'bigint' }).notNull(),
  creatorUnitKobo: bigint('creator_unit_kobo', { mode: 'bigint' }).notNull(),

  engagedAt: timestamp('engaged_at', { withTimezone: true }), // beacon confirmed engagement
  heldUntil: timestamp('held_until', { withTimezone: true }),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),

  clickedAt: timestamp('clicked_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('clicks_link_id_idx').on(t.linkId),
  index('clicks_clicked_at_idx').on(t.clickedAt),
  index('clicks_status_idx').on(t.status),
])

export const conversions = pgTable('conversions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clickId: uuid('click_id').notNull().references(() => clicks.id),
  event: text('event').notNull(),
  source: text('source').notNull(), // 's2s_postback' | 'pixel'
  approved: boolean('approved'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), // 14-day window
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
