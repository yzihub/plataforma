import { createClient } from '@supabase/supabase-js'

// Cliente com service_role — usar APENAS em API routes server-side
// Nunca expor no browser
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
