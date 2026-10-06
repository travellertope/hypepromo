import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, bigint, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { creators } from './creators.ts'

export const withdrawalStatusEnum = pgEnum('withdrawal_status', [
  'pending',    // requested, awaiting ops approval
  'approved',   // approved, transfer initiated
  'paid',       // Paystack transfer confirmed
  'failed',     // transfer failed
  'cancelled',  // rejected by ops
])

export const withdrawals = pgTable('withdrawals', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => creators.id),
  amountKobo: bigint('amount_kobo', { mode: 'bigint' }).notNull(),
  // transfer fee deducted from creator (Paystack charge)
  feeKobo: bigint('fee_kobo', { mode: 'bigint' }).notNull().default(sql`0`),
  netKobo: bigint('net_kobo', { mode: 'bigint' }).notNull(), // amountKobo - feeKobo
  status: withdrawalStatusEnum('status').notNull().default('pending'),
  paystackTransferCode: text('paystack_transfer_code'),
  paystackReference: text('paystack_reference'),
  failureReason: text('failure_reason'),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
