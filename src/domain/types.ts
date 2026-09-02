/**
 * Core entities. Two rules hold everywhere in this app:
 *  - money is an integer number of cents, never a float
 *  - a balance is derived by summing transactions, never stored
 */

export type Id = string

export type TransactionKind = 'in' | 'out'

export interface Child {
  id: Id
  name: string
  emoji: string
  color: string
  createdAt: string
  archivedAt?: string
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
}

export interface Settings {
  currency: string
  locale: string
  parentName: string
}

/** Everything the app owns, in one shape — what export/import moves around. */
export interface Snapshot {
  version: 1
  children: Child[]
  transactions: Transaction[]
  settings: Settings
  exportedAt: string
}
