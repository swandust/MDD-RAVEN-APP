/**
 * usePotsAlerts — real-time POTS threshold detection hook.
 *
 * ## Clinical basis
 *
 * ### Heart-rate criteria (primary)
 * POTS is defined by a sustained HR rise of ≥30 bpm (≥40 bpm in patients <19 y)
 * within 10 minutes of orthostatic challenge, without orthostatic hypotension
 * (Sheldon et al., Heart Rhythm 2015). The warning threshold at ≥20 bpm provides
 * an early-detection margin. HR is treated as the primary criterion because the
 * PPG-derived HR signal is more robust to motion and posture artefact than the
 * PTT-derived BP estimate.
 *
 * ### Blood-pressure criteria (secondary)
 * A systolic drop of ≥20 mmHg (adjusted by ageFactor for paediatric and elderly
 * patients) within 3 minutes of standing meets the consensus definition of
 * orthostatic hypotension (Freeman et al., Clin Auton Res 2011). The critical
 * threshold adds a further −5 mmHg margin to flag haemodynamic compromise.
 *
 * ### Trend criteria
 * A rising HR slope ≥5 bpm/min or a falling SBP slope ≥5 mmHg/min over 2 minutes
 * suggests an evolving orthostatic response before absolute thresholds are reached.
 *
 * ### Age factor
 * Elderly patients (>60 y) have blunted baroreflexes, so the clinically significant
 * BP drop occurs at a lower absolute change — ageFactor 0.75 tightens that bound.
 * Paediatric patients (<20 y) have higher baseline HR variability and a steeper
 * POTS HR criterion — ageFactor 1.1 relaxes the BP bound slightly.
 *
 * ### NOTE — BP accuracy
 * PTT-derived blood pressure accuracy degrades significantly after ~4 hours without
 * a cuff-based recalibration. In long sessions, treat HR-based criteria as primary
 * and apply additional clinical judgment to BP-triggered alerts.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type {
  AlertThresholds,
  PatientProfile,
  PotsAlert,
  TriggeredBy,
  VitalsReading,
} from '../types/pots';

// ─── Constants ────────────────────────────────────────────────────────────────

const BUFFER_WINDOW_MS = 10 * 60 * 1000;       // 10-minute rolling buffer
const BASELINE_NEAR_EDGE_MS = 5 * 60 * 1000;   // readings older than this form the baseline
const TREND_WINDOW_MS = 2 * 60 * 1000;          // slope computed over last 2 minutes
const CURRENT_SAMPLE_COUNT = 3;                 // smooth current value over last N readings
const MIN_BASELINE_READINGS = 5;               // minimum readings needed in baseline window
const DEBOUNCE_MS = 60 * 1000;                 // suppress identical alert re-emission for 60 s

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Ordinary least-squares slope via linear regression.
 * Returns the slope in (y-units per minute).
 */
function slopePerMin(points: Array<{ x: number; y: number }>): number {
  const n = points.length;
  if (n < 2) return 0;
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  const slopePerMs = (n * sumXY - sumX * sumY) / denom;
  return slopePerMs * 60_000; // ms → minute
}

export function buildThresholds(
  constants: ReturnType<typeof deriveProfileConstants>,
  baselineHR: number,
  baselineSBP: number,
): AlertThresholds {
  const { critHRDelta, warnHRDelta, critSBPDrop, warnSBPDrop } = constants;
  return {
    warnHRDelta,
    critHRDelta,
    warnHRAbsolute: Math.max(95, Math.max(100, Math.min(120, baselineHR + critHRDelta)) - 10),
    critHRAbsolute: Math.max(100, Math.min(120, baselineHR + critHRDelta)),
    hrTrendWarn: 5,
    hrTrendCrit: 10,
    warnSBPDrop,
    critSBPDrop,
    warnSBPAbsolute: Math.max(90, baselineSBP - warnSBPDrop),
    critSBPAbsolute: Math.max(80, baselineSBP - critSBPDrop - 5),
    sbpTrendWarn: 5,
    sbpTrendCrit: 10,
  };
}

/** Pure profile-derived scalars — stable as long as PatientProfile is unchanged. */
export function deriveProfileConstants(profile: PatientProfile) {
  const { age } = profile;
  const ageFactor = age > 60 ? 0.75 : age < 20 ? 1.1 : 1.0;
  const critHRDelta = age < 19 ? 40 : 30;
  const warnHRDelta = Math.max(20, critHRDelta - 10);
  const critSBPDrop = Math.round(20 * ageFactor);
  const warnSBPDrop = Math.round(10 * ageFactor);
  return { ageFactor, critHRDelta, warnHRDelta, critSBPDrop, warnSBPDrop };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePotsAlerts(sessionId: string): {
  alert: PotsAlert | null;
  thresholds: AlertThresholds | null;
  isLoading: boolean;
  error: string | null;
} {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [alert, setAlert] = useState<PotsAlert | null>(null);
  const [thresholds, setThresholds] = useState<AlertThresholds | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Rolling 10-minute buffer of validated readings. */
  const bufferRef = useRef<VitalsReading[]>([]);

  /**
   * Last emitted alert fingerprint for debounce.
   * Fingerprint = `severity|triggeredBy(sorted)`.
   */
  const lastAlertRef = useRef<{ key: string; time: number } | null>(null);

  // ── 1. Fetch health profile once on mount ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error(authError?.message ?? 'Not authenticated');
        }

        const { data, error: profileError } = await supabase
          .from('health_profile')
          .select('date_of_birth, biological_sex, height_cm, weight_kg')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw new Error(profileError.message);
        if (!data) throw new Error('No health profile found');

        if (!cancelled) {
          setProfile({
            age: computeAge(data.date_of_birth as string),
            biologicalSex: (data.biological_sex as 'male' | 'female' | 'other') ?? 'other',
            heightCm: Number(data.height_cm),
            weightKg: Number(data.weight_kg),
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load health profile');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── 2. Memoize profile-derived constants (recompute only when profile changes) ──
  const profileConstants = useMemo(
    () => (profile ? deriveProfileConstants(profile) : null),
    [profile],
  );

  // ── 3. Subscribe to processed_vitals in real time ───────────────────────────
  useEffect(() => {
    if (!profileConstants) return;

    // ── Evaluation logic (runs on every incoming reading) ────────────────────
    function evaluateAlert(buffer: VitalsReading[], now: number): void {
      // Partition buffer into baseline window (5–10 min ago) and recent window
      const baselineReadings = buffer.filter(
        (r) => now - r.timestamp >= BASELINE_NEAR_EDGE_MS,
      );
      const recentReadings = buffer.filter(
        (r) => now - r.timestamp < BASELINE_NEAR_EDGE_MS,
      );

      // Insufficient baseline data — emit nothing
      if (baselineReadings.length < MIN_BASELINE_READINGS) return;

      const baselineHR = median(baselineReadings.map((r) => r.heartRate));
      const baselineSBP = median(baselineReadings.map((r) => r.systolicBP));

      // Current value: median of last N readings (sensor noise smoothing)
      const currentSample = recentReadings.slice(-CURRENT_SAMPLE_COUNT);
      if (currentSample.length === 0) return;
      const currentHR = median(currentSample.map((r) => r.heartRate));
      const currentSBP = median(currentSample.map((r) => r.systolicBP));

      if (!profileConstants) return;
      const computed = buildThresholds(profileConstants, baselineHR, baselineSBP);

      const deltaHR = currentHR - baselineHR;
      const deltaSBP = baselineSBP - currentSBP; // positive = drop

      // Trend: linear regression slope over the last 2 minutes
      const trendWindow = buffer.filter((r) => now - r.timestamp <= TREND_WINDOW_MS);
      const hrTrend = slopePerMin(trendWindow.map((r) => ({ x: r.timestamp, y: r.heartRate })));
      const sbpTrend = slopePerMin(trendWindow.map((r) => ({ x: r.timestamp, y: r.systolicBP })));
      // SBP trend: negative slope = falling pressure; we report as positive rate-of-fall
      const sbpFallRate = -sbpTrend;

      // ── Build TriggeredBy list ──────────────────────────────────────────────
      const triggered: TriggeredBy[] = [];

      if (deltaHR >= computed.critHRDelta) triggered.push('hr_delta');
      else if (deltaHR >= computed.warnHRDelta) triggered.push('hr_delta');

      if (currentHR >= computed.critHRAbsolute) triggered.push('hr_absolute');
      else if (currentHR >= computed.warnHRAbsolute) triggered.push('hr_absolute');

      if (hrTrend >= computed.hrTrendCrit) triggered.push('hr_trend');
      else if (hrTrend >= computed.hrTrendWarn) triggered.push('hr_trend');

      if (deltaSBP >= computed.critSBPDrop) triggered.push('sbp_drop');
      else if (deltaSBP >= computed.warnSBPDrop) triggered.push('sbp_drop');

      if (currentSBP <= computed.critSBPAbsolute) triggered.push('sbp_absolute');
      else if (currentSBP <= computed.warnSBPAbsolute) triggered.push('sbp_absolute');

      if (sbpFallRate >= computed.sbpTrendCrit) triggered.push('sbp_trend');
      else if (sbpFallRate >= computed.sbpTrendWarn) triggered.push('sbp_trend');

      // ── Determine severity ─────────────────────────────────────────────────
      if (triggered.length === 0) {
        setAlert(null);
        setThresholds(computed);
        return;
      }

      const isCritical =
        deltaHR >= computed.critHRDelta ||
        currentHR >= computed.critHRAbsolute ||
        hrTrend >= computed.hrTrendCrit ||
        deltaSBP >= computed.critSBPDrop ||
        currentSBP <= computed.critSBPAbsolute ||
        sbpFallRate >= computed.sbpTrendCrit;

      const severity: 'warning' | 'critical' = isCritical ? 'critical' : 'warning';

      // ── Debounce — suppress identical severity + triggeredBy for 60 s ─────
      const alertKey = `${severity}|${[...triggered].sort().join(',')}`;
      const last = lastAlertRef.current;
      if (last && last.key === alertKey && now - last.time < DEBOUNCE_MS) {
        return;
      }
      lastAlertRef.current = { key: alertKey, time: now };

      const newAlert: PotsAlert = {
        severity,
        triggeredBy: triggered,
        currentHR,
        currentSBP,
        deltaHR,
        deltaSBP,
        hrTrendBpmPerMin: hrTrend,
        sbpTrendMmhgPerMin: sbpFallRate,
        thresholds: computed,
        timestamp: now,
      };

      setAlert(newAlert);
      setThresholds(computed);
    }

    // ── Realtime subscription ─────────────────────────────────────────────────
    const channel = supabase
      .channel(`pots-alerts-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'processed_vitals',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            created_at: string;
            heart_rate: number | null;
            systolic: number | null;
            diastolic: number | null;
            ptt_ms: number | null;
          };

          // Skip readings missing required biosignal fields
          if (row.heart_rate == null || row.systolic == null) return;

          const reading: VitalsReading = {
            id: row.id,
            timestamp: new Date(row.created_at).getTime(),
            heartRate: row.heart_rate,
            systolicBP: row.systolic,
            diastolicBP: row.diastolic ?? 0,
            pttMs: row.ptt_ms ?? null,
          };

          const now = reading.timestamp;

          // Append to buffer and prune readings older than 10 minutes
          bufferRef.current = [
            ...bufferRef.current.filter((r) => now - r.timestamp <= BUFFER_WINDOW_MS),
            reading,
          ];

          evaluateAlert(bufferRef.current, now);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      bufferRef.current = [];
    };
  }, [sessionId, profileConstants]);

  return { alert, thresholds, isLoading, error };
}
