// Minimal Cloudflare KV REST API helper.
// Only runs when CF_* env vars are set; otherwise no-ops (local / CI).

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

function kv() {
  const accountId = process.env['CF_ACCOUNT_ID']
  const namespaceId = process.env['CF_LINKS_KV_NAMESPACE_ID']
  const apiToken = process.env['CF_API_TOKEN']
  if (!accountId || !namespaceId || !apiToken) return null
  return { accountId, namespaceId, apiToken }
}

export async function kvPut(code: string, value: LinkKVValue): Promise<void> {
  const cfg = kv()
  if (!cfg) return

  const url = `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/storage/kv/namespaces/${cfg.namespaceId}/values/${code}`
  await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${cfg.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(value),
  })
}

export async function kvPatch(code: string, status: LinkKVValue['status']): Promise<void> {
  const cfg = kv()
  if (!cfg) return

  const getUrl = `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/storage/kv/namespaces/${cfg.namespaceId}/values/${code}`
  const res = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${cfg.apiToken}` },
  })
  if (!res.ok) return
  const existing = (await res.json()) as LinkKVValue
  await kvPut(code, { ...existing, status })
}
