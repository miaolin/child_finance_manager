/**
 * The Supabase client, or nothing.
 *
 * The app is designed to work with no cloud configured at all: without keys
 * it runs exactly as it did before, storing everything in this browser. That
 * is why this returns null rather than throwing — a missing key is a state to
 * handle, not a crash.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const cloudConfigured = Boolean(url && anonKey)

/** The project's own address and public key, for the one call made without the client. */
export const cloudUrl = url ?? ''
export const cloudAnonKey = anonKey ?? ''

export const supabase: SupabaseClient | null = cloudConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        // Google sends the browser back here to finish signing in; picking that
        // up automatically is what makes the round trip invisible.
        detectSessionInUrl: true,
        // Come back holding a one-use code rather than the session itself. The
        // default hands the access token over in the address bar, which puts it
        // in browser history and in anything reading the URL. The code is worth
        // nothing without a secret this browser kept to itself, so it is only
        // ever this browser that finishes the sign-in.
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
