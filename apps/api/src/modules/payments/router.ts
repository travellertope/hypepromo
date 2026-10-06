import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdvertiser } from '../../plugins/require-role.ts'
import { initiateTopup, verifyPaystackSignature, handlePaystackWebhook } from './service.ts'
import { MIN_TOPUP_KOBO } from '@promoet/config'

const TopupSchema = z.object({
  amountKobo: z.number().int().min(MIN_TOPUP_KOBO, `Minimum topup is ₦${MIN_TOPUP_KOBO / 100}`),
})

export default fp(async function paymentsRoutes(app: FastifyInstance) {
  app.post('/me/topup', { preHandler: requireAdvertiser }, async (req, rep) => {
    const body = TopupSchema.safeParse(req.body)
    if (!body.success) return rep.status(400).send({ error: body.error.flatten() })

    try {
      const result = await initiateTopup(req.authUser.id, BigInt(body.data.amountKobo))
      return rep.status(201).send(result)
    } catch (err: any) {
      if (err.message === 'ADVERTISER_NOT_FOUND') return rep.status(404).send({ error: 'Advertiser not found' })
      throw err
    }
  })

  // Paystack webhook — must read raw body for HMAC verification
  app.post(
    '/webhooks/paystack',
    {
      config: { rawBody: true },
    },
    async (req, rep) => {
      const sig = req.headers['x-paystack-signature'] as string | undefined
      if (!sig) return rep.status(400).send({ error: 'Missing signature' })

      const raw = (req as any).rawBody as Buffer | undefined
      if (!raw) return rep.status(400).send({ error: 'No raw body' })

      if (!verifyPaystackSignature(raw, sig)) {
        return rep.status(401).send({ error: 'Invalid signature' })
      }

      const payload = req.body as { event: string; data: Record<string, unknown> }
      await handlePaystackWebhook(payload.event, payload.data)

      return rep.status(200).send({ ok: true })
    },
  )
})
