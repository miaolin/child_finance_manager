/**
 * The seam between the UI and wherever data actually lives.
 *
 * The UI imports this interface and never a concrete implementation. Moving to
 * a hosted database later means writing a second class against this contract —
 * no screen or component changes.
 *
 * Every method is async so a network-backed implementation drops in without
 * changing a single call site.
 */

import type { Child, Id, Settings, Snapshot, Transaction } from '../domain/types.ts'

export type NewChild = Pick<Child, 'name' | 'emoji' | 'color'>
export type ChildEdits = Partial<NewChild>

export type NewTransaction = Pick<
  Transaction,
  'childId' | 'amountCents' | 'kind' | 'categoryId' | 'note' | 'occurredOn'
>
export type TransactionEdits = Partial<Omit<NewTransaction, 'childId'>>

export interface FinanceRepo {
  listChildren(): Promise<Child[]>
  addChild(child: NewChild): Promise<Child>
  updateChild(id: Id, edits: ChildEdits): Promise<Child>
  /** Removes the child and every transaction belonging to them. */
  removeChild(id: Id): Promise<void>

  listTransactions(childId?: Id): Promise<Transaction[]>
  addTransaction(tx: NewTransaction): Promise<Transaction>
  updateTransaction(id: Id, edits: TransactionEdits): Promise<Transaction>
  removeTransaction(id: Id): Promise<void>

  getSettings(): Promise<Settings>
  updateSettings(edits: Partial<Settings>): Promise<Settings>

  exportSnapshot(): Promise<Snapshot>
  /** Replaces all current data with the snapshot's contents. */
  importSnapshot(snapshot: Snapshot): Promise<void>
}
