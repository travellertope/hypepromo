// Persists a Transaction to the DB inside a single Postgres transaction.
// Auto-creates any ledger accounts that don't exist yet (upsert-on-conflict).
// Validates the double-entry invariant before writing.

import { eq, inArray } from 'drizzle-orm'
import { ledgerAccounts, journalEntries, journalLines } from '@promoet/db/schema'
import type { DB } from '@promoet/db/client'
import { inferAccountMeta } from './accounts.ts'
import { linesBalance } from './transactions.ts'
import type { Transaction } from './types.ts'

export interface PostResult {
  entryId: string
}

export async function postTransaction(db: DB, tx: Transaction): Promise<PostResult> {
  if (!linesBalance(tx.lines)) {
    const sum = tx.lines.reduce((s, l) => s + l.amountKobo, 0n)
    throw new Error(`Transaction does not balance: sum=${sum} (${tx.refType}:${tx.refId})`)
  }
  if (tx.lines.some(l => l.amountKobo === 0n)) {
    throw new Error(`Transaction has a zero-amount line (${tx.refType}:${tx.refId})`)
  }
  if (tx.lines.length < 2) {
    throw new Error(`Transaction must have at least 2 lines`)
  }

  return db.transaction(async (pgTx) => {
    // Ensure all referenced accounts exist
    const codes = [...new Set(tx.lines.map(l => l.accountCode))]
    const existing = await pgTx
      .select({ id: ledgerAccounts.id, code: ledgerAccounts.code })
      .from(ledgerAccounts)
      .where(inArray(ledgerAccounts.code, codes))

    const existingCodes = new Set(existing.map(a => a.code))
    const missing = codes.filter(c => !existingCodes.has(c))

    if (missing.length > 0) {
      await pgTx.insert(ledgerAccounts)
        .values(missing.map(code => {
          const meta = inferAccountMeta(code)
          return { code, name: meta.name, type: meta.type, ownerId: meta.ownerId }
        }))
        .onConflictDoNothing()
    }

    // Re-fetch to get all IDs (including just-inserted)
    const allAccounts = await pgTx
      .select({ id: ledgerAccounts.id, code: ledgerAccounts.code })
      .from(ledgerAccounts)
      .where(inArray(ledgerAccounts.code, codes))

    const accountMap = new Map(allAccounts.map(a => [a.code, a.id]))
    for (const code of codes) {
      if (!accountMap.has(code)) throw new Error(`Failed to resolve account: ${code}`)
    }

    // Insert journal entry
    const [entry] = await pgTx
      .insert(journalEntries)
      .values({ refType: tx.refType, refId: tx.refId, memo: tx.memo })
      .returning({ id: journalEntries.id })

    if (!entry) throw new Error('Failed to insert journal entry')

    // Insert all lines
    await pgTx.insert(journalLines).values(
      tx.lines.map(line => ({
        entryId: entry.id,
        accountId: accountMap.get(line.accountCode)!,
        amountKobo: line.amountKobo,
      }))
    )

    return { entryId: entry.id }
  })
}
