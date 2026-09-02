/**
 * Who is signed in, if anyone.
 *
 * With no cloud configured this reports "not signed in" forever and the app
 * carries on storing everything locally, which is the point: the cloud is an
 * addition, not a requirement.
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
