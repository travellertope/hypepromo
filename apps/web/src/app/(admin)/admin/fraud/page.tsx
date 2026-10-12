'use client'
import useSWR from 'swr'
import { api } from '@/lib/api'
import { PageSpinner, PageError } from '@/components/AsyncFeedback'
import { errorMessage } from '@/lib/errors'

export default function AdminFraudPage() {
  const { data, error, isLoading, mutate } = useSWR('admin/fraud', api.admin.getFraud)
  const items = data?.items ?? []

  if (isLoading) return <PageSpinner />
  if (error) return <PageError message={errorMessage(error, 'Failed to load fraud queue')} onRetry={() => mutate()} />

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
