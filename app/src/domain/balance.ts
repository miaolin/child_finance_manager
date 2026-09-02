/**
 * The single definition of "how much money do they have".
 * Derived on every read, so editing or deleting history can never leave a
 * stale balance behind.
 */

import type { Id, Transaction } from './types.ts'

export function balanceCents(transactions: Transaction[], childId: Id): number {
  return transactions.reduce((total, tx) => {
    if (tx.childId !== childId) return total
    return tx.kind === 'in' ? total + tx.amountCents : total - tx.amountCents
  }, 0)
}

export function totalsFor(
  transactions: Transaction[],
  childId: Id,
): { inCents: number; outCents: number; balanceCents: number } {
  let inCents = 0
  let outCents = 0
  for (const tx of transactions) {
    if (tx.childId !== childId) continue
    if (tx.kind === 'in') inCents += tx.amountCents
    else outCents += tx.amountCents
  }
  return { inCents, outCents, balanceCents: inCents - outCents }
}

/** Newest day first; within a day, most recently entered first. */
export function sortForDisplay(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.occurredOn !== b.occurredOn) return a.occurredOn < b.occurredOn ? 1 : -1
    return a.createdAt < b.createdAt ? 1 : -1
  })
}

export function groupByDay(transactions: Transaction[]): [string, Transaction[]][] {
  const days = new Map<string, Transaction[]>()
  for (const tx of sortForDisplay(transactions)) {
    const bucket = days.get(tx.occurredOn)
    if (bucket) bucket.push(tx)
    else days.set(tx.occurredOn, [tx])
  }
  return [...days.entries()]
}
