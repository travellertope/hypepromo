import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  CreateCampaignSchema,
  UpdateCampaignSchema,
  RejectCampaignSchema,
  QuestFeedParamsSchema,
} from '@promoet/schemas'
import { requireAdvertiser, requireAdmin } from '../../plugins/require-role.ts'
import * as svc from './service.ts'

const campaignRoutes: FastifyPluginAsync = async (app) => {
  // ── Public quest feed ────────────────────────────────────────────────────
  app.get('/quests', async (request, reply) => {
    const params = QuestFeedParamsSchema.parse(request.query)
    const { items, nextCursor } = await svc.listLiveCampaigns(params)
    return reply.send({ data: items, nextCursor })
  })

  app.get<{ Params: { campaignId: string } }>(
    '/quests/:campaignId',
    async (request, reply) => {
      const { campaignId } = request.params
      // Reuse admin view since campaign ID is enough
      const rows = await svc.listLiveCampaigns(
        { cursor: undefined, limit: 1 },
        undefined,
      )
      const item = rows.items.find((c) => c.id === campaignId)
      if (!item) return reply.status(404).send({ error: 'Campaign not found' })
      return reply.send({ data: item })
    },
  )

  // ── Advertiser: CRUD ─────────────────────────────────────────────────────
  app.post(
    '/me/campaigns',
    { preHandler: requireAdvertiser },
    async (request, reply) => {
      const input = CreateCampaignSchema.parse(request.body)
      const campaign = await svc.createCampaign(request.authUser.id, input)
      return reply.status(201).send({ data: campaign })
    },
  )

  app.get(
    '/me/campaigns',
    { preHandler: requireAdvertiser },
    async (request, reply) => {
      const q = z
        .object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).default(20) })
        .parse(request.query)
      const { items, nextCursor } = await svc.listMyCampaigns(
        request.authUser.id,
        q.cursor,
        q.limit,
      )
      return reply.send({ data: items, nextCursor })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/me/campaigns/:id',
    { preHandler: requireAdvertiser },
    async (request, reply) => {
      const campaign = await svc.getMyCampaign(
        request.params.id,
        request.authUser.id,
      )
      if (!campaign) return reply.status(404).send({ error: 'Not found' })
      return reply.send({ data: campaign })
    },
  )

  app.patch<{ Params: { id: string } }>(
    '/me/campaigns/:id',
    { preHandler: requireAdvertiser },
    async (request, reply) => {
      const input = UpdateCampaignSchema.parse(request.body)
      try {
        const campaign = await svc.updateCampaign(
          request.params.id,
          request.authUser.id,
          input,
        )
        return reply.send({ data: campaign })
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'NOT_FOUND') return reply.status(404).send({ error: 'Not found' })
        if (msg === 'NOT_DRAFT') return reply.status(409).send({ error: 'Campaign is not in draft' })
        throw err
      }
    },
  )

  app.post<{ Params: { id: string } }>(
    '/me/campaigns/:id/submit',
    { preHandler: requireAdvertiser },
    async (request, reply) => {
      try {
        const campaign = await svc.submitCampaign(
          request.params.id,
          request.authUser.id,
        )
        return reply.send({ data: campaign })
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'NOT_FOUND') return reply.status(404).send({ error: 'Not found' })
        if (msg === 'NOT_DRAFT') return reply.status(409).send({ error: 'Campaign is not in draft' })
        throw err
      }
    },
  )

  app.post<{ Params: { id: string } }>(
    '/me/campaigns/:id/pause',
    { preHandler: requireAdvertiser },
    async (request, reply) => {
      try {
        const campaign = await svc.pauseCampaign(
          request.params.id,
          request.authUser.id,
        )
        return reply.send({ data: campaign })
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'NOT_FOUND') return reply.status(404).send({ error: 'Not found' })
        if (msg === 'NOT_LIVE') return reply.status(409).send({ error: 'Campaign is not live' })
        throw err
      }
    },
  )

  app.post<{ Params: { id: string } }>(
    '/me/campaigns/:id/resume',
    { preHandler: requireAdvertiser },
    async (request, reply) => {
      try {
        const campaign = await svc.resumeCampaign(
          request.params.id,
          request.authUser.id,
        )
        return reply.send({ data: campaign })
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'NOT_FOUND') return reply.status(404).send({ error: 'Not found' })
        if (msg === 'NOT_PAUSED') return reply.status(409).send({ error: 'Campaign is not paused' })
        throw err
      }
    },
  )

  // ── Admin: review queue ──────────────────────────────────────────────────
  app.get(
    '/admin/campaigns/review',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const q = z
        .object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).default(20) })
        .parse(request.query)
      const result = await svc.getAdminReviewQueue(q.cursor, q.limit)
      return reply.send(result)
    },
  )

  app.post<{ Params: { id: string } }>(
    '/admin/campaigns/:id/approve',
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const campaign = await svc.approveCampaign(request.params.id, request.authUser.id)
        return reply.send({ data: campaign })
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'NOT_FOUND') return reply.status(404).send({ error: 'Not found' })
        if (msg === 'NOT_PENDING') return reply.status(409).send({ error: 'Campaign is not pending review' })
        throw err
      }
    },
  )

  app.post<{ Params: { id: string } }>(
    '/admin/campaigns/:id/reject',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { reason } = RejectCampaignSchema.parse(request.body)
      try {
        const campaign = await svc.rejectCampaign(request.params.id, request.authUser.id, reason)
        return reply.send({ data: campaign })
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'NOT_FOUND') return reply.status(404).send({ error: 'Not found' })
        if (msg === 'NOT_PENDING') return reply.status(409).send({ error: 'Campaign is not pending review' })
        throw err
      }
    },
  )
}

export default fp(campaignRoutes, { name: 'campaign-routes' })
