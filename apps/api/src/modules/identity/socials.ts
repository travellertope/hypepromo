import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '@promoet/db/client'
import { creatorSocials } from '@promoet/db/schema'
import { requireCreator } from '../../plugins/require-role.ts'

const PLATFORMS = ['whatsapp_status', 'x', 'facebook', 'instagram_story', 'instagram_bio', 'telegram'] as const

const UpsertSocialSchema = z.object({
  platform: z.enum(PLATFORMS),
  handle: z.string().min(1).max(100),
  followerCount: z.number().int().nonnegative().optional(),
})

export default fp(async function socialsRoutes(app: FastifyInstance) {
  app.get('/me/socials', { preHandler: requireCreator }, async (req, rep) => {
    const rows = await db
      .select()
      .from(creatorSocials)
      .where(eq(creatorSocials.creatorId, req.authUser.id))

    return rep.send({ items: rows })
  })

  app.put('/me/socials/:platform', { preHandler: requireCreator }, async (req, rep) => {
    const params = req.params as { platform: string }
    const body = UpsertSocialSchema.safeParse({ ...req.body as object, platform: params.platform })
    if (!body.success) return rep.status(400).send({ error: body.error.flatten() })

    const [row] = await db
      .insert(creatorSocials)
      .values({
        creatorId: req.authUser.id,
        platform: body.data.platform,
        handle: body.data.handle,
        followerCount: body.data.followerCount,
      })
      .onConflictDoUpdate({
        target: [creatorSocials.creatorId, creatorSocials.platform],
        set: {
          handle: body.data.handle,
          followerCount: body.data.followerCount,
          updatedAt: new Date(),
        },
      })
      .returning()

    return rep.send(row)
  })

  app.delete('/me/socials/:platform', { preHandler: requireCreator }, async (req, rep) => {
    const { platform } = req.params as { platform: string }
    if (!PLATFORMS.includes(platform as any)) {
      return rep.status(400).send({ error: 'Unknown platform' })
    }

    await db
      .delete(creatorSocials)
      .where(
        and(
          eq(creatorSocials.creatorId, req.authUser.id),
          eq(creatorSocials.platform, platform as typeof PLATFORMS[number]),
        ),
      )

    return rep.status(204).send()
  })
})
