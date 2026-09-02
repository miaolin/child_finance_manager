/**
 * Browser-storage implementation of FinanceRepo.
 *
 * Reads and writes one JSON blob under a single key. That is fine at this
 * size — a family's transactions for years is well under a megabyte — and it
 * keeps the whole dataset in the exact shape export/import already uses.
 *
 * The storage medium is injected so tests can run against a plain object
 * instead of a real browser.
 */

import type { Child, Id, Settings, Snapshot, Transaction } from '../domain/types.ts'
import type {
  ChildEdits,
  FinanceRepo,
  NewChild,
  NewTransaction,
  TransactionEdits,
} from './repo.ts'

const STORAGE_KEY = 'child-finance-manager/v1'

export const DEFAULT_SETTINGS: Settings = {
  currency: 'USD',
  locale: 'en-US',
  parentName: 'Parent',
}

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function emptySnapshot(): Snapshot {
  return {
    version: 1,
    children: [],
    transactions: [],
    settings: { ...DEFAULT_SETTINGS },
    exportedAt: new Date().toISOString(),
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Accepts anything and returns a valid Snapshot, dropping what it cannot
 * understand. Imported files are user-supplied and may be hand-edited or from
 * an older version, so nothing here may assume well-formed input.
 */
export function normalizeSnapshot(raw: unknown): Snapshot {
  const base = emptySnapshot()
  if (typeof raw !== 'object' || raw === null) return base
  const data = raw as Partial<Snapshot>

  const children = Array.isArray(data.children)
    ? data.children.filter(
        (c): c is Child => !!c && typeof c.id === 'string' && typeof c.name === 'string',
      )
    : []
  const knownChildIds = new Set(children.map((c) => c.id))

  const transactions = Array.isArray(data.transactions)
    ? data.transactions.filter(
        (t): t is Transaction =>
          !!t &&
          typeof t.id === 'string' &&
          knownChildIds.has(t.childId) &&
          Number.isSafeInteger(t.amountCents) &&
          t.amountCents > 0 &&
          (t.kind === 'in' || t.kind === 'out'),
      )
    : []

  return {
    version: 1,
    children,
    transactions,
    settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : base.exportedAt,
  }
}

export class LocalRepo implements FinanceRepo {
  constructor(private store: KeyValueStore) {}

  private read(): Snapshot {
    const raw = this.store.getItem(STORAGE_KEY)
    if (!raw) return emptySnapshot()
    try {
      return normalizeSnapshot(JSON.parse(raw))
    } catch {
      // Corrupt or truncated storage must not brick the app. Start clean; the
      // user's own export file remains their recovery path.
      return emptySnapshot()
    }
  }

  private write(snapshot: Snapshot): void {
    this.store.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  }

  async listChildren(): Promise<Child[]> {
    return this.read().children.filter((c) => !c.archivedAt)
  }

  async addChild(child: NewChild): Promise<Child> {
    const snapshot = this.read()
    const created: Child = { ...child, id: newId(), createdAt: new Date().toISOString() }
    snapshot.children.push(created)
    this.write(snapshot)
    return created
  }

  async updateChild(id: Id, edits: ChildEdits): Promise<Child> {
    const snapshot = this.read()
    const child = snapshot.children.find((c) => c.id === id)
    if (!child) throw new Error(`No child with id ${id}`)
    Object.assign(child, edits)
    this.write(snapshot)
    return child
  }

  async removeChild(id: Id): Promise<void> {
    const snapshot = this.read()
    snapshot.children = snapshot.children.filter((c) => c.id !== id)
    // Transactions are meaningless without their child, and leaving them would
    // let a future child id collision inherit someone else's history.
    snapshot.transactions = snapshot.transactions.filter((t) => t.childId !== id)
    this.write(snapshot)
  }

  async listTransactions(childId?: Id): Promise<Transaction[]> {
    const all = this.read().transactions
    return childId ? all.filter((t) => t.childId === childId) : all
  }

  async addTransaction(tx: NewTransaction): Promise<Transaction> {
    const snapshot = this.read()
    if (!snapshot.children.some((c) => c.id === tx.childId)) {
      throw new Error(`No child with id ${tx.childId}`)
    }
    if (!Number.isSafeInteger(tx.amountCents) || tx.amountCents <= 0) {
      throw new Error('Amount must be a positive whole number of cents')
    }
    const now = new Date().toISOString()
    const created: Transaction = { ...tx, id: newId(), createdAt: now, updatedAt: now }
    snapshot.transactions.push(created)
    this.write(snapshot)
    return created
  }

  async updateTransaction(id: Id, edits: TransactionEdits): Promise<Transaction> {
    const snapshot = this.read()
    const tx = snapshot.transactions.find((t) => t.id === id)
    if (!tx) throw new Error(`No transaction with id ${id}`)
    if (edits.amountCents !== undefined) {
      if (!Number.isSafeInteger(edits.amountCents) || edits.amountCents <= 0) {
        throw new Error('Amount must be a positive whole number of cents')
      }
    }
    Object.assign(tx, edits, { updatedAt: new Date().toISOString() })
    this.write(snapshot)
    return tx
  }

  async removeTransaction(id: Id): Promise<void> {
    const snapshot = this.read()
    snapshot.transactions = snapshot.transactions.filter((t) => t.id !== id)
    this.write(snapshot)
  }

  async getSettings(): Promise<Settings> {
    return this.read().settings
  }

  async updateSettings(edits: Partial<Settings>): Promise<Settings> {
    const snapshot = this.read()
    snapshot.settings = { ...snapshot.settings, ...edits }
    this.write(snapshot)
    return snapshot.settings
  }

  async exportSnapshot(): Promise<Snapshot> {
    return { ...this.read(), exportedAt: new Date().toISOString() }
  }

  async importSnapshot(snapshot: Snapshot): Promise<void> {
    this.write(normalizeSnapshot(snapshot))
  }
}

/** In-memory store: used by tests, and a safe fallback in private-mode browsers. */
export class MemoryStore implements KeyValueStore {
  private data = new Map<string, string>()
  getItem(key: string) {
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.data.set(key, value)
  }
}

export function createLocalRepo(): LocalRepo {
  try {
    const probe = '__cfm_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return new LocalRepo(window.localStorage)
  } catch {
    // Private browsing or blocked site data: the app still works this session.
    return new LocalRepo(new MemoryStore())
  }
}
