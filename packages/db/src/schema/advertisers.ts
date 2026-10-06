import { pgTable, uuid, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users.ts'

export const advertiserTierEnum = pgEnum('advertiser_tier', ['unverified', 'basic', 'verified'])

export const advertisers = pgTable('advertisers', {
  id: uuid('id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  orgName: text('org_name').notNull(),
  website: text('website'),
  industry: text('industry'),
  tier: advertiserTierEnum('tier').notNull().default('unverified'),
  // VAT / invoicing
  vatNumber: text('vat_number'),
  billingEmail: text('billing_email'),
  billingAddress: text('billing_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
