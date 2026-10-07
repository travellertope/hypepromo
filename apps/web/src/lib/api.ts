import { createClient } from './supabase/client'

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

async function getToken(): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 12000,
): Promise<T> {
  const token = await getToken()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  }).finally(() => clearTimeout(timer))

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new ApiError(res.status, body.message ?? res.statusText)
  }

  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

// ── Auth / Profile ─────────────────────────────────────────────────────────────

export const api = {
  creator: {
    getProfile: () => apiFetch<CreatorProfile>('/v1/me/creator-profile'),
    upsertProfile: (body: Partial<CreatorProfile>) =>
      apiFetch<CreatorProfile>('/v1/me/creator-profile', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    getSocials: () => apiFetch<{ items: Social[] }>('/v1/me/socials'),
    upsertSocial: (platform: string, body: { handle: string; followerCount?: number }) =>
      apiFetch<Social>(`/v1/me/socials/${platform}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    deleteSocial: (platform: string) =>
      apiFetch<void>(`/v1/me/socials/${platform}`, { method: 'DELETE' }),
    getWallet: () => apiFetch<WalletResponse>('/v1/me/wallet'),
    getEarnings: (cursor?: string) =>
      apiFetch<PagedResponse<EarningRow>>(`/v1/me/earnings${cursor ? `?cursor=${cursor}` : ''}`),
    getBankAccount: () => apiFetch<BankAccount>('/v1/me/bank-account'),
    setBankAccount: (body: BankAccountInput) =>
      apiFetch<BankAccount>('/v1/me/bank-account', { method: 'POST', body: JSON.stringify(body) }),
    requestWithdrawal: (amountKobo: number) =>
      apiFetch('/v1/me/withdrawals', { method: 'POST', body: JSON.stringify({ amountKobo }) }),
    getWithdrawals: () => apiFetch<{ items: Withdrawal[] }>('/v1/me/withdrawals'),
    getProofs: () => apiFetch<{ items: ProofRow[] }>('/v1/me/proofs'),
    submitProof: (questId: string, body: { platform: string; postUrl: string; screenshotUrl?: string }) =>
      apiFetch('/v1/quests/' + questId + '/proof', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    getBadges: () => apiFetch<{ items: Badge[] }>('/v1/me/badges'),
  },
  quests: {
    list: (cursor?: string) =>
      apiFetch<PagedResponse<Quest>>(`/v1/quests${cursor ? `?cursor=${cursor}` : ''}`),
    get: (questId: string) => apiFetch<Quest>(`/v1/quests/${questId}`),
    claim: (questId: string) =>
      apiFetch<Quest>(`/v1/quests/${questId}/claim`, { method: 'POST' }),
  },
  advertiser: {
    getProfile: () => apiFetch<AdvertiserProfile>('/v1/me/advertiser-profile'),
    upsertProfile: (body: Partial<AdvertiserProfile>) =>
      apiFetch<AdvertiserProfile>('/v1/me/advertiser-profile', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    getStats: () => apiFetch<AdvertiserStats>('/v1/me/stats'),
    listCampaigns: (cursor?: string) =>
      apiFetch<PagedResponse<Campaign>>(`/v1/me/campaigns${cursor ? `?cursor=${cursor}` : ''}`),
    getCampaign: (id: string) => apiFetch<Campaign>(`/v1/me/campaigns/${id}`),
    createCampaign: (body: CreateCampaignInput) =>
      apiFetch<Campaign>('/v1/me/campaigns', { method: 'POST', body: JSON.stringify(body) }),
    updateCampaign: (id: string, body: Partial<CreateCampaignInput>) =>
      apiFetch<Campaign>(`/v1/me/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    submitCampaign: (id: string) =>
      apiFetch<Campaign>(`/v1/me/campaigns/${id}/submit`, { method: 'POST' }),
    goLive: (id: string) =>
      apiFetch<Campaign>(`/v1/me/campaigns/${id}/go-live`, { method: 'POST' }),
    initiateTopup: (netAmountKobo: number) =>
      apiFetch<TopupResponse>('/v1/me/topup', {
        method: 'POST',
        body: JSON.stringify({ netAmountKobo }),
      }),
  },
  leaderboard: {
    getActive: () => apiFetch<LeaderboardResponse>('/v1/leaderboards/active'),
    getByState: (state: string) =>
      apiFetch<LeaderboardResponse>(`/v1/leaderboards/state/${encodeURIComponent(state)}`),
  },
  admin: {
    getCampaigns: () => apiFetch<PagedResponse<Campaign>>('/v1/admin/campaigns'),
    approveCampaign: (id: string) =>
      apiFetch<Campaign>(`/v1/admin/campaigns/${id}/approve`, { method: 'POST' }),
    rejectCampaign: (id: string, reason: string) =>
      apiFetch<Campaign>(`/v1/admin/campaigns/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    getWithdrawals: () => apiFetch<{ items: AdminWithdrawal[] }>('/v1/admin/withdrawals'),
    approveWithdrawal: (id: string) =>
      apiFetch(`/v1/admin/withdrawals/${id}/approve`, { method: 'POST' }),
    rejectWithdrawal: (id: string, reason: string) =>
      apiFetch(`/v1/admin/withdrawals/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    getFraud: () => apiFetch<{ items: FraudClick[] }>('/v1/admin/clicks/fraud'),
    getProofs: () => apiFetch<{ items: AdminProof[] }>('/v1/admin/proofs'),
    approveProof: (id: string) =>
      apiFetch(`/v1/admin/proofs/${id}/approve`, { method: 'POST' }),
    rejectProof: (id: string, reason: string) =>
      apiFetch(`/v1/admin/proofs/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },
}

// ── Type definitions ───────────────────────────────────────────────────────────

export interface PagedResponse<T> {
  items: T[]
  nextCursor: string | null
}

export interface CreatorProfile {
  id: string
  handle: string
  bio?: string | null | undefined
  state?: string | null | undefined
  niches?: string[] | null | undefined
  tier: string
  xp: number
  level: number
  streakDays: number
  energyMax: number
  energyUsed: number
}

export interface AdvertiserProfile {
  id: string
  orgName: string
  website: string | null
  industry: string | null
}

export interface Social {
  id: string
  platform: string
  handle: string
  followerCount: number | null
  verifiedAt: string | null
}

export interface WalletResponse {
  pendingKobo: number
  availableKobo: number
  lifetimeEarningsKobo: number
}

export interface EarningRow {
  clickId: string
  amountKobo: number
  status: string
  platform: string
  campaignName: string
  clickedAt: string
}

export interface BankAccount {
  bankCode: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
}

export interface BankAccountInput {
  bankCode: string
  bankAccountNumber: string
}

export interface Withdrawal {
  id: string
  amountKobo: number
  feeKobo: number
  netKobo: number
  status: string
  createdAt: string
}

export interface Quest {
  id: string
  campaignId: string
  status: string
  claimedAt: string | null
  campaign: {
    name: string
    description: string | null
    type: string
    creatorUnitKobo: number
    platforms: string[]
  }
}

export interface Campaign {
  id: string
  name: string
  description: string | null
  targetUrl: string
  type: string
  status: string
  unitPriceKobo: number
  creatorUnitKobo: number
  budgetKobo: number
  spentKobo: number
  platforms: string[]
  targetStates: string[] | null
  rejectionReason: string | null
  startsAt: string | null
  endsAt: string | null
  createdAt: string
}

export interface CreateCampaignInput {
  name: string
  description?: string
  targetUrl: string
  type: 'cpa' | 'cpc'
  unitPriceKobo: number
  budgetKobo: number
  platforms: string[]
  targetStates?: string[]
  targetNiches?: string[]
}

export interface AdvertiserStats {
  totalClicks: number
  validClicks: number
  rejectedClicks: number
  validPct: number
  totalSpendKobo: number
}

export interface TopupResponse {
  reference: string
  authorizationUrl: string
  grossKobo: number
}

export interface LeaderboardEntry {
  rank: number
  handle: string
  tier: string
  level: number
  earningsKobo: number
  validClicks: number
  state: string | null
}

export interface LeaderboardResponse {
  season: { id: string; name: string; startsAt: string; endsAt: string } | null
  items: LeaderboardEntry[]
}

export interface AdminWithdrawal {
  id: string
  creatorId: string
  handle: string
  amountKobo: number
  netKobo: number
  bankAccountName: string | null
  bankCode: string | null
  bankAccountNumber: string | null
  createdAt: string
}

export interface FraudClick {
  id: string
  status: string
  rejectionReason: string | null
  ip: string | null
  botScore: number | null
  countryCode: string | null
  clickedAt: string
  platform: string
  campaignName: string
}

export interface ProofRow {
  id: string
  questId: string
  platform: string
  postUrl: string
  status: string
  xpAwarded: number | null
  createdAt: string
}

export interface AdminProof {
  id: string
  questId: string
  creatorId: string
  handle: string
  campaignName: string
  platform: string
  postUrl: string
  screenshotUrl: string | null
  createdAt: string
}

export interface Badge {
  id: string
  kind: string
  refId: string | null
  awardedAt: string
}
