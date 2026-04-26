import { createClient } from '@supabase/supabase-js'
import { requireEnv } from '@/lib/env-validation'

// Cliente com service_role — usar APENAS em API routes server-side
// Nunca expor no browser
export function createAdminClient() {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
