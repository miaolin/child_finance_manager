/**
 * A FinanceRepo that keeps a local copy and a cloud copy in step.
 *
 * The shape of the thing:
 *
 *   every read  -> local, always, instantly
 *   every write -> local first, then pushed when there is a connection
 *   sync()      -> pull the cloud, merge per row, write back both ways
 *
 * Reading locally is what makes the app work on a tablet with no signal. It is
 * also why writes never wait on the network: an entry recorded in a car park
 * is recorded, and catches up later.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { LocalRepo } from '../data/localRepo.ts'
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
import type { Id, Settings, Snapshot } from '../domain/types.ts'
import { mergeCollections } from './merge.ts'
import { pullAll, pushRows } from './remote.ts'

export type SyncState = 'off' | 'idle' | 'syncing' | 'offline' | 'error'

export interface SyncStatus {
  state: SyncState
  /** Local changes not known to be in the cloud yet. */
  pending: number
  lastSyncedAt?: string
  message?: string
}

const SYNCED_AT_KEY = 'child-finance-manager/synced-at'

export class SyncingRepo implements FinanceRepo {
  private local: LocalRepo
  private client: SupabaseClient
  private ownerId: string
  private status: SyncStatus = { state: 'idle', pending: 0 }
  private listeners = new Set<(status: SyncStatus) => void>()
  private inFlight: Promise<void> | null = null
  private pushTimer: ReturnType<typeof setTimeout> | null = null
  private remoteTimer: ReturnType<typeof setTimeout> | null = null

  constructor(local: LocalRepo, client: SupabaseClient, ownerId: string) {
    this.local = local
    this.client = client
    this.ownerId = ownerId
    this.status = { state: 'idle', pending: 0, lastSyncedAt: this.readSyncedAt() }
    this.recount()
  }

  /* Status ---------------------------------------------------------------- */

  onStatus(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener)
    listener(this.status)
    return () => this.listeners.delete(listener)
  }

  getStatus(): SyncStatus {
    return this.status
  }

  private setStatus(patch: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...patch }
    for (const listener of this.listeners) listener(this.status)
  }

  private readSyncedAt(): string | undefined {
    try {
      return window.localStorage.getItem(SYNCED_AT_KEY) ?? undefined
    } catch {
      return undefined
    }
  }

  private writeSyncedAt(when: string): void {
    try {
      window.localStorage.setItem(SYNCED_AT_KEY, when)
    } catch {
      // A browser refusing storage is not a reason to fail a sync.
    }
  }

  /** Anything edited since the last successful sync is still owed to the cloud. */
  private async recount(): Promise<void> {
    const since = this.status.lastSyncedAt ?? '1970-01-01T00:00:00.000Z'
    const snapshot = await this.local.exportSnapshot()
    const pending = [
      ...snapshot.children,
      ...snapshot.transactions,
      ...snapshot.categories,
      ...snapshot.chores,
    ].filter((row) => row.updatedAt > since).length
    this.setStatus({ pending })
  }

  /* Live updates ----------------------------------------------------------- */

  /**
   * Listen for changes another device makes, so they arrive without anyone
   * pressing anything.
   *
   * Our own writes come back through here too. Rather than trying to tell them
   * apart, a pull is scheduled with a short delay and skipped while a sync is
   * already running — the merge is idempotent, so a redundant pull costs a
   * round trip and changes nothing.
   */
  watch(onChanged: () => void): () => void {
    const tables = ['children', 'transactions', 'categories', 'chores', 'settings']
    const channel = this.client.channel(`pocket-money:${this.ownerId}`)

    for (const table of tables) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `owner_id=eq.${this.ownerId}` },
        () => {
          if (this.remoteTimer) clearTimeout(this.remoteTimer)
          this.remoteTimer = setTimeout(() => {
            this.remoteTimer = null
            if (this.inFlight) return
            void this.sync().then(onChanged)
          }, 400)
        },
      )
    }

    channel.subscribe()

    return () => {
      if (this.remoteTimer) clearTimeout(this.remoteTimer)
      void this.client.removeChannel(channel)
    }
  }

  /* Writes ---------------------------------------------------------------- */

  /**
   * Push shortly after a change rather than on every keystroke. Renaming a
   * category letter by letter should be one upload, not fifteen.
   */
  private schedulePush(): void {
    if (this.pushTimer) clearTimeout(this.pushTimer)
    this.pushTimer = setTimeout(() => void this.sync(), 1200)
    void this.recount()
  }

  private async write<T>(work: Promise<T>): Promise<T> {
    const result = await work
    this.schedulePush()
    return result
  }

  /* Syncing --------------------------------------------------------------- */

  /** Pull, merge, push. Safe to call often: overlapping calls share one run. */
  async sync(): Promise<void> {
    if (this.inFlight) return this.inFlight
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.setStatus({ state: 'offline' })
      return
    }

    this.inFlight = this.runSync().finally(() => {
      this.inFlight = null
    })
    return this.inFlight
  }

  /**
   * A token can be refused as "issued at future" when the device clock runs
   * ahead of the server's. The session is not broken — a freshly minted token
   * fixes it — so this asks for one and tries again rather than stranding the
   * device until someone notices and signs out.
   */
  private looksLikeClockSkew(message: string): boolean {
    return /issued at future|jwt|token is expired|invalid claim/i.test(message)
  }

  /**
   * Every row is keyed to a user in `auth.users`. If that user is deleted, a
   * token already issued for it keeps working — Supabase tokens are not checked
   * against the database — so writes keep being attempted and every one is
   * refused by the foreign key. The session has to be replaced, not retried.
   */
  private looksLikeDeletedAccount(message: string): boolean {
    return /owner_id_fkey|violates foreign key constraint .*owner/i.test(message)
  }

  private async runSync(retriedAfterRefresh = false): Promise<void> {
    this.setStatus({ state: 'syncing', message: undefined })
    try {
      const remote = await pullAll(this.client, this.ownerId)
      const local = await this.local.exportSnapshot()

      const children = mergeCollections(local.children, remote.children)
      const transactions = mergeCollections(local.transactions, remote.transactions)
      const categories = mergeCollections(local.categories, remote.categories)
      const chores = mergeCollections(local.chores, remote.chores)

      // Settings are a single row, so the newer of the two simply wins.
      const localSettingsAt = local.settings.updatedAt ?? '1970-01-01T00:00:00.000Z'
      const remoteSettingsAt = remote.settings?.updatedAt ?? '1970-01-01T00:00:00.000Z'
      const settingsFromRemote = !!remote.settings && remoteSettingsAt > localSettingsAt

      const mergedSnapshot: Snapshot = {
        ...local,
        children: children.merged,
        transactions: transactions.merged,
        categories: categories.merged,
        chores: chores.merged,
        settings: settingsFromRemote ? remote.settings! : local.settings,
      }
      await this.local.importSnapshot(mergedSnapshot)

      await pushRows(this.client, this.ownerId, {
        children: children.toPush,
        transactions: transactions.toPush,
        categories: categories.toPush,
        chores: chores.toPush,
        settings: settingsFromRemote ? undefined : local.settings,
      })

      const syncedAt = new Date().toISOString()
      this.writeSyncedAt(syncedAt)
      this.setStatus({ state: 'idle', lastSyncedAt: syncedAt, pending: 0 })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed'
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false

      if (!offline && this.looksLikeDeletedAccount(message)) {
        // A refresh either hands back a session for an account that still
        // exists, or fails — in which case staying signed in only produces the
        // same error every few seconds. Sign out so the app asks properly.
        const { error: refreshError } = await this.client.auth.refreshSession()
        if (refreshError) {
          await this.client.auth.signOut()
          this.setStatus({
            state: 'error',
            message:
              'This device was signed in to an account that no longer exists. Sign in again to carry on.',
          })
          return
        }
        if (!retriedAfterRefresh) return this.runSync(true)
      }

      if (!offline && !retriedAfterRefresh && this.looksLikeClockSkew(message)) {
        const { error: refreshError } = await this.client.auth.refreshSession()
        if (!refreshError) return this.runSync(true)
      }

      this.setStatus({
        state: offline ? 'offline' : 'error',
        message: this.looksLikeClockSkew(message)
          ? `${message}. This device's clock may be out of step with the server — check its date and time are set automatically.`
          : `${message}.`,
      })
      await this.recount()
    }
  }

  /* FinanceRepo ----------------------------------------------------------- */

  listChildren() {
    return this.local.listChildren()
  }
  addChild(child: NewChild) {
    return this.write(this.local.addChild(child))
  }
  updateChild(id: Id, edits: ChildEdits) {
    return this.write(this.local.updateChild(id, edits))
  }
  removeChild(id: Id) {
    return this.write(this.local.removeChild(id))
  }

  listTransactions(childId?: Id) {
    return this.local.listTransactions(childId)
  }
  addTransaction(tx: NewTransaction) {
    return this.write(this.local.addTransaction(tx))
  }
  updateTransaction(id: Id, edits: TransactionEdits) {
    return this.write(this.local.updateTransaction(id, edits))
  }
  removeTransaction(id: Id) {
    return this.write(this.local.removeTransaction(id))
  }

  listCategories() {
    return this.local.listCategories()
  }
  addCategory(category: NewCategory) {
    return this.write(this.local.addCategory(category))
  }
  updateCategory(id: Id, edits: CategoryEdits) {
    return this.write(this.local.updateCategory(id, edits))
  }
  archiveCategory(id: Id) {
    return this.write(this.local.archiveCategory(id))
  }

  listChores() {
    return this.local.listChores()
  }
  addChore(chore: NewChore) {
    return this.write(this.local.addChore(chore))
  }
  updateChore(id: Id, edits: ChoreEdits) {
    return this.write(this.local.updateChore(id, edits))
  }
  archiveChore(id: Id) {
    return this.write(this.local.archiveChore(id))
  }

  getSettings() {
    return this.local.getSettings()
  }
  updateSettings(edits: Partial<Settings>) {
    return this.write(this.local.updateSettings({ ...edits, updatedAt: new Date().toISOString() }))
  }

  exportSnapshot() {
    return this.local.exportSnapshot()
  }
  importSnapshot(snapshot: Snapshot) {
    return this.write(this.local.importSnapshot(snapshot))
  }
}
