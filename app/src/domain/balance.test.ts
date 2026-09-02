import { describe, expect, it } from 'vitest'
import { balanceCents, groupByDay, sortForDisplay, totalsFor } from './balance.ts'
import { parseAmountToCents } from './money.ts'
import type { Transaction } from './types.ts'

let seq = 0
function tx(childId: string, kind: 'in' | 'out', cents: number, day = '2026-09-01'): Transaction {
  seq += 1
  const stamp = `2026-09-01T00:00:${String(seq).padStart(2, '0')}.000Z`
  return {
    id: `t${seq}`,
    childId,
    amountCents: cents,
    kind,
    categoryId: kind === 'in' ? 'allowance' : 'snacks',
    note: '',
    occurredOn: day,
    createdAt: stamp,
    updatedAt: stamp,
  }
}

describe('balanceCents', () => {
  it('is income minus spending', () => {
    const all = [tx('a', 'in', 2000), tx('a', 'out', 350), tx('a', 'out', 500)]
    expect(balanceCents(all, 'a')).toBe(1150)
  })

  it('keeps each child separate', () => {
    const all = [tx('a', 'in', 2000), tx('b', 'in', 500), tx('b', 'out', 100)]
    expect(balanceCents(all, 'a')).toBe(2000)
    expect(balanceCents(all, 'b')).toBe(400)
  })

  it('is zero for a child with no transactions', () => {
    expect(balanceCents([tx('a', 'in', 100)], 'nobody')).toBe(0)
  })

  it('can go negative, which surfaces a recording mistake rather than hiding it', () => {
    expect(balanceCents([tx('a', 'out', 500)], 'a')).toBe(-500)
  })

  it('accumulates many small amounts without drift', () => {
    // 0.1 + 0.2 in floats is 0.30000000000000004; in cents it is exactly 30.
    const dimes = Array.from({ length: 100 }, () => tx('a', 'in', parseAmountToCents('0.1')!))
    expect(balanceCents(dimes, 'a')).toBe(1000)
  })
})

describe('totalsFor', () => {
  it('reports income and spending alongside the balance', () => {
    const all = [tx('a', 'in', 2000), tx('a', 'out', 350), tx('b', 'in', 999)]
    expect(totalsFor(all, 'a')).toEqual({ inCents: 2000, outCents: 350, balanceCents: 1650 })
  })
})

describe('ordering', () => {
  it('puts the newest day first', () => {
    const older = tx('a', 'in', 100, '2026-08-30')
    const newer = tx('a', 'in', 100, '2026-09-02')
    expect(sortForDisplay([older, newer]).map((t) => t.occurredOn)).toEqual([
      '2026-09-02',
      '2026-08-30',
    ])
  })

  it('groups transactions under their day', () => {
    const groups = groupByDay([
      tx('a', 'in', 100, '2026-09-02'),
      tx('a', 'out', 50, '2026-09-02'),
      tx('a', 'in', 100, '2026-08-30'),
    ])
    expect(groups.map(([day, items]) => [day, items.length])).toEqual([
      ['2026-09-02', 2],
      ['2026-08-30', 1],
    ])
  })
})
