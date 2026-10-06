import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { db } from '@promoet/db/client'
import { users } from '@promoet/db/schema'
import { eq } from 'drizzle-orm'

// Shape of the Supabase JWT payload we care about
interface SupabaseJwtPayload {
  sub: string       // user UUID
  phone?: string
  email?: string
  iat: number
  exp: number
}

// What we attach to every authenticated request
export interface AuthUser {
  id: string
  role: 'creator' | 'advertiser' | 'admin'
  kycStatus: string
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthUser
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  const secret = process.env['JWT_SECRET']
  if (!secret) throw new Error('JWT_SECRET is not set')

  await app.register(jwt, {
    secret,
    verify: { algorithms: ['HS256'] },
  })

  // Decorator: verify JWT and load user from DB
  app.decorate('authenticate', async (request: FastifyRequest) => {
    const payload = await request.jwtVerify<SupabaseJwtPayload>()

    const [user] = await db
      .select({ id: users.id, role: users.role, kycStatus: users.kycStatus })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1)

    if (!user) {
      throw app.httpErrors.unauthorized('User not found')
    }

    request.authUser = user
  })
}

export default fp(authPlugin, { name: 'auth' })
