'use client'
import { useEffect, useState } from 'react'
import { api, type WalletResponse, type BankAccount, type Withdrawal } from '@/lib/api'
import { SlowHint, ErrorNote } from '@/components/AsyncFeedback'
import { errorMessage } from '@/lib/errors'

function fmt(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

type Tab = 'earnings' | 'withdraw' | 'bank'

export default function WalletPage() {
  const [tab, setTab] = useState<Tab>('earnings')
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [bank, setBank] = useState<BankAccount | null>(null)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)

  // Withdraw form
  const [amount, setAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  // Bank form
  const [bankCode, setBankCode] = useState('')
  const [acctNum, setAcctNum] = useState('')
  const [savingBank, setSavingBank] = useState(false)
  const [bankError, setBankError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.creator.getWallet().catch(() => null),
      api.creator.getBankAccount().catch(() => null),
      api.creator.getWithdrawals().catch(() => null),
    ]).then(([w, b, wds]) => {
      setWallet(w)
      setBank(b)
      setWithdrawals(wds?.items ?? [])
      setLoading(false)
    })
  }, [])

  async function handleWithdraw() {
    setWithdrawError(null)
    const kobo = Math.round(parseFloat(amount) * 100)
    if (isNaN(kobo) || kobo < 100000) {
      setWithdrawError('Minimum withdrawal is ₦1,000')
      return
    }
    setWithdrawing(true)
    try {
      await api.creator.requestWithdrawal(kobo)
      setAmount('')
      const [w, wds] = await Promise.all([
        api.creator.getWallet(),
        api.creator.getWithdrawals(),
      ])
      setWallet(w)
      setWithdrawals(wds.items)
      setTab('earnings')
    } catch (e) {
      setWithdrawError(errorMessage(e, 'Failed to request withdrawal.'))
    } finally {
      setWithdrawing(false)
    }
  }

  async function handleSaveBank() {
    if (!bankCode || !acctNum) {
      setBankError('Enter both a bank code and an account number.')
      return
    }
    setBankError(null)
    setSavingBank(true)
    try {
      const updated = await api.creator.setBankAccount({ bankCode, bankAccountNumber: acctNum })
      setBank(updated)
      setTab('earnings')
    } catch (e) {
      setBankError(errorMessage(e, 'Failed to save bank account.'))
    } finally {
      setSavingBank(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-cyber-neon border-t-transparent animate-spin" />
        <SlowHint active />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <h1 className="text-2xl font-black mb-4">Wallet</h1>

      {wallet && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { label: 'Pending', val: wallet.pendingKobo, color: 'text-yellow-400' },
            { label: 'Available', val: wallet.availableKobo, color: 'text-cyber-neon' },
            { label: 'Lifetime', val: wallet.lifetimeEarningsKobo, color: 'text-cyber-text' },
          ].map((item) => (
            <div key={item.label} className="glass-panel rounded-xl p-3 text-center">
              <p className="text-xs text-cyber-muted mb-1">{item.label}</p>
              <p className={`text-sm font-black ${item.color}`}>{fmt(item.val)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 glass-panel rounded-xl">
        {(['earnings', 'withdraw', 'bank'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-cyber-neon text-black' : 'text-cyber-muted'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'earnings' && (
        <div className="flex flex-col gap-2">
          {withdrawals.length === 0 && (
            <p className="text-center text-cyber-muted py-8">No withdrawals yet</p>
          )}
          {withdrawals.map((w) => (
            <div key={w.id} className="glass-panel rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{fmt(w.amountKobo)}</p>
                <p className="text-xs text-cyber-muted">{new Date(w.createdAt).toLocaleDateString('en-NG')}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${
                w.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                w.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {w.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'withdraw' && (
        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
          {!bank?.bankAccountNumber ? (
            <div className="text-center py-4">
              <p className="text-cyber-muted text-sm mb-3">Set up a bank account first</p>
              <button onClick={() => setTab('bank')} className="px-4 py-2 rounded-xl bg-cyber-accent text-white text-sm font-bold">
                Add Bank Account
              </button>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs text-cyber-muted mb-1">Bank: {bank.bankCode} • {bank.bankAccountNumber}</p>
                {bank.bankAccountName && <p className="text-sm text-white/80">{bank.bankAccountName}</p>}
              </div>
              <div>
                <label className="block text-xs text-cyber-muted mb-1">Amount (₦)</label>
                <input
                  type="number"
                  placeholder="1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-cyber-card border border-cyber-border rounded-xl px-4 py-3 text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-neon"
                  style={{ color: 'var(--cyber-text)' }}
                />
              </div>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="w-full py-3 rounded-xl bg-cyber-neon text-black font-bold disabled:opacity-50"
              >
                {withdrawing ? 'Processing…' : 'Request Withdrawal'}
              </button>
              <SlowHint active={withdrawing} className="-mt-2" />
              <ErrorNote className="-mt-2">{withdrawError}</ErrorNote>
              <p className="text-xs text-cyber-muted text-center">Min ₦1,000 · Processed within 24h</p>
            </>
          )}
        </div>
      )}

      {tab === 'bank' && (
        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs text-cyber-muted mb-1">Bank Code</label>
            <input
              type="text"
              placeholder="e.g. 058 (GTBank)"
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full bg-cyber-card border border-cyber-border rounded-xl px-4 py-3 text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-neon"
              style={{ color: 'var(--cyber-text)' }}
            />
          </div>
          <div>
            <label className="block text-xs text-cyber-muted mb-1">Account Number</label>
            <input
              type="text"
              placeholder="10 digits"
              value={acctNum}
              onChange={(e) => setAcctNum(e.target.value)}
              className="w-full bg-cyber-card border border-cyber-border rounded-xl px-4 py-3 text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-neon"
              style={{ color: 'var(--cyber-text)' }}
            />
          </div>
          <button
            onClick={handleSaveBank}
            disabled={savingBank}
            className="w-full py-3 rounded-xl bg-cyber-neon text-black font-bold disabled:opacity-50"
          >
            {savingBank ? 'Saving…' : 'Verify & Save'}
          </button>
          <SlowHint active={savingBank} className="-mt-2" />
          <ErrorNote className="-mt-2">{bankError}</ErrorNote>
        </div>
      )}
    </div>
  )
}
