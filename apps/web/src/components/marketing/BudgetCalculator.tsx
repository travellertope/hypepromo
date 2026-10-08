'use client'

import { useState } from 'react'
import Link from 'next/link'

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`

export function BudgetCalculator() {
  const [cpc, setCpc] = useState(500)
  const [clicks, setClicks] = useState(5000)

  return (
    <div className="glass-panel p-8 md:p-12 rounded-3xl shadow-2xl">
      <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
        <h3 className="text-2xl md:text-3xl font-extrabold text-cyber-text">Estimate Your Campaign Budget</h3>
        <p className="text-xs text-cyber-muted">Adjust the sliders to simulate clicks and campaign funding requirements.</p>
      </div>

      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <label htmlFor="cpc-slider" className="flex justify-between text-sm font-bold mb-2">
            <span className="text-cyber-muted">Cost Per Click (CPC)</span>
            <span className="text-cyber-neon">{naira(cpc)}</span>
          </label>
          <input
            id="cpc-slider"
            type="range"
            min={100}
            max={2000}
            step={50}
            value={cpc}
            onChange={(e) => setCpc(Number(e.target.value))}
            className="slider text-cyber-neon"
          />
        </div>

        <div>
          <label htmlFor="clicks-slider" className="flex justify-between text-sm font-bold mb-2">
            <span className="text-cyber-muted">Target Verified Clicks</span>
            <span className="text-cyber-accent">{clicks.toLocaleString('en-NG')} clicks</span>
          </label>
          <input
            id="clicks-slider"
            type="range"
            min={500}
            max={50000}
            step={500}
            value={clicks}
            onChange={(e) => setClicks(Number(e.target.value))}
            className="slider text-cyber-accent"
          />
        </div>

        <div className="pt-2">
          <div className="bg-cyber-dark border border-cyber-border p-6 rounded-2xl text-center max-w-md mx-auto">
            <span className="text-xs text-cyber-muted block mb-1">Total campaign budget required</span>
            <span className="text-3xl font-extrabold text-cyber-text tabular-nums">{naira(cpc * clicks)}</span>
          </div>
        </div>

        <div className="pt-4 text-center">
          <Link
            href="/auth/login?role=advertiser"
            className="inline-block px-8 py-3.5 rounded-xl bg-cyber-neon text-cyber-dark font-extrabold text-xs hover:opacity-90 transition"
          >
            Deploy This Campaign Now
          </Link>
        </div>
      </div>
    </div>
  )
}
