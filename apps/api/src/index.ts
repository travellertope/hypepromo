import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import sensible from '@fastify/sensible'
import authPlugin from './plugins/auth.ts'
import { healthRoutes } from './routes/health.ts'
import campaignRoutes from './modules/campaigns/router.ts'
import questRoutes from './modules/quests/router.ts'
import clickRoutes from './modules/clicks/router.ts'
import identityRoutes from './modules/identity/router.ts'
import socialsRoutes from './modules/identity/socials.ts'
import walletRoutes from './modules/wallet/router.ts'
import paymentsRoutes from './modules/payments/router.ts'
import internalRoutes from './modules/internal/router.ts'
import adminWithdrawalRoutes from './modules/admin/withdrawals.ts'
import adminFraudRoutes from './modules/admin/fraud.ts'

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
await app.register(campaignRoutes, { prefix: '/v1' })
await app.register(questRoutes, { prefix: '/v1' })
await app.register(clickRoutes, { prefix: '/v1' })
await app.register(identityRoutes, { prefix: '/v1' })
await app.register(socialsRoutes, { prefix: '/v1' })
await app.register(walletRoutes, { prefix: '/v1' })
await app.register(paymentsRoutes, { prefix: '/v1' })
await app.register(internalRoutes, { prefix: '/v1' })
await app.register(adminWithdrawalRoutes, { prefix: '/v1' })
await app.register(adminFraudRoutes, { prefix: '/v1' })

const port = Number(process.env['PORT'] ?? 3001)
const host = process.env['HOST'] ?? '0.0.0.0'

try {
  await app.listen({ port, host })
  app.log.info(`API listening on ${host}:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
