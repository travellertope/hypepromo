import type { FastifyInstance } from 'fastify'
import { releaseHeldClicks } from './service.ts'

export default async function internalRoutes(app: FastifyInstance) {
  // This hook is scoped to this plugin, so it guards exactly these routes —
  // it must not be made conditional on req.url, which silently disables it if
  // the mount path ever changes.
  app.addHook('preHandler', async (req, rep) => {
    const expected = process.env['INTERNAL_API_KEY']
    if (!expected) return rep.status(503).send({ error: 'Internal API not configured' })
    if (req.headers['x-internal-key'] !== expected) {
      return rep.status(401).send({ error: 'Unauthorized' })
    }
  })

  app.post('/internal/release-holds', async (_req, rep) => {
    const result = await releaseHeldClicks()
    return rep.send(result)
  })
}
