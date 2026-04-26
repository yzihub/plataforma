/**
 * Environment variable validation.
 *
 * Call requireEnv() for any variable that is required at runtime.
 * Throws a clear Error at module-load time — not silently at the first Supabase call.
 *
 * Usage:
 *   const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
 */

export function requireEnv(name: string): string {
  const value = process.env[name]

  if (!value || value.trim() === '') {
    throw new Error(
      `[YZI CONFIG] Missing required environment variable: ${name}\n` +
      `  Check your .env.local file. See .env.example for all required variables.`
    )
  }

  return value
}
