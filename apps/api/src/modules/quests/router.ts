import type { FastifyPluginAsync } from 'fastify'
import { ClaimQuestSchema } from '@promoet/schemas'
import { requireCreator } from '../../plugins/require-role.ts'
import * as svc from './service.ts'

const questRoutes: FastifyPluginAsync = async (app) => {
  // Claim a quest (idempotent — calling twice returns the same links)
  app.post<{ Params: { campaignId: string } }>(
    '/quests/:campaignId/claim',
    { preHandler: requireCreator },
    async (request, reply) => {
      const { platforms } = ClaimQuestSchema.parse(request.body)
      try {
        const result = await svc.claimQuest(
          request.authUser.id,
          request.params.campaignId,
          platforms,
        )
        return reply.status(201).send({ data: result })
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'CREATOR_NOT_FOUND') return reply.status(403).send({ error: 'Creator profile not found' })
        if (msg === 'OUT_OF_ENERGY') return reply.status(429).send({ error: 'Out of energy. Come back tomorrow.' })
        if (msg === 'CAMPAIGN_NOT_FOUND') return reply.status(404).send({ error: 'Campaign not found' })
        if (msg === 'CAMPAIGN_NOT_LIVE') return reply.status(409).send({ error: 'Campaign is not live' })
        if (msg === 'NO_VALID_PLATFORMS') return reply.status(400).send({ error: 'No valid platforms for this campaign' })
        throw err
      }
    },
  )

  // List my active quests + links
  app.get(
    '/me/quests',
    { preHandler: requireCreator },
    async (request, reply) => {
      const quests = await svc.listMyQuests(request.authUser.id)
      return reply.send({ data: quests })
    },
  )
}

export default questRoutes
