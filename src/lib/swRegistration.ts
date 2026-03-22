/**
 * swRegistration — registers the Firebase messaging service worker and
 * returns an FCM token for the current browser session.
 *
 * Call once after the user is confirmed authenticated. Subsequent calls
 * are safe (the browser deduplicates SW registrations).
 */

import { getToken } from 'firebase/messaging'
import { messaging } from './firebase'

interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

/**
 * Registers `/firebase-messaging-sw.js`, injects the Firebase config into
 * the service worker via postMessage, and retrieves an FCM token.
 *
 * @returns The FCM token string, or `null` if:
 *   - The browser does not support service workers
 *   - The user denies notification permission
 *   - The token fetch fails for any reason
 */
export async function registerFirebaseSW(): Promise<string | null> {
  // Guard: service workers are not available in all environments (e.g. HTTP,
  // some browsers, React Native webview).
  if (!('serviceWorker' in navigator)) {
    console.warn('[swRegistration] Service workers not supported — skipping SW registration.')
    return null
  }

  try {
    // 1. Register the service worker.
    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/' },
    )

    // 2. Inject the Firebase config so the SW can call initializeApp.
    //    The config values are read from Vite env vars at build time — they
    //    are never hardcoded in the SW file itself.
    const config: FirebaseConfig = {
      apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            as string,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        as string,
      projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         as string,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     as string,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID             as string,
    }

    // Wait for the SW to be ready before posting (handles the first-install case).
    const readySW = await navigator.serviceWorker.ready
    readySW.active?.postMessage({ type: 'FIREBASE_CONFIG', config })

    // 3. Request permission (if not yet granted) and fetch the FCM token.
    //    getToken will throw if permission is denied — caught below.
    if (!messaging) {
      console.warn('[swRegistration] Firebase Messaging not initialised — skipping token fetch.')
      return null
    }
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY as string,
      serviceWorkerRegistration: registration,
    })

    return token ?? null
  } catch (err) {
    // Permission denied, network error, or misconfigured VAPID key.
    // We log but never throw — SW registration must not crash the app.
    console.warn('[swRegistration] Failed to register SW or fetch FCM token:', err)
    return null
  }
}
