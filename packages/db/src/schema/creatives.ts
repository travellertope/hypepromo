import { pgTable, uuid, text, integer, timestamp, pgEnum, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { campaigns } from './campaigns.ts'

export const creativeAspectEnum = pgEnum('creative_aspect', [
  'square',    // 1:1  — WhatsApp Status, Facebook
  'portrait',  // 9:16 — Instagram Story
  'landscape', // 16:9 — X, Telegram
  'original',  // master upload, unresized
])

export const creatives = pgTable('creatives', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id),
  masterId: uuid('master_id').references((): AnyPgColumn => creatives.id), // null if this IS the master
  platform: text('platform'), // null for master
  aspect: creativeAspectEnum('aspect').notNull().default('original'),
  storageKey: text('storage_key').notNull(), // Supabase Storage path
  mimeType: text('mime_type').notNull(),
  widthPx: integer('width_px'),
  heightPx: integer('height_px'),
  fileSizeBytes: integer('file_size_bytes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
