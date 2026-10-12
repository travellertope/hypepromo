'use client'
import useSWR from 'swr'
import { api } from '@/lib/api'
import { PageSpinner, PageError } from '@/components/AsyncFeedback'
import { errorMessage } from '@/lib/errors'

function fmt(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

export default function StatsPage() {
  const { data: stats, error, isLoading, mutate } = useSWR(
    'advertiser/stats',
    api.advertiser.getStats,
  )

  if (isLoading) return <PageSpinner />
  if (error) return <PageError message={errorMessage(error, 'Failed to load stats')} onRetry={() => mutate()} />
  if (!stats) return null

  return (
    <div>
      <h1 className="text-2xl font-black mb-6">Campaign Stats</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Clicks', val: stats.totalClicks.toLocaleString(), color: 'text-cyber-text' },
          { label: 'Valid Clicks', val: stats.validClicks.toLocaleString(), color: 'text-cyber-neon' },
          { label: 'Rejected', val: stats.rejectedClicks.toLocaleString(), color: 'text-red-400' },
          { label: 'Valid Rate', val: `${stats.validPct}%`, color: 'text-green-400' },
          { label: 'Total Spend', val: fmt(stats.totalSpendKobo), color: 'text-cyber-accent' },
        ].map((item) => (
          <div key={item.label} className="glass-panel rounded-2xl p-5">
            <p className="text-xs text-white/40 mb-1">{item.label}</p>
            <p className={`text-2xl font-black ${item.color}`}>{item.val}</p>
          </div>
        ))}
      </div>

      {stats.totalClicks > 0 && (
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white/70">Click Quality</h2>
            <span className="text-lg font-black text-cyber-neon">{stats.validPct}%</span>
          </div>
          <div className="h-3 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-400 transition-all"
              style={{ width: `${stats.validPct}%` }}
            />
          </div>
          <p className="text-xs text-white/30 mt-2">
            {stats.validPct >= 80 ? 'Excellent quality — your audience is highly engaged' :
             stats.validPct >= 60 ? 'Good quality — normal click-through rate' :
             'Below average — check for bot traffic or platform mismatch'}
          </p>
        </div>
      )}
    </div>
  )
}
