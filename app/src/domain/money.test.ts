import { describe, expect, it } from 'vitest'
import { formatCents, formatSignedCents, isValidAmountCents, parseAmountToCents } from './money.ts'
import type { Settings } from './types.ts'

const settings: Settings = { currency: 'USD', locale: 'en-US', parentName: 'Parent' }

describe('parseAmountToCents', () => {
  it('parses plain and decimal amounts', () => {
    expect(parseAmountToCents('12')).toBe(1200)
    expect(parseAmountToCents('12.50')).toBe(1250)
    expect(parseAmountToCents('0.05')).toBe(5)
  })

  it('tolerates currency symbols, spaces and comma decimals', () => {
    expect(parseAmountToCents(' $12.50 ')).toBe(1250)
    expect(parseAmountToCents('12,50')).toBe(1250)
  })

  it('rejects input that is not a usable amount', () => {
    expect(parseAmountToCents('')).toBeNull()
    expect(parseAmountToCents('abc')).toBeNull()
    expect(parseAmountToCents('.')).toBeNull()
  })

  it('rounds at the cent boundary so no fraction of a cent is ever stored', () => {
    expect(parseAmountToCents('0.1')).toBe(10)
    expect(parseAmountToCents('3.333')).toBe(333)
    expect(Number.isInteger(parseAmountToCents('19.99') as number)).toBe(true)
  })
})

describe('formatting', () => {
  it('renders cents as currency', () => {
    expect(formatCents(1250, settings)).toBe('$12.50')
    expect(formatCents(0, settings)).toBe('$0.00')
  })

  it('shows direction explicitly', () => {
    expect(formatSignedCents(500, 'in', settings)).toBe('+$5.00')
    expect(formatSignedCents(350, 'out', settings)).toBe('−$3.50')
  })
})

describe('isValidAmountCents', () => {
  it('accepts only positive whole cents', () => {
    expect(isValidAmountCents(1)).toBe(true)
    expect(isValidAmountCents(0)).toBe(false)
    expect(isValidAmountCents(-100)).toBe(false)
    expect(isValidAmountCents(10.5)).toBe(false)
  })
})
