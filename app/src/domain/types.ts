/**
 * Core entities. Two rules hold everywhere in this app:
 *  - money is an integer number of cents, never a float
 *  - a balance is derived by summing transactions, never stored
 */

export type Id = string

export type TransactionKind = 'in' | 'out'

export type AllowanceCadence = 'none' | 'weekly' | 'monthly'

export interface Child {
  id: Id
  name: string
  emoji: string
  color: string
  createdAt: string
  archivedAt?: string

  /** Rules the parent sets. Absent means "no rule". */
  allowance?: {
    amountCents: number
    cadence: AllowanceCadence
    /** Day of week 0-6 for weekly, day of month 1-28 for monthly. */
    anchor: number
    /** The last date allowance was credited, so it is never paid twice. */
    lastPaidOn?: string
  }
  limits?: {
    perPurchaseCents?: number
    perWeekCents?: number
  }
}

export interface Transaction {
  id: Id
  childId: Id
  /** Always positive. Direction lives in `kind`, not in the sign. */
  amountCents: number
  kind: TransactionKind
  categoryId: Id
  note: string
  /** Calendar day the money moved, as YYYY-MM-DD. */
  occurredOn: string
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: Id
  label: string
  emoji: string
  appliesTo: TransactionKind
  /**
   * Removing a category archives it rather than deleting it, so entries
   * already recorded against it keep showing their real label.
   */
  archivedAt?: string
}

/** A job with a fixed price, so claiming it is one tap and never mistyped. */
export interface Chore {
  id: Id
  label: string
  emoji: string
  payoutCents: number
  archivedAt?: string
}

export interface ParentGate {
  /** SHA-256 of salt + PIN. Absent means no PIN has been set yet. */
  pinHash?: string
  salt?: string
}

export interface Settings {
  currency: string
  locale: string
  parentName: string
  parent?: ParentGate
}

/** Everything the app owns, in one shape — what export/import moves around. */
export interface Snapshot {
  version: 1
  children: Child[]
  transactions: Transaction[]
  categories: Category[]
  chores: Chore[]
  settings: Settings
  exportedAt: string
}
