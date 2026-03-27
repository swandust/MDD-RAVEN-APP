/**
 * send-pots-alert — Supabase Edge Function
 *
 * Receives a POTS alert payload, resolves FCM tokens for the target user,
 * and delivers a push notification via the Firebase Cloud Messaging HTTP v1 API.
 *
 * Required secrets (set with `supabase secrets set`):
 *   FIREBASE_SERVICE_ACCOUNT_JSON  — full contents of the service account key JSON
 *   FIREBASE_PROJECT_ID            — Firebase project ID string
 *
 * Auto-injected by Supabase (do not set manually):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlertPayload {
  userId: string
  severity: 'warning' | 'critical'
  triggeredBy: string[]
  currentHR: number
  currentSBP: number
  deltaHR: number
  deltaSBP: number
  timestamp: number
}

interface FcmTokenRow {
  id: string
  token: string
  platform: string
}

interface ServiceAccount {
  client_email: string
  private_key: string
}

interface TokenExchangeResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface FcmErrorDetail {
  errorCode?: string
}

interface FcmResponse {
  name?: string
  error?: {
    code: number
    message: string
    status: string
    details?: FcmErrorDetail[]
  }
}

// ─── CORS headers ─────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── In-memory rate-limit map ─────────────────────────────────────────────────
//
// Maps userId → unix-ms timestamp of the last push sent for that user.
// Resets on cold start — this is a best-effort guard, not a guarantee.
// At high invocation rates Supabase may run multiple instances; cross-instance
// deduplication would require a shared store (e.g. a Supabase KV row).

const lastSentMap = new Map<string, number>()
const RATE_LIMIT_MS = 60_000 // 60 seconds

// ─── FCM authentication ───────────────────────────────────────────────────────

/**
 * Encodes a Uint8Array to base64url without padding.
 * Required for building a JWS compact serialisation manually.
 */
function base64url(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Encodes a plain object as a base64url JSON segment (JWT header / claim set).
 */
function jwtSegment(obj: Record<string, unknown>): string {
  return base64url(new TextEncoder().encode(JSON.stringify(obj)))
}

/**
 * Derives a short-lived Google OAuth2 access token from a service account key.
 *
 * Process:
 *  1. Build a signed JWT (RS256) asserting the firebase.messaging scope.
 *  2. POST it to the Google token endpoint in the `urn:ietf:params:oauth:grant-type:jwt-bearer` flow.
 *  3. Return the resulting access_token.
 *
 * Web Crypto is used for all cryptographic operations — no external libraries.
 */
async function getAccessToken(serviceAccountJson: string): Promise<string> {
  // Secret is stored base64-encoded (set via `echo ... | base64`); decode before parsing.
  const decoded = atob(serviceAccountJson)
  const { client_email, private_key } = JSON.parse(decoded) as ServiceAccount

  const now = Math.floor(Date.now() / 1000)

  const header = jwtSegment({ alg: 'RS256', typ: 'JWT' })
  const claims = jwtSegment({
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })

  const signingInput = `${header}.${claims}`

  // Import the PEM private key into the Web Crypto key store.
  const pemBody = private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')

  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  )

  const signature = base64url(new Uint8Array(signatureBuffer))
  const jwt = `${signingInput}.${signature}`

  // Exchange the signed JWT for an access token.
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    throw new Error(`Google token exchange failed (${tokenRes.status}): ${text}`)
  }

  const tokenData = (await tokenRes.json()) as TokenExchangeResponse
  return tokenData.access_token
}

// ─── Notification content ─────────────────────────────────────────────────────

function buildNotificationContent(payload: AlertPayload): { title: string; body: string } {
  const title =
    payload.severity === 'critical'
      ? '⚠️ CRITICAL: POTS Alert'
      : '🚨 Warning: POTS Alert'

  const deltaHRStr =
    payload.deltaHR >= 0
      ? `HR +${Math.round(payload.deltaHR)} bpm above baseline`
      : `HR ${Math.round(payload.deltaHR)} bpm below baseline`

  const body = `${deltaHRStr} · SBP ${Math.round(payload.currentSBP)} mmHg`

  return { title, body }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS })
  }

  try {
    // 1. Method guard
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // 2. Parse and validate body
    let payload: AlertPayload
    try {
      payload = (await req.json()) as AlertPayload
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (!payload.userId || !payload.severity || !Array.isArray(payload.triggeredBy)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, severity, triggeredBy' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // 3. In-memory rate limit check
    const lastSent = lastSentMap.get(payload.userId)
    if (lastSent !== undefined && Date.now() - lastSent < RATE_LIMIT_MS) {
      return new Response(JSON.stringify({ sent: 0, reason: 'rate_limited' }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // 4. Initialise Supabase client with service role key for token read + stale cleanup
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 5. Fetch FCM tokens for this user
    const { data: tokenRows, error: tokenFetchError } = await supabase
      .from('fcm_tokens')
      .select('id, token, platform')
      .eq('user_id', payload.userId)

    if (tokenFetchError) {
      console.error('[send-pots-alert] Failed to fetch FCM tokens:', tokenFetchError.message)
      return new Response(JSON.stringify({ error: 'Failed to fetch tokens' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const rows = (tokenRows ?? []) as FcmTokenRow[]

    if (rows.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // 6. Build FCM auth token and project metadata
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON') ?? ''
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID') ?? ''

    if (!serviceAccountJson || !projectId) {
      console.error('[send-pots-alert] Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID')
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    let accessToken: string
    try {
      accessToken = await getAccessToken(serviceAccountJson)
    } catch (err) {
      console.error('[send-pots-alert] Failed to obtain FCM access token:', err)
      return new Response(JSON.stringify({ error: 'FCM authentication failed' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { title, body } = buildNotificationContent(payload)
    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`

    // Serialise the full payload into FCM data so the foreground app can parse it.
    const dataPayload: Record<string, string> = {
      userId: payload.userId,
      severity: payload.severity,
      triggeredBy: JSON.stringify(payload.triggeredBy),
      currentHR: String(payload.currentHR),
      currentSBP: String(payload.currentSBP),
      deltaHR: String(payload.deltaHR),
      deltaSBP: String(payload.deltaSBP),
      timestamp: String(payload.timestamp),
    }

    // 7. Send to each token, collect stale token IDs for cleanup
    let sent = 0
    let failed = 0
    const staleIds: string[] = []

    await Promise.all(
      rows.map(async (row) => {
        try {
          const fcmRes = await fetch(fcmEndpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token: row.token,
                notification: { title, body },
                data: dataPayload,
              },
            }),
          })

          const fcmBody = (await fcmRes.json()) as FcmResponse

          if (fcmRes.ok) {
            sent++
          } else {
            failed++
            // Mark stale if FCM reports the token is no longer registered.
            const errorCode = fcmBody.error?.details?.[0]?.errorCode ?? fcmBody.error?.status
            if (
              fcmRes.status === 404 ||
              errorCode === 'UNREGISTERED' ||
              errorCode === 'INVALID_ARGUMENT'
            ) {
              staleIds.push(row.id)
            } else {
              console.warn(
                `[send-pots-alert] FCM error for token ${row.id}:`,
                fcmBody.error?.message,
              )
            }
          }
        } catch (err) {
          failed++
          console.warn(`[send-pots-alert] Network error sending to token ${row.id}:`, err)
        }
      }),
    )

    // 8. Clean up stale tokens using service role client
    if (staleIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('fcm_tokens')
        .delete()
        .in('id', staleIds)

      if (deleteError) {
        // Log but do not fail — stale cleanup is best-effort
        console.warn('[send-pots-alert] Failed to delete stale tokens:', deleteError.message)
      } else {
        console.log(`[send-pots-alert] Deleted ${staleIds.length} stale token(s)`)
      }
    }

    // 9. Update rate-limit map after successful dispatch
    lastSentMap.set(payload.userId, Date.now())

    return new Response(JSON.stringify({ sent, failed }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    // Outer catch — edge functions must always return a Response
    console.error('[send-pots-alert] Unhandled error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
