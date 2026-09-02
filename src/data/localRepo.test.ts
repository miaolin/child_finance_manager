import { beforeEach, describe, expect, it } from 'vitest'
import { balanceCents } from '../domain/balance.ts'
import { LocalRepo, MemoryStore, normalizeSnapshot } from './localRepo.ts'

let repo: LocalRepo
let store: MemoryStore

beforeEach(() => {
  store = new MemoryStore()
  repo = new LocalRepo(store)
})

async function withChild(name = 'Mia') {
  return repo.addChild({ name, emoji: '🦊', color: '#e07a5f' })
}

describe('children', () => {
  it('starts empty', async () => {
    expect(await repo.listChildren()).toEqual([])
  })

  it('adds and lists children', async () => {
    await withChild('Mia')
    await withChild('Leo')
    expect((await repo.listChildren()).map((c) => c.name)).toEqual(['Mia', 'Leo'])
  })

  it('renames a child', async () => {
    const child = await withChild('Mia')
    await repo.updateChild(child.id, { name: 'Amelia' })
    expect((await repo.listChildren())[0].name).toBe('Amelia')
  })

  it('deletes the child together with their transactions', async () => {
    const mia = await withChild('Mia')
    const leo = await withChild('Leo')
    await repo.addTransaction({
      childId: mia.id, amountCents: 500, kind: 'in',
      categoryId: 'allowance', note: '', occurredOn: '2026-09-01',
    })
    await repo.addTransaction({
      childId: leo.id, amountCents: 700, kind: 'in',
      categoryId: 'allowance', note: '', occurredOn: '2026-09-01',
    })

    await repo.removeChild(mia.id)

    expect((await repo.listChildren()).map((c) => c.name)).toEqual(['Leo'])
    expect(await repo.listTransactions()).toHaveLength(1)
  })
})

describe('transactions', () => {
  it('rejects an amount that is zero, negative or fractional', async () => {
    const child = await withChild()
    const base = {
      childId: child.id, kind: 'out' as const,
      categoryId: 'snacks', note: '', occurredOn: '2026-09-01',
    }
    await expect(repo.addTransaction({ ...base, amountCents: 0 })).rejects.toThrow()
    await expect(repo.addTransaction({ ...base, amountCents: -100 })).rejects.toThrow()
    await expect(repo.addTransaction({ ...base, amountCents: 10.5 })).rejects.toThrow()
  })

  it('refuses a transaction for a child that does not exist', async () => {
    await expect(
      repo.addTransaction({
        childId: 'ghost', amountCents: 100, kind: 'in',
        categoryId: 'gift', note: '', occurredOn: '2026-09-01',
      }),
    ).rejects.toThrow()
  })

  it('recomputes the balance after an edit', async () => {
    const child = await withChild()
    await repo.addTransaction({
      childId: child.id, amountCents: 2000, kind: 'in',
      categoryId: 'gift', note: 'Birthday', occurredOn: '2026-09-01',
    })
    const spend = await repo.addTransaction({
      childId: child.id, amountCents: 350, kind: 'out',
      categoryId: 'snacks', note: 'Ice cream', occurredOn: '2026-09-02',
    })
    expect(balanceCents(await repo.listTransactions(), child.id)).toBe(1650)

    await repo.updateTransaction(spend.id, { amountCents: 500 })
    expect(balanceCents(await repo.listTransactions(), child.id)).toBe(1500)
  })

  it('recomputes the balance after a delete', async () => {
    const child = await withChild()
    const gift = await repo.addTransaction({
      childId: child.id, amountCents: 2000, kind: 'in',
      categoryId: 'gift', note: '', occurredOn: '2026-09-01',
    })
    await repo.removeTransaction(gift.id)
    expect(balanceCents(await repo.listTransactions(), child.id)).toBe(0)
  })

  it('lists only the requested child', async () => {
    const mia = await withChild('Mia')
    const leo = await withChild('Leo')
    for (const id of [mia.id, mia.id, leo.id]) {
      await repo.addTransaction({
        childId: id, amountCents: 100, kind: 'in',
        categoryId: 'chores', note: '', occurredOn: '2026-09-01',
      })
    }
    expect(await repo.listTransactions(mia.id)).toHaveLength(2)
    expect(await repo.listTransactions(leo.id)).toHaveLength(1)
  })
})

describe('persistence', () => {
  it('survives a new repo over the same storage', async () => {
    const child = await withChild('Mia')
    await repo.addTransaction({
      childId: child.id, amountCents: 500, kind: 'in',
      categoryId: 'allowance', note: '', occurredOn: '2026-09-01',
    })

    const reopened = new LocalRepo(store)
    expect((await reopened.listChildren()).map((c) => c.name)).toEqual(['Mia'])
    expect(balanceCents(await reopened.listTransactions(), child.id)).toBe(500)
  })

  it('recovers from corrupt storage instead of throwing', async () => {
    store.setItem('child-finance-manager/v1', '{not json')
    expect(await new LocalRepo(store).listChildren()).toEqual([])
  })
})

describe('export and import', () => {
  it('restores exactly what was exported', async () => {
    const child = await withChild('Mia')
    await repo.addTransaction({
      childId: child.id, amountCents: 1234, kind: 'out',
      categoryId: 'toys', note: 'Lego', occurredOn: '2026-09-01',
    })
    const snapshot = await repo.exportSnapshot()

    const fresh = new LocalRepo(new MemoryStore())
    await fresh.importSnapshot(JSON.parse(JSON.stringify(snapshot)))

    expect(await fresh.listChildren()).toEqual(await repo.listChildren())
    expect(await fresh.listTransactions()).toEqual(await repo.listTransactions())
  })

  it('drops transactions whose child is missing from the file', () => {
    const normalized = normalizeSnapshot({
      version: 1,
      children: [],
      transactions: [{ id: 't1', childId: 'ghost', amountCents: 100, kind: 'out' }],
    })
    expect(normalized.transactions).toEqual([])
  })

  it('falls back to defaults for an unusable file', () => {
    expect(normalizeSnapshot(null).children).toEqual([])
    expect(normalizeSnapshot('nonsense').settings.currency).toBe('USD')
  })
})
