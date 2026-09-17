/**
 * The one way into the app: Google, or an email and a password.
 *
 * Google is offered first because it is the tap most people already know, and
 * because there is no password to lose. The email and password stay underneath
 * it rather than being replaced: an OAuth round trip leaves the app for another
 * site and comes back, and on a home-screen app on iOS that journey is the part
 * most likely to go wrong. A password is typed where you are standing.
 *
 * Deliberately not a magic link. A link has to be opened in the browser that
 * asked for it, and a mail client will happily hand it to a different one —
 * which silently signs in the wrong browser and leaves the records stranded.
 */

import { useEffect, useState } from 'react'
import { cloudAnonKey, cloudUrl, supabase } from '../data/supabase.ts'
import { Button, Field, Notice } from './components.tsx'

const MIN_PASSWORD = 6

export function AuthForm() {
  const google = useGoogleProvider()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function withGoogle() {
    if (!supabase) return
    setProblem(null)
    setNote(null)
    setBusy(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Come back to this app rather than to whatever Supabase has as its
        // site URL, which is one deployment and not, say, a preview build.
        redirectTo: window.location.origin,
        // Ask Google every time which account to use. Without it a browser
        // holding one signed-in Google account signs straight back in, which
        // makes "Sign out" look broken on a shared family device.
        queryParams: { prompt: 'select_account' },
      },
    })
    // On success the browser is already on its way to Google; nothing below
    // this line runs. Only a failure to even start gets here.
    if (error) {
      setBusy(false)
      setProblem(explainGoogle(error.message))
    }
  }

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

  return (
    <div className="auth">
      {google === 'off' ? (
        <Notice>
          Google sign-in is not switched on for this project yet. Turn on the Google provider in
          Supabase, or use an email and a password.
        </Notice>
      ) : (
        <>
          <Button
            tone="panel"
            wide
            disabled={busy || google === 'asking'}
            onClick={() => void withGoogle()}
          >
            <span className="auth__google">
              <GoogleMark />
              Continue with Google
            </span>
          </Button>

          <p className="auth__or">or use an email and a password</p>
        </>
      )}

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
          <Button type="submit" disabled={busy}>
            {busy ? 'Working…' : 'Sign in'}
          </Button>
          <Button tone="quiet" disabled={busy} onClick={() => void submit('up')}>
            Create the account
          </Button>
        </div>
      </form>
    </div>
  )
}

/**
 * Whether this project actually offers Google.
 *
 * Asked here rather than found out on the way: pressing the button leaves the
 * app for Supabase, and if the provider is switched off what comes back is a
 * line of JSON on a black page with no way forward. Supabase publishes which
 * providers are on, so the button is only offered when it leads somewhere.
 *
 * Anything other than a clear "no" — offline, a slow project, an unexpected
 * shape — leaves the button in place. A working sign-in must not be hidden
 * because a side call failed.
 */
function useGoogleProvider(): 'asking' | 'on' | 'off' {
  const configured = Boolean(cloudUrl && cloudAnonKey)
  const [state, setState] = useState<'asking' | 'on' | 'off'>(configured ? 'asking' : 'on')

  useEffect(() => {
    if (!configured) return
    let live = true
    fetch(`${cloudUrl}/auth/v1/settings`, { headers: { apikey: cloudAnonKey } })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { external?: Record<string, boolean> } | null) => {
        if (!live) return
        setState(body?.external?.google === false ? 'off' : 'on')
      })
      .catch(() => {
        if (live) setState('on')
      })
    return () => {
      live = false
    }
  }, [configured])

  return state
}

/** Google's own mark. Their terms require it drawn in these four colours. */
function GoogleMark() {
  return (
    <svg className="auth__mark" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
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

function explainGoogle(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) {
    return 'Google sign-in is not switched on for this project yet. Turn on the Google provider in Supabase, or use an email and a password below.'
  }
  return `Could not start Google sign-in: ${message} You can use an email and a password below instead.`
}
