'use client'
import { useState } from 'react'
import { api, type CreateCampaignInput } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { SlowHint, ErrorNote } from '@/components/AsyncFeedback'
import { errorMessage } from '@/lib/errors'

const PLATFORMS = ['whatsapp_status', 'x', 'facebook', 'instagram_story', 'instagram_bio', 'telegram']
const STATES = ['Lagos','Abuja','Rivers','Kano','Oyo','Delta','Anambra','Ogun','Edo','Enugu','Kaduna','Imo','Abia','Osun','Akwa Ibom']

export default function NewCampaignPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [form, setForm] = useState<Partial<CreateCampaignInput>>({
    type: 'cpc',
    platforms: [],
    targetStates: [],
  })

  function set<K extends keyof CreateCampaignInput>(k: K, v: CreateCampaignInput[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function togglePlatform(p: string) {
    const curr = form.platforms ?? []
    set('platforms', curr.includes(p) ? curr.filter((x) => x !== p) : [...curr, p])
  }

  function toggleState(s: string) {
    const curr = form.targetStates ?? []
    set('targetStates', curr.includes(s) ? curr.filter((x) => x !== s) : [...curr, s])
  }

  async function handleSubmit() {
    if (!form.name || !form.targetUrl || !form.unitPriceKobo || !form.budgetKobo) {
      setSubmitError('Fill in the name, target URL, price per click and budget first.')
      return
    }
    setSubmitError(null)
    setSaving(true)
    try {
      const campaign = await api.advertiser.createCampaign(form as CreateCampaignInput)
      await api.advertiser.submitCampaign(campaign.id)
      router.push('/advertiser')
    } catch (e) {
      setSubmitError(errorMessage(e, 'Failed to submit campaign.'))
      setSaving(false)
    }
  }

  const steps = [
    {
      title: 'Basics',
      content: (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-white/50 mb-1">Campaign Name</label>
            <input
              value={form.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Summer Giveaway 2026"
              className="w-full bg-white/5 border border-cyber-border rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-cyber-neon"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Description (optional)</label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="What are creators promoting?"
              className="w-full bg-white/5 border border-cyber-border rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-cyber-neon resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Target URL</label>
            <input
              type="url"
              value={form.targetUrl ?? ''}
              onChange={(e) => set('targetUrl', e.target.value)}
              placeholder="https://yoursite.com/landing"
              className="w-full bg-white/5 border border-cyber-border rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-cyber-neon"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Campaign Type</label>
            <div className="flex gap-2">
              {(['cpc', 'cpa'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => set('type', t)}
                  className={`flex-1 py-3 rounded-xl font-bold uppercase text-sm border transition-all ${form.type === t ? 'bg-cyber-neon/20 border-cyber-neon text-cyber-neon' : 'border-cyber-border text-white/40'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/30 mt-1">
              {form.type === 'cpc' ? 'Pay per valid click' : 'Pay per confirmed conversion'}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Budget',
      content: (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-white/50 mb-1">Price Per Click (₦)</label>
            <input
              type="number"
              value={form.unitPriceKobo ? form.unitPriceKobo / 100 : ''}
              onChange={(e) => set('unitPriceKobo', Math.round(parseFloat(e.target.value) * 100) || 0)}
              placeholder="50"
              className="w-full bg-white/5 border border-cyber-border rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-cyber-neon"
            />
            {form.unitPriceKobo && form.unitPriceKobo > 0 && (
              <p className="text-xs text-white/40 mt-1">
                Creator earns ≈ ₦{(form.unitPriceKobo * 0.75 / 100).toFixed(2)} per click
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Total Budget (₦)</label>
            <input
              type="number"
              value={form.budgetKobo ? form.budgetKobo / 100 : ''}
              onChange={(e) => set('budgetKobo', Math.round(parseFloat(e.target.value) * 100) || 0)}
              placeholder="50000"
              className="w-full bg-white/5 border border-cyber-border rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-cyber-neon"
            />
          </div>
          {form.unitPriceKobo && form.budgetKobo && form.unitPriceKobo > 0 && form.budgetKobo > 0 && (
            <div className="glass-panel rounded-xl p-4">
              <p className="text-xs text-white/50 mb-2">Estimated reach</p>
              <p className="text-2xl font-black text-cyber-neon">
                {Math.floor(form.budgetKobo / form.unitPriceKobo).toLocaleString()}
              </p>
              <p className="text-xs text-white/40">max clicks</p>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Targeting',
      content: (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-xs text-white/50 mb-2">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    (form.platforms ?? []).includes(p)
                      ? 'bg-cyber-neon/20 border-cyber-neon text-cyber-neon'
                      : 'border-cyber-border text-white/40'
                  }`}
                >
                  {p.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-2">Target States (leave empty for all)</label>
            <div className="flex flex-wrap gap-2">
              {STATES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleState(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    (form.targetStates ?? []).includes(s)
                      ? 'bg-cyber-accent/20 border-cyber-accent text-cyber-accent'
                      : 'border-cyber-border text-white/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Review',
      content: (
        <div className="flex flex-col gap-3">
          {[
            ['Name', form.name],
            ['Type', form.type?.toUpperCase()],
            ['Target URL', form.targetUrl],
            ['Price/click', form.unitPriceKobo ? '₦' + (form.unitPriceKobo / 100).toLocaleString() : '-'],
            ['Budget', form.budgetKobo ? '₦' + (form.budgetKobo / 100).toLocaleString() : '-'],
            ['Platforms', (form.platforms ?? []).join(', ') || 'none'],
            ['States', (form.targetStates ?? []).join(', ') || 'All'],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between py-2 border-b border-white/5">
              <span className="text-sm text-white/40">{label}</span>
              <span className="text-sm font-semibold text-right max-w-[60%]">{val}</span>
            </div>
          ))}
          <p className="text-xs text-white/30 mt-2">
            Your campaign will go to admin review. Fund it after approval to go live.
          </p>
        </div>
      ),
    },
  ]

  const current = steps[step]!

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="text-white/50 text-sm">← Back</button>
        )}
        <h1 className="text-2xl font-black">New Campaign</h1>
      </div>

      {/* Step dots */}
      <div className="flex gap-1.5 mb-6">
        {steps.map((s, i) => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= step ? 'bg-cyber-neon' : 'bg-white/10'}`} />
        ))}
      </div>

      <div className="glass-panel rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-white/60 mb-4">{current.title}</h2>
        {current.content}
      </div>

      {step < steps.length - 1 ? (
        <button
          onClick={() => setStep(step + 1)}
          className="w-full py-3 rounded-xl bg-cyber-neon text-black font-bold"
        >
          Continue →
        </button>
      ) : (
        <>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-cyber-accent text-white font-bold disabled:opacity-50"
          >
            {saving ? 'Submitting…' : 'Submit for Review'}
          </button>
          <SlowHint active={saving} className="mt-2" />
          <ErrorNote className="mt-2">{submitError}</ErrorNote>
        </>
      )}
    </div>
  )
}
