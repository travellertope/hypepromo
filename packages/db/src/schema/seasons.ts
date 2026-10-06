import { pgTable, uuid, text, timestamp, pgEnum, integer, bigint } from 'drizzle-orm/pg-core'
import { creators } from './creators.ts'

export const seasonStatusEnum = pgEnum('season_status', ['upcoming', 'active', 'ended'])

export const seasons = pgTable('seasons', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  status: seasonStatusEnum('status').notNull().default('upcoming'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const leaderboardEntries = pgTable('leaderboard_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  seasonId: uuid('season_id').notNull().references(() => seasons.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id').notNull().references(() => creators.id, { onDelete: 'cascade' }),
  rank: integer('rank').notNull(),
  earningsKobo: bigint('earnings_kobo', { mode: 'bigint' }).notNull().default(0n),
  validClicks: integer('valid_clicks').notNull().default(0),
  state: text('state'),
  niche: text('niche'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
