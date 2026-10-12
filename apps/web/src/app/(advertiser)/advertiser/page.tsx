'use client'
import useSWR from 'swr'
import { api, type Campaign } from '@/lib/api'
import { PageSpinner, PageError, SlowHint, ErrorNote } from '@/components/AsyncFeedback'
import { errorMessage } from '@/lib/errors'
import Link from 'next/link'
import { useState } from 'react'

function fmt(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-cyber-card/40 text-cyber-muted',
  pending_review: 'bg-yellow-500/20 text-yellow-400',
  funded: 'bg-blue-500/20 text-blue-400',
  live: 'bg-green-500/20 text-green-400',
  paused: 'bg-orange-500/20 text-orange-400',
  rejected: 'bg-red-500/20 text-red-400',
  completed: 'bg-cyber-neon/20 text-cyber-neon',
}

export default function AdvertiserCampaignsPage() {
  const { data, error, isLoading, mutate } = useSWR(
    'advertiser/campaigns',
    () => api.advertiser.listCampaigns(),
  )
  const campaigns: Campaign[] = data?.items ?? []

  const [going, setGoing] = useState<string | null>(null)
  const [goLiveError, setGoLiveError] = useState<string | null>(null)

  async function handleGoLive(id: string) {
    setGoLiveError(null)
    setGoing(id)
    try {
      const updated = await api.advertiser.goLive(id)
      mutate(
        (prev) => prev ? { ...prev, items: prev.items.map((c) => (c.id === id ? updated : c)) } : prev,
        { revalidate: false },
      )
    } catch (e) {
      setGoLiveError(errorMessage(e, 'Failed to take the campaign live.'))
    } finally {
      setGoing(null)
    }
  }

  if (isLoading) return <PageSpinner />
  if (error) return <PageError message={errorMessage(error, 'Failed to load campaigns')} onRetry={() => mutate()} />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Campaigns</h1>
        <Link
          href="/advertiser/campaigns/new"
          className="px-4 py-2 rounded-xl bg-cyber-neon text-black font-bold text-sm"
        >
          + New Campaign
        </Link>
      </div>

      <ErrorNote className="mb-4">{goLiveError}</ErrorNote>

      {campaigns.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">📢</p>
          <p className="text-cyber-muted mb-4">No campaigns yet</p>
          <Link href="/advertiser/campaigns/new" className="px-6 py-3 rounded-xl bg-cyber-accent text-white font-bold">
            Create Your First Campaign
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {campaigns.map((c) => (
          <div key={c.id} className="glass-panel rounded-2xl p-5">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <h3 className="font-bold">{c.name}</h3>
                <p className="text-xs text-cyber-muted mt-0.5 capitalize">{c.type} · {(c.platforms ?? []).join(', ')}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap ${STATUS_STYLE[c.status] ?? 'bg-cyber-card/40 text-cyber-muted'}`}>
                {c.status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-cyber-card rounded-lg p-2 text-center">
                <p className="text-xs text-cyber-muted">Budget</p>
                <p className="text-sm font-black">{fmt(c.budgetKobo)}</p>
              </div>
              <div className="bg-cyber-card rounded-lg p-2 text-center">
                <p className="text-xs text-cyber-muted">Spent</p>
                <p className="text-sm font-black">{fmt(c.spentKobo)}</p>
              </div>
              <div className="bg-cyber-card rounded-lg p-2 text-center">
                <p className="text-xs text-cyber-muted">Per Click</p>
                <p className="text-sm font-black">{fmt(c.unitPriceKobo)}</p>
              </div>
            </div>

            <div className="h-1.5 rounded-full bg-cyber-card/40 mb-4 overflow-hidden">
              <div
                className="h-full rounded-full bg-cyber-neon"
                style={{ width: `${c.budgetKobo > 0 ? Math.min((c.spentKobo / c.budgetKobo) * 100, 100) : 0}%` }}
              />
            </div>

            <div className="flex gap-2">
              {c.status === 'funded' && (
                <button
                  onClick={() => handleGoLive(c.id)}
                  disabled={going === c.id}
                  className="flex-1 py-2 rounded-xl bg-green-500/80 text-white text-sm font-bold disabled:opacity-50"
                >
                  {going === c.id ? '…' : 'Go Live'}
                </button>
              )}
              {c.status === 'draft' && (
                <Link href={`/advertiser/campaigns/new?edit=${c.id}`} className="flex-1 py-2 rounded-xl border border-cyber-border text-center text-sm font-semibold text-cyber-muted">
                  Edit
                </Link>
              )}
              {c.rejectionReason && (
                <p className="text-xs text-red-400 mt-1">Rejected: {c.rejectionReason}</p>
              )}
            </div>

            <SlowHint active={going === c.id} className="mt-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
