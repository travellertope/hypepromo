import { pgTable, uuid, text, integer, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core'
import { creators } from './creators.ts'

export const socialPlatformEnum = pgEnum('social_platform', [
  'whatsapp_status',
  'x',
  'facebook',
  'instagram_story',
  'instagram_bio',
  'telegram',
])

export const socialVerificationStatusEnum = pgEnum('social_verification_status', [
  'pending',
  'verified',
  'rejected',
])

export const creatorSocials = pgTable('creator_socials', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => creators.id, { onDelete: 'cascade' }),
  platform: socialPlatformEnum('platform').notNull(),
  handle: text('handle').notNull(),
  followerCount: integer('follower_count'),
  screenshotUrl: text('screenshot_url'),
  verificationStatus: socialVerificationStatusEnum('verification_status').notNull().default('pending'),
  rejectionReason: text('rejection_reason'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.creatorId, t.platform)])
