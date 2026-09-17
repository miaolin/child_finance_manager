/**
 * The front door. Nothing else in the app renders until someone is through it.
 *
 * The records themselves were never the thing a gate protects — row-level
 * security is what keeps one family's tins away from another's, signed in or
 * not. What this stops is the deployed link opening straight into an app at
 * all, which is what it did before.
 */

import { useEffect, useState } from 'react'
import { AuthForm } from './AuthForm.tsx'
import { Notice } from './components.tsx'

export function SignInScreen({ configured }: { configured: boolean }) {
  const returned = useOAuthFailure()

  return (
    <div className="gate">
      <div className="gate__card">
        <p className="gate__coin" aria-hidden="true">
          🪙
        </p>
        <h1 className="gate__title">Pocket money</h1>

        {configured ? (
          <>
            <p className="gate__text">
              Sign in to open the tins. Every device signed into the same account shows the same
              records.
            </p>
            {returned ? <Notice>{returned}</Notice> : null}
            <AuthForm />
          </>
        ) : (
          <>
            <p className="gate__text">
              Sign-in is not set up on this copy of the app, so there is no way in yet.
            </p>
            <p className="gate__text">
              Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> — to{' '}
              <code>app/.env.local</code> when running it yourself, or to the deployment's
              environment variables — then build again. The README has the whole setup.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Google sends a refusal back as part of the URL rather than as a failed call,
 * so without this the person lands back on the sign-in screen with no idea why
 * it did not work.
 */
function useOAuthFailure(): string | null {
  // Read once, as this screen first renders: the refusal is already in the URL
  // by then, and reading it during render rather than after one keeps the
  // message from arriving a frame late.
  const [message] = useState(readFailure)

  useEffect(() => {
    if (!message) return
    // Take it back out of the address bar so a reload does not show it again.
    window.history.replaceState({}, '', window.location.pathname)
  }, [message])

  return message
}

function readFailure(): string | null {
  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const code = search.get('error') ?? hash.get('error')
  if (!code) return null

  const detail = search.get('error_description') ?? hash.get('error_description')
  return code === 'access_denied'
    ? 'Google sign-in was cancelled. Try again, or use an email and a password.'
    : `Google sign-in did not finish: ${detail ?? code}`
}
