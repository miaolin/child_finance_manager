/**
 * All money crosses this module. Amounts are integer cents; the only place
 * a decimal exists is the string a human reads or types.
 */

import type { Settings } from './types.ts'

/** Parses "12.50", "12,50", "$12.50" or "12" into 1250. Returns null if unusable. */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[^\d.,-]/g, '').replace(',', '.')
  if (cleaned === '' || cleaned === '.' || cleaned === '-') return null

  const asNumber = Number(cleaned)
  if (!Number.isFinite(asNumber)) return null

  // Round at the cent boundary so 0.1 + 0.2 style drift can never enter storage.
  const cents = Math.round(asNumber * 100)
  return Number.isSafeInteger(cents) ? cents : null
}

export function formatCents(cents: number, settings: Settings): string {
  return new Intl.NumberFormat(settings.locale, {
    style: 'currency',
    currency: settings.currency,
  }).format(cents / 100)
}

/** Formatted with an explicit direction, e.g. "+$5.00" or "−$3.50". */
export function formatSignedCents(
  cents: number,
  kind: 'in' | 'out',
  settings: Settings,
): string {
  return `${kind === 'in' ? '+' : '−'}${formatCents(cents, settings)}`
}

export function isValidAmountCents(cents: number): boolean {
  return Number.isSafeInteger(cents) && cents > 0
}
