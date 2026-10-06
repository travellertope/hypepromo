import { eq, and, desc, lte, sql } from 'drizzle-orm'
import { db } from '@promoet/db/client'
import {
  creators,
  withdrawals,
  clicks,
  referralLinks,
  quests,
} from '@promoet/db/schema'
import {
  getCreatorBalances,
  buildWithdrawal,
  postTransaction,
} from '@promoet/ledger'
import { MIN_WITHDRAWAL_KOBO, paystackTransferFee } from '@promoet/config'
import { encodeCursor, decodeCursor } from '@promoet/schemas'

// ── Wallet balance ───────────────────────────────────────────────────────────

export async function getWallet(creatorId: string) {
  const { pendingKobo, availableKobo } = await getCreatorBalances(db, creatorId)

  // Lifetime = sum of all creator_unit amounts from released valid clicks
  const [lifetimeRow] = await db
    .select({ total: sql<string>`coalesce(sum(${clicks.creatorUnitKobo}), 0)` })
    .from(clicks)
    .innerJoin(referralLinks, eq(referralLinks.id, clicks.linkId))
    .innerJoin(quests, eq(quests.id, referralLinks.questId))
    .where(
      and(
        eq(quests.creatorId, creatorId),
        eq(clicks.status, 'released'),
      ),
    )

  const lifetimeKobo = BigInt(lifetimeRow?.total ?? '0')

  return {
    pendingKobo: Number(pendingKobo),
    availableKobo: Number(availableKobo),
    lifetimeKobo: Number(lifetimeKobo),
  }
}

// ── Earnings feed ────────────────────────────────────────────────────────────

export async function listEarnings(creatorId: string, cursor?: string, limit = 20) {
  const safeLimit = Math.min(limit, 100)
  let rows

  if (cursor) {
    const decoded = decodeCursor(cursor)
    if (!decoded) throw new Error('INVALID_CURSOR')

    rows = await db
      .select({
        id: clicks.id,
        status: clicks.status,
        creatorUnitKobo: clicks.creatorUnitKobo,
        heldUntil: clicks.heldUntil,
        releasedAt: clicks.releasedAt,
        clickedAt: clicks.clickedAt,
        platform: referralLinks.platform,
      })
      .from(clicks)
      .innerJoin(referralLinks, eq(referralLinks.id, clicks.linkId))
      .innerJoin(quests, eq(quests.id, referralLinks.questId))
      .where(
        and(
          eq(quests.creatorId, creatorId),
          lte(clicks.clickedAt, decoded.createdAt),
        ),
      )
      .orderBy(desc(clicks.clickedAt))
      .limit(safeLimit + 1)
  } else {
    rows = await db
      .select({
        id: clicks.id,
        status: clicks.status,
        creatorUnitKobo: clicks.creatorUnitKobo,
        heldUntil: clicks.heldUntil,
        releasedAt: clicks.releasedAt,
        clickedAt: clicks.clickedAt,
        platform: referralLinks.platform,
      })
      .from(clicks)
      .innerJoin(referralLinks, eq(referralLinks.id, clicks.linkId))
      .innerJoin(quests, eq(quests.id, referralLinks.questId))
      .where(eq(quests.creatorId, creatorId))
      .orderBy(desc(clicks.clickedAt))
      .limit(safeLimit + 1)
  }

  const hasMore = rows.length > safeLimit
  const items = hasMore ? rows.slice(0, safeLimit) : rows
  const nextCursor = hasMore && items.length > 0
    ? encodeCursor(items[items.length - 1]!.clickedAt, items[items.length - 1]!.id)
    : undefined

  return {
    items: items.map(r => ({
      ...r,
      creatorUnitKobo: Number(r.creatorUnitKobo),
    })),
    nextCursor,
  }
}

// ── Bank account ─────────────────────────────────────────────────────────────

export interface SetBankAccountInput {
  creatorId: string
  bankCode: string
  bankAccountNumber: string
  bankAccountName: string
  paystackRecipientCode: string
}

export async function setBankAccount(input: SetBankAccountInput) {
  const [row] = await db
    .update(creators)
    .set({
      bankCode: input.bankCode,
      bankAccountNumber: input.bankAccountNumber,
      bankAccountName: input.bankAccountName,
      paystackRecipientCode: input.paystackRecipientCode,
      updatedAt: new Date(),
    })
    .where(eq(creators.id, input.creatorId))
    .returning({
      bankCode: creators.bankCode,
      bankAccountNumber: creators.bankAccountNumber,
      bankAccountName: creators.bankAccountName,
    })

  return row
}

export async function getBankAccount(creatorId: string) {
  const [row] = await db
    .select({
      bankCode: creators.bankCode,
      bankAccountNumber: creators.bankAccountNumber,
      bankAccountName: creators.bankAccountName,
      paystackRecipientCode: creators.paystackRecipientCode,
    })
    .from(creators)
    .where(eq(creators.id, creatorId))
    .limit(1)

  return row ?? null
}

// ── Withdrawals ──────────────────────────────────────────────────────────────

export async function requestWithdrawal(creatorId: string, amountKobo: bigint) {
  if (amountKobo < BigInt(MIN_WITHDRAWAL_KOBO)) throw new Error('BELOW_MINIMUM')

  const { availableKobo } = await getCreatorBalances(db, creatorId)
  if (amountKobo > availableKobo) throw new Error('INSUFFICIENT_BALANCE')

  const [creator] = await db
    .select({ paystackRecipientCode: creators.paystackRecipientCode })
    .from(creators)
    .where(eq(creators.id, creatorId))
    .limit(1)

  if (!creator?.paystackRecipientCode) throw new Error('NO_BANK_ACCOUNT')

  const feeKobo = paystackTransferFee(amountKobo)
  const netKobo = amountKobo - feeKobo

  const [withdrawal] = await db.transaction(async (tx) => {
    const [w] = await tx
      .insert(withdrawals)
      .values({ creatorId, amountKobo, feeKobo, netKobo })
      .returning()

    if (!w) throw new Error('INSERT_FAILED')

    const ledgerTx = buildWithdrawal({ creatorId, amountKobo, feeKobo, refId: w.id })
    await postTransaction(tx as any, ledgerTx)

    return [w]
  })

  return {
    ...withdrawal,
    amountKobo: Number(withdrawal?.amountKobo),
    feeKobo: Number(withdrawal?.feeKobo),
    netKobo: Number(withdrawal?.netKobo),
  }
}

export async function listWithdrawals(creatorId: string) {
  const rows = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.creatorId, creatorId))
    .orderBy(desc(withdrawals.createdAt))
    .limit(50)

  return rows.map(r => ({
    ...r,
    amountKobo: Number(r.amountKobo),
    feeKobo: Number(r.feeKobo),
    netKobo: Number(r.netKobo),
  }))
}
