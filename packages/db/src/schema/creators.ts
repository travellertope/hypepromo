import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, integer, bigint, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users.ts'

export const tierEnum = pgEnum('creator_tier', ['starter', 'rising', 'pro', 'elite'])

export const creators = pgTable('creators', {
  id: uuid('id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  handle: text('handle').notNull().unique(), // promoet.com/@handle
  bio: text('bio'),
  state: text('state'), // Nigerian state e.g. "Lagos"
  niches: text('niches').array(),
  tier: tierEnum('tier').notNull().default('starter'),
  xp: integer('xp').notNull().default(0),
  level: integer('level').notNull().default(1),
  energyMax: integer('energy_max').notNull().default(10),
  energyUsed: integer('energy_used').notNull().default(0),
  energyResetAt: timestamp('energy_reset_at', { withTimezone: true }),
  // bank details (set before first withdrawal)
  bankCode: text('bank_code'),
  bankAccountNumber: text('bank_account_number'),
  bankAccountName: text('bank_account_name'),
  paystackRecipientCode: text('paystack_recipient_code'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// available_kobo and pending_kobo live in the ledger; these are cached for display
export const creatorBalanceCache = pgTable('creator_balance_cache', {
  creatorId: uuid('creator_id').primaryKey().references(() => creators.id, { onDelete: 'cascade' }),
  pendingKobo: bigint('pending_kobo', { mode: 'bigint' }).notNull().default(sql`0`),
  availableKobo: bigint('available_kobo', { mode: 'bigint' }).notNull().default(sql`0`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
