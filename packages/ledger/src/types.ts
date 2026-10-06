export type RefType =
  | 'funding'       // advertiser tops up wallet / campaign funded
  | 'click'         // click recorded, amount moves advertiser→creator(pending)+platform
  | 'conversion'    // CPA conversion approved
  | 'hold_release'  // CLICK_HOLD_DAYS elapsed; creator pending→available
  | 'withdrawal'    // creator withdraws; available decreases, cash goes out
  | 'reversal'      // reversal of any prior entry

export interface JournalLine {
  accountCode: string
  amountKobo: bigint  // positive = debit, negative = credit; must never be 0
}

export interface Transaction {
  refType: RefType
  refId: string
  memo?: string
  lines: JournalLine[]
}
