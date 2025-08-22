import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

let client: SupabaseClient<Database> | null = null
let unavailableClient: SupabaseClient<Database> | null = null

function ensureClient(): SupabaseClient<Database> {
  if (!client) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      // Return an unavailable proxy that throws only when a method is actually invoked
      if (!unavailableClient) {
        unavailableClient = new Proxy({} as SupabaseClient<Database>, {
          get(_t, _prop) {
            return () => {
              throw new Error('Supabase client is not configured: please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
            }
          },
        }) as SupabaseClient<Database>
      }
      return unavailableClient
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