'use client'
import useSWR from 'swr'
import { api, type AdminProof } from '@/lib/api'
import { PageSpinner, PageError, SlowHint, ErrorNote } from '@/components/AsyncFeedback'
import { errorMessage } from '@/lib/errors'
import { useState } from 'react'

export default function AdminProofsPage() {
  const { data, error, isLoading, mutate } = useSWR('admin/proofs', api.admin.getProofs)
  const items: AdminProof[] = data?.items ?? []

  const [acting, setActing] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  async function approve(id: string) {
    setActionError(null)
    setActing(id)
    try {
      await api.admin.approveProof(id)
      mutate(
        (prev) => prev ? { ...prev, items: prev.items.filter((p) => p.id !== id) } : prev,
        { revalidate: false },
      )
    } catch (e) {
      setActionError(errorMessage(e, 'Failed to approve proof.'))
    } finally {
      setActing(null)
    }
  }

  async function reject(id: string) {
    if (!rejectReason.trim()) return
    setActionError(null)
    setActing(id)
    try {
      await api.admin.rejectProof(id, rejectReason)
      mutate(
        (prev) => prev ? { ...prev, items: prev.items.filter((p) => p.id !== id) } : prev,
        { revalidate: false },
      )
      setRejectingId(null)
      setRejectReason('')
    } catch (e) {
      setActionError(errorMessage(e, 'Failed to reject proof.'))
    } finally {
      setActing(null)
    }
  }

  if (isLoading) return <PageSpinner />
  if (error) return <PageError message={errorMessage(error, 'Failed to load proofs')} onRetry={() => mutate()} />

  return (
    <div>
      <h1 className="text-2xl font-black mb-6">Post Proof Review</h1>

      <ErrorNote className="mb-4">{actionError}</ErrorNote>

      {items.length === 0 && (
        <div className="text-center py-16 text-white/40">
          <p className="text-4xl mb-3">📋</p>
          <p>No proofs pending review</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {items.map((proof) => (
          <div key={proof.id} className="glass-panel rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-bold">@{proof.handle}</p>
                <p className="text-xs text-white/40">{proof.campaignName} · {proof.platform}</p>
              </div>
              <p className="text-xs text-white/40">{new Date(proof.createdAt).toLocaleString('en-NG')}</p>
            </div>

            <div className="bg-white/5 rounded-xl p-3 mb-4">
              <p className="text-xs text-white/40 mb-1">Post URL</p>
              <a
                href={proof.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyber-neon text-sm break-all hover:underline"
              >
                {proof.postUrl}
              </a>
            </div>

            {proof.screenshotUrl && (
              <div className="mb-4">
                <a href={proof.screenshotUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={proof.screenshotUrl}
                    alt="screenshot"
                    className="w-full max-h-48 object-cover rounded-xl border border-cyber-border"
                  />
                </a>
              </div>
            )}

            {rejectingId === proof.id ? (
              <div className="flex gap-2">
                <input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Rejection reason"
                  className="flex-1 bg-white/5 border border-red-500/40 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none"
                />
                <button
                  onClick={() => reject(proof.id)}
                  disabled={acting === proof.id}
                  className="px-4 py-2 rounded-xl bg-red-500/80 text-white text-sm font-bold disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => { setRejectingId(null); setRejectReason('') }}
                  className="px-3 py-2 rounded-xl border border-white/10 text-sm text-white/50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => approve(proof.id)}
                  disabled={acting === proof.id}
                  className="flex-1 py-2 rounded-xl bg-green-500/80 text-white font-bold text-sm disabled:opacity-50"
                >
                  {acting === proof.id ? '…' : 'Approve +25 XP'}
                </button>
                <button
                  onClick={() => setRejectingId(proof.id)}
                  disabled={acting === proof.id}
                  className="py-2 px-4 rounded-xl border border-red-500/40 text-red-400 font-bold text-sm disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}

            <SlowHint active={acting === proof.id} className="mt-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
