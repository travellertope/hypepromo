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
  const [saving, setSaving] = useState(false)

  const [handle, setHandle] = useState('')
  const [bio, setBio] = useState('')
  const [state, setState] = useState('')
  const [niches, setNiches] = useState<string[]>([])

  useEffect(() => {
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
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await api.creator.upsertProfile({ handle, bio: bio || null, state: state || null, niches: niches.length ? niches : null })
      setProfile(updated)
    } catch (e) {
      alert((e as Error).message)
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

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-6">
      <h1 className="text-2xl font-black mb-6">Profile</h1>

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-white/50 mb-1">Handle</label>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="yourhandle"
            className="w-full bg-white/5 border border-cyber-border rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-cyber-neon"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Tell brands about yourself…"
            className="w-full bg-white/5 border border-cyber-border rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-cyber-neon resize-none"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">State</label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full bg-cyber-card border border-cyber-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyber-neon"
          >
            <option value="">Select state…</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-2">Niches</label>
          <div className="flex flex-wrap gap-2">
            {NICHES.map((n) => (
              <button
                key={n}
                onClick={() => toggleNiche(n)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  niches.includes(n)
                    ? 'bg-cyber-accent/30 border-cyber-accent text-cyber-accent'
                    : 'border-cyber-border text-white/50'
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
          className="w-full py-3 rounded-xl bg-cyber-neon text-black font-bold disabled:opacity-50 mt-2"
        >
          {saving ? 'Saving…' : 'Save Profile'}
        </button>

        {/* Socials */}
        {socials.length > 0 && (
          <div className="mt-2">
            <h3 className="text-sm font-semibold text-white/60 mb-2">Connected Platforms</h3>
            <div className="flex flex-col gap-2">
              {socials.map((s) => (
                <div key={s.id} className="glass-panel rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold capitalize">{s.platform.replace('_', ' ')}</p>
                    <p className="text-xs text-white/40">@{s.handle}</p>
                  </div>
                  {s.followerCount && (
                    <span className="text-xs text-cyber-neon">{s.followerCount.toLocaleString()} followers</span>
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
                <p className="text-xs text-white/40">Level</p>
              </div>
              <div>
                <p className="text-xl font-black text-white">{profile.xp.toLocaleString()}</p>
                <p className="text-xs text-white/40">XP</p>
              </div>
              <div>
                <p className="text-xl font-black text-orange-400">{profile.streakDays}</p>
                <p className="text-xs text-white/40">Day Streak</p>
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
