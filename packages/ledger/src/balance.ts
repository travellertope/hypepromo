// Query the current balance of a ledger account.
// Balance = sum of all journal_lines.amount_kobo for that account.
// Positive balance on a liability account = platform owes that amount.

import { eq, sql } from 'drizzle-orm'
import { ledgerAccounts, journalLines } from '@promoet/db/schema'
import type { DB } from '@promoet/db/client'

export async function getBalance(db: DB, accountCode: string): Promise<bigint> {
  const [account] = await db
    .select({ id: ledgerAccounts.id })
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.code, accountCode))

  if (!account) return 0n

  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${journalLines.amountKobo}), 0)` })
    .from(journalLines)
    .where(eq(journalLines.accountId, account.id))

  return BigInt(row?.total ?? '0')
}

// Convenience: return creator's pending and available balances together
export async function getCreatorBalances(
  db: DB,
  creatorId: string,
): Promise<{ pendingKobo: bigint; availableKobo: bigint }> {
  const { creatorPending, creatorAvailable } = await import('./accounts.ts')

  const [pending, available] = await Promise.all([
    getBalance(db, creatorPending(creatorId)),
    getBalance(db, creatorAvailable(creatorId)),
  ])

  // Liability accounts: negative sum = we owe that amount (credits > debits)
  return {
    pendingKobo:   pending   < 0n ? -pending   : 0n,
    availableKobo: available < 0n ? -available : 0n,
  }
}
