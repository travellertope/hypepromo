'use client'
import { useEffect, useState } from 'react'
import { api, type LeaderboardResponse } from '@/lib/api'

function fmt(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

const TIER_COLORS: Record<string, string> = {
  starter: 'text-white/60',
  rising: 'text-green-400',
  pro: 'text-cyber-neon',
  elite: 'text-cyber-accent',
}

const RANK_MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.leaderboard.getActive().then((res) => {
      setData(res)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-cyber-neon border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!data?.season) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <p className="text-4xl">🏆</p>
        <p className="text-white/60">No active season right now</p>
        <p className="text-white/30 text-sm">Season rankings coming soon</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Leaderboard</h1>
          <p className="text-xs text-cyber-neon mt-0.5">{data.season.name}</p>
        </div>
        <div className="text-right text-xs text-white/40">
          <p>Ends {new Date(data.season.endsAt).toLocaleDateString('en-NG')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {data.items.map((entry, i) => (
          <div
            key={entry.rank}
            className={`glass-panel rounded-xl px-4 py-3 flex items-center gap-3 ${i < 3 ? 'border-cyber-neon/30' : ''}`}
          >
            <div className="w-8 text-center">
              {i < 3 ? (
                <span className="text-xl">{RANK_MEDALS[i]}</span>
              ) : (
                <span className="text-sm font-bold text-white/40">#{entry.rank}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">@{entry.handle}</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold capitalize ${TIER_COLORS[entry.tier] ?? 'text-white/60'}`}>
                  {entry.tier} · Lv.{entry.level}
                </span>
                {entry.state && <span className="text-xs text-white/30">{entry.state}</span>}
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-cyber-neon text-sm">{fmt(entry.earningsKobo)}</p>
              <p className="text-xs text-white/40">{entry.validClicks} clicks</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
