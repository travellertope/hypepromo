import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose'
import { db } from '@promoet/db/client'
import { users } from '@promoet/db/schema'
import { eq } from 'drizzle-orm'

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

// Supabase signs JWTs with RS256 — verify using their public JWKS endpoint.
// The project ref is not a secret; the private key never leaves Supabase.
// Project ref is not sensitive — it's just the subdomain of the Supabase URL.
const supabaseProjectRef =
  process.env['SUPABASE_PROJECT_REF'] ??
  process.env['SUPABASE_URL']?.match(/https:\/\/([^.]+)/)?.[1] ??
  'zsbwmafckgqgjrsdnkkw' // fallback: this project's ref

const JWKS = createRemoteJWKSet(
  new URL(`https://${supabaseProjectRef}.supabase.co/auth/v1/.well-known/jwks.json`)
)

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorate('authenticate', async (request: FastifyRequest) => {
    const auth = request.headers['authorization']
    if (!auth?.startsWith('Bearer ')) {
      throw app.httpErrors.unauthorized('Missing or malformed authorization header')
    }
    const token = auth.slice(7)

    let sub: string
    try {
      const { payload } = await jwtVerify(token, JWKS)
      sub = payload.sub as string
      if (!sub) throw new Error('missing sub claim')
    } catch (err: any) {
      // Fall through to HS256 only if this is explicitly a symmetric-key project
      const secret = process.env['JWT_SECRET']
      if (!secret) throw app.httpErrors.unauthorized(`JWT verification failed: ${err.message}`)

      try {
        // HS256 fallback — used when Supabase project is configured for HS256
        const claims = decodeJwt(token)
        const key = new TextEncoder().encode(secret)
        const { createHmac } = await import('node:crypto')
        // Manually verify HS256: we re-use jose's decodeJwt for the payload
        // but sign-check via Node crypto to avoid importing extra packages
        const [rawHeader, rawPayload, rawSig] = token.split('.')
        const data = `${rawHeader}.${rawPayload}`
        const expected = createHmac('sha256', key).update(data).digest('base64url')
        if (expected !== rawSig) throw new Error('signature mismatch')
        sub = claims.sub as string
        if (!sub) throw new Error('missing sub claim')
      } catch (fallbackErr: any) {
        throw app.httpErrors.unauthorized(`JWT verification failed: ${fallbackErr.message}`)
      }
    }

    const [user] = await db
      .select({ id: users.id, role: users.role, kycStatus: users.kycStatus })
      .from(users)
      .where(eq(users.id, sub))
      .limit(1)

    if (!user) throw app.httpErrors.unauthorized('User not found')
    request.authUser = user
  })
}

export default fp(authPlugin, { name: 'auth' })
