/**
 * fcmTokenService — persists FCM tokens in Supabase so the backend can
 * target push notifications to specific users and devices.
 *
 * Both functions are plain async functions (no React). They are safe to call
 * from any context — auth callbacks, event handlers, or service modules.
 *
 * The `public.fcm_tokens` table is expected to already exist with columns:
 *   id uuid, user_id uuid, token text, platform text,
 *   created_at timestamptz, updated_at timestamptz
 * with a unique constraint on (user_id, token).
 */

import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { supabase } from '../../lib/supabase'
import { registerFirebaseSW } from '../lib/swRegistration'

type Platform = 'web' | 'android'

/**
 * Detects whether the app is running inside a Capacitor native shell.
 * The one intentional `any` cast in this file — Capacitor is not typed on
 * `window` and the import would add a dependency we don't want here.
 */
function detectPlatform(): Platform {
  if (
    typeof window !== 'undefined' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !(window as any).Capacitor?.isNativePlatform()
  ) {
    return 'web'
  }
  return 'android'
}

/**
 * Registers the Firebase service worker, retrieves an FCM token, and upserts
 * it into `public.fcm_tokens` for the current authenticated user.
 *
 * Returns silently (no throw) in all failure cases:
 * - User not authenticated
 * - Notification permission denied
 * - Network / Supabase error
 */
export async function registerAndStoreFcmToken(): Promise<void> {
  // 1. Get the FCM token — platform-branched.
  let token: string | null
  if (Capacitor.isNativePlatform()) {
    // Android: use the Capacitor Firebase Messaging plugin.
    try {
      await FirebaseMessaging.requestPermissions()
      const result = await FirebaseMessaging.getToken()
      token = result.token ?? null
    } catch (err) {
      console.warn('[fcmTokenService] Android FCM token registration failed:', err)
      return
    }
  } else {
    // Web: register the Firebase service worker and retrieve the VAPID token.
    try {
      token = await registerFirebaseSW()
    } catch (err) {
      console.warn('[fcmTokenService] registerFirebaseSW threw unexpectedly:', err)
      return
    }
  }

  // 2. Permission denied or SW unavailable — nothing to store.
  if (!token) return

  // 3. Detect platform.
  const platform = detectPlatform()

  // 4. Resolve the authenticated user.
  let userId: string
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      console.warn('[fcmTokenService] No authenticated user — skipping token storage.')
      return
    }
    userId = user.id
  } catch (err) {
    console.warn('[fcmTokenService] Failed to resolve current user:', err)
    return
  }

  // 5. Upsert the token — onConflict on (user_id, token) updates updated_at
  //    without creating duplicate rows when the same token is re-registered.
  try {
    const { error } = await supabase
      .from('fcm_tokens')
      .upsert(
        {
          user_id:    userId,
          token,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token' },
      )

    if (error) {
      console.warn('[fcmTokenService] Failed to upsert FCM token:', error.message)
    }
  } catch (err) {
    console.warn('[fcmTokenService] Unexpected error upserting FCM token:', err)
  }
}

/**
 * Deletes a specific FCM token from `public.fcm_tokens` for the current user.
 * Call this on logout so the user stops receiving push notifications on this
 * device after signing out.
 *
 * @param token - The FCM token string returned by `registerFirebaseSW()`.
 */
export async function removeFcmToken(token: string): Promise<void> {
  // 1. Resolve the authenticated user.
  let userId: string
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      console.warn('[fcmTokenService] No authenticated user — cannot remove token.')
      return
    }
    userId = user.id
  } catch (err) {
    console.warn('[fcmTokenService] Failed to resolve current user for token removal:', err)
    return
  }

  // 2. Delete the specific token row.
  try {
    const { error } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token)

    if (error) {
      console.warn('[fcmTokenService] Failed to delete FCM token:', error.message)
    }
  } catch (err) {
    console.warn('[fcmTokenService] Unexpected error deleting FCM token:', err)
  }
}
