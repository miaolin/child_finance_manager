/**
 * Reading and writing the cloud copy.
 *
 * The database speaks snake_case and the app speaks camelCase, so every field
 * crosses through here. Doing it in one place means a column rename breaks
 * compilation rather than silently dropping data.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Category, Child, Chore, Settings, Transaction } from '../domain/types.ts'

export interface RemoteSnapshot {
  children: Child[]
  transactions: Transaction[]
  categories: Category[]
  chores: Chore[]
  settings: Settings | null
}

/* Row shapes as the database holds them. */
type ChildRow = {
  id: string
  name: string
  emoji: string
  color: string
  allowance: Child['allowance'] | null
  limits: Child['limits'] | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}
type TransactionRow = {
  id: string
  child_id: string
  amount_cents: number
  kind: 'in' | 'out'
  category_id: string
  note: string
  occurred_on: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}
type CategoryRow = {
  id: string
  label: string
  emoji: string
  applies_to: 'in' | 'out'
  archived_at: string | null
  updated_at: string
  deleted_at: string | null
}
type ChoreRow = {
  id: string
  label: string
  emoji: string
  payout_cents: number
  archived_at: string | null
  updated_at: string
  deleted_at: string | null
}
type SettingsRow = {
  currency: string
  locale: string
  parent_name: string
  parent: Settings['parent'] | null
  updated_at: string
}

const optional = <T,>(value: T | null): T | undefined => value ?? undefined

export const fromRow = {
  child: (r: ChildRow): Child => ({
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    color: r.color,
    allowance: optional(r.allowance),
    limits: optional(r.limits),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: optional(r.deleted_at),
  }),
  transaction: (r: TransactionRow): Transaction => ({
    id: r.id,
    childId: r.child_id,
    amountCents: Number(r.amount_cents),
    kind: r.kind,
    categoryId: r.category_id,
    note: r.note,
    occurredOn: r.occurred_on,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: optional(r.deleted_at),
  }),
  category: (r: CategoryRow): Category => ({
    id: r.id,
    label: r.label,
    emoji: r.emoji,
    appliesTo: r.applies_to,
    archivedAt: optional(r.archived_at),
    updatedAt: r.updated_at,
    deletedAt: optional(r.deleted_at),
  }),
  chore: (r: ChoreRow): Chore => ({
    id: r.id,
    label: r.label,
    emoji: r.emoji,
    payoutCents: Number(r.payout_cents),
    archivedAt: optional(r.archived_at),
    updatedAt: r.updated_at,
    deletedAt: optional(r.deleted_at),
  }),
  settings: (r: SettingsRow): Settings => ({
    currency: r.currency,
    locale: r.locale,
    parentName: r.parent_name,
    parent: optional(r.parent),
    updatedAt: r.updated_at,
  }),
}

export const toRow = {
  child: (c: Child, ownerId: string) => ({
    owner_id: ownerId,
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    color: c.color,
    allowance: c.allowance ?? null,
    limits: c.limits ?? null,
    created_at: c.createdAt,
    deleted_at: c.deletedAt ?? null,
  }),
  transaction: (t: Transaction, ownerId: string) => ({
    owner_id: ownerId,
    id: t.id,
    child_id: t.childId,
    amount_cents: t.amountCents,
    kind: t.kind,
    category_id: t.categoryId,
    note: t.note,
    occurred_on: t.occurredOn,
    created_at: t.createdAt,
    deleted_at: t.deletedAt ?? null,
  }),
  category: (c: Category, ownerId: string) => ({
    owner_id: ownerId,
    id: c.id,
    label: c.label,
    emoji: c.emoji,
    applies_to: c.appliesTo,
    archived_at: c.archivedAt ?? null,
    deleted_at: c.deletedAt ?? null,
  }),
  chore: (c: Chore, ownerId: string) => ({
    owner_id: ownerId,
    id: c.id,
    label: c.label,
    emoji: c.emoji,
    payout_cents: c.payoutCents,
    archived_at: c.archivedAt ?? null,
    deleted_at: c.deletedAt ?? null,
  }),
  settings: (s: Settings, ownerId: string) => ({
    owner_id: ownerId,
    currency: s.currency,
    locale: s.locale,
    parent_name: s.parentName,
    parent: s.parent ?? null,
  }),
}

export async function pullAll(
  client: SupabaseClient,
  ownerId: string,
): Promise<RemoteSnapshot> {
  const [children, transactions, categories, chores, settings] = await Promise.all([
    client.from('children').select('*').eq('owner_id', ownerId),
    client.from('transactions').select('*').eq('owner_id', ownerId),
    client.from('categories').select('*').eq('owner_id', ownerId),
    client.from('chores').select('*').eq('owner_id', ownerId),
    client.from('settings').select('*').eq('owner_id', ownerId).maybeSingle(),
  ])

  for (const result of [children, transactions, categories, chores, settings]) {
    if (result.error) throw new Error(result.error.message)
  }

  return {
    children: (children.data as ChildRow[]).map(fromRow.child),
    transactions: (transactions.data as TransactionRow[]).map(fromRow.transaction),
    categories: (categories.data as CategoryRow[]).map(fromRow.category),
    chores: (chores.data as ChoreRow[]).map(fromRow.chore),
    settings: settings.data ? fromRow.settings(settings.data as SettingsRow) : null,
  }
}

export async function pushRows(
  client: SupabaseClient,
  ownerId: string,
  rows: {
    children: Child[]
    transactions: Transaction[]
    categories: Category[]
    chores: Chore[]
    settings?: Settings
  },
): Promise<void> {
  // Children before transactions: a transaction's foreign key needs its child
  // to exist first, and on a first upload neither is there yet.
  const steps: { table: string; payload: unknown[]; onConflict: string }[] = [
    {
      table: 'children',
      payload: rows.children.map((c) => toRow.child(c, ownerId)),
      onConflict: 'owner_id,id',
    },
    {
      table: 'categories',
      payload: rows.categories.map((c) => toRow.category(c, ownerId)),
      onConflict: 'owner_id,id',
    },
    {
      table: 'chores',
      payload: rows.chores.map((c) => toRow.chore(c, ownerId)),
      onConflict: 'owner_id,id',
    },
    {
      table: 'transactions',
      payload: rows.transactions.map((t) => toRow.transaction(t, ownerId)),
      onConflict: 'owner_id,id',
    },
  ]
  if (rows.settings) {
    steps.push({
      table: 'settings',
      payload: [toRow.settings(rows.settings, ownerId)],
      // Settings are one row per family, keyed by owner alone.
      onConflict: 'owner_id',
    })
  }

  for (const step of steps) {
    if (step.payload.length === 0) continue
    const { error } = await client
      .from(step.table)
      .upsert(step.payload, { onConflict: step.onConflict })
    if (error) throw new Error(`${step.table}: ${error.message}`)
  }
}
