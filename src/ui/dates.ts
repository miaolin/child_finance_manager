/** Dates are stored as plain YYYY-MM-DD days, with no timezone attached. */

export function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** "Today", "Yesterday", or "Saturday 30 August" for anything older. */
export function describeDay(iso: string, locale: string): string {
  if (iso === todayIso()) return 'Today'

  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, (month ?? 1) - 1, day ?? 1)

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const sameDay =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  if (sameDay) return 'Yesterday'

  const thisYear = new Date().getFullYear() === date.getFullYear()
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: thisYear ? undefined : 'numeric',
  }).format(date)
}
