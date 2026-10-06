import { z } from 'zod'
import { PLATFORMS, type Platform } from './campaigns.ts'

export const ClaimQuestSchema = z.object({
  platforms: z.array(z.enum(PLATFORMS)).min(1).max(6),
})

export type ClaimQuest = z.infer<typeof ClaimQuestSchema>

export interface ReferralLinkKit {
  linkId: string
  platform: Platform
  code: string
  url: string
  caption: string
}

export interface ClaimResponse {
  questId: string
  campaignId: string
  links: ReferralLinkKit[]
}

export interface QuestFeedItem {
  campaignId: string
  name: string
  description: string | null
  type: 'cpc' | 'cpa'
  unitPriceKobo: number
  creatorUnitKobo: number
  platforms: string[]
  targetStates: string[] | null
  targetNiches: string[] | null
  alreadyClaimed: boolean
}

export interface QuestWithLinks {
  questId: string
  campaignId: string
  campaignName: string
  type: 'cpc' | 'cpa'
  status: string
  links: ReferralLinkKit[]
  claimedAt: string
}
