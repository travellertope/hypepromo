import { eq, and, desc } from 'drizzle-orm'
import { db } from '@promoet/db/client'
import { campaigns, creators, quests, referralLinks } from '@promoet/db/schema'
import type { Platform, ClaimResponse, QuestWithLinks } from '@promoet/schemas'
import { generateCode } from './code.ts'
import { kvPut } from '../../lib/cloudflare.ts'

const REDIRECT_BASE = process.env['REDIRECT_BASE_URL'] ?? 'https://promoet.com'

const CAPTIONS: Record<Platform, (name: string, url: string) => string> = {
  whatsapp_status: (n, u) => `[AD] ${n}\n\nCheck it out 👉 ${u}\n\n#ad`,
  x: (n, u) => `[AD] ${n}\n\n${u} #ad #sponsored`,
  facebook: (n, u) => `[AD] ${n}\n\n${u}\n\n#ad #sponsored`,
  instagram_story: (n, u) => `[AD] ${n} — Tap the link 👆\n\n${u} #ad`,
  instagram_bio: (n, u) => `[AD] ${n} — Link in bio:\n${u} #ad`,
  telegram: (n, u) => `[AD] ${n}\n\n${u} #ad`,
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode()
    const [existing] = await db
      .select({ id: referralLinks.id })
      .from(referralLinks)
      .where(eq(referralLinks.code, code))
      .limit(1)
    if (!existing) return code
  }
  throw new Error('CODE_GEN_FAILED')
}

export async function claimQuest(
  creatorId: string,
  campaignId: string,
  platforms: Platform[],
): Promise<ClaimResponse> {
  // Verify creator profile + energy
  const [creator] = await db
    .select({
      id: creators.id,
      energyMax: creators.energyMax,
      energyUsed: creators.energyUsed,
      energyResetAt: creators.energyResetAt,
    })
    .from(creators)
    .where(eq(creators.id, creatorId))
    .limit(1)

  if (!creator) throw new Error('CREATOR_NOT_FOUND')

  // Reset energy if 24h has passed
  const now = new Date()
  if (creator.energyResetAt && now >= creator.energyResetAt) {
    await db
      .update(creators)
      .set({
        energyUsed: 0,
        energyResetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        updatedAt: now,
      })
      .where(eq(creators.id, creatorId))
    creator.energyUsed = 0
  }

  if (creator.energyUsed >= creator.energyMax) throw new Error('OUT_OF_ENERGY')

  // Verify campaign is live
  const [campaign] = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      type: campaigns.type,
      status: campaigns.status,
      targetUrl: campaigns.targetUrl,
      advertiserId: campaigns.advertiserId,
      unitPriceKobo: campaigns.unitPriceKobo,
      creatorUnitKobo: campaigns.creatorUnitKobo,
      platforms: campaigns.platforms,
    })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1)

  if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND')
  if (campaign.status !== 'live') throw new Error('CAMPAIGN_NOT_LIVE')

  // Validate all requested platforms exist in campaign
  const validPlatforms = platforms.filter((p) => campaign.platforms.includes(p))
  if (validPlatforms.length === 0) throw new Error('NO_VALID_PLATFORMS')

  // Check for existing quest (idempotent re-claim returns existing links)
  const [existingQuest] = await db
    .select({ id: quests.id })
    .from(quests)
    .where(and(eq(quests.campaignId, campaignId), eq(quests.creatorId, creatorId)))
    .limit(1)

  if (existingQuest) {
    return getQuestLinks(existingQuest.id, campaignId)
  }

  // Create quest + links in a transaction
  const result = await db.transaction(async (tx) => {
    const [quest] = await tx
      .insert(quests)
      .values({ campaignId, creatorId })
      .returning({ id: quests.id })
    if (!quest) throw new Error('INSERT_FAILED')

    const links = await Promise.all(
      validPlatforms.map(async (platform) => {
        const code = await generateUniqueCode()
        const [link] = await tx
          .insert(referralLinks)
          .values({ questId: quest.id, platform, code })
          .returning({ id: referralLinks.id, code: referralLinks.code })
        if (!link) throw new Error('INSERT_FAILED')
        return { linkId: link.id, platform, code }
      }),
    )

    // Consume 1 energy
    await tx
      .update(creators)
      .set({
        energyUsed: creator.energyUsed + 1,
        energyResetAt:
          creator.energyResetAt ??
          new Date(now.getTime() + 24 * 60 * 60 * 1000),
        updatedAt: now,
      })
      .where(eq(creators.id, creatorId))

    return { questId: quest.id, links }
  })

  // Write each link to Cloudflare KV (non-critical, fire-and-forget)
  result.links.forEach(({ linkId, platform, code }) => {
    kvPut(code, {
      linkId,
      questId: result.questId,
      campaignId,
      advertiserId: campaign.advertiserId,
      creatorId,
      targetUrl: campaign.targetUrl,
      unitPriceKobo: Number(campaign.unitPriceKobo),
      creatorUnitKobo: Number(campaign.creatorUnitKobo),
      platform,
      status: 'active',
    }).catch(() => {/* KV write failure is non-fatal */})
  })

  // Award XP for claiming (non-fatal)
  import('../xp/service.ts').then(({ awardXp }) =>
    awardXp(creatorId, 'quest_claim', 10, result.questId)
  ).catch((err) => {
    console.error('XP award failed for quest claim', result.questId, err)
  })

  return {
    questId: result.questId,
    campaignId,
    links: result.links.map(({ linkId, platform, code }) => {
      const url = `${REDIRECT_BASE}/r/${code}`
      return {
        linkId,
        platform,
        code,
        url,
        caption: CAPTIONS[platform](campaign.name, url),
      }
    }),
  }
}

async function getQuestLinks(questId: string, campaignId: string): Promise<ClaimResponse> {
  const rows = await db
    .select({
      id: referralLinks.id,
      platform: referralLinks.platform,
      code: referralLinks.code,
      campaignName: campaigns.name,
      targetUrl: campaigns.targetUrl,
    })
    .from(referralLinks)
    .innerJoin(quests, eq(quests.id, referralLinks.questId))
    .innerJoin(campaigns, eq(campaigns.id, quests.campaignId))
    .where(eq(referralLinks.questId, questId))

  return {
    questId,
    campaignId,
    links: rows.map((r) => {
      const url = `${REDIRECT_BASE}/r/${r.code}`
      return {
        linkId: r.id,
        platform: r.platform as Platform,
        code: r.code,
        url,
        caption: CAPTIONS[r.platform as Platform](r.campaignName, url),
      }
    }),
  }
}

export async function listMyQuests(creatorId: string): Promise<QuestWithLinks[]> {
  const rows = await db
    .select({
      questId: quests.id,
      campaignId: quests.campaignId,
      questStatus: quests.status,
      claimedAt: quests.claimedAt,
      campaignName: campaigns.name,
      campaignType: campaigns.type,
      linkId: referralLinks.id,
      platform: referralLinks.platform,
      code: referralLinks.code,
    })
    .from(quests)
    .innerJoin(campaigns, eq(campaigns.id, quests.campaignId))
    .leftJoin(referralLinks, eq(referralLinks.questId, quests.id))
    .where(eq(quests.creatorId, creatorId))
    .orderBy(desc(quests.claimedAt))

  // Group by quest
  const map = new Map<string, QuestWithLinks>()
  for (const r of rows) {
    let entry = map.get(r.questId)
    if (!entry) {
      entry = {
        questId: r.questId,
        campaignId: r.campaignId,
        campaignName: r.campaignName,
        type: r.campaignType,
        status: r.questStatus,
        links: [],
        claimedAt: r.claimedAt instanceof Date ? r.claimedAt.toISOString() : String(r.claimedAt),
      }
      map.set(r.questId, entry)
    }
    if (r.linkId && r.platform && r.code) {
      const url = `${REDIRECT_BASE}/r/${r.code}`
      entry.links.push({
        linkId: r.linkId,
        platform: r.platform as Platform,
        code: r.code,
        url,
        caption: CAPTIONS[r.platform as Platform](r.campaignName, url),
      })
    }
  }

  return [...map.values()]
}
