export interface Env {
  LINKS: KVNamespace
  CLICK_QUEUE: Queue<ClickQueueMessage>
}

export interface LinkKVValue {
  linkId: string
  questId: string
  campaignId: string
  advertiserId: string
  creatorId: string
  targetUrl: string
  unitPriceKobo: number
  creatorUnitKobo: number
  platform: string
  status: 'active' | 'paused' | 'exhausted' | 'expired'
}

export interface ClickQueueMessage {
  linkId: string
  code: string
  campaignId: string
  advertiserId: string
  creatorId: string
  platform: string
  unitPriceKobo: number
  creatorUnitKobo: number
  ip: string | null
  userAgent: string | null
  asn: string | null
  country: string | null
  botScore: number | null
  pmVid: string | null
  referrer: string | null
  ts: string
}
