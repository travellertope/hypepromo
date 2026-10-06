import {
  pgTable, uuid, text, bigint, timestamp, pgEnum, index, check,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// Double-entry ledger. Every financial event produces >= 2 entries that sum to zero.
// All amounts in kobo (₦1 = 100 kobo). Amounts are always positive; direction is in account type.

export const accountTypeEnum = pgEnum('account_type', [
  'asset', 'liability', 'revenue', 'expense',
])

export const ledgerAccounts = pgTable('ledger_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // e.g. 'creator:uuid', 'advertiser_wallet', 'platform_revenue'
  name: text('name').notNull(),
  type: accountTypeEnum('type').notNull(),
  ownerId: uuid('owner_id'), // null for platform accounts
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  // reference to what caused this entry
  refType: text('ref_type').notNull(), // 'click', 'conversion', 'withdrawal', 'funding', 'reversal'
  refId: uuid('ref_id').notNull(),
  memo: text('memo'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const journalLines = pgTable('journal_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  entryId: uuid('entry_id').notNull().references(() => journalEntries.id),
  accountId: uuid('account_id').notNull().references(() => ledgerAccounts.id),
  // debit = positive, credit = negative (standard accounting)
  amountKobo: bigint('amount_kobo', { mode: 'bigint' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('journal_lines_account_idx').on(t.accountId),
  index('journal_lines_entry_idx').on(t.entryId),
  check('amount_nonzero', sql`${t.amountKobo} <> 0`),
])
