/**
 * Holds the app's data in React state and keeps it in step with the repo.
 *
 * Every mutation writes through the repo and then refreshes from it, so what
 * the screen shows is always what storage actually holds — no optimistic copy
 * that can quietly disagree with the source of truth.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CategoryEdits,
  ChildEdits,
  ChoreEdits,
  FinanceRepo,
  NewCategory,
  NewChild,
  NewChore,
  NewTransaction,
  TransactionEdits,
} from '../data/repo.ts'
import { DEFAULT_SETTINGS } from '../data/localRepo.ts'
import { allowanceDatesOwed } from '../domain/allowance.ts'
import type {
  Category,
  Child,
  Chore,
  Id,
  Settings,
  Snapshot,
  Transaction,
} from '../domain/types.ts'
import { todayIso } from './dates.ts'

export interface FinanceState {
  ready: boolean
  children: Child[]
  transactions: Transaction[]
  categories: Category[]
  chores: Chore[]
  settings: Settings
  addChild(child: NewChild): Promise<Child>
  updateChild(id: Id, edits: ChildEdits): Promise<void>
  removeChild(id: Id): Promise<void>
  addTransaction(tx: NewTransaction): Promise<void>
  updateTransaction(id: Id, edits: TransactionEdits): Promise<void>
  removeTransaction(id: Id): Promise<void>
  addCategory(category: NewCategory): Promise<void>
  updateCategory(id: Id, edits: CategoryEdits): Promise<void>
  archiveCategory(id: Id): Promise<void>
  addChore(chore: NewChore): Promise<void>
  updateChore(id: Id, edits: ChoreEdits): Promise<void>
  archiveChore(id: Id): Promise<void>
  updateSettings(edits: Partial<Settings>): Promise<void>
  exportSnapshot(): Promise<Snapshot>
  importSnapshot(snapshot: Snapshot): Promise<void>
}

export function useFinance(repo: FinanceRepo): FinanceState {
  const [ready, setReady] = useState(false)
  const [children, setChildren] = useState<Child[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  const refresh = useCallback(async () => {
    const [nextChildren, nextTransactions, nextCategories, nextChores, nextSettings] =
      await Promise.all([
        repo.listChildren(),
        repo.listTransactions(),
        repo.listCategories(),
        repo.listChores(),
        repo.getSettings(),
      ])
    setChildren(nextChildren)
    setTransactions(nextTransactions)
    setCategories(nextCategories)
    setChores(nextChores)
    setSettings(nextSettings)
  }, [repo])

  /**
   * Credit any allowance that came due while the app was closed. Runs once per
   * mount: the dates owed are computed from the last paid date, so opening the
   * app twice in a day cannot pay twice.
   */
  const caughtUp = useRef(false)
  const catchUpAllowance = useCallback(async () => {
    const today = todayIso()
    let paidAnything = false

    for (const child of await repo.listChildren()) {
      const owed = allowanceDatesOwed(child, today)
      if (owed.length === 0) continue

      for (const date of owed) {
        await repo.addTransaction({
          childId: child.id,
          amountCents: child.allowance!.amountCents,
          kind: 'in',
          categoryId: 'allowance',
          note: 'Allowance',
          occurredOn: date,
        })
      }
      await repo.updateChild(child.id, {
        allowance: { ...child.allowance!, lastPaidOn: owed[owed.length - 1] },
      })
      paidAnything = true
    }
    return paidAnything
  }, [repo])

  useEffect(() => {
    void (async () => {
      if (!caughtUp.current) {
        caughtUp.current = true
        try {
          await catchUpAllowance()
        } catch {
          // A failure here must not stop the app opening; the parent can still
          // record the allowance by hand.
        }
      }
      await refresh()
      setReady(true)
    })()
  }, [refresh, catchUpAllowance])

  const after = async <T,>(work: Promise<T>): Promise<T> => {
    const result = await work
    await refresh()
    return result
  }

  return {
    ready,
    children,
    transactions,
    categories,
    chores,
    settings,

    addChild: (child) => after(repo.addChild(child)),
    updateChild: async (id, edits) => void (await after(repo.updateChild(id, edits))),
    removeChild: async (id) => after(repo.removeChild(id)),
    addTransaction: async (tx) => void (await after(repo.addTransaction(tx))),
    updateTransaction: async (id, edits) =>
      void (await after(repo.updateTransaction(id, edits))),
    removeTransaction: async (id) => after(repo.removeTransaction(id)),
    addCategory: async (category) => void (await after(repo.addCategory(category))),
    updateCategory: async (id, edits) => void (await after(repo.updateCategory(id, edits))),
    archiveCategory: async (id) => after(repo.archiveCategory(id)),
    addChore: async (chore) => void (await after(repo.addChore(chore))),
    updateChore: async (id, edits) => void (await after(repo.updateChore(id, edits))),
    archiveChore: async (id) => after(repo.archiveChore(id)),
    updateSettings: async (edits) => void (await after(repo.updateSettings(edits))),
    exportSnapshot: () => repo.exportSnapshot(),
    importSnapshot: async (snapshot) => after(repo.importSnapshot(snapshot)),
  }
}
