import type { Env, LinkKVValue, ClickQueueMessage } from './types.ts'

const PM_VID_COOKIE = 'pm_vid'
const PM_VID_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function getPmVid(request: Request): string | null {
  const cookie = request.headers.get('Cookie') ?? ''
  const match = cookie.match(/(?:^|;\s*)pm_vid=([^;]+)/)
  return match?.[1] ?? null
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // Route: /r/:code — 8-char base62 code
    const match = url.pathname.match(/^\/r\/([A-Za-z0-9]{8})$/)
    if (!match) {
      return new Response('Not found', { status: 404 })
    }
    const code = match[1]!

    const link = await env.LINKS.get<LinkKVValue>(code, 'json')
    if (!link || link.status !== 'active') {
      return new Response('Link not found or inactive', { status: 404 })
    }

    // Read or generate pm_vid for visitor deduplication
    const existingVid = getPmVid(request)
    const pmVid = existingVid ?? crypto.randomUUID()

    // Extract Cloudflare edge signals
    const cf = (request as Request & { cf?: Record<string, unknown> }).cf ?? {}
    const botManagement = cf['botManagement'] as { score?: number } | undefined

    const clickMsg: ClickQueueMessage = {
      linkId: link.linkId,
      code,
      campaignId: link.campaignId,
      advertiserId: link.advertiserId,
      creatorId: link.creatorId,
      platform: link.platform,
      unitPriceKobo: link.unitPriceKobo,
      creatorUnitKobo: link.creatorUnitKobo,
      ip: request.headers.get('CF-Connecting-IP'),
      userAgent: request.headers.get('User-Agent'),
      asn: typeof cf['asn'] === 'number' ? String(cf['asn']) : null,
      country: typeof cf['country'] === 'string' ? cf['country'] : null,
      botScore: typeof botManagement?.score === 'number' ? botManagement.score : null,
      pmVid,
      referrer: request.headers.get('Referer'),
      ts: new Date().toISOString(),
    }

    // Enqueue in background — don't block the redirect
    ctx.waitUntil(env.CLICK_QUEUE.send(clickMsg))

    // Build destination URL
    const dest = new URL(link.targetUrl)
    dest.searchParams.set('pm_click', '1')

    // Redirect with cookie header
    const headers = new Headers()
    headers.set('Location', dest.toString())
    headers.set('Cache-Control', 'no-store')
    if (!existingVid) {
      headers.set(
        'Set-Cookie',
        `${PM_VID_COOKIE}=${pmVid}; Max-Age=${PM_VID_MAX_AGE}; Path=/; SameSite=None; Secure; HttpOnly`,
      )
    }

    return new Response(null, { status: 302, headers })
  },
} satisfies ExportedHandler<Env>
