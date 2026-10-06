import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  BPS_DENOMINATOR,
  CREATOR_SHARE_BPS,
  VAT_RATE_BPS,
  creatorUnit,
  MIN_CPC_KOBO,
} from '@promoet/config'
import {
  buildFunding,
  buildClickPayout,
  buildHoldRelease,
  buildWithdrawal,
  buildReversal,
  linesBalance,
} from '../transactions.ts'
import type { Transaction } from '../types.ts'

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// Minimum unit price that produces non-zero lines for both creator and platform
// MIN_CPC_KOBO = 5000 guarantees the split is always > 0 on both sides
const unitPriceArb = fc.bigInt({ min: BigInt(MIN_CPC_KOBO), max: 100_000_000n })
const smallAmountArb = fc.bigInt({ min: 1n, max: 100_000_000n })
const uuidArb = fc.uuid()

// ---------------------------------------------------------------------------
// Core invariant helper
// ---------------------------------------------------------------------------

function assertBalances(tx: Transaction) {
  const sum = tx.lines.reduce((s, l) => s + l.amountKobo, 0n)
  expect(sum).toBe(0n)
  tx.lines.forEach(l => expect(l.amountKobo).not.toBe(0n))
}

// ---------------------------------------------------------------------------
// Funding
// ---------------------------------------------------------------------------

describe('buildFunding', () => {
  it('lines always sum to zero', () => {
    fc.assert(
      fc.property(uuidArb, smallAmountArb, uuidArb, (advId, amount, refId) => {
        assertBalances(buildFunding({ advertiserId: advId, amountKobo: amount, refId }))
      })
    )
  })

  it('has exactly 2 lines', () => {
    fc.assert(
      fc.property(uuidArb, smallAmountArb, uuidArb, (advId, amount, refId) => {
        expect(buildFunding({ advertiserId: advId, amountKobo: amount, refId }).lines).toHaveLength(2)
      })
    )
  })

  it('rejects non-positive amount', () => {
    expect(() => buildFunding({ advertiserId: 'x', amountKobo: 0n, refId: 'r' })).toThrow()
    expect(() => buildFunding({ advertiserId: 'x', amountKobo: -1n, refId: 'r' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// Click payout
// ---------------------------------------------------------------------------

describe('buildClickPayout', () => {
  it('lines always sum to zero', () => {
    fc.assert(
      fc.property(uuidArb, uuidArb, unitPriceArb, uuidArb, (advId, ctrId, unit, refId) => {
        assertBalances(buildClickPayout({ advertiserId: advId, creatorId: ctrId, unitPriceKobo: unit, refId }))
      })
    )
  })

  it('creator receives exactly floor(unit * 7500 / 10000)', () => {
    fc.assert(
      fc.property(uuidArb, uuidArb, unitPriceArb, uuidArb, (advId, ctrId, unit, refId) => {
        const tx = buildClickPayout({ advertiserId: advId, creatorId: ctrId, unitPriceKobo: unit, refId })
        const creatorLine = tx.lines.find(l => l.accountCode.startsWith('creator:pending:'))
        expect(creatorLine).toBeDefined()
        // Credit on a pending account is negative; absolute value is creator's cut
        expect(-creatorLine!.amountKobo).toBe(creatorUnit(unit))
      })
    )
  })

  it('platform gross = unit - creator share', () => {
    fc.assert(
      fc.property(uuidArb, uuidArb, unitPriceArb, uuidArb, (advId, ctrId, unit, refId) => {
        const tx = buildClickPayout({ advertiserId: advId, creatorId: ctrId, unitPriceKobo: unit, refId })
        const creatorAmount = creatorUnit(unit)
        const platformGross = unit - creatorAmount
        const vatKobo = (platformGross * BigInt(VAT_RATE_BPS)) / BigInt(BPS_DENOMINATOR)
        const platformNet = platformGross - vatKobo

        const revLine = tx.lines.find(l => l.accountCode === 'platform:revenue')
        const vatLine = tx.lines.find(l => l.accountCode === 'platform:vat')

        expect(-revLine!.amountKobo).toBe(platformNet)
        if (vatKobo > 0n) {
          expect(-vatLine!.amountKobo).toBe(vatKobo)
        }
      })
    )
  })

  it('creator + platform gross = unit price (no money created or lost)', () => {
    fc.assert(
      fc.property(uuidArb, uuidArb, unitPriceArb, uuidArb, (advId, ctrId, unit, refId) => {
        const tx = buildClickPayout({ advertiserId: advId, creatorId: ctrId, unitPriceKobo: unit, refId })
        const credits = tx.lines
          .filter(l => l.amountKobo < 0n)
          .reduce((s, l) => s + (-l.amountKobo), 0n)
        expect(credits).toBe(unit)
      })
    )
  })

  it('creator receives strictly less than the full unit price (platform always gets something)', () => {
    fc.assert(
      fc.property(uuidArb, uuidArb, unitPriceArb, uuidArb, (advId, ctrId, unit, refId) => {
        const tx = buildClickPayout({ advertiserId: advId, creatorId: ctrId, unitPriceKobo: unit, refId })
        const creatorLine = tx.lines.find(l => l.accountCode.startsWith('creator:pending:'))!
        const creatorAmt = -creatorLine.amountKobo
        expect(creatorAmt).toBeLessThan(unit)
        expect(creatorAmt).toBeGreaterThan(0n)
      })
    )
  })

  it('bigint truncation error on creator share is less than 1 unit (< BPS_DENOMINATOR - 1 below exact)', () => {
    fc.assert(
      fc.property(uuidArb, uuidArb, unitPriceArb, uuidArb, (advId, ctrId, unit, refId) => {
        const tx = buildClickPayout({ advertiserId: advId, creatorId: ctrId, unitPriceKobo: unit, refId })
        const creatorLine = tx.lines.find(l => l.accountCode.startsWith('creator:pending:'))!
        const creatorAmt = -creatorLine.amountKobo
        // floor(unit * 7500 / 10000) is always within (BPS_DENOMINATOR - 1) of the exact value
        const exactNumerator = unit * BigInt(CREATOR_SHARE_BPS)
        expect(creatorAmt * BigInt(BPS_DENOMINATOR)).toBeGreaterThanOrEqual(exactNumerator - BigInt(BPS_DENOMINATOR - 1))
        expect(creatorAmt * BigInt(BPS_DENOMINATOR)).toBeLessThanOrEqual(exactNumerator)
      })
    )
  })
})

// ---------------------------------------------------------------------------
// Hold release
// ---------------------------------------------------------------------------

describe('buildHoldRelease', () => {
  it('lines always sum to zero', () => {
    fc.assert(
      fc.property(uuidArb, smallAmountArb, uuidArb, (ctrId, amount, refId) => {
        assertBalances(buildHoldRelease({ creatorId: ctrId, amountKobo: amount, refId }))
      })
    )
  })

  it('pending decreases by the same amount available increases', () => {
    fc.assert(
      fc.property(uuidArb, smallAmountArb, uuidArb, (ctrId, amount, refId) => {
        const tx = buildHoldRelease({ creatorId: ctrId, amountKobo: amount, refId })
        const pendingLine   = tx.lines.find(l => l.accountCode.startsWith('creator:pending:'))!
        const availableLine = tx.lines.find(l => l.accountCode.startsWith('creator:available:'))!
        expect(pendingLine.amountKobo).toBe(-availableLine.amountKobo)
        expect(pendingLine.amountKobo).toBe(amount)
      })
    )
  })
})

// ---------------------------------------------------------------------------
// Withdrawal
// ---------------------------------------------------------------------------

describe('buildWithdrawal', () => {
  it('lines always sum to zero', () => {
    fc.assert(
      fc.property(
        uuidArb,
        // amount, fee: fee < amount and both positive
        fc.bigInt({ min: 2n, max: 100_000_000n }).chain(amount =>
          fc.bigInt({ min: 0n, max: amount - 1n }).map(fee => ({ amount, fee }))
        ),
        uuidArb,
        (ctrId, { amount, fee }, refId) => {
          assertBalances(buildWithdrawal({ creatorId: ctrId, amountKobo: amount, feeKobo: fee, refId }))
        }
      )
    )
  })

  it('amount = netKobo + feeKobo', () => {
    fc.assert(
      fc.property(
        uuidArb,
        fc.bigInt({ min: 2n, max: 100_000_000n }).chain(amount =>
          fc.bigInt({ min: 0n, max: amount - 1n }).map(fee => ({ amount, fee }))
        ),
        uuidArb,
        (ctrId, { amount, fee }, refId) => {
          const tx = buildWithdrawal({ creatorId: ctrId, amountKobo: amount, feeKobo: fee, refId })
          const availLine = tx.lines.find(l => l.accountCode.startsWith('creator:available:'))!
          const cashLine  = tx.lines.find(l => l.accountCode === 'platform:cash')!
          const revLine   = tx.lines.find(l => l.accountCode === 'platform:revenue')

          expect(availLine.amountKobo).toBe(amount)
          const net = amount - fee
          expect(-cashLine.amountKobo).toBe(net)
          if (fee > 0n) {
            expect(-revLine!.amountKobo).toBe(fee)
          }
        }
      )
    )
  })

  it('rejects fee >= amount', () => {
    expect(() => buildWithdrawal({ creatorId: 'x', amountKobo: 1000n, feeKobo: 1000n, refId: 'r' })).toThrow()
    expect(() => buildWithdrawal({ creatorId: 'x', amountKobo: 1000n, feeKobo: 2000n, refId: 'r' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// Reversal
// ---------------------------------------------------------------------------

describe('buildReversal', () => {
  // Generate a valid transaction to reverse by building a funding tx
  const fundingArb = fc.tuple(uuidArb, smallAmountArb, uuidArb)
    .map(([advId, amount, refId]) => buildFunding({ advertiserId: advId, amountKobo: amount, refId }))

  it('reversal lines sum to zero', () => {
    fc.assert(
      fc.property(fundingArb, uuidArb, (original, refId) => {
        assertBalances(buildReversal({ original, refId }))
      })
    )
  })

  it('each reversal line negates the original line', () => {
    fc.assert(
      fc.property(fundingArb, uuidArb, (original, refId) => {
        const rev = buildReversal({ original, refId })
        original.lines.forEach((origLine, i) => {
          expect(rev.lines[i]!.amountKobo).toBe(-origLine.amountKobo)
          expect(rev.lines[i]!.accountCode).toBe(origLine.accountCode)
        })
      })
    )
  })

  it('original + reversal = net zero for every account', () => {
    fc.assert(
      fc.property(fundingArb, uuidArb, (original, refId) => {
        const rev = buildReversal({ original, refId })
        const allLines = [...original.lines, ...rev.lines]
        const byAccount = new Map<string, bigint>()
        for (const l of allLines) {
          byAccount.set(l.accountCode, (byAccount.get(l.accountCode) ?? 0n) + l.amountKobo)
        }
        for (const [, net] of byAccount) {
          expect(net).toBe(0n)
        }
      })
    )
  })

  it('double reversal reproduces the original lines', () => {
    fc.assert(
      fc.property(fundingArb, uuidArb, uuidArb, (original, refId1, refId2) => {
        const rev = buildReversal({ original, refId: refId1 })
        const revrev = buildReversal({ original: rev, refId: refId2 })
        original.lines.forEach((origLine, i) => {
          expect(revrev.lines[i]!.amountKobo).toBe(origLine.amountKobo)
        })
      })
    )
  })
})

// ---------------------------------------------------------------------------
// linesBalance
// ---------------------------------------------------------------------------

describe('linesBalance', () => {
  it('returns true iff lines sum to zero', () => {
    fc.assert(
      fc.property(
        fc.array(fc.bigInt({ min: -1_000_000n, max: 1_000_000n }).filter(n => n !== 0n), { minLength: 1 }),
        (amounts) => {
          const negSum = -amounts.reduce((s, a) => s + a, 0n)
          const lines = [
            ...amounts.map(a => ({ accountCode: 'a', amountKobo: a })),
            ...(negSum !== 0n ? [{ accountCode: 'b', amountKobo: negSum }] : []),
          ]
          expect(linesBalance(lines)).toBe(true)
        }
      )
    )
  })

  it('returns false for unbalanced lines', () => {
    expect(linesBalance([{ accountCode: 'a', amountKobo: 1n }])).toBe(false)
  })
})
