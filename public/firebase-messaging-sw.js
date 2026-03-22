/**
 * firebase-messaging-sw.js — FCM background message handler.
 *
 * Firebase config is injected at runtime by the page via postMessage
 * (type: 'FIREBASE_CONFIG'). Firebase initialisation is lazy — it happens
 * inside each event handler on first use — but all addEventListener calls
 * are synchronous at parse time so Chrome registers the handlers correctly.
 *
 * Handler registration order:
 *   1. push / pushsubscriptionchange / notificationclick — registered
 *      synchronously so the browser sees them immediately on worker startup.
 *   2. message — receives the FIREBASE_CONFIG payload from the page and
 *      assigns it to self.__FIREBASE_CONFIG__; also triggers lazy init.
 *
 * LIMITATION — true background messages (device locked, no page open):
 * self.__FIREBASE_CONFIG__ is populated by the page via postMessage. If the
 * SW wakes for a push with no client page running, the config will be
 * undefined and the Firebase messaging SDK path will be skipped. The raw
 * push handler below still shows a notification using whatever data FCM
 * placed in the push event payload directly, so foreground-style data
 * messages will be silent but notification messages will still appear.
 * For full offline coverage, consider persisting the config to IndexedDB
 * on first page load. On native (Android/iOS), Capacitor handles background
 * delivery independently — this file is only used for the web PWA path.
 */

/* global firebase, self */

// importScripts must be the very first executable statements.
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

// ── Config + init state ───────────────────────────────────────────────────────

/**
 * Populated by the FIREBASE_CONFIG postMessage from the page.
 * @type {object | undefined}
 */
self.__FIREBASE_CONFIG__ = undefined

let _initialized = false

/**
 * Initialises Firebase lazily. Safe to call from inside any event handler.
 * No-ops if already initialised or if the config has not yet arrived.
 * Returns true when Firebase is ready, false otherwise.
 *
 * @returns {boolean}
 */
function ensureFirebase () {
  if (_initialized) return true
  if (!self.__FIREBASE_CONFIG__) return false

  _initialized = true
  firebase.initializeApp(self.__FIREBASE_CONFIG__)

  // Register the Firebase SDK's own background-message handler.
  // This handles FCM messages that arrive while the app is backgrounded
  // and the page has already posted the config (i.e., the normal SW lifecycle).
  firebase.messaging().onBackgroundMessage(function (payload) {
    const title = (payload.notification && payload.notification.title) || 'POTS Alert'
    const body  = (payload.notification && payload.notification.body)  || ''
    self.registration.showNotification(title, { body, icon: '/icon.png' })
  })

  return true
}

// ── push ──────────────────────────────────────────────────────────────────────
// Registered synchronously so Chrome sees it at parse time.
// When Firebase is ready, the SDK's onBackgroundMessage handler above takes
// over; this raw handler provides a fallback when config hasn't arrived yet
// (e.g. the SW was woken cold with no client page open).

self.addEventListener('push', function (event) {
  // Attempt lazy init — succeeds when the page has already sent the config.
  ensureFirebase()

  // Fallback: show a notification directly from the raw push payload so that
  // FCM notification messages are never silently dropped, even when the
  // Firebase SDK could not be initialised (no config yet).
  if (!_initialized) {
    var data = {}
    try { data = event.data ? event.data.json() : {} } catch (_) { data = {} }

    var title = (data.notification && data.notification.title) || 'POTS Alert'
    var body  = (data.notification && data.notification.body)  || ''

    event.waitUntil(
      self.registration.showNotification(title, { body, icon: '/icon.png' })
    )
  }
  // When _initialized is true, the Firebase messaging SDK's internal push
  // listener (registered by onBackgroundMessage above) handles the event.
})

// ── pushsubscriptionchange ────────────────────────────────────────────────────
// Must be registered synchronously. Browsers fire this when the push
// subscription expires or is revoked so the app can re-subscribe.

self.addEventListener('pushsubscriptionchange', function (event) {
  ensureFirebase()
  // Re-subscribe and notify the app so it can update the FCM token in Supabase.
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then(function (subscription) {
        // Post the new subscription back to any open clients so
        // fcmTokenService.registerAndStoreFcmToken() can re-run.
        return self.clients.matchAll({ type: 'window' }).then(function (clients) {
          clients.forEach(function (client) {
            client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED', subscription: subscription.toJSON() })
          })
        })
      })
      .catch(function (err) {
        console.warn('[firebase-messaging-sw] pushsubscriptionchange re-subscribe failed:', err)
      })
  )
})

// ── notificationclick ─────────────────────────────────────────────────────────
// Must be registered synchronously. Handles taps on displayed notifications.

self.addEventListener('notificationclick', function (event) {
  ensureFirebase()
  event.notification.close()

  // Focus an existing app window or open a new one.
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clients) {
        for (var i = 0; i < clients.length; i++) {
          if ('focus' in clients[i]) return clients[i].focus()
        }
        if (self.clients.openWindow) return self.clients.openWindow('/')
      })
  )
})

// ── message — receives FIREBASE_CONFIG from the page ─────────────────────────
// Stays structurally as-is. Assigns config and triggers lazy init.

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    // Assign config before calling ensureFirebase so initializeApp sees it.
    self.__FIREBASE_CONFIG__ = event.data.config
    ensureFirebase()
  }
})
