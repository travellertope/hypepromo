import type { FastifyInstance } from 'fastify'
import { eq, desc } from 'drizzle-orm'
import { db } from '@promoet/db/client'
import { creatorSocials, creators } from '@promoet/db/schema'
import { requireAdmin } from '../../plugins/require-role.ts'

export default async function adminSocialsRoutes(app: FastifyInstance) {
  // List all pending verification requests
  app.get('/admin/socials', { preHandler: requireAdmin }, async (_req, rep) => {
    const rows = await db
      .select({
        id: creatorSocials.id,
        creatorId: creatorSocials.creatorId,
        handle: creators.handle,
        platform: creatorSocials.platform,
        socialHandle: creatorSocials.handle,
        followerCount: creatorSocials.followerCount,
        screenshotUrl: creatorSocials.screenshotUrl,
        verificationStatus: creatorSocials.verificationStatus,
        rejectionReason: creatorSocials.rejectionReason,
        verifiedAt: creatorSocials.verifiedAt,
        createdAt: creatorSocials.createdAt,
        updatedAt: creatorSocials.updatedAt,
      })
      .from(creatorSocials)
      .innerJoin(creators, eq(creators.id, creatorSocials.creatorId))
      .orderBy(desc(creatorSocials.updatedAt))
      .limit(200)

    return rep.send({ items: rows })
  })

  // Approve: mark as verified
  app.post('/admin/socials/:id/verify', { preHandler: requireAdmin }, async (req, rep) => {
    const { id } = req.params as { id: string }

    const [row] = await db
      .select({ id: creatorSocials.id, verificationStatus: creatorSocials.verificationStatus })
      .from(creatorSocials)
      .where(eq(creatorSocials.id, id))
      .limit(1)

    if (!row) return rep.status(404).send({ error: 'Social not found' })

    const [updated] = await db
      .update(creatorSocials)
      .set({
        verificationStatus: 'verified',
        verifiedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(creatorSocials.id, id))
      .returning()

    return rep.send(updated)
  })

  // Reject: mark as rejected with reason
  app.post('/admin/socials/:id/reject', { preHandler: requireAdmin }, async (req, rep) => {
    const { id } = req.params as { id: string }
    const body = req.body as { reason?: string }

    const [row] = await db
      .select({ id: creatorSocials.id })
      .from(creatorSocials)
      .where(eq(creatorSocials.id, id))
      .limit(1)

    if (!row) return rep.status(404).send({ error: 'Social not found' })

    const [updated] = await db
      .update(creatorSocials)
      .set({
        verificationStatus: 'rejected',
        rejectionReason: body.reason ?? 'Does not meet requirements',
        verifiedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(creatorSocials.id, id))
      .returning()

    return rep.send(updated)
  })
}
