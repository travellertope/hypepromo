import { eq, desc } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { db } from '@promoet/db/client'
import { withdrawals, creators } from '@promoet/db/schema'
import { requireAdmin } from '../../plugins/require-role.ts'
import { initiateTransfer } from '../payments/paystack.ts'

function generateTransferRef(): string {
  return `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export default async function adminWithdrawalRoutes(app: FastifyInstance) {
  // List pending withdrawals
  app.get('/admin/withdrawals', { preHandler: requireAdmin }, async (_req, rep) => {
    const rows = await db
      .select({
        id: withdrawals.id,
        creatorId: withdrawals.creatorId,
        amountKobo: withdrawals.amountKobo,
        feeKobo: withdrawals.feeKobo,
        netKobo: withdrawals.netKobo,
        status: withdrawals.status,
        createdAt: withdrawals.createdAt,
        handle: creators.handle,
        bankAccountName: creators.bankAccountName,
        bankAccountNumber: creators.bankAccountNumber,
        paystackRecipientCode: creators.paystackRecipientCode,
      })
      .from(withdrawals)
      .innerJoin(creators, eq(creators.id, withdrawals.creatorId))
      .where(eq(withdrawals.status, 'pending'))
      .orderBy(desc(withdrawals.createdAt))
      .limit(100)

    return rep.send({
      items: rows.map(r => ({
        ...r,
        amountKobo: Number(r.amountKobo),
        feeKobo: Number(r.feeKobo),
        netKobo: Number(r.netKobo),
      })),
    })
  })

  // Approve withdrawal — triggers Paystack transfer
  app.post('/admin/withdrawals/:id/approve', { preHandler: requireAdmin }, async (req, rep) => {
    const { id } = req.params as { id: string }

    const [w] = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, id))
      .limit(1)

    if (!w) return rep.status(404).send({ error: 'Withdrawal not found' })
    if (w.status !== 'pending') return rep.status(409).send({ error: 'Withdrawal is not pending' })

    // Look up recipient code
    const [creator] = await db
      .select({ paystackRecipientCode: creators.paystackRecipientCode })
      .from(creators)
      .where(eq(creators.id, w.creatorId))
      .limit(1)

    if (!creator?.paystackRecipientCode) {
      return rep.status(422).send({ error: 'Creator has no Paystack recipient' })
    }

    const reference = generateTransferRef()

    let transfer
    try {
      transfer = await initiateTransfer({
        recipientCode: creator.paystackRecipientCode,
        amountKobo: Number(w.netKobo),
        reference,
        reason: `Promoet creator payout`,
      })
    } catch (err: any) {
      await db
        .update(withdrawals)
        .set({ status: 'failed', failureReason: err.message, updatedAt: new Date() })
        .where(eq(withdrawals.id, id))
      return rep.status(502).send({ error: 'Paystack transfer failed', detail: err.message })
    }

    await db
      .update(withdrawals)
      .set({
        status: 'approved',
        paystackTransferCode: transfer.transfer_code,
        paystackReference: reference,
        reviewedBy: req.authUser.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(withdrawals.id, id))

    return rep.send({ ok: true, transferCode: transfer.transfer_code })
  })

  // Reject withdrawal
  app.post('/admin/withdrawals/:id/reject', { preHandler: requireAdmin }, async (req, rep) => {
    const { id } = req.params as { id: string }
    const body = req.body as { reason?: string }

    const [w] = await db
      .select({ status: withdrawals.status })
      .from(withdrawals)
      .where(eq(withdrawals.id, id))
      .limit(1)

    if (!w) return rep.status(404).send({ error: 'Withdrawal not found' })
    if (w.status !== 'pending') return rep.status(409).send({ error: 'Withdrawal is not pending' })

    await db
      .update(withdrawals)
      .set({
        status: 'cancelled',
        failureReason: body.reason ?? 'Rejected by admin',
        reviewedBy: req.authUser.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(withdrawals.id, id))

    // TODO: reverse the ledger entry so creator gets funds back
    // (deferred to Phase 2 — for now admin must manually re-credit)

    return rep.send({ ok: true })
  })
}
