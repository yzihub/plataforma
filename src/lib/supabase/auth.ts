import { createClient } from '@/lib/supabase/client'

/**
 * Sends a magic link email to the given address.
 * Uses Supabase signInWithOtp (PKCE flow) — the existing /auth/callback
 * route handles the code exchange for both OAuth and OTP magic links.
 */
export async function sendMagicLink(email: string) {
  const supabase = createClient()

  const emailRedirectTo =
    `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/auth/callback`

  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
    },
  })

  return { data, error }
}
