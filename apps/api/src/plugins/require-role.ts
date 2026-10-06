import type { FastifyRequest, FastifyReply } from 'fastify'
import type { AuthUser } from './auth.ts'

type Role = AuthUser['role']

/**
 * Returns a Fastify preHandler that:
 * 1. Verifies the JWT (calls authenticate)
 * 2. Checks the user has one of the allowed roles
 */
export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    await (request.server as any).authenticate(request)

    if (!roles.includes(request.authUser.role)) {
      throw request.server.httpErrors.forbidden(
        `Requires role: ${roles.join(' or ')}`
      )
    }
  }
}

// Convenience shorthands
export const requireCreator = requireRole('creator')
export const requireAdvertiser = requireRole('advertiser')
export const requireAdmin = requireRole('admin')
export const requireAuth = requireRole('creator', 'advertiser', 'admin')
