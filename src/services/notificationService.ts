/**
 * notificationService — audio, vibration, and push notification delivery.
 *
 * All functions are plain TypeScript (no React). They are safe to call from
 * anywhere — event handlers, context effects, or vanilla TS modules.
 *
 * EXTENSION POINT (Phase 5): dispatchPushNotification is intentionally left
 * as a no-op stub. Phase 5 will check Capacitor.isNativePlatform() and branch
 * between a Supabase edge-function call (native) and the browser Notification
 * API (web). Do not add logic here until that phase.
 */

import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '../../lib/supabase';
import type { PotsAlert } from '../types/pots';

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Lazily creates and reuses a single AudioContext instance.
 * The AudioContext is created on first use (after a user gesture on most
 * browsers), never on module load, to avoid the autoplay policy error.
 */
let _audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    const Ctor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    _audioCtx = new Ctor();
  }
  return _audioCtx;
}

/**
 * Schedules a single sine-wave beep via the Web Audio API.
 *
 * @param ctx      - The AudioContext to use.
 * @param freq     - Oscillator frequency in Hz.
 * @param startAt  - AudioContext time (seconds) at which the beep begins.
 * @param duration - Duration of the beep in seconds.
 */
function scheduleBeep(
  ctx: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.value = freq;

  // Ramp gain down to avoid a harsh click at the end of each beep.
  gain.gain.setValueAtTime(0.3, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Plays an alert tone using the Web Audio API.
 *
 * - Warning:  two short beeps at 440 Hz (150 ms each, 100 ms gap)
 * - Critical: three fast beeps at 880 Hz (100 ms each, 60 ms gap)
 *
 * Wrapped in try/catch — audio failure must never crash the app.
 */
export function playAlertTone(severity: 'warning' | 'critical'): void {
  try {
    const ctx = getAudioContext();

    // Resume context if suspended (e.g. browser autoplay policy)
    void ctx.resume().then(() => {
      const now = ctx.currentTime;

      if (severity === 'warning') {
        // 440 Hz · 150 ms beep · 100 ms gap · 150 ms beep
        const beepDuration = 0.15;
        const gap = 0.1;
        scheduleBeep(ctx, 440, now, beepDuration);
        scheduleBeep(ctx, 440, now + beepDuration + gap, beepDuration);
      } else {
        // 880 Hz · 100 ms beep · 60 ms gap × 3
        const beepDuration = 0.1;
        const gap = 0.06;
        const stride = beepDuration + gap;
        scheduleBeep(ctx, 880, now, beepDuration);
        scheduleBeep(ctx, 880, now + stride, beepDuration);
        scheduleBeep(ctx, 880, now + stride * 2, beepDuration);
      }
    });
  } catch {
    // Audio errors must not propagate — the alert UI remains functional.
  }
}

/**
 * Triggers the device vibration motor via the Vibration API.
 *
 * Pattern (milliseconds):
 * - Warning:  vibrate 200 · pause 100 · vibrate 200
 * - Critical: vibrate 300 · pause 100 · vibrate 300 · pause 100 · vibrate 300
 *
 * Guarded: checks `navigator.vibrate` before calling (not available on iOS or
 * desktop browsers; silently skipped).
 */
export function triggerVibration(severity: 'warning' | 'critical'): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }

  const pattern =
    severity === 'warning'
      ? [200, 100, 200]
      : [300, 100, 300, 100, 300];

  try {
    navigator.vibrate(pattern);
  } catch {
    // Vibration errors must not propagate.
  }
}

/**
 * Dispatches a push notification for a POTS alert.
 *
 * Always invokes the `send-pots-alert` Supabase edge function so the server
 * can fan out to all registered devices. On web, also shows a foreground
 * browser Notification directly (the SW only handles background delivery).
 *
 * Errors are logged but never rethrown — notification failure must not
 * disrupt the in-app alert UI that is already visible to the user.
 */
export async function dispatchPushNotification(alert: PotsAlert): Promise<void> {
  try {
    // 1. Require an authenticated user — no push without a known recipient.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 2. Detect runtime platform.
    const platform = Capacitor.isNativePlatform() ? 'android' : 'web';

    // 3. Build the edge-function payload.
    const payload = {
      userId: user.id,
      severity: alert.severity,
      triggeredBy: alert.triggeredBy,
      currentHR: alert.currentHR,
      currentSBP: alert.currentSBP,
      deltaHR: alert.deltaHR,
      deltaSBP: alert.deltaSBP,
      timestamp: alert.timestamp,
    };

    // 4. Invoke the edge function (handles both web and native FCM delivery).
    const { error: fnError } = await supabase.functions.invoke('send-pots-alert', {
      body: payload,
    });
    if (fnError) {
      console.warn('[notificationService] send-pots-alert edge function error:', fnError);
    }

    // 5. Web-only: show a foreground browser Notification as an immediate fallback.
    //    The service worker handles background delivery; this covers the case where
    //    the tab is open and focused (SW background handler does not fire then).
    if (platform === 'web' && typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') {
        const title =
          alert.severity === 'critical'
            ? '⚠️ CRITICAL: POTS Alert'
            : '🚨 Warning: POTS Alert';
        const body = `HR +${Math.round(alert.deltaHR)} bpm · SBP ${Math.round(alert.currentSBP)} mmHg`;

        new Notification(title, { body, icon: '/icon.png' });
      }
    }
  } catch (err) {
    console.warn('[notificationService] dispatchPushNotification failed:', err);
  }
}

/**
 * Registers a foreground push-notification listener for Android native.
 *
 * On Android, FCM delivers pushes directly to the app when it is foregrounded
 * rather than routing them through the OS notification tray. This listener
 * parses the data payload from the edge function and passes the reconstructed
 * PotsAlert to the provided callback.
 *
 * Safe to call unconditionally — returns immediately on web.
 *
 * @param onAlert - Called with the parsed PotsAlert whenever a foreground push arrives.
 */
export function initAndroidPushListeners(
  onAlert: (alert: PotsAlert) => void,
): void {
  if (!Capacitor.isNativePlatform()) return;

  void FirebaseMessaging.addListener('notificationReceived', (event) => {
    // The edge function stringifies all payload values; parse them back.
    try {
      const data = event.notification.data as Record<string, string>;
      const incomingAlert: PotsAlert = {
        severity:           data.severity as 'warning' | 'critical',
        triggeredBy:        JSON.parse(data.triggeredBy) as PotsAlert['triggeredBy'],
        currentHR:          Number(data.currentHR),
        currentSBP:         Number(data.currentSBP),
        deltaHR:            Number(data.deltaHR),
        deltaSBP:           Number(data.deltaSBP),
        hrTrendBpmPerMin:   0,
        sbpTrendMmhgPerMin: 0,
        thresholds:         JSON.parse(data.thresholds ?? '{}') as PotsAlert['thresholds'],
        timestamp:          Number(data.timestamp),
      };

      // Post a local notification so it appears in the system tray even when
      // the app is foregrounded (FCM suppresses the tray notification in that case).
      const title = incomingAlert.severity === 'critical'
        ? '⚠️ CRITICAL: POTS Alert'
        : '🚨 Warning: POTS Alert';
      const body = incomingAlert.severity === 'critical'
        ? `Your heart rate jumped by +${Math.round(incomingAlert.deltaHR)} bpm. Sit or lie down immediately — high fainting risk!`
        : `Your heart rate increased by +${Math.round(incomingAlert.deltaHR)} bpm. Sit down if you feel dizzy, lightheaded, or unwell.`;

      void LocalNotifications.schedule({
        notifications: [{
          id: Date.now() % 2147483647,
          title,
          body,
          schedule: { at: new Date(Date.now() + 100) },
        }],
      });

      onAlert(incomingAlert);
    } catch (err) {
      console.warn('[notificationService] Failed to parse incoming push payload:', err);
    }
  });
}
