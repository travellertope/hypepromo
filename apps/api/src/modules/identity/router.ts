import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireCreator, requireAdvertiser } from '../../plugins/require-role.ts'
import {
  upsertCreatorProfile,
  getCreatorProfile,
  upsertAdvertiserProfile,
  getAdvertiserProfile,
} from './service.ts'

const UpsertCreatorSchema = z.object({
  handle: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/, 'handle must be 3-20 alphanumeric/underscore chars'),
  bio: z.string().max(500).optional(),
  state: z.string().max(50).optional(),
  niches: z.array(z.string().max(30)).max(5).optional(),
})

const UpsertAdvertiserSchema = z.object({
  orgName: z.string().min(1).max(120),
  website: z.string().url().optional(),
  industry: z.string().max(80).optional(),
  vatNumber: z.string().max(30).optional(),
  billingEmail: z.string().email().optional(),
})

export default async function identityRoutes(app: FastifyInstance) {
  // Creator profile
  app.post('/me/creator-profile', { preHandler: requireCreator }, async (req, rep) => {
    const body = UpsertCreatorSchema.safeParse(req.body)
    if (!body.success) return rep.status(400).send({ error: body.error.flatten() })

    try {
      const profile = await upsertCreatorProfile({ creatorId: req.authUser.id, ...body.data })
      return rep.status(200).send(profile)
    } catch (err: any) {
      if (err.message === 'HANDLE_TAKEN') return rep.status(409).send({ error: 'Handle already taken' })
      throw err
    }
  })

  app.get('/me/creator-profile', { preHandler: requireCreator }, async (req, rep) => {
    const profile = await getCreatorProfile(req.authUser.id)
    if (!profile) return rep.status(404).send({ error: 'Profile not found' })
    return rep.send(profile)
  })

  // Advertiser profile
  app.post('/me/advertiser-profile', { preHandler: requireAdvertiser }, async (req, rep) => {
    const body = UpsertAdvertiserSchema.safeParse(req.body)
    if (!body.success) return rep.status(400).send({ error: body.error.flatten() })

    const profile = await upsertAdvertiserProfile({ advertiserId: req.authUser.id, ...body.data })
    return rep.status(200).send(profile)
  })

  app.get('/me/advertiser-profile', { preHandler: requireAdvertiser }, async (req, rep) => {
    const profile = await getAdvertiserProfile(req.authUser.id)
    if (!profile) return rep.status(404).send({ error: 'Profile not found' })
    return rep.send(profile)
  })
}
