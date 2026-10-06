// Pure transaction builders — no DB calls, no side effects.
// Every function returns a Transaction whose lines sum to exactly 0.
//
// Sign convention: positive = debit, negative = credit.
// For liability accounts (advertiser wallet, creator balances), a CREDIT
// means the balance owed grows; a DEBIT means it shrinks.

import {
  BPS_DENOMINATOR,
  CREATOR_SHARE_BPS,
  VAT_RATE_BPS,
  creatorUnit,
} from '@promoet/config'
import {
  PLATFORM_CASH,
  PLATFORM_REVENUE,
  PLATFORM_VAT_PAYABLE,
  advertiserWallet,
  creatorAvailable,
  creatorPending,
} from './accounts.ts'
import type { Transaction } from './types.ts'

// ---------------------------------------------------------------------------
// Advertiser deposits funds (campaign funding / wallet top-up)
// DR platform:cash +amount — asset increases
// CR advertiser:{id} -amount — liability increases (we owe the advertiser)
// ---------------------------------------------------------------------------
export function buildFunding(opts: {
  advertiserId: string
  amountKobo: bigint
  refId: string
  memo?: string
}): Transaction {
  const { advertiserId, amountKobo, refId, memo } = opts
  assertPositive(amountKobo, 'amountKobo')

  return {
    refType: 'funding',
    refId,
    memo: memo ?? `Wallet funding`,
    lines: [
      { accountCode: PLATFORM_CASH,                 amountKobo:  amountKobo },
      { accountCode: advertiserWallet(advertiserId), amountKobo: -amountKobo },
    ],
  }
}

// ---------------------------------------------------------------------------
// Click (or CPA conversion) recorded
//
// Advertiser wallet shrinks by unitPriceKobo.
// Creator gets 75 % (pending, held for CLICK_HOLD_DAYS).
// Platform keeps 25 % gross; 7.5 % of that is VAT payable.
// Integer arithmetic: all divisions truncate; platform gets the remainder.
//
// DR advertiser:{id}       +unitPriceKobo
// CR creator:pending:{id}  -creatorAmount
// CR platform:revenue      -platformNet
// CR platform:vat          -vatKobo
// Sum = unitPriceKobo - creatorAmount - platformNet - vatKobo = 0
// ---------------------------------------------------------------------------
export function buildClickPayout(opts: {
  advertiserId: string
  creatorId: string
  unitPriceKobo: bigint
  refId: string
  memo?: string
}): Transaction {
  const { advertiserId, creatorId, unitPriceKobo, refId, memo } = opts
  assertPositive(unitPriceKobo, 'unitPriceKobo')

  const creatorAmount  = creatorUnit(unitPriceKobo)
  const platformGross  = unitPriceKobo - creatorAmount
  const vatKobo        = (platformGross * BigInt(VAT_RATE_BPS)) / BigInt(BPS_DENOMINATOR)
  const platformNet    = platformGross - vatKobo

  // Guard against edge cases where rounding produces a zero line
  if (creatorAmount === 0n || platformNet === 0n) {
    throw new Error(
      `unitPriceKobo ${unitPriceKobo} is too small to split (creator=${creatorAmount}, net=${platformNet})`
    )
  }

  return {
    refType: 'click',
    refId,
    memo: memo ?? `Click payout`,
    lines: [
      { accountCode: advertiserWallet(advertiserId),  amountKobo:  unitPriceKobo  },
      { accountCode: creatorPending(creatorId),        amountKobo: -creatorAmount  },
      { accountCode: PLATFORM_REVENUE,                 amountKobo: -platformNet    },
      ...(vatKobo > 0n ? [{ accountCode: PLATFORM_VAT_PAYABLE, amountKobo: -vatKobo }] : []),
    ],
  }
}

// ---------------------------------------------------------------------------
// Hold released — pending moves to available after CLICK_HOLD_DAYS
//
// DR creator:pending:{id}   +amountKobo
// CR creator:available:{id} -amountKobo
// ---------------------------------------------------------------------------
export function buildHoldRelease(opts: {
  creatorId: string
  amountKobo: bigint
  refId: string
  memo?: string
}): Transaction {
  const { creatorId, amountKobo, refId, memo } = opts
  assertPositive(amountKobo, 'amountKobo')

  return {
    refType: 'hold_release',
    refId,
    memo: memo ?? `Hold released`,
    lines: [
      { accountCode: creatorPending(creatorId),   amountKobo:  amountKobo },
      { accountCode: creatorAvailable(creatorId), amountKobo: -amountKobo },
    ],
  }
}

// ---------------------------------------------------------------------------
// Creator withdrawal
//
// Creator's available balance decreases.
// Net goes out as cash; fee stays as revenue.
//
// DR creator:available:{id} +amountKobo
// CR platform:cash          -netKobo      (cash leaves the platform)
// CR platform:revenue       -feeKobo      (we keep the transfer fee)
// ---------------------------------------------------------------------------
export function buildWithdrawal(opts: {
  creatorId: string
  amountKobo: bigint
  feeKobo: bigint
  refId: string
  memo?: string
}): Transaction {
  const { creatorId, amountKobo, feeKobo, refId, memo } = opts
  assertPositive(amountKobo, 'amountKobo')
  assertNonNegative(feeKobo, 'feeKobo')
  if (feeKobo >= amountKobo) throw new Error('feeKobo must be less than amountKobo')

  const netKobo = amountKobo - feeKobo

  return {
    refType: 'withdrawal',
    refId,
    memo: memo ?? `Creator withdrawal`,
    lines: [
      { accountCode: creatorAvailable(creatorId), amountKobo:  amountKobo },
      { accountCode: PLATFORM_CASH,               amountKobo: -netKobo    },
      ...(feeKobo > 0n ? [{ accountCode: PLATFORM_REVENUE, amountKobo: -feeKobo }] : []),
    ],
  }
}

// ---------------------------------------------------------------------------
// Generic reversal — negates every line of a prior transaction
// ---------------------------------------------------------------------------
export function buildReversal(opts: {
  original: Transaction
  refId: string
  memo?: string
}): Transaction {
  const { original, refId, memo } = opts
  return {
    refType: 'reversal',
    refId,
    memo: memo ?? `Reversal of ${original.refType} ${original.refId}`,
    lines: original.lines.map(l => ({ ...l, amountKobo: -l.amountKobo })),
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertPositive(v: bigint, name: string): void {
  if (v <= 0n) throw new Error(`${name} must be > 0, got ${v}`)
}

function assertNonNegative(v: bigint, name: string): void {
  if (v < 0n) throw new Error(`${name} must be >= 0, got ${v}`)
}

// Exported for tests and the post() guard
export function linesBalance(lines: Transaction['lines']): boolean {
  return lines.reduce((sum, l) => sum + l.amountKobo, 0n) === 0n
}
