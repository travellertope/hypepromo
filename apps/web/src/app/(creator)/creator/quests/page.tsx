'use client'
import useSWRInfinite from 'swr/infinite'
import { api, type Quest } from '@/lib/api'
import { PageSpinner, PageError, SlowHint, ErrorNote } from '@/components/AsyncFeedback'
import { errorMessage } from '@/lib/errors'
import { useState } from 'react'

function fmt(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

const PLATFORM_ICONS: Record<string, string> = {
  whatsapp_status: '💬',
  x: '𝕏',
  facebook: '📘',
  instagram_story: '📸',
  instagram_bio: '📷',
  telegram: '✈️',
}

export default function QuestsPage() {
  const { data, error, isLoading, mutate, size, setSize } = useSWRInfinite(
    (pageIndex, prev) => {
      if (prev && !prev.nextCursor) return null
      return ['quests', pageIndex === 0 ? null : prev?.nextCursor]
    },
    ([, cursor]) => api.quests.list(cursor ?? undefined),
  )

  const quests: Quest[] = data?.flatMap((p) => p.items) ?? []
  const hasMore = !!data?.[data.length - 1]?.nextCursor

  const [claiming, setClaiming] = useState<string | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)

  async function handleClaim(questId: string) {
    setClaimError(null)
    setClaiming(questId)
    try {
      const updated = await api.quests.claim(questId)
      mutate(
        (pages) =>
          pages?.map((page) => ({
            ...page,
            items: page.items.map((q) => (q.id === questId ? updated : q)),
          })),
        { revalidate: false },
      )
    } catch (e) {
      setClaimError(errorMessage(e, 'Failed to claim quest.'))
    } finally {
      setClaiming(null)
    }
  }

  if (isLoading) return <PageSpinner />
  if (error) return <PageError message={errorMessage(error, 'Failed to load quests')} onRetry={() => mutate()} />

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <h1 className="text-2xl font-black mb-6">Quest Feed</h1>

      <ErrorNote className="mb-3">{claimError}</ErrorNote>

      <div className="flex flex-col gap-3">
        {quests.length === 0 && (
          <div className="text-center py-16 text-cyber-muted">
            <p className="text-4xl mb-3">🏹</p>
            <p>No quests available right now</p>
            <p className="text-sm mt-1">Check back soon!</p>
          </div>
        )}

        {quests.map((q) => (
          <div key={q.id} className="glass-panel rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{q.campaign.name}</h3>
                {q.campaign.description && (
                  <p className="text-xs text-cyber-muted mt-1 line-clamp-2">{q.campaign.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {q.campaign.platforms.map((p) => (
                    <span key={p} className="text-xs bg-cyber-card/60 rounded-full px-2 py-0.5">
                      {PLATFORM_ICONS[p] ?? '📱'} {p.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-cyber-neon font-black text-lg">{fmt(q.campaign.creatorUnitKobo)}</p>
                <p className="text-xs text-cyber-muted capitalize">{q.campaign.type}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              {q.claimedAt ? (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyber-neon inline-block" />
                  <span className="text-xs text-cyber-neon font-semibold">Active — share &amp; earn!</span>
                </div>
              ) : (
                <button
                  onClick={() => handleClaim(q.id)}
                  disabled={claiming === q.id}
                  className="px-4 py-2 rounded-xl bg-cyber-accent text-white text-sm font-bold disabled:opacity-50 transition-opacity"
                >
                  {claiming === q.id ? 'Claiming…' : 'Claim Quest +10 XP'}
                </button>
              )}
            </div>

            <SlowHint active={claiming === q.id} className="mt-2" />
          </div>
        ))}

        {hasMore && (
          <button
            onClick={() => setSize(size + 1)}
            className="w-full py-3 rounded-xl border border-cyber-border text-sm text-cyber-muted"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  )
}
