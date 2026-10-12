'use client'
import useSWR from 'swr'
import { api, type AdminSocial } from '@/lib/api'
import { PageSpinner, PageError, ErrorNote } from '@/components/AsyncFeedback'
import { errorMessage } from '@/lib/errors'
import { useState } from 'react'

const PLATFORM_LABELS: Record<string, string> = {
  whatsapp_status: 'WhatsApp Status',
  x: 'X (Twitter)',
  facebook: 'Facebook',
  instagram_story: 'Instagram Story',
  instagram_bio: 'Instagram Bio',
  telegram: 'Telegram',
}

function StatusBadge({ status }: { status: AdminSocial['verificationStatus'] }) {
  if (status === 'verified') return <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Verified</span>
  if (status === 'rejected') return <span className="text-xs font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">Rejected</span>
  return <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">Pending</span>
}

export default function AdminSocialsPage() {
  const { data, error, isLoading, mutate } = useSWR('admin/socials', () => api.admin.getSocials())

  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function handleVerify(id: string) {
    setBusy(id)
    setActionError(null)
    try {
      await api.admin.verifySocial(id)
      await mutate(
        (prev) => prev ? { items: prev.items.map((s) => s.id === id ? { ...s, verificationStatus: 'verified' as const, verifiedAt: new Date().toISOString(), rejectionReason: null } : s) } : prev,
        { revalidate: false },
      )
    } catch (e) {
      setActionError(errorMessage(e, 'Failed to verify.'))
    } finally {
      setBusy(null)
    }
  }

  async function handleReject(id: string) {
    const reason = rejectReasons[id]?.trim() || 'Does not meet requirements'
    setBusy(id)
    setActionError(null)
    try {
      await api.admin.rejectSocial(id, reason)
      await mutate(
        (prev) => prev ? { items: prev.items.map((s) => s.id === id ? { ...s, verificationStatus: 'rejected' as const, rejectionReason: reason } : s) } : prev,
        { revalidate: false },
      )
    } catch (e) {
      setActionError(errorMessage(e, 'Failed to reject.'))
    } finally {
      setBusy(null)
    }
  }

  if (isLoading) return <PageSpinner />
  if (error) return <PageError message={errorMessage(error, 'Failed to load')} onRetry={() => mutate()} />

  const items = data?.items ?? []
  const pending = items.filter((s) => s.verificationStatus === 'pending')
  const reviewed = items.filter((s) => s.verificationStatus !== 'pending')

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black mb-2">Social Verifications</h1>
      <p className="text-sm text-cyber-muted mb-6">Review creator social accounts before they can claim quests.</p>

      <ErrorNote className="mb-4">{actionError}</ErrorNote>

      {pending.length === 0 && (
        <div className="glass-panel rounded-2xl p-8 text-center text-cyber-muted mb-8">
          No pending verifications
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-cyber-muted uppercase tracking-widest mb-3">Pending ({pending.length})</h2>
          <div className="flex flex-col gap-3">
            {pending.map((s) => (
              <SocialCard
                key={s.id}
                social={s}
                busy={busy === s.id}
                rejectReason={rejectReasons[s.id] ?? ''}
                onRejectReasonChange={(v) => setRejectReasons((r) => ({ ...r, [s.id]: v }))}
                onVerify={() => handleVerify(s.id)}
                onReject={() => handleReject(s.id)}
              />
            ))}
          </div>
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-cyber-muted uppercase tracking-widest mb-3">Reviewed</h2>
          <div className="flex flex-col gap-3">
            {reviewed.map((s) => (
              <SocialCard
                key={s.id}
                social={s}
                busy={busy === s.id}
                rejectReason={rejectReasons[s.id] ?? ''}
                onRejectReasonChange={(v) => setRejectReasons((r) => ({ ...r, [s.id]: v }))}
                onVerify={() => handleVerify(s.id)}
                onReject={() => handleReject(s.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SocialCard({
  social,
  busy,
  rejectReason,
  onRejectReasonChange,
  onVerify,
  onReject,
}: {
  social: AdminSocial
  busy: boolean
  rejectReason: string
  onRejectReasonChange: (v: string) => void
  onVerify: () => void
  onReject: () => void
}) {
  const [showReject, setShowReject] = useState(false)

  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-cyber-text">@{social.handle}</p>
            <StatusBadge status={social.verificationStatus} />
          </div>
          <p className="text-xs text-cyber-muted mt-0.5">
            {PLATFORM_LABELS[social.platform] ?? social.platform} · creator: <span className="text-cyber-text">{social.handle}</span>
          </p>
          <p className="text-xs text-cyber-muted">
            {social.followerCount != null ? `${social.followerCount.toLocaleString()} followers` : 'No follower count'}
          </p>
          {social.rejectionReason && (
            <p className="text-xs text-red-400 mt-1">Reason: {social.rejectionReason}</p>
          )}
        </div>
        {social.screenshotUrl && (
          <a
            href={social.screenshotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-cyber-neon underline"
          >
            Screenshot →
          </a>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onVerify}
          disabled={busy || social.verificationStatus === 'verified'}
          className="flex-1 py-2 rounded-lg bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-bold disabled:opacity-40 hover:bg-green-500/30 transition-all"
        >
          {social.verificationStatus === 'verified' ? '✓ Verified' : 'Verify'}
        </button>
        <button
          onClick={() => setShowReject((v) => !v)}
          disabled={busy}
          className="flex-1 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold disabled:opacity-40 hover:bg-red-500/20 transition-all"
        >
          Reject
        </button>
      </div>

      {showReject && (
        <div className="mt-2 flex gap-2">
          <input
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
            placeholder="Reason (optional)"
            className="flex-1 bg-cyber-card border border-red-500/30 rounded-lg px-3 py-1.5 text-xs text-cyber-text placeholder-cyber-muted focus:outline-none"
          />
          <button
            onClick={() => { onReject(); setShowReject(false) }}
            disabled={busy}
            className="px-4 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold disabled:opacity-40"
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  )
}
