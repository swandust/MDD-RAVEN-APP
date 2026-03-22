import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePotsAlerts } from '../hooks/usePotsAlerts';
import {
  dispatchPushNotification,
  initAndroidPushListeners,
  playAlertTone,
  triggerVibration,
} from '../services/notificationService';
import type { PotsAlert } from '../types/pots';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AlertContextValue {
  activeAlert: PotsAlert | null;
  history: PotsAlert[];
  /** Clears activeAlert without removing it from history. */
  dismissAlert: () => void;
  isLoading: boolean;
  error: string | null;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

// ─── Auto-dismiss durations ────────────────────────────────────────────────────

const AUTO_DISMISS_MS: Record<'warning' | 'critical', number> = {
  warning: 15_000,
  critical: 30_000,
};

const HISTORY_CAP = 20;

// ─── Provider ──────────────────────────────────────────────────────────────────

export function AlertProvider({
  sessionId,
  children,
}: {
  sessionId: string;
  children: ReactNode;
}) {
  const { alert, isLoading, error } = usePotsAlerts(sessionId);

  const [activeAlert, setActiveAlert] = useState<PotsAlert | null>(null);
  const [history, setHistory] = useState<PotsAlert[]>([]);

  // Stable dismiss callback — does not change across renders.
  const dismissAlert = useCallback(() => setActiveAlert(null), []);

  // Ref tracking the auto-dismiss timer so we can clear it on new alerts or
  // manual dismissal without adding it to effect dependencies.
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Notification effect ──────────────────────────────────────────────────────
  //
  // Dependency: alert?.timestamp — we intentionally DO NOT list `alert` itself
  // here. Each unique alert from usePotsAlerts carries a new timestamp (the
  // hook's internal debounce ensures no two logically-identical alerts share
  // the same timestamp within 60 s). Using only the timestamp means this
  // effect fires exactly once per distinct alert, never on unrelated re-renders.
  //
  // When alert becomes null (the hook clears it) the timestamp becomes
  // undefined, which is treated as a no-op.

  const alertTimestamp = alert?.timestamp ?? null;

  useEffect(() => {
    if (!alert) return;

    // 1. Sensory feedback — both wrapped in their own try/catch internally.
    playAlertTone(alert.severity);
    triggerVibration(alert.severity);

    // 2. Push dispatch (no-op stub; Phase 5 will fill this in).
    void dispatchPushNotification(alert);

    // 3. Prepend to history, capped at HISTORY_CAP entries.
    setHistory((prev) => [alert, ...prev].slice(0, HISTORY_CAP));

    // 4. Expose as the active alert.
    setActiveAlert(alert);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertTimestamp]);

  // ── Android foreground push listener ─────────────────────────────────────────
  //
  // On Android native, FCM delivers foreground pushes to the app rather than
  // the OS tray. initAndroidPushListeners is a no-op on web — safe to call
  // unconditionally. Runs once on mount; the listener lives for the component
  // lifetime (AlertProvider is only unmounted on sign-out).

  useEffect(() => {
    initAndroidPushListeners((incomingAlert) => {
      setActiveAlert(incomingAlert);
      setHistory((prev) => [incomingAlert, ...prev].slice(0, HISTORY_CAP));
      playAlertTone(incomingAlert.severity);
      triggerVibration(incomingAlert.severity);
    });
  }, []);

  // ── Auto-dismiss timer ───────────────────────────────────────────────────────
  //
  // Runs whenever activeAlert changes (new alert arrives or alert is cleared).
  // Clears any previous timer first so that a rapid succession of alerts — or
  // a manual dismiss — never fires a stale auto-dismiss.

  useEffect(() => {
    if (dismissTimerRef.current !== null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    if (!activeAlert) return;

    const delay = AUTO_DISMISS_MS[activeAlert.severity];
    dismissTimerRef.current = setTimeout(() => {
      setActiveAlert(null);
    }, delay);

    return () => {
      if (dismissTimerRef.current !== null) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [activeAlert]);

  return (
    <AlertContext.Provider
      value={{ activeAlert, history, dismissAlert, isLoading, error }}
    >
      {children}
    </AlertContext.Provider>
  );
}

// ─── Consumer hook ─────────────────────────────────────────────────────────────

export function useAlertContext(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAlertContext must be used within an AlertProvider');
  }
  return ctx;
}
