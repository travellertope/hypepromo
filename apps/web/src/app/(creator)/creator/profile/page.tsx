'use client'
import useSWR from 'swr'
import { api, ApiError, type Social } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PageSpinner, PageError, SlowHint, ErrorNote } from '@/components/AsyncFeedback'
import { errorMessage } from '@/lib/errors'
import { useState, useEffect, useRef } from 'react'

const BUCKET = 'social-screenshots'

async function uploadScreenshot(file: File, userId: string, platform: string): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/${platform}_${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

const NICHES = ['Fashion', 'Tech', 'Comedy', 'Music', 'Sports', 'Food', 'Travel', 'Finance', 'Health', 'Gaming']
const STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara']

const PLATFORM_LABELS: Record<string, string> = {
  whatsapp_status: 'WhatsApp Status',
  x: 'X (Twitter)',
  facebook: 'Facebook',
  instagram_story: 'Instagram Story',
  instagram_bio: 'Instagram Bio',
  telegram: 'Telegram',
}
const PLATFORMS = Object.keys(PLATFORM_LABELS)

async function fetchProfileData() {
  const profile = await api.creator.getProfile().catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  })
  const socials = await api.creator.getSocials().catch(() => ({ items: [] }))
  return { profile, socials: socials?.items ?? [] }
}

function StatusBadge({ status }: { status: Social['verificationStatus'] }) {
  if (status === 'verified') return <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Verified</span>
  if (status === 'rejected') return <span className="text-xs font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">Rejected</span>
  return <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">Pending</span>
}

export default function ProfilePage() {
  const router = useRouter()
  const { data, error, isLoading, mutate } = useSWR('creator/profile', fetchProfileData)

  const [handle, setHandle] = useState('')
  const [bio, setBio] = useState('')
  const [state, setState] = useState('')
  const [niches, setNiches] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)

  // Social linking form
  const [socialPlatform, setSocialPlatform] = useState(PLATFORMS[0]!)
  const [socialHandle, setSocialHandle] = useState('')
  const [socialFollowers, setSocialFollowers] = useState('')
  const [socialScreenshot, setSocialScreenshot] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadOk, setUploadOk] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [socialSaving, setSocialSaving] = useState(false)
  const [socialError, setSocialError] = useState<string | null>(null)
  const [socialOk, setSocialOk] = useState(false)
  const [deletingPlatform, setDeletingPlatform] = useState<string | null>(null)

  useEffect(() => {
    if (!data?.profile) return
    const p = data.profile
    setHandle(p.handle)
    setBio(p.bio ?? '')
    setState(p.state ?? '')
    setNiches(p.niches ?? [])
  }, [data?.profile])

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setSaveOk(false)
    try {
      const updated = await api.creator.upsertProfile({
        handle,
        bio: bio || null,
        state: state || null,
        niches: niches.length ? niches : null,
      })
      await mutate((prev) => prev ? { ...prev, profile: updated } : prev, { revalidate: false })
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 3000)
    } catch (e) {
      setSaveError(errorMessage(e, 'Failed to save.'))
    } finally {
      setSaving(false)
    }
  }

  function toggleNiche(n: string) {
    setNiches((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n])
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const userId = data?.profile?.id
    if (!userId) { setSocialError('Save your profile first.'); return }
    setUploading(true)
    setUploadOk(false)
    setSocialError(null)
    try {
      const url = await uploadScreenshot(file, userId, socialPlatform)
      setSocialScreenshot(url)
      setUploadOk(true)
    } catch (err) {
      setSocialError(errorMessage(err, 'Upload failed. Check the storage bucket exists.'))
    } finally {
      setUploading(false)
    }
  }

  async function handleLinkSocial() {
    if (!socialHandle.trim()) { setSocialError('Enter your handle.'); return }
    if (!socialFollowers || Number(socialFollowers) < 1) { setSocialError('Enter your follower count.'); return }
    if (!socialScreenshot.trim()) { setSocialError('Upload a screenshot first.'); return }
    setSocialSaving(true)
    setSocialError(null)
    setSocialOk(false)
    try {
      const updated = await api.creator.upsertSocial(socialPlatform, {
        handle: socialHandle.trim(),
        followerCount: Number(socialFollowers),
        screenshotUrl: socialScreenshot.trim(),
      })
      await mutate(
        (prev) => prev ? {
          ...prev,
          socials: prev.socials.some((s) => s.platform === socialPlatform)
            ? prev.socials.map((s) => s.platform === socialPlatform ? updated : s)
            : [...prev.socials, updated],
        } : prev,
        { revalidate: false },
      )
      setSocialOk(true)
      setSocialHandle('')
      setSocialFollowers('')
      setSocialScreenshot('')
      setUploadOk(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setTimeout(() => setSocialOk(false), 4000)
    } catch (e) {
      setSocialError(errorMessage(e, 'Failed to link account.'))
    } finally {
      setSocialSaving(false)
    }
  }

  async function handleDeleteSocial(platform: string) {
    setDeletingPlatform(platform)
    try {
      await api.creator.deleteSocial(platform)
      await mutate(
        (prev) => prev ? { ...prev, socials: prev.socials.filter((s) => s.platform !== platform) } : prev,
        { revalidate: false },
      )
    } catch (e) {
      setSocialError(errorMessage(e, 'Failed to remove.'))
    } finally {
      setDeletingPlatform(null)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (isLoading) return <PageSpinner />
  if (error) return <PageError message={errorMessage(error, 'Failed to load profile')} onRetry={() => mutate()} />

  const profile = data?.profile ?? null
  const socials = data?.socials ?? []
  const hasVerifiedSocial = socials.some((s) => s.verificationStatus === 'verified')

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-6">
      <h1 className="text-2xl font-black mb-6">Profile</h1>

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-cyber-muted mb-1">Handle</label>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="yourhandle"
            className="w-full bg-cyber-card border border-cyber-border rounded-xl px-4 py-3 text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-neon"
            style={{ color: 'var(--cyber-text)' }}
          />
        </div>

        <div>
          <label className="block text-xs text-cyber-muted mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Tell brands about yourself…"
            className="w-full bg-cyber-card border border-cyber-border rounded-xl px-4 py-3 text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-neon resize-none"
            style={{ color: 'var(--cyber-text)' }}
          />
        </div>

        <div>
          <label className="block text-xs text-cyber-muted mb-1">State</label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full bg-cyber-card border border-cyber-border rounded-xl px-4 py-3 text-cyber-text focus:outline-none focus:border-cyber-neon"
            style={{ color: 'var(--cyber-text)' }}
          >
            <option value="">Select state…</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-cyber-muted mb-2">Niches</label>
          <div className="flex flex-wrap gap-2">
            {NICHES.map((n) => (
              <button
                key={n}
                onClick={() => toggleNiche(n)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  niches.includes(n)
                    ? 'bg-cyber-accent/20 border-cyber-accent text-cyber-accent'
                    : 'border-cyber-border text-cyber-muted'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyber-accent to-pink-500 text-white font-bold disabled:opacity-50 mt-2 shadow-lg transition-all"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Saving…
            </span>
          ) : saveOk ? '✓ Saved!' : 'Save Profile'}
        </button>

        <SlowHint active={saving} className="-mt-1" />
        <ErrorNote className="-mt-1">{saveError}</ErrorNote>

        {/* Social account verification */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-cyber-text">Social Accounts</h3>
            {hasVerifiedSocial && (
              <span className="text-xs text-green-400 font-semibold">✓ Quest-eligible</span>
            )}
          </div>

          {!hasVerifiedSocial && (
            <div className="glass-panel rounded-xl p-3 mb-3 border border-yellow-400/20">
              <p className="text-xs text-yellow-400 font-semibold">Verification required</p>
              <p className="text-xs text-cyber-muted mt-0.5">Link and verify at least one social account to unlock quest claiming.</p>
            </div>
          )}

          {/* Existing socials */}
          {socials.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {socials.map((s) => (
                <div key={s.id} className="glass-panel rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-cyber-text">{PLATFORM_LABELS[s.platform] ?? s.platform}</p>
                        <StatusBadge status={s.verificationStatus} />
                      </div>
                      <p className="text-xs text-cyber-muted">@{s.handle}</p>
                      {s.followerCount && (
                        <p className="text-xs text-cyber-neon">{s.followerCount.toLocaleString()} followers</p>
                      )}
                      {s.verificationStatus === 'rejected' && s.rejectionReason && (
                        <p className="text-xs text-red-400 mt-1">Reason: {s.rejectionReason}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteSocial(s.platform)}
                      disabled={deletingPlatform === s.platform}
                      className="text-xs text-cyber-muted hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Link new / edit form */}
          <div className="glass-panel rounded-xl p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-cyber-muted uppercase tracking-wide">Link a social account</p>

            <div>
              <label className="block text-xs text-cyber-muted mb-1">Platform</label>
              <select
                value={socialPlatform}
                onChange={(e) => setSocialPlatform(e.target.value)}
                className="w-full bg-cyber-card border border-cyber-border rounded-xl px-3 py-2.5 text-sm text-cyber-text focus:outline-none focus:border-cyber-neon"
                style={{ color: 'var(--cyber-text)' }}
              >
                {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-cyber-muted mb-1">Your handle / username</label>
              <input
                value={socialHandle}
                onChange={(e) => setSocialHandle(e.target.value)}
                placeholder="@yourhandle"
                className="w-full bg-cyber-card border border-cyber-border rounded-xl px-3 py-2.5 text-sm text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-neon"
                style={{ color: 'var(--cyber-text)' }}
              />
            </div>

            <div>
              <label className="block text-xs text-cyber-muted mb-1">Follower count</label>
              <input
                type="number"
                value={socialFollowers}
                onChange={(e) => setSocialFollowers(e.target.value)}
                placeholder="e.g. 5000"
                min={0}
                className="w-full bg-cyber-card border border-cyber-border rounded-xl px-3 py-2.5 text-sm text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-neon"
                style={{ color: 'var(--cyber-text)' }}
              />
            </div>

            <div>
              <label className="block text-xs text-cyber-muted mb-1">Screenshot of your follower count</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
                id="screenshot-upload"
              />
              <label
                htmlFor="screenshot-upload"
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all text-sm font-semibold
                  ${uploadOk
                    ? 'border-green-500/60 text-green-400 bg-green-500/5'
                    : 'border-cyber-border text-cyber-muted hover:border-cyber-neon hover:text-cyber-neon'
                  } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {uploading ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> Uploading…</>
                ) : uploadOk ? (
                  <>✓ Screenshot ready — tap to replace</>
                ) : (
                  <>📷 Tap to upload screenshot</>
                )}
              </label>
              <p className="text-xs text-cyber-muted mt-1">Take a screenshot showing your profile and follower count.</p>
            </div>

            <button
              onClick={handleLinkSocial}
              disabled={socialSaving}
              className="w-full py-2.5 rounded-xl bg-cyber-neon text-black font-bold text-sm disabled:opacity-50"
            >
              {socialSaving ? 'Submitting…' : socialOk ? '✓ Submitted for review' : 'Submit for Verification'}
            </button>

            <ErrorNote className="-mt-1">{socialError}</ErrorNote>
          </div>
        </div>

        {profile && (
          <div className="glass-panel rounded-2xl p-4 mt-2">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-black text-cyber-neon">{profile.level}</p>
                <p className="text-xs text-cyber-muted">Level</p>
              </div>
              <div>
                <p className="text-xl font-black text-cyber-text">{profile.xp.toLocaleString()}</p>
                <p className="text-xs text-cyber-muted">XP</p>
              </div>
              <div>
                <p className="text-xl font-black text-orange-400">{profile.streakDays}</p>
                <p className="text-xs text-cyber-muted">Day Streak</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleSignOut}
          className="w-full py-3 rounded-xl border border-red-500/40 text-red-400 text-sm font-semibold mt-2"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
