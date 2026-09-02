/**
 * Can this child record this spend?
 *
 * A limit is a rule about recording, not a lock on the money: the child is
 * told which limit they hit and by how much, so the number they are shown is
 * something they can act on rather than a flat refusal.
 */

import type { Child, Transaction } from './types.ts'

export interface LimitBreach {
  kind: 'per-purchase' | 'per-week'
  limitCents: number
  /** What the spend would total against that limit. */
  wouldBeCents: number
  overByCents: number
}

/** Monday-start week containing `iso`, as [start, end] inclusive YYYY-MM-DD. */
export function weekBounds(iso: string): [string, string] {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  const offsetToMonday = (date.getDay() + 6) % 7
  const start = new Date(date)
  start.setDate(date.getDate() - offsetToMonday)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  const fmt = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(
      x.getDate(),
    ).padStart(2, '0')}`
  return [fmt(start), fmt(end)]
}

/**
 * The first limit this spend would break, or null if it is within the rules.
 * `excludeTransactionId` lets an edit weigh itself against the week without
 * counting its own old amount twice.
 */
export function checkSpend({
  child,
  transactions,
  amountCents,
  occurredOn,
  excludeTransactionId,
}: {
  child: Child
  transactions: Transaction[]
  amountCents: number
  occurredOn: string
  excludeTransactionId?: string
}): LimitBreach | null {
  const limits = child.limits
  if (!limits) return null

  const perPurchase = limits.perPurchaseCents
  if (perPurchase && perPurchase > 0 && amountCents > perPurchase) {
    return {
      kind: 'per-purchase',
      limitCents: perPurchase,
      wouldBeCents: amountCents,
      overByCents: amountCents - perPurchase,
    }
  }

  const perWeek = limits.perWeekCents
  if (perWeek && perWeek > 0) {
    const [start, end] = weekBounds(occurredOn)
    const alreadySpent = transactions.reduce((total, tx) => {
      if (tx.childId !== child.id || tx.kind !== 'out') return total
      if (tx.id === excludeTransactionId) return total
      if (tx.occurredOn < start || tx.occurredOn > end) return total
      return total + tx.amountCents
    }, 0)

    const wouldBe = alreadySpent + amountCents
    if (wouldBe > perWeek) {
      return {
        kind: 'per-week',
        limitCents: perWeek,
        wouldBeCents: wouldBe,
        overByCents: wouldBe - perWeek,
      }
    }
  }

  return null
}
