import type { Session } from '@supabase/supabase-js'
import { supabase } from '../data/supabase.ts'
import type { SyncStatus } from '../sync/SyncingRepo.ts'
import { Button } from './components.tsx'

/**
 * What sync is doing, and the way out.
 *
 * Signing in happens at the front door now, so this only ever has a session to
 * describe — the app does not render at all without one.
 */
export function SyncPanel({
  session,
  status,
  onSyncNow,
}: {
  session: Session
  status: SyncStatus | null
  onSyncNow: () => void
}) {
  return (
    <div className="sync">
      <h3>Account</h3>
      <p className="sync__text">
        Signed in as {session.user.email}. Every device signed into this address shows the same
        records, and changes appear on the others by themselves.
      </p>
      <p className="sync__status">{describe(status)}</p>
      <div className="sync__actions">
        <Button tone="quiet" onClick={onSyncNow}>
          Check now
        </Button>
        <Button tone="quiet" onClick={() => void supabase?.auth.signOut()}>
          Sign out
        </Button>
      </div>
      <p className="sync__note">
        Signing out leaves the records on this device and deletes nothing, but it does close the
        app until someone signs in again.
      </p>
    </div>
  )
}

function describe(status: SyncStatus | null): string {
  if (!status) return 'Starting up…'
  switch (status.state) {
    case 'syncing':
      return 'Syncing…'
    case 'offline':
      return status.pending > 0
        ? `Offline. ${count(status.pending)} waiting to upload.`
        : 'Offline. Everything here is up to date; changes will upload when you reconnect.'
    case 'error':
      return `Could not sync: ${status.message ?? 'unknown problem'} It will try again.`
    case 'off':
      return 'Sync is not set up.'
    default:
      if (status.pending > 0) return `${count(status.pending)} waiting to upload.`
      return status.lastSyncedAt
        ? `Up to date, last checked ${new Date(status.lastSyncedAt).toLocaleTimeString()}.`
        : 'Up to date.'
  }
}

function count(n: number): string {
  return n === 1 ? '1 change' : `${n} changes`
}
