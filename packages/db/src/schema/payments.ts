import { pgTable, uuid, text, bigint, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core'
import { advertisers } from './advertisers.ts'

export const paystackPaymentStatusEnum = pgEnum('paystack_payment_status', [
  'pending',
  'success',
  'failed',
  'abandoned',
])

export const paystackPayments = pgTable('paystack_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  advertiserId: uuid('advertiser_id').notNull().references(() => advertisers.id),
  reference: text('reference').notNull().unique(),
  // net amount the advertiser wallet should receive after grossing up
  amountKobo: bigint('amount_kobo', { mode: 'bigint' }).notNull(),
  // total charged to the card (includes Paystack fees)
  grossKobo: bigint('gross_kobo', { mode: 'bigint' }).notNull(),
  status: paystackPaymentStatusEnum('status').notNull().default('pending'),
  paystackResponse: jsonb('paystack_response'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
