// Thin Paystack HTTP client — only the endpoints Phase 1 needs.
// All amounts in kobo (Paystack also uses kobo for NGN).

const BASE = 'https://api.paystack.co'

function headers() {
  const key = process.env['PAYSTACK_SECRET_KEY']
  if (!key) throw new Error('PAYSTACK_SECRET_KEY not set')
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Paystack ${path} ${res.status}: ${text}`)
  }
  const json = (await res.json()) as { data: T }
  return json.data
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: headers() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Paystack ${path} ${res.status}: ${text}`)
  }
  const json = (await res.json()) as { data: T }
  return json.data
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface InitializeResult {
  authorization_url: string
  access_code: string
  reference: string
}

export interface VerifyResult {
  status: string    // 'success' | 'failed' | 'abandoned' ...
  reference: string
  amount: number    // kobo
  customer: { email: string }
}

export interface BankAccountResult {
  account_number: string
  account_name: string
  bank_id: number
}

export interface TransferResult {
  transfer_code: string
  reference: string
  status: string
}

// ── Functions ─────────────────────────────────────────────────────────────────

export async function initializeTransaction(opts: {
  email: string
  amountKobo: number
  reference: string
  callbackUrl?: string
  metadata?: Record<string, unknown>
}): Promise<InitializeResult> {
  return post('/transaction/initialize', {
    email: opts.email,
    amount: opts.amountKobo,
    reference: opts.reference,
    callback_url: opts.callbackUrl,
    metadata: opts.metadata,
  })
}

export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  return get(`/transaction/verify/${encodeURIComponent(reference)}`)
}

export async function resolveBankAccount(
  bankCode: string,
  accountNumber: string,
): Promise<BankAccountResult> {
  return get(`/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`)
}

export async function initiateTransfer(opts: {
  recipientCode: string
  amountKobo: number
  reference: string
  reason?: string
}): Promise<TransferResult> {
  return post('/transfer', {
    source: 'balance',
    recipient: opts.recipientCode,
    amount: opts.amountKobo,
    reference: opts.reference,
    reason: opts.reason ?? 'Creator payout',
  })
}
