import { eq, and, gt, count } from 'drizzle-orm'
import { db } from '@promoet/db/client'
import { clicks, referralLinks, campaigns } from '@promoet/db/schema'
import { CLICK_HOLD_DAYS } from '@promoet/config'
import { postTransaction, buildClickPayout } from '@promoet/ledger'
import type { ClickEvent } from '@promoet/schemas'

const BOT_SCORE_THRESHOLD = 30

export type IngestResult =
  | { valid: true; clickId: string }
  | { valid: false; reason: string; clickId: string }

export async function ingestClick(event: ClickEvent): Promise<IngestResult> {
  // Resolve link → campaign + advertiser
  const [link] = await db
    .select({
      id: referralLinks.id,
      questId: referralLinks.questId,
      platform: referralLinks.platform,
    })
    .from(referralLinks)
    .where(eq(referralLinks.id, event.linkId))
    .limit(1)

  if (!link) {
    return await insertRejected(event, 'LINK_NOT_FOUND', null)
  }

  // Fraud rule 1: bot score too high
  if (event.botScore !== null && event.botScore > BOT_SCORE_THRESHOLD) {
    return await insertRejected(event, 'BOT_SCORE_HIGH', link.id)
  }

  // Fraud rule 2: same pmVid + same link within 24h
  if (event.pmVid) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [dup] = await db
      .select({ id: clicks.id })
      .from(clicks)
      .where(
        and(
          eq(clicks.linkId, event.linkId),
          eq(clicks.pmVid, event.pmVid),
          gt(clicks.clickedAt, cutoff),
        ),
      )
      .limit(1)

    if (dup) {
      return await insertRejected(event, 'DUPLICATE_VISITOR', link.id)
    }
  }

  // Fraud rule 3: same IP clicked same link 3+ times in the last hour
  if (event.ip) {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000)
    const ipCountRows = await db
      .select({ total: count() })
      .from(clicks)
      .where(
        and(
          eq(clicks.linkId, event.linkId),
          eq(clicks.ip, event.ip),
          gt(clicks.clickedAt, cutoff),
        ),
      )
    const ipCount = ipCountRows[0]?.total ?? 0

    if (Number(ipCount) >= 3) {
      return await insertRejected(event, 'IP_RATE_LIMIT', link.id)
    }
  }

  // Valid click — insert with 'held' status
  const heldUntil = new Date(Date.now() + CLICK_HOLD_DAYS * 24 * 60 * 60 * 1000)

  const [click] = await db
    .insert(clicks)
    .values({
      linkId: event.linkId,
      status: 'held',
      ip: event.ip ?? undefined,
      userAgent: event.userAgent ?? undefined,
      asn: event.asn ?? undefined,
      countryCode: event.country ?? undefined,
      botScore: event.botScore ?? undefined,
      pmVid: event.pmVid ?? undefined,
      fingerprint: undefined,
      unitPriceKobo: BigInt(event.unitPriceKobo),
      creatorUnitKobo: BigInt(event.creatorUnitKobo),
      heldUntil,
      clickedAt: new Date(event.ts),
    })
    .returning({ id: clicks.id })

  if (!click) throw new Error('INSERT_FAILED')

  // Resolve campaign + creator from the link's quest
  const [questRow] = await db
    .select({
      creatorId: referralLinks.questId, // join through quest
      campaignId: campaigns.id,
      advertiserId: campaigns.advertiserId,
    })
    .from(referralLinks)
    .innerJoin(
      campaigns,
      // referralLinks → quests → campaigns — done via quests join
      // We have campaignId in the ClickEvent, use it directly
      eq(campaigns.id, event.campaignId),
    )
    .where(eq(referralLinks.id, event.linkId))
    .limit(1)

  // Post ledger entry (non-fatal if it fails — click is still recorded)
  try {
    if (questRow) {
      const tx = buildClickPayout({
        advertiserId: event.advertiserId,
        creatorId: event.creatorId,
        unitPriceKobo: BigInt(event.unitPriceKobo),
        refId: click.id,
      })
      await postTransaction(db, tx)
    }
  } catch (err) {
    // Log but don't fail the ingest
    console.error('Ledger postTransaction failed for click', click.id, err)
  }

  return { valid: true, clickId: click.id }
}

async function insertRejected(
  event: ClickEvent,
  reason: string,
  linkId: string | null,
): Promise<IngestResult> {
  const effectiveLinkId = linkId ?? event.linkId

  const [click] = await db
    .insert(clicks)
    .values({
      linkId: effectiveLinkId,
      status: 'rejected',
      ip: event.ip ?? undefined,
      userAgent: event.userAgent ?? undefined,
      asn: event.asn ?? undefined,
      countryCode: event.country ?? undefined,
      botScore: event.botScore ?? undefined,
      pmVid: event.pmVid ?? undefined,
      unitPriceKobo: BigInt(event.unitPriceKobo),
      creatorUnitKobo: BigInt(event.creatorUnitKobo),
      rejectedAt: new Date(),
      rejectionReason: reason,
      clickedAt: new Date(event.ts),
    })
    .returning({ id: clicks.id })

  return { valid: false, reason, clickId: click?.id ?? 'unknown' }
}
