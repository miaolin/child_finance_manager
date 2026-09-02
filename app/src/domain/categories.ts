import type { Category, Id, TransactionKind } from './types.ts'

/**
 * Seeded on first run, then owned by the parent — these are a starting point,
 * not a fixed list. Emoji carry the meaning so a child who cannot read
 * fluently can still pick the right one.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'allowance', label: 'Allowance', emoji: '🗓️', appliesTo: 'in' },
  { id: 'chores', label: 'Chores', emoji: '🧹', appliesTo: 'in' },
  { id: 'gift', label: 'Gift', emoji: '🎁', appliesTo: 'in' },
  // 压岁钱: the money children are given in a red envelope at Lunar New Year.
  { id: 'new-year', label: 'New Year money', emoji: '🧧', appliesTo: 'in' },
  { id: 'tennis', label: 'Tennis tournament', emoji: '🎾', appliesTo: 'in' },
  { id: 'other-in', label: 'Something else', emoji: '💰', appliesTo: 'in' },

  { id: 'snacks', label: 'Snacks', emoji: '🍦', appliesTo: 'out' },
  { id: 'toys', label: 'Toys', emoji: '🧸', appliesTo: 'out' },
  { id: 'books', label: 'Books', emoji: '📚', appliesTo: 'out' },
  { id: 'games', label: 'Games', emoji: '🎮', appliesTo: 'out' },
  { id: 'clothes', label: 'Clothes', emoji: '👕', appliesTo: 'out' },
  { id: 'outings', label: 'Outings', emoji: '🎡', appliesTo: 'out' },
  { id: 'presents', label: 'Presents for others', emoji: '💝', appliesTo: 'out' },
  { id: 'other-out', label: 'Something else', emoji: '🛍️', appliesTo: 'out' },
]

/** What a child may pick from now: the right direction, and not archived. */
export function categoriesFor(all: Category[], kind: TransactionKind): Category[] {
  return all.filter((c) => c.appliesTo === kind && !c.archivedAt)
}

/**
 * Never throws. An archived category still resolves, so old entries keep their
 * label; an id that has vanished entirely renders as a visible unknown rather
 * than blank.
 */
export function categoryById(all: Category[], id: Id): Category {
  return (
    all.find((c) => c.id === id) ?? { id, label: 'Other', emoji: '❓', appliesTo: 'out' }
  )
}

/** Slug from a label, kept unique against ids already in use. */
export function categoryIdFor(label: string, taken: Id[]): Id {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'category'
  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}
