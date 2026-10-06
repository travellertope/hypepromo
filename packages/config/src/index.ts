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
