import { z } from 'zod'

// Shape of the event the redirect worker enqueues to Cloudflare Queue
export const ClickEventSchema = z.object({
  linkId: z.string().uuid(),
  code: z.string().length(8),
  campaignId: z.string().uuid(),
  advertiserId: z.string().uuid(),
  creatorId: z.string().uuid(),
  platform: z.string(),
  unitPriceKobo: z.number().int().positive(),
  creatorUnitKobo: z.number().int().positive(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  asn: z.string().nullable(),
  country: z.string().nullable(),
  botScore: z.number().int().min(0).max(100).nullable(),
  pmVid: z.string().nullable(),
  referrer: z.string().nullable(),
  ts: z.string().datetime(),
})

export type ClickEvent = z.infer<typeof ClickEventSchema>

// Shape of the request the CF Queue consumer sends to the Fastify API
export const IngestClickSchema = ClickEventSchema

export type IngestClick = ClickEvent
