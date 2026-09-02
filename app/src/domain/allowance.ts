/**
 * When is allowance owed?
 *
 * Kept as a pure function of (rule, lastPaidOn, today) so the answer is
 * testable and identical however often the app is opened. Opening the app
 * three times in a day must credit the same allowance once, and an app not
 * opened for a month must credit every week it missed — not just the latest.
 */

import type { Child } from './types.ts'

function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Every date on or before `today` when allowance was due and has not been paid.
 * Oldest first. Empty when there is no rule, no cadence, or nothing is owed.
 */
export function allowanceDatesOwed(child: Child, today: string): string[] {
  const rule = child.allowance
  if (!rule || rule.cadence === 'none' || rule.amountCents <= 0) return []

  const end = toDate(today)
  // With no payment history, start from the day the child was added — so
  // adding a child today does not back-pay a year of allowance.
  const startFrom = rule.lastPaidOn ?? toIso(toDate(child.createdAt.slice(0, 10)))
  const after = toDate(startFrom)

  const due: string[] = []
  const cursor = new Date(after)

  // Position the cursor on the first due date strictly after `after`. For
  // monthly that may still be this month, so it cannot simply skip ahead.
  if (rule.cadence === 'weekly') {
    const weekday = ((Math.round(rule.anchor) % 7) + 7) % 7
    do {
      cursor.setDate(cursor.getDate() + 1)
    } while (cursor.getDay() !== weekday)
  } else {
    // Clamped to 28 so every month genuinely has the day.
    const anchor = Math.min(Math.max(Math.round(rule.anchor), 1), 28)
    cursor.setDate(anchor)
    if (cursor <= after) {
      cursor.setMonth(cursor.getMonth() + 1)
      cursor.setDate(anchor)
    }
  }

  // Capped so a corrupt date cannot spin forever.
  for (let guard = 0; guard < 400 && cursor <= end; guard += 1) {
    due.push(toIso(cursor))
    if (rule.cadence === 'weekly') {
      cursor.setDate(cursor.getDate() + 7)
    } else {
      const anchor = cursor.getDate()
      cursor.setMonth(cursor.getMonth() + 1)
      cursor.setDate(anchor)
    }
  }

  return due
}
