'use client'
import { useEffect, useState } from 'react'
import { api, ApiError, type AdvertiserProfile } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { SlowHint, ErrorNote } from '@/components/AsyncFeedback'
import { errorMessage } from '@/lib/errors'

const INDUSTRIES = [
  'Agriculture & Farming',
  'Automotive',
  'Beauty & Cosmetics',
  'Books & Literature',
  'Construction & Architecture',
  'E-commerce & Retail',
  'Education',
  'Entertainment',
  'Fashion & Apparel',
  'Finance & Banking',
  'Food & Beverage',
  'Gaming',
  'Government & Public Sector',
  'Health & Wellness',
  'Legal Services',
  'Logistics & Supply Chain',
  'Media & Publishing',
  'Music',
  'Non-profit & NGO',
  'Real Estate',
  'Religion & Spirituality',
  'Sports & Fitness',
  'Technology',
  'Telecommunications',
  'Travel & Hospitality',
]

export default function AdvertiserProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<AdvertiserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)

  const [orgName, setOrgName] = useState('')
  const [website, setWebsite] = useState('')
  const [industry, setIndustry] = useState('')

  useEffect(() => {
    if (!loading) return
    let cancelled = false

    void (async () => {
      try {
        const p = await api.advertiser.getProfile().catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 404) return null
          throw e
        })
        if (cancelled) return
        if (p) {
          setProfile(p)
          setOrgName(p.orgName)
          setWebsite(p.website ?? '')
          setIndustry(p.industry ?? '')
        }
        setLoadError(null)
      } catch (e) {
        if (!cancelled) setLoadError(errorMessage(e, 'Something went wrong loading your profile.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setSaveOk(false)
    try {
      const updated = await api.advertiser.upsertProfile({
        orgName,
        website: website || null,
        industry: industry || null,
      })
      setProfile(updated)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 3000)
    } catch (e) {
      setSaveError(errorMessage(e, 'Failed to save.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-cyber-neon border-t-transparent animate-spin" />
        <SlowHint active />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <p className="text-cyber-text font-semibold">Couldn&apos;t load your profile</p>
        <p className="text-cyber-muted text-sm">{loadError}</p>
        <button
          onClick={() => { setLoadError(null); setLoading(true) }}
          className="px-6 py-2.5 rounded-xl bg-cyber-accent text-white text-sm font-bold"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-black mb-6">Organisation Profile</h1>

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-cyber-muted mb-1">Organisation Name</label>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Acme Corp"
            className="w-full bg-cyber-card border border-cyber-border rounded-xl px-4 py-3 text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-neon"
            style={{ color: 'var(--cyber-text)' }}
          />
        </div>

        <div>
          <label className="block text-xs text-cyber-muted mb-1">Website</label>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            type="url"
            className="w-full bg-cyber-card border border-cyber-border rounded-xl px-4 py-3 text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-neon"
            style={{ color: 'var(--cyber-text)' }}
          />
        </div>

        <div>
          <label className="block text-xs text-cyber-muted mb-1">Industry</label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full bg-cyber-card border border-cyber-border rounded-xl px-4 py-3 text-cyber-text focus:outline-none focus:border-cyber-neon"
            style={{ color: 'var(--cyber-text)' }}
          >
            <option value="">Select industry…</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !orgName.trim()}
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

        {profile && (
          <div className="glass-panel rounded-2xl p-4 mt-2">
            <p className="text-xs text-cyber-muted mb-1">Organisation</p>
            <p className="font-bold text-cyber-text">{profile.orgName}</p>
            {profile.industry && <p className="text-sm text-cyber-muted mt-1">{profile.industry}</p>}
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
