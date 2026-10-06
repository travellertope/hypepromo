import { z } from 'zod'

export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type Pagination = z.infer<typeof PaginationSchema>

export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url')
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8')
    const idx = raw.lastIndexOf('|')
    if (idx === -1) return null
    return {
      createdAt: new Date(raw.slice(0, idx)),
      id: raw.slice(idx + 1),
    }
  } catch {
    return null
  }
}
