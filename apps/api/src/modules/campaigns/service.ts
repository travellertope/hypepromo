import { eq, and, desc, lt, or, isNull, sql, count } from 'drizzle-orm'
import { db } from '@promoet/db/client'
import {
  campaigns,
  advertisers,
  clicks,
  referralLinks,
  quests,
} from '@promoet/db/schema'
import { creatorUnit } from '@promoet/config'
import { getBalance, advertiserWallet } from '@promoet/ledger'
import type {
  CreateCampaign,
  UpdateCampaign,
  CampaignResponse,
  QuestFeedParams,
} from '@promoet/schemas'
import { decodeCursor, encodeCursor } from '@promoet/schemas'

function toCampaignResponse(row: typeof campaigns.$inferSelect): CampaignResponse {
  return {
    id: row.id,
    advertiserId: row.advertiserId,
    name: row.name,
    description: row.description ?? null,
    targetUrl: row.targetUrl,
    type: row.type,
    status: row.status,
    unitPriceKobo: Number(row.unitPriceKobo),
    creatorUnitKobo: Number(row.creatorUnitKobo),
    budgetKobo: Number(row.budgetKobo),
    reservedKobo: Number(row.reservedKobo),
    spentKobo: Number(row.spentKobo),
    platforms: row.platforms,
    targetStates: row.targetStates ?? null,
    targetNiches: row.targetNiches ?? null,
    conversionEvent: row.conversionEvent ?? null,
    cpaApprovalWindowDays: row.cpaApprovalWindowDays ?? null,
    rejectionReason: row.rejectionReason ?? null,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function createCampaign(
  advertiserId: string,
  input: CreateCampaign,
): Promise<CampaignResponse> {
  // Ensure advertiser profile exists
  const [advertiser] = await db
    .select({ id: advertisers.id })
    .from(advertisers)
    .where(eq(advertisers.id, advertiserId))
    .limit(1)
  if (!advertiser) throw new Error('ADVERTISER_NOT_FOUND')

  const unitPriceKobo = BigInt(input.unitPriceKobo)
  const creatorUnitKobo = creatorUnit(unitPriceKobo)

  const [campaign] = await db
    .insert(campaigns)
    .values({
      advertiserId,
      name: input.name,
      description: input.description,
      targetUrl: input.targetUrl,
      type: input.type,
      status: 'draft',
      unitPriceKobo,
      creatorUnitKobo,
      budgetKobo: BigInt(input.budgetKobo),
      platforms: input.platforms as string[],
      targetStates: input.targetStates as string[] | undefined,
      targetNiches: input.targetNiches as string[] | undefined,
      conversionEvent: input.type === 'cpa' ? input.conversionEvent : undefined,
      cpaApprovalWindowDays:
        input.type === 'cpa' ? input.cpaApprovalWindowDays : undefined,
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
      endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
    })
    .returning()

  if (!campaign) throw new Error('INSERT_FAILED')
  return toCampaignResponse(campaign)
}

export async function getMyCampaign(
  id: string,
  advertiserId: string,
): Promise<CampaignResponse | null> {
  const [row] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.advertiserId, advertiserId)))
    .limit(1)
  return row ? toCampaignResponse(row) : null
}

export async function listMyCampaigns(
  advertiserId: string,
  cursor: string | undefined,
  limit: number,
): Promise<{ items: CampaignResponse[]; nextCursor: string | null }> {
  const decoded = cursor ? decodeCursor(cursor) : null

  const rows = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.advertiserId, advertiserId),
        decoded
          ? or(
              lt(campaigns.createdAt, decoded.createdAt),
              and(eq(campaigns.createdAt, decoded.createdAt), lt(campaigns.id, decoded.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(campaigns.createdAt), desc(campaigns.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const last = items[items.length - 1]
  const nextCursor =
    hasMore && last ? encodeCursor(last.createdAt, last.id) : null

  return { items: items.map(toCampaignResponse), nextCursor }
}

export async function updateCampaign(
  id: string,
  advertiserId: string,
  input: UpdateCampaign,
): Promise<CampaignResponse> {
  const [existing] = await db
    .select({ status: campaigns.status })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.advertiserId, advertiserId)))
    .limit(1)

  if (!existing) throw new Error('NOT_FOUND')
  if (existing.status !== 'draft') throw new Error('NOT_DRAFT')

  const [updated] = await db
    .update(campaigns)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.targetUrl !== undefined && { targetUrl: input.targetUrl }),
      ...(input.startsAt !== undefined && {
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
      }),
      ...(input.endsAt !== undefined && {
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
      }),
      updatedAt: new Date(),
    })
    .where(and(eq(campaigns.id, id), eq(campaigns.advertiserId, advertiserId)))
    .returning()

  if (!updated) throw new Error('UPDATE_FAILED')
  return toCampaignResponse(updated)
}

export async function submitCampaign(
  id: string,
  advertiserId: string,
): Promise<CampaignResponse> {
  const [existing] = await db
    .select({ status: campaigns.status })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.advertiserId, advertiserId)))
    .limit(1)

  if (!existing) throw new Error('NOT_FOUND')
  if (existing.status !== 'draft') throw new Error('NOT_DRAFT')

  const [updated] = await db
    .update(campaigns)
    .set({ status: 'pending_review', updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning()

  if (!updated) throw new Error('UPDATE_FAILED')
  return toCampaignResponse(updated)
}

export async function pauseCampaign(
  id: string,
  advertiserId: string,
): Promise<CampaignResponse> {
  const [existing] = await db
    .select({ status: campaigns.status })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.advertiserId, advertiserId)))
    .limit(1)

  if (!existing) throw new Error('NOT_FOUND')
  if (existing.status !== 'live') throw new Error('NOT_LIVE')

  const [updated] = await db
    .update(campaigns)
    .set({ status: 'paused', updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning()

  if (!updated) throw new Error('UPDATE_FAILED')
  return toCampaignResponse(updated)
}

export async function resumeCampaign(
  id: string,
  advertiserId: string,
): Promise<CampaignResponse> {
  const [existing] = await db
    .select({ status: campaigns.status })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.advertiserId, advertiserId)))
    .limit(1)

  if (!existing) throw new Error('NOT_FOUND')
  if (existing.status !== 'paused') throw new Error('NOT_PAUSED')

  const [updated] = await db
    .update(campaigns)
    .set({ status: 'live', updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning()

  if (!updated) throw new Error('UPDATE_FAILED')
  return toCampaignResponse(updated)
}

// Admin ops
export async function approveCampaign(
  id: string,
  adminId: string,
): Promise<CampaignResponse> {
  const [existing] = await db
    .select({ status: campaigns.status })
    .from(campaigns)
    .where(eq(campaigns.id, id))
    .limit(1)

  if (!existing) throw new Error('NOT_FOUND')
  if (existing.status !== 'pending_review') throw new Error('NOT_PENDING')

  const [updated] = await db
    .update(campaigns)
    .set({
      status: 'funded',
      reviewedBy: adminId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, id))
    .returning()

  if (!updated) throw new Error('UPDATE_FAILED')
  return toCampaignResponse(updated)
}

export async function rejectCampaign(
  id: string,
  adminId: string,
  reason: string,
): Promise<CampaignResponse> {
  const [existing] = await db
    .select({ status: campaigns.status })
    .from(campaigns)
    .where(eq(campaigns.id, id))
    .limit(1)

  if (!existing) throw new Error('NOT_FOUND')
  if (existing.status !== 'pending_review') throw new Error('NOT_PENDING')

  const [updated] = await db
    .update(campaigns)
    .set({
      status: 'rejected',
      rejectionReason: reason,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, id))
    .returning()

  if (!updated) throw new Error('UPDATE_FAILED')
  return toCampaignResponse(updated)
}

// Public quest feed — live campaigns only
export async function listLiveCampaigns(
  params: QuestFeedParams,
  creatorId?: string,
): Promise<{ items: ReturnType<typeof toCampaignResponse>[]; nextCursor: string | null }> {
  const { cursor, limit, type, platform } = params
  const decoded = cursor ? decodeCursor(cursor) : null
  const now = new Date()

  const rows = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.status, 'live'),
        or(isNull(campaigns.endsAt), sql`${campaigns.endsAt} > ${now}`),
        type ? eq(campaigns.type, type) : undefined,
        platform
          ? sql`${campaigns.platforms} @> ARRAY[${platform}]::text[]`
          : undefined,
        decoded
          ? or(
              lt(campaigns.createdAt, decoded.createdAt),
              and(eq(campaigns.createdAt, decoded.createdAt), lt(campaigns.id, decoded.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(campaigns.createdAt), desc(campaigns.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const last = items[items.length - 1]
  const nextCursor =
    hasMore && last ? encodeCursor(last.createdAt, last.id) : null

  return { items: items.map(toCampaignResponse), nextCursor }
}

export async function getAdminReviewQueue(
  cursor: string | undefined,
  limit: number,
): Promise<{ items: CampaignResponse[]; nextCursor: string | null }> {
  const decoded = cursor ? decodeCursor(cursor) : null

  const rows = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.status, 'pending_review'),
        decoded
          ? or(
              lt(campaigns.createdAt, decoded.createdAt),
              and(eq(campaigns.createdAt, decoded.createdAt), lt(campaigns.id, decoded.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(campaigns.createdAt), desc(campaigns.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const last = items[items.length - 1]
  const nextCursor =
    hasMore && last ? encodeCursor(last.createdAt, last.id) : null

  return { items: items.map(toCampaignResponse), nextCursor }
}

// ── Go-live ───────────────────────────────────────────────────────────────────
// Transitions a funded campaign to live after confirming the advertiser has
// enough wallet balance to cover at least one unit price.
export async function goLiveCampaign(
  id: string,
  advertiserId: string,
): Promise<CampaignResponse> {
  const [existing] = await db
    .select({ status: campaigns.status, unitPriceKobo: campaigns.unitPriceKobo })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.advertiserId, advertiserId)))
    .limit(1)

  if (!existing) throw new Error('NOT_FOUND')
  if (existing.status !== 'funded') throw new Error('NOT_FUNDED')

  const balance = await getBalance(db, advertiserWallet(advertiserId))
  // Liability accounts: negative sum = we owe the advertiser
  const available = balance < 0n ? -balance : 0n

  if (available < existing.unitPriceKobo) throw new Error('INSUFFICIENT_FUNDS')

  const [updated] = await db
    .update(campaigns)
    .set({ status: 'live', startsAt: new Date(), updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning()

  if (!updated) throw new Error('UPDATE_FAILED')
  return toCampaignResponse(updated)
}

// ── Advertiser stats ──────────────────────────────────────────────────────────

export interface AdvertiserStats {
  totalClicks: number
  validClicks: number
  rejectedClicks: number
  validPct: number
  totalSpendKobo: number
}

export async function getAdvertiserStats(advertiserId: string): Promise<AdvertiserStats> {
  // Get all click IDs for campaigns owned by this advertiser
  const [row] = await db
    .select({
      total:    sql<string>`count(${clicks.id})`,
      valid:    sql<string>`count(${clicks.id}) filter (where ${clicks.status} in ('held', 'released'))`,
      rejected: sql<string>`count(${clicks.id}) filter (where ${clicks.status} = 'rejected')`,
      spend:    sql<string>`coalesce(sum(${clicks.unitPriceKobo}) filter (where ${clicks.status} != 'rejected'), 0)`,
    })
    .from(campaigns)
    .innerJoin(quests, eq(quests.campaignId, campaigns.id))
    .innerJoin(referralLinks, eq(referralLinks.questId, quests.id))
    .innerJoin(clicks, eq(clicks.linkId, referralLinks.id))
    .where(eq(campaigns.advertiserId, advertiserId))

  const total    = Number(row?.total ?? 0)
  const valid    = Number(row?.valid ?? 0)
  const rejected = Number(row?.rejected ?? 0)
  const spend    = Number(row?.spend ?? 0)

  return {
    totalClicks: total,
    validClicks: valid,
    rejectedClicks: rejected,
    validPct: total > 0 ? Math.round((valid / total) * 10000) / 100 : 0,
    totalSpendKobo: spend,
  }
}
