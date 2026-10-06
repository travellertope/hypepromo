'use client'
import { useEffect, useState } from 'react'
import { api, type FraudClick } from '@/lib/api'

export default function AdminFraudPage() {
  const [items, setItems] = useState<FraudClick[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.admin.getFraud().then((res) => {
      setItems(res.items)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="text-white/40 py-10 text-center">Loading…</div>

  return (
    <div>
      <h1 className="text-2xl font-black mb-6">Fraud Queue</h1>

      {items.length === 0 && (
        <div className="text-center py-16 text-white/40">
          <p className="text-4xl mb-3">🛡️</p>
          <p>No flagged clicks</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-white/40 border-b border-cyber-border">
              {['Campaign', 'Platform', 'IP', 'Country', 'Bot Score', 'Reason', 'Time'].map((h) => (
                <th key={h} className="pb-3 pr-4 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 pr-4 font-medium">{c.campaignName}</td>
                <td className="py-3 pr-4 text-white/60">{c.platform}</td>
                <td className="py-3 pr-4 font-mono text-xs text-white/50">{c.ip ?? '—'}</td>
                <td className="py-3 pr-4">{c.countryCode ?? '—'}</td>
                <td className="py-3 pr-4">
                  {c.botScore != null ? (
                    <span className={`font-bold ${c.botScore > 0.7 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {(c.botScore * 100).toFixed(0)}%
                    </span>
                  ) : '—'}
                </td>
                <td className="py-3 pr-4 text-xs text-red-400">{c.rejectionReason ?? '—'}</td>
                <td className="py-3 text-xs text-white/40">
                  {new Date(c.clickedAt).toLocaleString('en-NG')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
