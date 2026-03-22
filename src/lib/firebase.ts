import { initializeApp } from 'firebase/app'
import { getMessaging, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseApp = initializeApp(firebaseConfig)

// getMessaging requires HTTPS + service worker support.
// Guard so a missing env var or unsupported browser never crashes the app.
let _messaging: Messaging | null = null
try {
  _messaging = getMessaging(firebaseApp)
} catch (err) {
  console.warn('[firebase] getMessaging failed — push notifications disabled:', err)
}
export const messaging: Messaging | null = _messaging
