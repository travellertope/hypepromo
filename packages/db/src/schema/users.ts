import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['creator', 'advertiser', 'admin'])
export const kycStatusEnum = pgEnum('kyc_status', ['none', 'pending', 'approved', 'rejected'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // matches Supabase auth.users.id
  phone: text('phone').notNull().unique(),
  email: text('email').unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  role: roleEnum('role').notNull(),
  kycStatus: kycStatusEnum('kyc_status').notNull().default('none'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
