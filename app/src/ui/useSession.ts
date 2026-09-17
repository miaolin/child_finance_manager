/**
 * Who is signed in, if anyone.
 *
 * With no cloud configured this reports "not signed in" forever — and since
 * signing in is now the way into the app, that state is a front door with no
 * handle. The sign-in screen says as much rather than letting anyone past it.
 *
 * The first answer comes from this browser's own copy of the session, not from
 * the network, which is what lets a device that is already signed in open with
 * no connection at all.
 */

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { cloudConfigured, supabase } from '../data/supabase.ts'

export interface SessionState {
  ready: boolean
  session: Session | null
  configured: boolean
}

export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!cloudConfigured)

  useEffect(() => {
    if (!supabase) return

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return { ready, session, configured: cloudConfigured }
}
