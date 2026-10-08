'use client'
import { useEffect, useState } from 'react'
import { api, type AdminWithdrawal } from '@/lib/api'
import { SlowHint, ErrorNote } from '@/components/AsyncFeedback'
import { errorMessage } from '@/lib/errors'

function fmt(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

export default function AdminWithdrawalsPage() {
  const [items, setItems] = useState<AdminWithdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    api.admin.getWithdrawals().then((res) => {
      setItems(res.items)
      setLoading(false)
    })
  }, [])

  async function approve(id: string) {
    setActionError(null)
    setActing(id)
    try {
      await api.admin.approveWithdrawal(id)
      setItems((prev) => prev.filter((w) => w.id !== id))
    } catch (e) {
      setActionError(errorMessage(e, 'Failed to approve withdrawal.'))
    } finally {
      setActing(null)
    }
  }

  async function reject(id: string) {
    setActionError(null)
    setActing(id)
    try {
      await api.admin.rejectWithdrawal(id, 'Manual rejection')
      setItems((prev) => prev.filter((w) => w.id !== id))
    } catch (e) {
      setActionError(errorMessage(e, 'Failed to reject withdrawal.'))
    } finally {
      setActing(null)
    }
  }

  if (loading) return (
    <div className="py-10 text-center flex flex-col items-center gap-2">
      <p className="text-white/40">Loading…</p>
      <SlowHint active />
    </div>
  )

  return (
    <div>
      <h1 className="text-2xl font-black mb-6">Withdrawal Queue</h1>

      <ErrorNote className="mb-4">{actionError}</ErrorNote>

      {items.length === 0 && (
        <div className="text-center py-16 text-white/40">
          <p className="text-4xl mb-3">💳</p>
          <p>No pending withdrawals</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {items.map((w) => (
          <div key={w.id} className="glass-panel rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-bold">@{w.handle}</p>
                <p className="text-xs text-white/40">{new Date(w.createdAt).toLocaleString('en-NG')}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-cyber-neon">{fmt(w.amountKobo)}</p>
                <p className="text-xs text-white/40">Net: {fmt(w.netKobo)}</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 mb-4 text-xs">
              <p className="text-white/40 mb-0.5">Bank</p>
              <p>{w.bankAccountName ?? 'Unknown'} · {w.bankCode} · {w.bankAccountNumber}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => approve(w.id)}
                disabled={acting === w.id}
                className="flex-1 py-2 rounded-xl bg-green-500/80 text-white font-bold text-sm disabled:opacity-50"
              >
                Approve & Pay
              </button>
              <button
                onClick={() => reject(w.id)}
                disabled={acting === w.id}
                className="py-2 px-4 rounded-xl border border-red-500/40 text-red-400 font-bold text-sm disabled:opacity-50"
              >
                Reject
              </button>
            </div>

            <SlowHint active={acting === w.id} className="mt-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
