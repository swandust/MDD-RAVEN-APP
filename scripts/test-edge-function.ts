/**
 * test-edge-function.ts
 *
 * Smoke-tests the deployed `send-pots-alert` Supabase edge function.
 *
 * Required env vars in .env.local:
 *   VITE_SUPABASE_URL    — your project's Supabase URL
 *   SUPABASE_ANON_KEY    — anon/public key (or VITE_SUPABASE_ANON_KEY)
 *   TEST_USER_ID         — UUID of a user who has already signed in so that
 *                          registerAndStoreFcmToken() has fired and an FCM
 *                          token row exists in public.fcm_tokens
 *
 * Run:  npm run test:edge
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ─── .env.local loader ────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV_PATH = resolve(__dirname, '..', '.env.local')

function loadEnv(): Record<string, string> {
  if (!existsSync(ENV_PATH)) {
    console.error(`[env] .env.local not found at ${ENV_PATH}`)
    console.error('      Create it and add VITE_SUPABASE_URL, SUPABASE_ANON_KEY, TEST_USER_ID')
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
  console.error(
    `[env] Missing required variable. Expected one of: ${candidates.join(', ')}`,
  )
  console.error('      Add it to .env.local and re-run.')
  process.exit(1)
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function pass(label: string): void {
  console.log(`  ✓ PASS  ${label}`)
  passed++
}

function fail(label: string, detail?: string): void {
  console.error(`  ✗ FAIL  ${label}`)
  if (detail) console.error(`         ${detail}`)
  failed++
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n── send-pots-alert edge function smoke test ──────────────────\n')

  const env = loadEnv()
  const supabaseUrl = requireVar(env, 'VITE_SUPABASE_URL', 'SUPABASE_URL')
  const anonKey    = requireVar(env, 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY')
  const userId     = requireVar(env, 'TEST_USER_ID')

  const endpoint = `${supabaseUrl}/functions/v1/send-pots-alert`

  const payload = {
    userId,
    severity: 'warning',
    triggeredBy: ['hr_delta'],
    currentHR: 105,
    currentSBP: 112,
    deltaHR: 32,
    deltaSBP: 14,
    timestamp: Date.now(),
  }

  console.log(`  Endpoint : ${endpoint}`)
  console.log(`  userId   : ${userId}`)
  console.log(`  payload  :`, JSON.stringify(payload, null, 4), '\n')

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error(`  [network] Failed to reach ${endpoint}:`, err)
    process.exit(1)
  }

  // ── Assert HTTP 200 ──────────────────────────────────────────────────────────
  if (res.status === 200) {
    pass(`HTTP 200 OK`)
  } else {
    fail(`HTTP ${res.status}`, `Expected 200, got ${res.status}`)
  }

  const bodyText = await res.text()
  console.log('\n  Response body:', bodyText, '\n')

  let body: Record<string, unknown>
  try {
    body = JSON.parse(bodyText) as Record<string, unknown>
  } catch {
    fail('Response is valid JSON', `Body is not JSON: ${bodyText}`)
    printSummary()
    return
  }

  // ── Assert shape ─────────────────────────────────────────────────────────────
  if ('sent' in body && 'failed' in body) {
    pass('Response contains { sent, failed }')
  } else if ('sent' in body && 'reason' in body) {
    pass('Response contains { sent, reason }  (rate-limited)')
    console.log('  Note: request was rate-limited — wait 60s and retry if needed')
  } else if ('error' in body) {
    fail('Response contains { sent, failed }', `Got error: ${String(body.error)}`)
  } else {
    fail('Response contains { sent, failed }', `Unexpected shape: ${bodyText}`)
  }

  // ── Diagnostic: no FCM token ─────────────────────────────────────────────────
  if (typeof body.sent === 'number' && body.sent === 0 && !body.reason) {
    console.warn(
      '\n  ⚠ DIAGNOSTIC: sent === 0 — No FCM token found for this user.',
      '\n    Sign in to the app in the browser first so registerAndStoreFcmToken()',
      '\n    fires and stores a token in public.fcm_tokens. Then re-run this script.\n',
    )
  }

  printSummary()
}

function printSummary(): void {
  console.log(`\n── Results: ${passed} passed, ${failed} failed ───────────────────────\n`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('[fatal]', err)
  process.exit(1)
})
