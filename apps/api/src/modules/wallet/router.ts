import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireCreator } from '../../plugins/require-role.ts'
import {
  getWallet,
  listEarnings,
  getBankAccount,
  setBankAccount,
  requestWithdrawal,
  listWithdrawals,
} from './service.ts'
import { resolveBankAccount } from '../payments/paystack.ts'

const SetBankSchema = z.object({
  bankCode: z.string().min(1),
  bankAccountNumber: z.string().regex(/^\d{10}$/, 'must be 10 digits'),
})

const WithdrawSchema = z.object({
  amountKobo: z.number().int().positive(),
})

export default async function walletRoutes(app: FastifyInstance) {
  app.get('/me/wallet', { preHandler: requireCreator }, async (req, rep) => {
    const wallet = await getWallet(req.authUser.id)
    return rep.send(wallet)
  })

  app.get('/me/earnings', { preHandler: requireCreator }, async (req, rep) => {
    const q = req.query as Record<string, string>
    const result = await listEarnings(
      req.authUser.id,
      q['cursor'],
      q['limit'] ? Number(q['limit']) : 20,
    )
    return rep.send(result)
  })

  app.get('/me/bank-account', { preHandler: requireCreator }, async (req, rep) => {
    const account = await getBankAccount(req.authUser.id)
    if (!account) return rep.status(404).send({ error: 'No bank account on file' })
    return rep.send(account)
  })

  app.post('/me/bank-account', { preHandler: requireCreator }, async (req, rep) => {
    const body = SetBankSchema.safeParse(req.body)
    if (!body.success) return rep.status(400).send({ error: body.error.flatten() })

    // Validate account number via Paystack
    let resolved: { account_name: string; account_number: string } | null = null
    try {
      resolved = await resolveBankAccount(body.data.bankCode, body.data.bankAccountNumber)
    } catch {
      return rep.status(422).send({ error: 'Could not verify bank account with Paystack' })
    }

    // Create Paystack transfer recipient
    let recipientCode: string
    try {
      const resp = await createPaystackRecipient({
        name: resolved.account_name,
        accountNumber: body.data.bankAccountNumber,
        bankCode: body.data.bankCode,
      })
      recipientCode = resp.recipient_code
    } catch {
      return rep.status(422).send({ error: 'Could not create Paystack transfer recipient' })
    }

    const account = await setBankAccount({
      creatorId: req.authUser.id,
      bankCode: body.data.bankCode,
      bankAccountNumber: body.data.bankAccountNumber,
      bankAccountName: resolved.account_name,
      paystackRecipientCode: recipientCode,
    })

    return rep.send(account)
  })

  app.post('/me/withdrawals', { preHandler: requireCreator }, async (req, rep) => {
    const body = WithdrawSchema.safeParse(req.body)
    if (!body.success) return rep.status(400).send({ error: body.error.flatten() })

    try {
      const w = await requestWithdrawal(req.authUser.id, BigInt(body.data.amountKobo))
      return rep.status(201).send(w)
    } catch (err: any) {
      if (err.message === 'BELOW_MINIMUM') return rep.status(400).send({ error: 'Amount below minimum withdrawal' })
      if (err.message === 'INSUFFICIENT_BALANCE') return rep.status(400).send({ error: 'Insufficient available balance' })
      if (err.message === 'NO_BANK_ACCOUNT') return rep.status(400).send({ error: 'Set a bank account before withdrawing' })
      throw err
    }
  })

  app.get('/me/withdrawals', { preHandler: requireCreator }, async (req, rep) => {
    const list = await listWithdrawals(req.authUser.id)
    return rep.send({ items: list })
  })
}

// Inline helper — avoids circular import with payments module
async function createPaystackRecipient(opts: {
  name: string
  accountNumber: string
  bankCode: string
}): Promise<{ recipient_code: string }> {
  const key = process.env['PAYSTACK_SECRET_KEY']
  if (!key) throw new Error('PAYSTACK_SECRET_KEY not set')

  const res = await fetch('https://api.paystack.co/transferrecipient', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'nuban',
      name: opts.name,
      account_number: opts.accountNumber,
      bank_code: opts.bankCode,
      currency: 'NGN',
    }),
  })

  if (!res.ok) throw new Error(`Paystack error: ${res.status}`)
  const json = (await res.json()) as { data: { recipient_code: string } }
  return json.data
}
