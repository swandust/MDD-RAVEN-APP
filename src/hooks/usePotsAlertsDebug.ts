// DEBUG ONLY — never use in production. Remove before release.
//
// Thin wrapper around usePotsAlerts that merges optional threshold overrides
// into the returned `thresholds` value for UI testing.
//
// IMPORTANT LIMITATION: The `alert` value is still produced by the production
// hook using its own computed thresholds. Overriding thresholds here does NOT
// cause alerts to fire at lower values — it only changes what the `thresholds`
// field displays in the UI (useful for testing the AlertBanner render path).
//
// To actually trigger alerts at artificially low thresholds during live testing,
// temporarily lower the BASELINE_NEAR_EDGE_MS constant in usePotsAlerts.ts
// (e.g., to 30 s) so the baseline window fills quickly, and insert test rows
// into processed_vitals via the Supabase dashboard with out-of-range HR values.

import { usePotsAlerts } from './usePotsAlerts'
import type { AlertThresholds, PotsAlert } from '../types/pots'

/**
 * Preset thresholds that fire on normal resting vitals.
 * Swap usePotsAlerts → usePotsAlertsDebug in a component temporarily to
 * exercise the AlertBanner without needing a real POTS event.
 */
export const DEBUG_LOW_THRESHOLDS: Partial<AlertThresholds> = {
  warnHRDelta: 5,
  critHRDelta: 10,
  warnSBPDrop: 3,
  critSBPDrop: 6,
}

interface UsePotsAlertsDebugResult {
  alert: PotsAlert | null
  thresholds: AlertThresholds | null
  isLoading: boolean
  error: string | null
}

/**
 * Debug wrapper around usePotsAlerts.
 *
 * @param sessionId         - Passed through to the production hook unchanged.
 * @param thresholdOverrides - Optional partial threshold values merged over the
 *                            computed thresholds in the returned object. Does
 *                            not affect alert evaluation — display only.
 */
export function usePotsAlertsDebug(
  sessionId: string,
  thresholdOverrides?: Partial<AlertThresholds>,
): UsePotsAlertsDebugResult {
  const result = usePotsAlerts(sessionId)

  const debugThresholds: AlertThresholds | null =
    result.thresholds && thresholdOverrides
      ? { ...result.thresholds, ...thresholdOverrides }
      : result.thresholds

  return { ...result, thresholds: debugThresholds }
}
