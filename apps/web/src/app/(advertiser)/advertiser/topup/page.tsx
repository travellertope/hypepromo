'use client'
import { useState } from 'react'
import { api } from '@/lib/api'

function fmt(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

function grossUp(netKobo: number): number {
  const netB = BigInt(netKobo)
  const FEE_CAP = 200000n
  const RAW_FEE = ((netB + 10000n) * 10000n + 9849n) / 9850n - netB
  const fee = RAW_FEE < FEE_CAP ? RAW_FEE : FEE_CAP
  return Number(netB + fee)
}

const PRESETS = [5000, 10000, 25000, 50000, 100000]

export default function TopupPage() {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const netKobo = Math.round(parseFloat(amount || '0') * 100)
  const grossKobo = netKobo >= 100 ? grossUp(netKobo) : 0
  const feeKobo = grossKobo - netKobo

  async function handleTopup() {
    if (netKobo < 100000) return setError('Minimum top-up is ₦1,000')
    setError('')
    setLoading(true)
    try {
      const res = await api.advertiser.initiateTopup(netKobo)
      window.location.href = res.authorizationUrl
    } catch (e) {
      setError((e as Error).message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-black mb-6">Top Up Wallet</h1>

      <div className="glass-panel rounded-2xl p-5 mb-4">
        <label className="block text-xs text-white/50 mb-2">Amount (₦)</label>

        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(String(p / 100))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                netKobo === p ? 'bg-cyber-neon/20 border-cyber-neon text-cyber-neon' : 'border-cyber-border text-white/40'
              }`}
            >
              ₦{(p / 100).toLocaleString()}
            </button>
          ))}
        </div>

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter custom amount"
          className="w-full bg-white/5 border border-cyber-border rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-cyber-neon mb-4"
        />

        {grossKobo > 0 && (
          <div className="bg-white/5 rounded-xl p-4 mb-4 flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Amount</span>
              <span>{fmt(netKobo)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Paystack Fee</span>
              <span className="text-yellow-400">+{fmt(feeKobo)}</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-2 border-t border-white/10">
              <span>You Pay</span>
              <span className="text-cyber-neon">{fmt(grossKobo)}</span>
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button
          onClick={handleTopup}
          disabled={loading || netKobo < 100000}
          className="w-full py-3 rounded-xl bg-cyber-neon text-black font-bold disabled:opacity-40"
        >
          {loading ? 'Redirecting to Paystack…' : 'Pay with Paystack'}
        </button>
      </div>

      <p className="text-xs text-white/30 text-center">
        Secure payment via Paystack · Funds appear instantly after payment
      </p>
    </div>
  )
}
