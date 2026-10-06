import { eq } from 'drizzle-orm'
import { db } from '@promoet/db/client'
import { creators, advertisers } from '@promoet/db/schema'

// ── Creator profile ─────────────────────────────────────────────────────────

export interface UpsertCreatorProfileInput {
  creatorId: string
  handle: string
  bio?: string | undefined
  state?: string | undefined
  niches?: string[] | undefined
}

export async function upsertCreatorProfile(input: UpsertCreatorProfileInput) {
  const { creatorId, handle, bio, state, niches } = input

  // Check handle uniqueness (exclude self)
  const existing = await db
    .select({ id: creators.id })
    .from(creators)
    .where(eq(creators.handle, handle))
    .limit(1)

  if (existing[0] && existing[0].id !== creatorId) {
    throw new Error('HANDLE_TAKEN')
  }

  const [row] = await db
    .insert(creators)
    .values({
      id: creatorId,
      handle,
      bio,
      state,
      niches,
    })
    .onConflictDoUpdate({
      target: creators.id,
      set: {
        handle,
        bio,
        state,
        niches,
        updatedAt: new Date(),
      },
    })
    .returning()

  return row
}

export async function getCreatorProfile(creatorId: string) {
  const [row] = await db
    .select()
    .from(creators)
    .where(eq(creators.id, creatorId))
    .limit(1)

  return row ?? null
}

// ── Advertiser profile ───────────────────────────────────────────────────────

export interface UpsertAdvertiserProfileInput {
  advertiserId: string
  orgName: string
  website?: string | undefined
  industry?: string | undefined
  vatNumber?: string | undefined
  billingEmail?: string | undefined
}

export async function upsertAdvertiserProfile(input: UpsertAdvertiserProfileInput) {
  const { advertiserId, orgName, website, industry, vatNumber, billingEmail } = input

  const [row] = await db
    .insert(advertisers)
    .values({
      id: advertiserId,
      orgName,
      website,
      industry,
      vatNumber,
      billingEmail,
    })
    .onConflictDoUpdate({
      target: advertisers.id,
      set: {
        orgName,
        website,
        industry,
        vatNumber,
        billingEmail,
        updatedAt: new Date(),
      },
    })
    .returning()

  return row
}

export async function getAdvertiserProfile(advertiserId: string) {
  const [row] = await db
    .select()
    .from(advertisers)
    .where(eq(advertisers.id, advertiserId))
    .limit(1)

  return row ?? null
}
