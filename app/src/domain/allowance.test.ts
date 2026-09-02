import { describe, expect, it } from 'vitest'
import { allowanceDatesOwed } from './allowance.ts'
import type { Child } from './types.ts'

function child(allowance?: Child['allowance'], createdAt = '2026-01-01T00:00:00.000Z'): Child {
  return {
    id: 'c1', name: 'Mia', emoji: '🦊', color: '#000',
    createdAt, updatedAt: createdAt, allowance,
  }
}

describe('allowanceDatesOwed', () => {
  it('owes nothing without a rule', () => {
    expect(allowanceDatesOwed(child(), '2026-09-02')).toEqual([])
  })

  it('owes nothing when the cadence is off or the amount is zero', () => {
    expect(
      allowanceDatesOwed(child({ amountCents: 500, cadence: 'none', anchor: 1 }), '2026-09-02'),
    ).toEqual([])
    expect(
      allowanceDatesOwed(child({ amountCents: 0, cadence: 'weekly', anchor: 1 }), '2026-09-02'),
    ).toEqual([])
  })

  it('pays weekly on the chosen weekday', () => {
    // Anchor 1 = Monday. 2026-09-02 is a Wednesday.
    const owed = allowanceDatesOwed(
      child({ amountCents: 500, cadence: 'weekly', anchor: 1, lastPaidOn: '2026-08-10' }),
      '2026-09-02',
    )
    expect(owed).toEqual(['2026-08-17', '2026-08-24', '2026-08-31'])
    expect(new Set(owed.map((d) => new Date(`${d}T00:00`).getDay()))).toEqual(new Set([1]))
  })

  it('catches up every missed week, not just the most recent', () => {
    const owed = allowanceDatesOwed(
      child({ amountCents: 500, cadence: 'weekly', anchor: 1, lastPaidOn: '2026-06-01' }),
      '2026-09-02',
    )
    expect(owed.length).toBeGreaterThan(10)
  })

  it('owes nothing twice for the same period', () => {
    const rule = { amountCents: 500, cadence: 'weekly' as const, anchor: 1 }
    const owed = allowanceDatesOwed(child({ ...rule, lastPaidOn: '2026-08-10' }), '2026-09-02')
    const lastPaid = owed[owed.length - 1]
    // Paying up to the last owed date leaves nothing further owed the same day.
    expect(allowanceDatesOwed(child({ ...rule, lastPaidOn: lastPaid }), '2026-09-02')).toEqual([])
  })

  it('does not back-pay before the child existed', () => {
    const owed = allowanceDatesOwed(
      child({ amountCents: 500, cadence: 'weekly', anchor: 1 }, '2026-08-24T00:00:00.000Z'),
      '2026-09-02',
    )
    expect(owed).toEqual(['2026-08-31'])
  })

  it('pays monthly on the chosen day', () => {
    const owed = allowanceDatesOwed(
      child({ amountCents: 2000, cadence: 'monthly', anchor: 15, lastPaidOn: '2026-06-15' }),
      '2026-09-02',
    )
    expect(owed).toEqual(['2026-07-15', '2026-08-15'])
  })

  it('clamps a monthly anchor past the 28th so every month has that day', () => {
    const owed = allowanceDatesOwed(
      child({ amountCents: 2000, cadence: 'monthly', anchor: 31, lastPaidOn: '2026-06-01' }),
      '2026-09-02',
    )
    expect(owed).toEqual(['2026-06-28', '2026-07-28', '2026-08-28'])
  })
})
