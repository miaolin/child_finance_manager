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

export const supabase: SupabaseClient | null = cloudConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        // The sign-in link comes back with the session in the URL; picking it
        // up automatically is what makes the link work in one tap.
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
