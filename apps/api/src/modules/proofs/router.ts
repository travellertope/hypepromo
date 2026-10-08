import type { FastifyInstance } from 'fastify'
import { eq, desc } from 'drizzle-orm'
import { db } from '@promoet/db/client'
import { postProofs, quests, campaigns, creators } from '@promoet/db/schema'
import { requireCreator, requireAdmin } from '../../plugins/require-role.ts'
import { awardXp } from '../xp/service.ts'

export default async function proofsRoutes(app: FastifyInstance) {
  // POST /v1/quests/:questId/proof — creator submits post proof
  app.post(
    '/quests/:questId/proof',
    { preHandler: requireCreator },
    async (req, rep) => {
      const { questId } = req.params as { questId: string }
      const { platform, postUrl, screenshotUrl } = req.body as {
        platform: string
        postUrl: string
        screenshotUrl?: string
      }

      const creatorId = req.authUser.id

      if (!postUrl) return rep.badRequest('postUrl required')

      const [proof] = await db
        .insert(postProofs)
        .values({ questId, creatorId, platform, postUrl, screenshotUrl })
        .returning()

      return rep.status(201).send(proof)
    },
  )

  // GET /v1/me/proofs — creator's proof submissions
  app.get('/me/proofs', { preHandler: requireCreator }, async (req, rep) => {
    const rows = await db
      .select({
        id: postProofs.id,
        questId: postProofs.questId,
        platform: postProofs.platform,
        postUrl: postProofs.postUrl,
        status: postProofs.status,
        xpAwarded: postProofs.xpAwarded,
        createdAt: postProofs.createdAt,
      })
      .from(postProofs)
      .where(eq(postProofs.creatorId, req.authUser.id))
      .orderBy(desc(postProofs.createdAt))
      .limit(50)

    return rep.send({ items: rows })
  })

  // GET /v1/admin/proofs — pending proof review queue
  app.get('/admin/proofs', { preHandler: requireAdmin }, async (_req, rep) => {
    const rows = await db
      .select({
        id: postProofs.id,
        questId: postProofs.questId,
        creatorId: postProofs.creatorId,
        platform: postProofs.platform,
        postUrl: postProofs.postUrl,
        screenshotUrl: postProofs.screenshotUrl,
        createdAt: postProofs.createdAt,
        handle: creators.handle,
        campaignName: campaigns.name,
      })
      .from(postProofs)
      .innerJoin(creators, eq(creators.id, postProofs.creatorId))
      .innerJoin(quests, eq(quests.id, postProofs.questId))
      .innerJoin(campaigns, eq(campaigns.id, quests.campaignId))
      .where(eq(postProofs.status, 'pending_review'))
      .orderBy(postProofs.createdAt)
      .limit(100)

    return rep.send({ items: rows })
  })

  // POST /v1/admin/proofs/:id/approve
  app.post(
    '/admin/proofs/:id/approve',
    { preHandler: requireAdmin },
    async (req, rep) => {
      const { id } = req.params as { id: string }

      const [proof] = await db
        .update(postProofs)
        .set({
          status: 'approved',
          reviewedBy: req.authUser.id,
          reviewedAt: new Date(),
          xpAwarded: 25,
          updatedAt: new Date(),
        })
        .where(eq(postProofs.id, id))
        .returning()

      if (!proof) return rep.notFound('proof not found')

      // Award XP non-fatally
      awardXp(proof.creatorId, 'post_proof_approved', 25, id).catch(() => {})

      return rep.send(proof)
    },
  )

  // POST /v1/admin/proofs/:id/reject
  app.post(
    '/admin/proofs/:id/reject',
    { preHandler: requireAdmin },
    async (req, rep) => {
      const { id } = req.params as { id: string }
      const { reason } = req.body as { reason?: string }

      const [proof] = await db
        .update(postProofs)
        .set({
          status: 'rejected',
          rejectionReason: reason ?? 'Does not meet requirements',
          reviewedBy: req.authUser.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(postProofs.id, id))
        .returning()

      if (!proof) return rep.notFound('proof not found')

      return rep.send(proof)
    },
  )
}
