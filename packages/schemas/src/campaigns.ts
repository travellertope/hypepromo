import { z } from 'zod'
import {
  MIN_CPC_KOBO,
  MIN_CPA_KOBO,
  MIN_BUDGET_CPC_KOBO,
  MIN_BUDGET_CPA_KOBO,
} from '@promoet/config'

export const PLATFORMS = [
  'whatsapp_status',
  'x',
  'facebook',
  'instagram_story',
  'instagram_bio',
  'telegram',
] as const
export type Platform = (typeof PLATFORMS)[number]

const baseCampaign = {
  name: z.string().min(3).max(80),
  description: z.string().max(1000).optional(),
  targetUrl: z.string().url(),
  platforms: z.array(z.enum(PLATFORMS)).min(1).max(6),
  targetStates: z.array(z.string().max(40)).max(37).optional(),
  targetNiches: z.array(z.string().max(30)).max(5).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
}

export const CreateCampaignSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('cpc'),
    unitPriceKobo: z.number().int().min(MIN_CPC_KOBO),
    budgetKobo: z.number().int().min(MIN_BUDGET_CPC_KOBO),
    ...baseCampaign,
  }),
  z.object({
    type: z.literal('cpa'),
    unitPriceKobo: z.number().int().min(MIN_CPA_KOBO),
    budgetKobo: z.number().int().min(MIN_BUDGET_CPA_KOBO),
    conversionEvent: z.string().min(1).max(50),
    cpaApprovalWindowDays: z.number().int().min(1).max(30).default(14),
    ...baseCampaign,
  }),
])

export type CreateCampaign = z.infer<typeof CreateCampaignSchema>

export const UpdateCampaignSchema = z.object({
  name: z.string().min(3).max(80).optional(),
  description: z.string().max(1000).nullish(),
  targetUrl: z.string().url().optional(),
  startsAt: z.string().datetime().nullish(),
  endsAt: z.string().datetime().nullish(),
})

export type UpdateCampaign = z.infer<typeof UpdateCampaignSchema>

export const RejectCampaignSchema = z.object({
  reason: z.string().min(10).max(500),
})

export const QuestFeedParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  type: z.enum(['cpc', 'cpa']).optional(),
  platform: z.enum(PLATFORMS).optional(),
})

export type QuestFeedParams = z.infer<typeof QuestFeedParamsSchema>

export type CampaignStatus =
  | 'draft'
  | 'pending_review'
  | 'rejected'
  | 'funded'
  | 'live'
  | 'paused'
  | 'exhausted'
  | 'closed'

export interface CampaignResponse {
  id: string
  advertiserId: string
  name: string
  description: string | null
  targetUrl: string
  type: 'cpc' | 'cpa'
  status: CampaignStatus
  unitPriceKobo: number
  creatorUnitKobo: number
  budgetKobo: number
  reservedKobo: number
  spentKobo: number
  platforms: string[]
  targetStates: string[] | null
  targetNiches: string[] | null
  conversionEvent: string | null
  cpaApprovalWindowDays: number | null
  rejectionReason: string | null
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  updatedAt: string
}
