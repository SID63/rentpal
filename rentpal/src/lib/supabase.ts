import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

let client: SupabaseClient<Database> | null = null

function ensureClient(): SupabaseClient<Database> {
  if (!client) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Do not eagerly throw during build-time imports; only initialize when actually used
    if (!supabaseUrl || !supabaseAnonKey) {
      // In client/runtime, this should be set via env. During build/prerender, avoid initialization.
      throw new Error('Supabase client requested before environment was configured')
    }

    client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}

// Export a proxy that lazily initializes the client on first property access
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    const c = ensureClient() as any
    const value = Reflect.get(c, prop, receiver)
    return typeof value === 'function' ? value.bind(c) : value
  },
}) as SupabaseClient<Database>