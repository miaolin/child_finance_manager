import { beforeEach, describe, expect, it } from 'vitest'
import { balanceCents } from '../domain/balance.ts'
import { categoriesFor, categoryById } from '../domain/categories.ts'
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
    expect(normalizeSnapshot('nonsense').settings.currency).toBe('SGD')
  })
})

describe('categories', () => {
  it('seeds the defaults on a fresh store', async () => {
    const all = await repo.listCategories()
    expect(all.length).toBeGreaterThan(0)
    expect(all.some((c) => c.appliesTo === 'in')).toBe(true)
    expect(all.some((c) => c.appliesTo === 'out')).toBe(true)
  })

  it('adds one with an id derived from its name', async () => {
    const created = await repo.addCategory({
      label: 'Birthday money', emoji: '🎂', appliesTo: 'in',
    })
    expect(created.id).toBe('birthday-money')
    expect((await repo.listCategories()).some((c) => c.id === created.id)).toBe(true)
  })

  it('does not reuse an id that is taken', async () => {
    const first = await repo.addCategory({ label: 'Books', emoji: '📗', appliesTo: 'in' })
    expect(first.id).not.toBe('books')
  })

  it('renames one', async () => {
    await repo.updateCategory('snacks', { label: 'Treats' })
    const snacks = (await repo.listCategories()).find((c) => c.id === 'snacks')
    expect(snacks?.label).toBe('Treats')
  })

  it('archives rather than deletes, so old entries keep their label', async () => {
    const child = await withChild()
    await repo.addTransaction({
      childId: child.id, amountCents: 350, kind: 'out',
      categoryId: 'snacks', note: '', occurredOn: '2026-09-01',
    })

    await repo.archiveCategory('snacks')

    const all = await repo.listCategories()
    const snacks = all.find((c) => c.id === 'snacks')
    expect(snacks?.archivedAt).toBeTruthy()
    expect(snacks?.label).toBe('Snacks')
    expect(categoriesFor(all, 'out').some((c) => c.id === 'snacks')).toBe(false)
    expect(categoryById(all, 'snacks').label).toBe('Snacks')
  })

  it('rejects a category with no name', async () => {
    await expect(
      repo.addCategory({ label: '   ', emoji: '⭐', appliesTo: 'in' }),
    ).rejects.toThrow()
  })
})

describe('chores', () => {
  it('starts with none', async () => {
    expect(await repo.listChores()).toEqual([])
  })

  it('adds one with a payout', async () => {
    const chore = await repo.addChore({ label: 'Tidy the shed', emoji: '🧹', payoutCents: 500 })
    expect(chore.payoutCents).toBe(500)
    expect(await repo.listChores()).toHaveLength(1)
  })

  it('refuses a payout that is zero, negative or fractional', async () => {
    const base = { label: 'Job', emoji: '🧹' }
    await expect(repo.addChore({ ...base, payoutCents: 0 })).rejects.toThrow()
    await expect(repo.addChore({ ...base, payoutCents: -100 })).rejects.toThrow()
    await expect(repo.addChore({ ...base, payoutCents: 10.5 })).rejects.toThrow()
  })

  it('archives one out of the list', async () => {
    const chore = await repo.addChore({ label: 'Tidy', emoji: '🧹', payoutCents: 500 })
    await repo.archiveChore(chore.id)
    expect(await repo.listChores()).toEqual([])
  })
})

describe('per-child rules', () => {
  it('stores an allowance and limits on the child', async () => {
    const child = await withChild()
    await repo.updateChild(child.id, {
      allowance: { amountCents: 500, cadence: 'weekly', anchor: 1, lastPaidOn: '2026-09-01' },
      limits: { perPurchaseCents: 1000, perWeekCents: 2000 },
    })
    const saved = (await repo.listChildren())[0]
    expect(saved.allowance).toEqual({
      amountCents: 500, cadence: 'weekly', anchor: 1, lastPaidOn: '2026-09-01',
    })
    expect(saved.limits).toEqual({ perPurchaseCents: 1000, perWeekCents: 2000 })
  })
})

describe('migrating a file written before the parent view', () => {
  it('seeds categories a v1 export does not have', () => {
    const migrated = normalizeSnapshot({
      version: 1,
      children: [{ id: 'c1', name: 'Mia', emoji: '🦊', color: '#000', createdAt: 'x' }],
      transactions: [
        { id: 't1', childId: 'c1', amountCents: 350, kind: 'out', categoryId: 'snacks' },
      ],
      settings: { currency: 'SGD', locale: 'en-SG', parentName: 'Parent' },
    })
    expect(migrated.categories.length).toBeGreaterThan(0)
    expect(categoryById(migrated.categories, 'snacks').label).toBe('Snacks')
    expect(migrated.chores).toEqual([])
    expect(migrated.transactions).toHaveLength(1)
  })

  it('keeps categories a newer file does carry', () => {
    const migrated = normalizeSnapshot({
      version: 1,
      children: [],
      transactions: [],
      categories: [{ id: 'x', label: 'Only one', emoji: '⭐', appliesTo: 'in' }],
      chores: [],
    })
    expect(migrated.categories).toHaveLength(1)
  })
})

describe('the parent PIN', () => {
  it('is absent until one is set', async () => {
    expect((await repo.getSettings()).parent).toBeUndefined()
  })

  it('clears back to unset, leaving everything else alone', async () => {
    const child = await withChild('Mia')
    await repo.addTransaction({
      childId: child.id, amountCents: 500, kind: 'in',
      categoryId: 'allowance', note: '', occurredOn: '2026-09-01',
    })
    await repo.updateSettings({ parent: { salt: 'abc', pinHash: 'def' } })
    expect((await repo.getSettings()).parent?.pinHash).toBe('def')

    await repo.updateSettings({ parent: undefined })

    expect((await repo.getSettings()).parent).toBeUndefined()
    // The records the PIN was guarding are untouched.
    expect(await repo.listChildren()).toHaveLength(1)
    expect(balanceCents(await repo.listTransactions(), child.id)).toBe(500)
    expect((await repo.getSettings()).currency).toBe('SGD')
  })

  it('stays cleared after reopening the store', async () => {
    await repo.updateSettings({ parent: { salt: 'abc', pinHash: 'def' } })
    await repo.updateSettings({ parent: undefined })
    expect((await new LocalRepo(store).getSettings()).parent).toBeUndefined()
  })
})
