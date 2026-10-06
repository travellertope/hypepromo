// Well-known ledger account codes.
// Platform accounts: no ownerId. User accounts: scoped by UUID.
// Format is deliberate — inferAccountMeta() below relies on the prefix pattern.

export const PLATFORM_CASH        = 'platform:cash'
export const PLATFORM_REVENUE     = 'platform:revenue'
export const PLATFORM_VAT_PAYABLE = 'platform:vat'

export const advertiserWallet   = (id: string) => `advertiser:${id}`
export const creatorPending     = (id: string) => `creator:pending:${id}`
export const creatorAvailable   = (id: string) => `creator:available:${id}`

// ---------------------------------------------------------------------------
// Account meta — used by post() to auto-create unknown accounts on first use
// ---------------------------------------------------------------------------

type AccountType = 'asset' | 'liability' | 'revenue' | 'expense'

export interface AccountMeta {
  type: AccountType
  name: string
  ownerId: string | null
}

export function inferAccountMeta(code: string): AccountMeta {
  if (code === PLATFORM_CASH)        return { type: 'asset',     name: 'Platform Cash',          ownerId: null }
  if (code === PLATFORM_REVENUE)     return { type: 'revenue',   name: 'Platform Revenue',        ownerId: null }
  if (code === PLATFORM_VAT_PAYABLE) return { type: 'liability', name: 'Platform VAT Payable',    ownerId: null }

  if (code.startsWith('advertiser:')) {
    const id = code.slice('advertiser:'.length)
    return { type: 'liability', name: `Advertiser Wallet`, ownerId: id }
  }
  if (code.startsWith('creator:pending:')) {
    const id = code.slice('creator:pending:'.length)
    return { type: 'liability', name: `Creator Pending`, ownerId: id }
  }
  if (code.startsWith('creator:available:')) {
    const id = code.slice('creator:available:'.length)
    return { type: 'liability', name: `Creator Available`, ownerId: id }
  }

  throw new Error(`Unknown ledger account code: ${code}`)
}
