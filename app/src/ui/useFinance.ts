/**
 * Holds the app's data in React state and keeps it in step with the repo.
 *
 * Every mutation writes through the repo and then refreshes from it, so what
 * the screen shows is always what storage actually holds — no optimistic copy
 * that can quietly disagree with the source of truth.
 */

import { useCallback, useEffect, useState } from 'react'
import type { FinanceRepo, NewChild, NewTransaction, TransactionEdits } from '../data/repo.ts'
import { DEFAULT_SETTINGS } from '../data/localRepo.ts'
import type { Child, Id, Settings, Snapshot, Transaction } from '../domain/types.ts'

export interface FinanceState {
  ready: boolean
  children: Child[]
  transactions: Transaction[]
  settings: Settings
  addChild(child: NewChild): Promise<Child>
  renameChild(id: Id, edits: Partial<NewChild>): Promise<void>
  removeChild(id: Id): Promise<void>
  addTransaction(tx: NewTransaction): Promise<void>
  updateTransaction(id: Id, edits: TransactionEdits): Promise<void>
  removeTransaction(id: Id): Promise<void>
  updateSettings(edits: Partial<Settings>): Promise<void>
  exportSnapshot(): Promise<Snapshot>
  importSnapshot(snapshot: Snapshot): Promise<void>
}

export function useFinance(repo: FinanceRepo): FinanceState {
  const [ready, setReady] = useState(false)
  const [children, setChildren] = useState<Child[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  const refresh = useCallback(async () => {
    const [nextChildren, nextTransactions, nextSettings] = await Promise.all([
      repo.listChildren(),
      repo.listTransactions(),
      repo.getSettings(),
    ])
    setChildren(nextChildren)
    setTransactions(nextTransactions)
    setSettings(nextSettings)
  }, [repo])

  useEffect(() => {
    void refresh().then(() => setReady(true))
  }, [refresh])

  return {
    ready,
    children,
    transactions,
    settings,

    addChild: async (child) => {
      const created = await repo.addChild(child)
      await refresh()
      return created
    },
    renameChild: async (id, edits) => {
      await repo.updateChild(id, edits)
      await refresh()
    },
    removeChild: async (id) => {
      await repo.removeChild(id)
      await refresh()
    },
    addTransaction: async (tx) => {
      await repo.addTransaction(tx)
      await refresh()
    },
    updateTransaction: async (id, edits) => {
      await repo.updateTransaction(id, edits)
      await refresh()
    },
    removeTransaction: async (id) => {
      await repo.removeTransaction(id)
      await refresh()
    },
    updateSettings: async (edits) => {
      await repo.updateSettings(edits)
      await refresh()
    },
    exportSnapshot: () => repo.exportSnapshot(),
    importSnapshot: async (snapshot) => {
      await repo.importSnapshot(snapshot)
      await refresh()
    },
  }
}
