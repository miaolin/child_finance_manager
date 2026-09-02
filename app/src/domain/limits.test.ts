import { describe, expect, it } from 'vitest'
import { checkSpend, weekBounds } from './limits.ts'
import type { Child, Transaction } from './types.ts'

function child(limits?: Child['limits']): Child {
  return {
    id: 'c1', name: 'Mia', emoji: '🦊', color: '#000',
    createdAt: '2026-01-01T00:00:00.000Z', limits,
  }
}

let seq = 0
function spend(cents: number, occurredOn: string, childId = 'c1'): Transaction {
  seq += 1
  return {
    id: `t${seq}`, childId, amountCents: cents, kind: 'out',
    categoryId: 'snacks', note: '', occurredOn,
    createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
  }
}

describe('weekBounds', () => {
  it('runs Monday to Sunday around the given day', () => {
    // 2026-09-02 is a Wednesday.
    expect(weekBounds('2026-09-02')).toEqual(['2026-08-31', '2026-09-06'])
  })

  it('keeps a Sunday in the week that began the Monday before', () => {
    expect(weekBounds('2026-09-06')).toEqual(['2026-08-31', '2026-09-06'])
  })
})

describe('checkSpend', () => {
  const base = { transactions: [], occurredOn: '2026-09-02' }

  it('allows anything when no limits are set', () => {
    expect(checkSpend({ ...base, child: child(), amountCents: 100000 })).toBeNull()
  })

  it('allows a spend equal to the per-purchase limit', () => {
    expect(
      checkSpend({ ...base, child: child({ perPurchaseCents: 1000 }), amountCents: 1000 }),
    ).toBeNull()
  })

  it('reports a per-purchase breach with how far over it is', () => {
    const breach = checkSpend({
      ...base, child: child({ perPurchaseCents: 1000 }), amountCents: 1250,
    })
    expect(breach).toEqual({
      kind: 'per-purchase', limitCents: 1000, wouldBeCents: 1250, overByCents: 250,
    })
  })

  it('counts the rest of the week toward a weekly limit', () => {
    const breach = checkSpend({
      child: child({ perWeekCents: 2000 }),
      transactions: [spend(1500, '2026-08-31'), spend(300, '2026-09-01')],
      amountCents: 400,
      occurredOn: '2026-09-02',
    })
    expect(breach).toMatchObject({ kind: 'per-week', wouldBeCents: 2200, overByCents: 200 })
  })

  it('ignores spending from other weeks and other children', () => {
    expect(
      checkSpend({
        child: child({ perWeekCents: 2000 }),
        transactions: [spend(1900, '2026-08-24'), spend(1900, '2026-09-01', 'c2')],
        amountCents: 100,
        occurredOn: '2026-09-02',
      }),
    ).toBeNull()
  })

  it('does not count an edited entry against itself', () => {
    const existing = spend(1900, '2026-09-01')
    expect(
      checkSpend({
        child: child({ perWeekCents: 2000 }),
        transactions: [existing],
        amountCents: 1950,
        occurredOn: '2026-09-01',
        excludeTransactionId: existing.id,
      }),
    ).toBeNull()
  })

  it('checks the per-purchase limit before the weekly one', () => {
    const breach = checkSpend({
      ...base,
      child: child({ perPurchaseCents: 500, perWeekCents: 100 }),
      amountCents: 600,
    })
    expect(breach?.kind).toBe('per-purchase')
  })
})
