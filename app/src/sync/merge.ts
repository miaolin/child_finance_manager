/**
 * Deciding what a record should be when two devices disagree.
 *
 * The rule is last-write-wins per row, using the timestamp the database
 * stamped — never a client clock, which can be wrong by hours.
 *
 * Kept pure so the awkward cases are tested rather than hoped for: two devices
 * editing the same entry, a delete racing an edit, and a row that exists on
 * one side only.
 */

export interface Syncable {
  id: string
  updatedAt: string
  deletedAt?: string
}

/**
 * The winner between a local and a remote version of the same row.
 * A delete is just another edit: if it is the more recent one, it wins.
 */
export function pickWinner<T extends Syncable>(local: T | undefined, remote: T | undefined) {
  if (!local) return remote
  if (!remote) return local
  return remote.updatedAt > local.updatedAt ? remote : local
}

export interface MergeResult<T> {
  /** What the local store should hold afterwards, deletions included. */
  merged: T[]
  /** Rows whose local version won and therefore still need uploading. */
  toPush: T[]
}

export function mergeCollections<T extends Syncable>(
  localRows: T[],
  remoteRows: T[],
): MergeResult<T> {
  const locals = new Map(localRows.map((row) => [row.id, row]))
  const remotes = new Map(remoteRows.map((row) => [row.id, row]))
  const ids = new Set([...locals.keys(), ...remotes.keys()])

  const merged: T[] = []
  const toPush: T[] = []

  for (const id of ids) {
    const local = locals.get(id)
    const remote = remotes.get(id)
    const winner = pickWinner(local, remote)
    if (!winner) continue
    merged.push(winner)

    // Only worth uploading when the local side is what won, and the remote
    // either lacks the row or holds an older version of it.
    if (local && winner === local && (!remote || remote.updatedAt < local.updatedAt)) {
      toPush.push(local)
    }
  }

  return { merged, toPush }
}

/** Rows a reader should see: everything not deleted. */
export function visible<T extends Syncable>(rows: T[]): T[] {
  return rows.filter((row) => !row.deletedAt)
}
