'use client'
import { useEffect, useState } from 'react'
import { api, type CreatorProfile, type Social } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NICHES = ['Fashion', 'Tech', 'Comedy', 'Music', 'Sports', 'Food', 'Travel', 'Finance', 'Health', 'Gaming']
const STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara']

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [socials, setSocials] = useState<Social[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)

  const [handle, setHandle] = useState('')
  const [bio, setBio] = useState('')
  const [state, setState] = useState('')
  const [niches, setNiches] = useState<string[]>([])

  useEffect(() => {
    if (!loading) return
    Promise.all([
      api.creator.getProfile().catch(() => null),
      api.creator.getSocials().catch(() => null),
    ]).then(([p, s]) => {
      if (p) {
        setProfile(p)
        setHandle(p.handle)
        setBio(p.bio ?? '')
        setState(p.state ?? '')
        setNiches(p.niches ?? [])
      }
      setSocials(s?.items ?? [])
      setLoading(false)
    }).catch(() => {
      setLoadError(true)
      setLoading(false)
    })
  }, [loading])

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setSaveOk(false)
    try {
      const updated = await api.creator.upsertProfile({ handle, bio: bio || null, state: state || null, niches: niches.length ? niches : null })
      setProfile(updated)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 3000)
    } catch (e) {
      setSaveError((e as Error).message ?? 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function toggleNiche(n: string) {
    setNiches((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n])
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-cyber-neon border-t-transparent animate-spin" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <p className="text-cyber-text font-semibold">Couldn't reach the server</p>
        <p className="text-cyber-muted text-sm">The API may be waking up — try again in a moment.</p>
        <button
          onClick={() => { setLoadError(false); setLoading(true); }}
          className="px-6 py-2.5 rounded-xl bg-cyber-accent text-white text-sm font-bold"
        >
          Retry
        </button>
      </div>
    )
  }

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
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyber-accent to-pink-500 text-white font-bold disabled:opacity-50 mt-2 shadow-lg"
        >
          {saving ? 'Saving…' : saveOk ? '✓ Saved!' : 'Save Profile'}
        </button>

        {saveError && (
          <p className="text-red-500 text-xs text-center -mt-1">{saveError}</p>
        )}

        {/* Socials */}
        {socials.length > 0 && (
          <div className="mt-2">
            <h3 className="text-sm font-semibold text-cyber-muted mb-2">Connected Platforms</h3>
            <div className="flex flex-col gap-2">
              {socials.map((s) => (
                <div key={s.id} className="glass-panel rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-cyber-text capitalize">{s.platform.replace('_', ' ')}</p>
                    <p className="text-xs text-cyber-muted">@{s.handle}</p>
                  </div>
                  {s.followerCount && (
                    <span className="text-xs text-cyber-neon font-semibold">{s.followerCount.toLocaleString()} followers</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
