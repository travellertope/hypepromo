import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import sensible from '@fastify/sensible'
import authPlugin from './plugins/auth.ts'
import { healthRoutes } from './routes/health.ts'

const isDev = process.env['NODE_ENV'] !== 'production'

const app = Fastify({
  logger: isDev
    ? { level: 'info', transport: { target: 'pino-pretty' } }
    : { level: 'warn' },
  trustProxy: true,
})

await app.register(helmet, { contentSecurityPolicy: !isDev })

await app.register(cors, {
  origin: isDev ? true : ['https://promoet.com', /\.promoet\.com$/],
  credentials: true,
})

await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })

await app.register(sensible)   // adds app.httpErrors.*
await app.register(authPlugin) // adds app.authenticate + request.authUser

// Routes
await app.register(healthRoutes, { prefix: '/health' })

const port = Number(process.env['PORT'] ?? 3001)
const host = process.env['HOST'] ?? '0.0.0.0'

try {
  await app.listen({ port, host })
  app.log.info(`API listening on ${host}:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
