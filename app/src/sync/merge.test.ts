import { describe, expect, it } from 'vitest'
import { mergeCollections, pickWinner, visible } from './merge.ts'

const row = (
  id: string,
  updatedAt: string,
  extra: { deletedAt?: string; note?: string } = {},
) => ({ id, updatedAt, ...extra })

describe('pickWinner', () => {
  it('takes whichever side exists when only one does', () => {
    const only = row('a', '2026-09-01T00:00:00Z')
    expect(pickWinner(only, undefined)).toBe(only)
    expect(pickWinner(undefined, only)).toBe(only)
  })

  it('takes the more recent edit', () => {
    const older = row('a', '2026-09-01T00:00:00Z', { note: 'old' })
    const newer = row('a', '2026-09-02T00:00:00Z', { note: 'new' })
    expect(pickWinner(older, newer)).toBe(newer)
    expect(pickWinner(newer, older)).toBe(newer)
  })

  it('keeps the local side when the two are equally old, so nothing flaps', () => {
    const local = row('a', '2026-09-01T00:00:00Z', { note: 'local' })
    const remote = row('a', '2026-09-01T00:00:00Z', { note: 'remote' })
    expect(pickWinner(local, remote)).toBe(local)
  })

  it('lets a delete win when it is the more recent edit', () => {
    const edited = row('a', '2026-09-01T00:00:00Z')
    const deleted = row('a', '2026-09-02T00:00:00Z', { deletedAt: '2026-09-02T00:00:00Z' })
    expect(pickWinner(edited, deleted)).toBe(deleted)
  })

  it('lets an edit win over an older delete, so a resurrect is deliberate', () => {
    const deleted = row('a', '2026-09-01T00:00:00Z', { deletedAt: '2026-09-01T00:00:00Z' })
    const edited = row('a', '2026-09-02T00:00:00Z')
    expect(pickWinner(deleted, edited)).toBe(edited)
  })
})

describe('mergeCollections', () => {
  it('keeps rows that exist on only one side', () => {
    const { merged } = mergeCollections(
      [row('local-only', '2026-09-01T00:00:00Z')],
      [row('remote-only', '2026-09-01T00:00:00Z')],
    )
    expect(merged.map((r) => r.id).sort()).toEqual(['local-only', 'remote-only'])
  })

  it('uploads a local row the cloud has never seen', () => {
    const { toPush } = mergeCollections([row('fresh', '2026-09-02T00:00:00Z')], [])
    expect(toPush.map((r) => r.id)).toEqual(['fresh'])
  })

  it('does not upload a row the cloud already has at the same version', () => {
    const same = '2026-09-01T00:00:00Z'
    const { toPush } = mergeCollections([row('a', same)], [row('a', same)])
    expect(toPush).toEqual([])
  })

  it('does not upload when the remote version is newer — it takes it instead', () => {
    const { merged, toPush } = mergeCollections(
      [row('a', '2026-09-01T00:00:00Z', { note: 'mine' })],
      [row('a', '2026-09-03T00:00:00Z', { note: 'theirs' })],
    )
    expect(toPush).toEqual([])
    expect(merged[0]).toMatchObject({ note: 'theirs' })
  })

  it('uploads the local edit made while offline, when it is the newer one', () => {
    const { merged, toPush } = mergeCollections(
      [row('a', '2026-09-05T00:00:00Z', { note: 'edited on the plane' })],
      [row('a', '2026-09-01T00:00:00Z', { note: 'stale' })],
    )
    expect(toPush.map((r) => r.id)).toEqual(['a'])
    expect(merged[0]).toMatchObject({ note: 'edited on the plane' })
  })

  it('propagates a remote delete into the merged set', () => {
    const { merged } = mergeCollections(
      [row('a', '2026-09-01T00:00:00Z')],
      [row('a', '2026-09-02T00:00:00Z', { deletedAt: '2026-09-02T00:00:00Z' })],
    )
    expect(merged[0].deletedAt).toBeTruthy()
    expect(visible(merged)).toEqual([])
  })

  it('handles both sides being empty', () => {
    expect(mergeCollections([], [])).toEqual({ merged: [], toPush: [] })
  })
})

describe('visible', () => {
  it('hides deleted rows and keeps the rest', () => {
    const rows = [
      row('a', '2026-09-01T00:00:00Z'),
      row('b', '2026-09-01T00:00:00Z', { deletedAt: '2026-09-01T00:00:00Z' }),
    ]
    expect(visible(rows).map((r) => r.id)).toEqual(['a'])
  })
})
