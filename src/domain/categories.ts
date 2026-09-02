import type { Category } from './types.ts'

/**
 * Fixed for v1. Emoji carry the meaning so a child who cannot read fluently
 * can still pick the right one.
 */
export const CATEGORIES: Category[] = [
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

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))

export function categoriesFor(kind: 'in' | 'out'): Category[] {
  return CATEGORIES.filter((c) => c.appliesTo === kind)
}

/** Never throws — an unknown id from old data still renders something sane. */
export function categoryById(id: string): Category {
  return BY_ID.get(id) ?? { id, label: 'Other', emoji: '❓', appliesTo: 'out' }
}
