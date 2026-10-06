import { eq } from 'drizzle-orm'
import { createHmac } from 'node:crypto'
import { db } from '@promoet/db/client'
import { paystackPayments, advertisers, users } from '@promoet/db/schema'
import { grossUpPaystack } from '@promoet/config'
import { buildFunding, postTransaction } from '@promoet/ledger'
import { initializeTransaction } from './paystack.ts'

function generateReference(): string {
  return `pm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

// ── Topup ─────────────────────────────────────────────────────────────────────

export async function initiateTopup(advertiserId: string, netAmountKobo: bigint) {
  // Look up advertiser email via users table
  const [row] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, advertiserId))
    .limit(1)

  if (!row?.email) throw new Error('ADVERTISER_NOT_FOUND')

  const grossKobo = grossUpPaystack(netAmountKobo)
  const reference = generateReference()

  // Store pending payment record
  const [payment] = await db
    .insert(paystackPayments)
    .values({
      advertiserId,
      reference,
      amountKobo: netAmountKobo,
      grossKobo,
    })
    .returning({ id: paystackPayments.id })

  if (!payment) throw new Error('INSERT_FAILED')

  const result = await initializeTransaction({
    email: row.email,
    amountKobo: Number(grossKobo),
    reference,
    callbackUrl: `${process.env['APP_URL'] ?? 'https://promoet.com'}/advertiser/topup/success`,
    metadata: { advertiserId, netAmountKobo: Number(netAmountKobo) },
  })

  return {
    checkoutUrl: result.authorization_url,
    reference,
    grossKobo: Number(grossKobo),
    amountKobo: Number(netAmountKobo),
  }
}

// ── Webhook ───────────────────────────────────────────────────────────────────

export function verifyPaystackSignature(rawBody: Buffer, signature: string): boolean {
  const secret = process.env['PAYSTACK_SECRET_KEY'] ?? ''
  const hash = createHmac('sha512', secret).update(rawBody).digest('hex')
  return hash === signature
}

export async function handlePaystackWebhook(event: string, data: Record<string, unknown>) {
  if (event !== 'charge.success') return { handled: false }

  const reference = data['reference'] as string
  if (!reference) return { handled: false }

  // Find matching pending payment
  const [payment] = await db
    .select()
    .from(paystackPayments)
    .where(eq(paystackPayments.reference, reference))
    .limit(1)

  if (!payment) return { handled: false }

  // Idempotent — if already processed, skip
  if (payment.status === 'success') return { handled: true, idempotent: true }

  // Post ledger funding entry
  await db.transaction(async (tx) => {
    await (tx as any)
      .update(paystackPayments)
      .set({ status: 'success', paystackResponse: data, updatedAt: new Date() })
      .where(eq(paystackPayments.reference, reference))

    const ledgerTx = buildFunding({
      advertiserId: payment.advertiserId,
      amountKobo: payment.amountKobo,
      refId: payment.id,
      memo: `Paystack topup ${reference}`,
    })
    await postTransaction(tx as any, ledgerTx)
  })

  return { handled: true }
}
