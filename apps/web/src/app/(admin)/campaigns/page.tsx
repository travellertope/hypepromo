'use client'
import { useEffect, useState } from 'react'
import { api, type Campaign } from '@/lib/api'

function fmt(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  useEffect(() => {
    api.admin.getCampaigns().then((res) => {
      setCampaigns(res.items)
      setLoading(false)
    })
  }, [])

  async function approve(id: string) {
    await api.admin.approveCampaign(id)
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
  }

  async function reject(id: string) {
    if (!reason) return
    await api.admin.rejectCampaign(id, reason)
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
    setRejecting(null)
    setReason('')
  }

  if (loading) {
    return <div className="text-white/40 py-10 text-center">Loading…</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-black mb-6">Campaign Review</h1>

      {campaigns.length === 0 && (
        <div className="text-center py-16 text-white/40">
          <p className="text-4xl mb-3">✅</p>
          <p>No campaigns pending review</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {campaigns.map((c) => (
          <div key={c.id} className="glass-panel rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="font-bold text-lg">{c.name}</h3>
                <p className="text-sm text-white/40">{c.type.toUpperCase()}</p>
                {c.description && <p className="text-sm text-white/60 mt-1">{c.description}</p>}
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 whitespace-nowrap">
                pending review
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xs text-white/40">Budget</p>
                <p className="font-bold">{fmt(c.budgetKobo)}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xs text-white/40">Per Click</p>
                <p className="font-bold">{fmt(c.unitPriceKobo)}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 col-span-2">
                <p className="text-xs text-white/40">Target URL</p>
                <p className="font-mono text-xs break-all text-cyber-neon">{c.targetUrl}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-white/40 mb-1">Platforms: {c.platforms.join(', ')}</p>
              {c.targetStates && c.targetStates.length > 0 && (
                <p className="text-xs text-white/40">States: {c.targetStates.join(', ')}</p>
              )}
            </div>

            {rejecting === c.id ? (
              <div className="flex gap-2 mt-2">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Rejection reason"
                  className="flex-1 bg-white/5 border border-red-500/40 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none"
                />
                <button onClick={() => reject(c.id)} className="px-4 py-2 rounded-xl bg-red-500/80 text-white text-sm font-bold">
                  Reject
                </button>
                <button onClick={() => setRejecting(null)} className="px-3 py-2 rounded-xl border border-white/10 text-sm text-white/50">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => approve(c.id)}
                  className="px-5 py-2 rounded-xl bg-green-500/80 text-white font-bold text-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() => setRejecting(c.id)}
                  className="px-5 py-2 rounded-xl border border-red-500/40 text-red-400 font-bold text-sm"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
