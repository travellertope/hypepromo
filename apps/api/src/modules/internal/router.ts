import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { releaseHeldClicks } from './service.ts'

export default fp(async function internalRoutes(app: FastifyInstance) {
  // All internal routes require the shared secret header
  app.addHook('preHandler', async (req, rep) => {
    if (!req.url.startsWith('/v1/internal/')) return
    const key = req.headers['x-internal-key']
    if (key !== process.env['INTERNAL_API_KEY']) {
      return rep.status(401).send({ error: 'Unauthorized' })
    }
  })

  app.post('/internal/release-holds', async (_req, rep) => {
    const result = await releaseHeldClicks()
    return rep.send(result)
  })
})
