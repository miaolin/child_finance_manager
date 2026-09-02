import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../data/supabase.ts'
import type { SyncStatus } from '../sync/SyncingRepo.ts'
import { Button, Field, Notice } from './components.tsx'

const MIN_PASSWORD = 6

/**
 * Sign in with an email and a password.
 *
 * Deliberately not a magic link. A link has to be opened in the browser that
 * asked for it, and a mail client will happily hand it to a different one —
 * which silently signs in the wrong browser and leaves the records stranded.
 * A password works wherever it is typed.
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
  const [password, setPassword] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(mode: 'in' | 'up') {
    if (!supabase) return
    const address = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setProblem('That does not look like an email address.')
      return
    }
    if (password.length < MIN_PASSWORD) {
      setProblem(`The password needs at least ${MIN_PASSWORD} characters.`)
      return
    }
    setProblem(null)
    setNote(null)
    setBusy(true)

    const { data, error } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email: address, password })
        : await supabase.auth.signUp({ email: address, password })

    setBusy(false)
    if (error) {
      setProblem(explain(error.message, mode))
      return
    }
    // Sign-up with email confirmation switched on returns a user but no
    // session: nothing is signed in until the address is confirmed. Say so
    // rather than looking like it worked.
    if (mode === 'up' && !data.session) {
      setNote(`Account created. Confirm ${address} from your inbox, then sign in here.`)
    }
  }

  if (!session) {
    return (
      <div className="sync">
        <h3>Sync across devices</h3>
        <p className="sync__text">
          Use the same email and password on every device and they all show the same records.
          Create the account once, then sign in on the others.
        </p>

        <form
          className="sync__form"
          onSubmit={(event) => {
            event.preventDefault()
            void submit('in')
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

          <Field label="Password" hint={`At least ${MIN_PASSWORD} characters`}>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          {problem ? <Notice>{problem}</Notice> : null}
          {note ? <p className="sync__status">{note}</p> : null}

          <div className="sync__actions">
            <Button type="submit" tone="panel" disabled={busy}>
              {busy ? 'Working…' : 'Sign in'}
            </Button>
            <Button tone="quiet" disabled={busy} onClick={() => void submit('up')}>
              Create the account
            </Button>
          </div>
        </form>

        <p className="sync__note">
          Anyone with this email and password can see and change the records, so pick a password
          you do not use elsewhere.
        </p>
      </div>
    )
  }

  return (
    <div className="sync">
      <h3>Sync across devices</h3>
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
        Signing out leaves the records on this device. It does not delete anything.
      </p>
    </div>
  )
}

/** Supabase's wording is for developers. These are the cases a parent will hit. */
function explain(message: string, mode: 'in' | 'up'): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) {
    return 'That email and password do not match an account. If this is your first device, use Create the account instead.'
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'That account already exists — use Sign in instead.'
  }
  if (m.includes('email not confirmed')) {
    return 'This account still needs confirming. Open the confirmation email, then sign in again.'
  }
  if (m.includes('password')) return message
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) {
    return 'New accounts are switched off for this project. Turn signups back on in Supabase, or sign in with the account you already made.'
  }
  return mode === 'in' ? `Could not sign in: ${message}` : `Could not create the account: ${message}`
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
