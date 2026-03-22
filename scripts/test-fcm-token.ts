/**
 * test-fcm-token.ts
 *
 * Verifies that at least one FCM token is stored in public.fcm_tokens for the
 * test user. A missing token means push notifications cannot be delivered.
 *
 * Required env vars in .env.local:
 *   VITE_SUPABASE_URL         — your project's Supabase URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS)
 *                               Find it: Supabase dashboard → Project Settings → API → service_role secret key
 *   TEST_USER_ID              — UUID of the user to check
 *                               Find it: Supabase dashboard → Authentication → Users
 *
 * Run:  npm run test:fcm-token
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

// ─── .env.local loader ────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV_PATH = resolve(__dirname, '..', '.env.local')

function loadEnv(): Record<string, string> {
  if (!existsSync(ENV_PATH)) {
    console.error(`[env] .env.local not found at ${ENV_PATH}`)
    console.error('      Create it and add VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, TEST_USER_ID')
    process.exit(1)
  }
  const env: Record<string, string> = {}
  for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    env[key] = val
  }
  return env
}

function requireVar(env: Record<string, string>, ...candidates: string[]): string {
  for (const key of candidates) {
    if (env[key]) return env[key]
  }
  console.error(`[env] Missing required variable. Expected one of: ${candidates.join(', ')}`)
  console.error('      Add it to .env.local and re-run.')
  process.exit(1)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FcmTokenRow {
  id: string
  token: string
  platform: string
  created_at: string
  updated_at: string
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n── FCM token registration check ──────────────────────────────\n')

  const env = loadEnv()
  const supabaseUrl      = requireVar(env, 'VITE_SUPABASE_URL', 'SUPABASE_URL')
  const serviceRoleKey   = env['SUPABASE_SERVICE_ROLE_KEY']
  const userId           = requireVar(env, 'TEST_USER_ID')

  if (!serviceRoleKey) {
    console.error(
      '[env] Missing SUPABASE_SERVICE_ROLE_KEY — find it in Supabase dashboard' +
      ' → Project Settings → API → service_role key',
    )
    process.exit(1)
  }

  console.log(`  Querying fcm_tokens for user: ${userId}\n`)

  // Service role key bypasses RLS so the script can read rows regardless of policy.
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data, error } = await supabase
    .from('fcm_tokens')
    .select('id, token, platform, created_at, updated_at')
    .eq('user_id', userId)

  if (error) {
    console.error('  [supabase] Query failed:', error.message)
    console.error('  Check that VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct.')
    process.exit(1)
  }

  const rows = (data ?? []) as FcmTokenRow[]

  if (rows.length === 0) {
    console.error('  ✗ FAIL  No FCM token rows found for this user.')
    console.error()
    console.error('  ▶ Fix: Open the app in the browser, sign in, and wait for the')
    console.error('         notification permission prompt. The registerAndStoreFcmToken()')
    console.error('         call in AuthContext fires automatically after sign-in.')
    console.error('         Then re-run this script.')
    process.exit(1)
  }

  console.log(`  Found ${rows.length} token(s):\n`)
  for (const row of rows) {
    console.log('  ─', {
      id: row.id,
      platform: row.platform,
      created_at: row.created_at,
      updated_at: row.updated_at,
      token: `${row.token.slice(0, 20)}...`,  // truncated for safety
    })
  }

  console.log(`\n  ✓ PASS  ${rows.length} FCM token(s) found — push delivery is possible.\n`)
}

main().catch((err) => {
  console.error('[fatal]', err)
  process.exit(1)
})
