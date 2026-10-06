import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { eq, desc } from 'drizzle-orm'
import { db } from '@promoet/db/client'
import { clicks, referralLinks, quests, campaigns } from '@promoet/db/schema'
import { requireAdmin } from '../../plugins/require-role.ts'

export default fp(async function adminFraudRoutes(app: FastifyInstance) {
  // List recent rejected/fraud clicks
  app.get('/admin/clicks/fraud', { preHandler: requireAdmin }, async (req, rep) => {
    const q = req.query as Record<string, string>
    const limit = Math.min(Number(q['limit'] ?? 50), 200)

    const rows = await db
      .select({
        id: clicks.id,
        status: clicks.status,
        rejectionReason: clicks.rejectionReason,
        ip: clicks.ip,
        botScore: clicks.botScore,
        countryCode: clicks.countryCode,
        clickedAt: clicks.clickedAt,
        platform: referralLinks.platform,
        campaignId: campaigns.id,
        campaignName: campaigns.name,
      })
      .from(clicks)
      .innerJoin(referralLinks, eq(referralLinks.id, clicks.linkId))
      .innerJoin(quests, eq(quests.id, referralLinks.questId))
      .innerJoin(campaigns, eq(campaigns.id, quests.campaignId))
      .where(eq(clicks.status, 'rejected'))
      .orderBy(desc(clicks.clickedAt))
      .limit(limit)

    return rep.send({ items: rows })
  })
})
