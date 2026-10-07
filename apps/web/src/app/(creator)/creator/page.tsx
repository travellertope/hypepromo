'use client'
import { useEffect, useState } from 'react'
import { api, type CreatorProfile, type WalletResponse, type Quest } from '@/lib/api'
import { XpBar } from '@/components/XpBar'
import Link from 'next/link'

function fmt(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

export default function CreatorDashboard() {
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.creator.getProfile().catch(() => null),
      api.creator.getWallet().catch(() => null),
      api.quests.list().catch(() => null),
    ]).then(([p, w, q]) => {
      setProfile(p)
      setWallet(w)
      setQuests(q?.items.slice(0, 3) ?? [])
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

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <p className="text-cyber-muted">Complete your profile to get started</p>
        <Link
          href="/creator/profile"
          className="px-6 py-3 rounded-xl bg-cyber-neon text-black font-bold"
        >
          Set Up Profile
        </Link>
      </div>
    )
  }

  const energyPct = ((profile.energyMax - profile.energyUsed) / profile.energyMax) * 100

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="px-4 pt-8 pb-2">
        <p className="text-cyber-muted text-sm">Welcome back,</p>
        <h1 className="text-2xl font-black text-cyber-text">@{profile.handle}</h1>
        <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-cyber-accent/20 border border-cyber-accent/40">
          <span className="text-xs text-cyber-accent font-semibold uppercase">{profile.tier}</span>
        </div>
      </div>

      <XpBar xp={profile.xp} level={profile.level} streakDays={profile.streakDays} />

      {/* Energy bar */}
      <div className="mx-4 mb-4 glass-panel rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-cyber-muted">Energy</span>
          <span className="text-xs text-cyber-muted">{profile.energyMax - profile.energyUsed} / {profile.energyMax}</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: profile.energyMax }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-3 rounded-sm ${i < profile.energyMax - profile.energyUsed ? 'bg-cyber-neon' : 'bg-cyber-card'}`}
            />
          ))}
        </div>
      </div>

      {/* Wallet */}
      {wallet && (
        <div className="mx-4 mb-4 glass-panel rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-cyber-muted">Wallet</h2>
            <Link href="/creator/wallet" className="text-xs text-cyber-neon">View all →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-cyber-card rounded-xl p-3">
              <p className="text-xs text-cyber-muted mb-1">Pending</p>
              <p className="text-lg font-black text-yellow-400">{fmt(wallet.pendingKobo)}</p>
            </div>
            <div className="bg-cyber-card rounded-xl p-3">
              <p className="text-xs text-cyber-muted mb-1">Available</p>
              <p className="text-lg font-black text-cyber-neon">{fmt(wallet.availableKobo)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quest previews */}
      <div className="mx-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-cyber-muted">Active Quests</h2>
          <Link href="/creator/quests" className="text-xs text-cyber-neon">See all →</Link>
        </div>
        <div className="flex flex-col gap-2">
          {quests.length === 0 && (
            <p className="text-cyber-muted text-sm text-center py-4">No quests yet — check back soon!</p>
          )}
          {quests.map((q) => (
            <Link
              key={q.id}
              href="/creator/quests"
              className="glass-panel rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-sm">{q.campaign.name}</p>
                <p className="text-xs text-cyber-muted mt-0.5">{q.campaign.platforms.join(', ')}</p>
              </div>
              <div className="text-right">
                <p className="text-cyber-neon font-black">{fmt(q.campaign.creatorUnitKobo)}</p>
                <p className="text-xs text-cyber-muted capitalize">{q.campaign.type}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
