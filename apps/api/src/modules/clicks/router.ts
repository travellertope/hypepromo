import type { FastifyPluginAsync } from 'fastify'
import { IngestClickSchema } from '@promoet/schemas'
import { ingestClick } from './service.ts'

const clickRoutes: FastifyPluginAsync = async (app) => {
  // Called by the Cloudflare Queue consumer worker.
  // Protected by INTERNAL_API_KEY header (pre-shared secret).
  app.post('/internal/clicks', async (request, reply) => {
    const expected = process.env['INTERNAL_API_KEY']
    if (expected) {
      const provided = request.headers['x-internal-key']
      if (provided !== expected) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }
    }

    const event = IngestClickSchema.parse(request.body)
    const result = await ingestClick(event)
    return reply.send(result)
  })
}

export default clickRoutes
