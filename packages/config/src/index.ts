// All money constants — single source of truth, never inline these
export const CREATOR_SHARE_BPS = 7500       // 75.00%
export const PLATFORM_SHARE_BPS = 2500      // 25.00%
export const BPS_DENOMINATOR = 10_000

// VAT on the platform's 25% fee only (agent model)
export const VAT_RATE_BPS = 750             // 7.5%

// Minimum amounts (kobo — ₦1 = 100 kobo)
export const MIN_CPC_KOBO = 5_000           // ₦50
export const MIN_CPA_KOBO = 30_000          // ₦300
export const MIN_BUDGET_CPC_KOBO = 2_500_000  // ₦25,000
export const MIN_BUDGET_CPA_KOBO = 5_000_000  // ₦50,000
export const MIN_TOPUP_KOBO = 1_000_000     // ₦10,000
export const MIN_WITHDRAWAL_KOBO = 100_000  // ₦1,000

// Hold period
export const CLICK_HOLD_DAYS = 7
export const CPA_APPROVAL_WINDOW_DAYS = 14

// Energy
export const ENERGY_DEFAULT_MAX = 10
export const ENERGY_RESET_HOURS = 24

// Max share of a campaign budget per creator
export const MAX_CREATOR_BUDGET_PCT = 10    // 10%

// Referral link code length (base62)
export const LINK_CODE_LENGTH = 8

/** Compute creator's unit in kobo from advertiser's price. */
export function creatorUnit(unitPriceKobo: bigint): bigint {
  return (unitPriceKobo * BigInt(CREATOR_SHARE_BPS)) / BigInt(BPS_DENOMINATOR)
}

// Paystack local card fee: 1.5% + ₦100, capped at ₦2,000 (all in kobo)
const PAYSTACK_RATE_BPS = 150n   // 1.5%
const PAYSTACK_FIXED_KOBO = 10_000n  // ₦100
const PAYSTACK_CAP_KOBO = 200_000n   // ₦2,000

/**
 * Compute the gross charge to the advertiser's card so that after Paystack
 * deducts its fee the platform receives exactly netKobo.
 */
export function grossUpPaystack(netKobo: bigint): bigint {
  // Check whether the cap would apply at the capped gross
  const cappedGross = netKobo + PAYSTACK_CAP_KOBO
  const feeAtCap = (cappedGross * PAYSTACK_RATE_BPS) / BigInt(BPS_DENOMINATOR) + PAYSTACK_FIXED_KOBO
  if (feeAtCap >= PAYSTACK_CAP_KOBO) {
    return cappedGross
  }

  // No cap: gross = ceil((net + fixed) * BPS / (BPS - rate_bps))
  const bps = BigInt(BPS_DENOMINATOR)
  const gross = ((netKobo + PAYSTACK_FIXED_KOBO) * bps + (bps - PAYSTACK_RATE_BPS) - 1n) / (bps - PAYSTACK_RATE_BPS)
  // Verify rounding didn't undershoot
  const fee = (gross * PAYSTACK_RATE_BPS) / bps + PAYSTACK_FIXED_KOBO
  if (gross - fee < netKobo) return gross + 1n
  return gross
}

/**
 * Paystack transfer fee charged against creator payouts (deducted from withdrawal).
 * ≤₦5,000 → ₦10; ≤₦50,000 → ₦25; >₦50,000 → ₦50
 */
export function paystackTransferFee(amountKobo: bigint): bigint {
  if (amountKobo <= 500_000n)  return 1_000n   // ₦10
  if (amountKobo <= 5_000_000n) return 2_500n  // ₦25
  return 5_000n                                 // ₦50
}

/** Compute creator level from total XP. level = floor((xp/100)^(1/1.6)) */
export function xpToLevel(xp: number): number {
  if (xp <= 0) return 1
  return Math.max(1, Math.floor(Math.pow(xp / 100, 1 / 1.6)))
}
