import { sql } from 'drizzle-orm'
import {
  pgTable, uuid, text, bigint, integer, boolean,
  timestamp, pgEnum, jsonb,
} from 'drizzle-orm/pg-core'
import { advertisers } from './advertisers.ts'

export const campaignTypeEnum = pgEnum('campaign_type', ['cpc', 'cpa'])
export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft', 'pending_review', 'rejected', 'funded', 'live', 'paused', 'exhausted', 'closed',
])

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  advertiserId: uuid('advertiser_id').notNull().references(() => advertisers.id),
  name: text('name').notNull(),
  description: text('description'),
  targetUrl: text('target_url').notNull(),
  type: campaignTypeEnum('type').notNull(),
  status: campaignStatusEnum('status').notNull().default('draft'),

  // pricing (all amounts in kobo)
  unitPriceKobo: bigint('unit_price_kobo', { mode: 'bigint' }).notNull(),   // advertiser pays per click/conversion
  creatorUnitKobo: bigint('creator_unit_kobo', { mode: 'bigint' }).notNull(), // floor(unit * 7500/10000)
  budgetKobo: bigint('budget_kobo', { mode: 'bigint' }).notNull(),
  reservedKobo: bigint('reserved_kobo', { mode: 'bigint' }).notNull().default(sql`0`),
  spentKobo: bigint('spent_kobo', { mode: 'bigint' }).notNull().default(sql`0`),

  // caps
  maxPerCreatorPct: integer('max_per_creator_pct').notNull().default(10), // 10% of budget
  dailyCapKobo: bigint('daily_cap_kobo', { mode: 'bigint' }),

  // targeting
  platforms: text('platforms').array().notNull(), // launch platforms
  targetStates: text('target_states').array(),
  targetNiches: text('target_niches').array(),

  // CPA-specific
  conversionEvent: text('conversion_event'),
  cpaApprovalWindowDays: integer('cpa_approval_window_days').default(14),

  // moderation
  rejectionReason: text('rejection_reason'),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

  // VAT snapshot
  vatIncludedKobo: bigint('vat_included_kobo', { mode: 'bigint' }).notNull().default(sql`0`),

  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
