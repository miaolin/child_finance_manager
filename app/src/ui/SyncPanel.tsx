import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../data/supabase.ts'
import type { SyncStatus } from '../sync/SyncingRepo.ts'
import { Button, Field, Notice } from './components.tsx'

/**
 * Sign in, sign out, and say plainly what sync is doing. A sync indicator that
 * only ever says "synced" is worse than none: what a person needs to know is
 * when something has *not* left the device yet.
 */
export function SyncPanel({
  session,
  status,
  onSyncNow,
}: {
  session: Session | null
  status: SyncStatus | null
  onSyncNow: () => void
}) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function sendLink() {
    if (!supabase) return
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setProblem('That does not look like an email address.')
      return
    }
    setProblem(null)
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) setProblem(error.message)
    else setSent(true)
  }

  if (!session) {
    return (
      <div className="sync">
        <h3>Sync across devices</h3>
        {sent ? (
          <p className="sync__text">
            A sign-in link is on its way to {email}. Open it on this device. If it has not
            arrived in a minute or two, check the spam folder.
          </p>
        ) : (
          <>
            <p className="sync__text">
              Sign in on each device and they all show the same records. Anyone who can read
              this inbox can sign in, so use an address only the adults have.
            </p>
            <form
              className="sync__form"
              onSubmit={(event) => {
                event.preventDefault()
                void sendLink()
              }}
            >
              <Field label="Email">
                <input
                  className="input"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              {problem ? <Notice>{problem}</Notice> : null}
              <Button type="submit" tone="panel" disabled={busy}>
                {busy ? 'Sending…' : 'Send me a link'}
              </Button>
            </form>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="sync">
      <h3>Sync across devices</h3>
      <p className="sync__text">
        Signed in as {session.user.email}. Every device signed into this address shows the
        same records.
      </p>
      <p className="sync__status">{describe(status)}</p>
      <div className="sync__actions">
        <Button onClick={onSyncNow}>Sync now</Button>
        <Button tone="quiet" onClick={() => void supabase?.auth.signOut()}>
          Sign out
        </Button>
      </div>
      {session ? (
        <p className="sync__note">
          Signing out leaves the records on this device. It does not delete anything.
        </p>
      ) : null}
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
