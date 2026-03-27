/**
 * usePotsAlerts.test.ts
 *
 * Unit tests for the pure threshold evaluation logic extracted from usePotsAlerts.
 *
 * Unified alert logic:
 *   Warning  — HR delta ≥ 30 bpm  OR  MAP drop ≥ 5 mmHg
 *   Critical — HR delta ≥ 40 bpm  OR  MAP drop ≥ 10%
 */

import { describe, it, expect } from 'vitest'
import {
  buildThresholds,
  deriveProfileConstants,
} from '../usePotsAlerts'
import type { AlertThresholds, PatientProfile, PotsAlert, TriggeredBy, VitalsReading } from '../../types/pots'

// ─── Constants (mirrored from usePotsAlerts) ──────────────────────────────────

const BASELINE_NEAR_EDGE_MS = 5 * 60 * 1000
const CURRENT_SAMPLE_COUNT = 3
const MIN_BASELINE_READINGS = 5
const DEBOUNCE_MS = 60 * 1000

// ─── Pure test helpers ────────────────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function computeMAP(systolicBP: number, diastolicBP: number): number {
  return diastolicBP + (systolicBP - diastolicBP) / 3
}

function evaluateBuffer(
  buffer: VitalsReading[],
  profile: PatientProfile,
  now: number,
  lastAlert: { key: string; time: number } | null,
): {
  alert: PotsAlert | null
  thresholds: AlertThresholds | null
  nextLastAlert: { key: string; time: number } | null
} {
  const profileConstants = deriveProfileConstants(profile)

  const baselineReadings = buffer.filter((r) => now - r.timestamp >= BASELINE_NEAR_EDGE_MS)
  const recentReadings   = buffer.filter((r) => now - r.timestamp <  BASELINE_NEAR_EDGE_MS)

  if (baselineReadings.length < MIN_BASELINE_READINGS) {
    return { alert: null, thresholds: null, nextLastAlert: lastAlert }
  }

  const baselineHR  = median(baselineReadings.map((r) => r.heartRate))
  const baselineMAP = median(baselineReadings.map((r) => computeMAP(r.systolicBP, r.diastolicBP)))

  const currentSample = recentReadings.slice(-CURRENT_SAMPLE_COUNT)
  if (currentSample.length === 0) {
    return { alert: null, thresholds: null, nextLastAlert: lastAlert }
  }

  const currentHR  = median(currentSample.map((r) => r.heartRate))
  const currentMAP = median(currentSample.map((r) => computeMAP(r.systolicBP, r.diastolicBP)))
  const computed   = buildThresholds(profileConstants, baselineHR, baselineMAP)

  const deltaHR    = currentHR - baselineHR
  const deltaMAP   = baselineMAP - currentMAP  // positive = drop
  const mapDropPct = baselineMAP > 0 ? deltaMAP / baselineMAP : 0

  const triggered: TriggeredBy[] = []

  if      (deltaHR    >= computed.critHRDelta)             triggered.push('hr_delta')
  else if (deltaHR    >= computed.warnHRDelta)             triggered.push('hr_delta')

  if      (mapDropPct >= profileConstants.critMAPDropPct)  triggered.push('sbp_drop')
  else if (deltaMAP   >= profileConstants.warnMAPDrop)     triggered.push('sbp_drop')

  if (triggered.length === 0) {
    return { alert: null, thresholds: computed, nextLastAlert: lastAlert }
  }

  const isCritical =
    deltaHR    >= computed.critHRDelta ||
    mapDropPct >= profileConstants.critMAPDropPct

  const severity: 'warning' | 'critical' = isCritical ? 'critical' : 'warning'

  const alertKey = `${severity}|${[...triggered].sort().join(',')}`
  if (lastAlert && lastAlert.key === alertKey && now - lastAlert.time < DEBOUNCE_MS) {
    return { alert: null, thresholds: computed, nextLastAlert: lastAlert }
  }

  const nextLastAlert = { key: alertKey, time: now }
  const alert: PotsAlert = {
    severity,
    triggeredBy: triggered,
    currentHR,
    currentSBP: currentMAP,
    deltaHR,
    deltaSBP: deltaMAP,
    hrTrendBpmPerMin: 0,
    sbpTrendMmhgPerMin: 0,
    thresholds: computed,
    timestamp: now,
  }

  return { alert, thresholds: computed, nextLastAlert }
}

// ─── Reading factory ──────────────────────────────────────────────────────────

function reading(
  id: string,
  timestamp: number,
  heartRate: number,
  systolicBP: number,
  diastolicBP = 70,
): VitalsReading {
  return { id, timestamp, heartRate, systolicBP, diastolicBP, pttMs: null }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = 10 * 60 * 1000   // 600_000 ms

function baselineReadings(heartRate: number, systolicBP: number, diastolicBP = 70): VitalsReading[] {
  return [0, 60_000, 120_000, 180_000, 240_000].map((t, i) =>
    reading(`b${i}`, t, heartRate, systolicBP, diastolicBP),
  )
}

function recentReadings(heartRate: number, systolicBP: number, diastolicBP = 70): VitalsReading[] {
  return [360_000, 420_000, 480_000].map((t, i) =>
    reading(`r${i}`, t, heartRate, systolicBP, diastolicBP),
  )
}

function adultProfile(age = 35): PatientProfile {
  return { age, biologicalSex: 'female', heightCm: 165, weightKg: 65 }
}

// ─── deriveProfileConstants ───────────────────────────────────────────────────

describe('deriveProfileConstants', () => {
  it('always returns warnHRDelta=30 and critHRDelta=40 regardless of age', () => {
    for (const age of [16, 19, 35, 65]) {
      const c = deriveProfileConstants(adultProfile(age))
      expect(c.warnHRDelta).toBe(30)
      expect(c.critHRDelta).toBe(40)
    }
  })

  it('always returns warnMAPDrop=5 and critMAPDropPct=0.10', () => {
    const c = deriveProfileConstants(adultProfile(35))
    expect(c.warnMAPDrop).toBe(5)
    expect(c.critMAPDropPct).toBe(0.10)
  })
})

// ─── buildThresholds ──────────────────────────────────────────────────────────

describe('buildThresholds', () => {
  it('sets warnSBPDrop to warnMAPDrop (5)', () => {
    const c = deriveProfileConstants(adultProfile())
    const t = buildThresholds(c, 70, 86)
    expect(t.warnSBPDrop).toBe(5)
  })

  it('sets critSBPDrop to 10% of baselineMAP', () => {
    const c = deriveProfileConstants(adultProfile())
    const baselineMAP = 86
    const t = buildThresholds(c, 70, baselineMAP)
    expect(t.critSBPDrop).toBe(Math.round(baselineMAP * 0.10))
  })
})

// ─── evaluateAlert (via evaluateBuffer) ──────────────────────────────────────

describe('evaluateAlert', () => {
  it('returns null when buffer has fewer than 5 baseline readings', () => {
    const buffer = recentReadings(70, 120)
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert).toBeNull()
  })

  it('returns null when baseline window has fewer than 5 readings', () => {
    const buffer = [0, 60_000, 120_000, 180_000].map((t, i) =>
      reading(`b${i}`, t, 70, 120),
    )
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert).toBeNull()
  })

  it('returns null when recent window is empty', () => {
    const buffer = baselineReadings(70, 120)
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert).toBeNull()
  })

  it('returns warning when deltaHR >= 30 but < 40', () => {
    // deltaHR = 103 - 70 = 33 → warning
    const buffer = [
      ...baselineReadings(70, 120),
      ...recentReadings(103, 120),
    ]
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert?.severity).toBe('warning')
    expect(alert?.triggeredBy).toContain('hr_delta')
  })

  it('returns critical when deltaHR >= 40', () => {
    // deltaHR = 112 - 70 = 42 → critical
    const buffer = [
      ...baselineReadings(70, 120),
      ...recentReadings(112, 120),
    ]
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert?.severity).toBe('critical')
    expect(alert?.triggeredBy).toContain('hr_delta')
  })

  it('returns warning when MAP drop >= 5 mmHg but < 10%', () => {
    // Baseline MAP = 70 + (120-70)/3 = 86.67, 10% = 8.67
    // systolicBP=104 → MAP = 70 + 34/3 = 81.33, drop = 5.33 → warning
    const buffer = [
      ...baselineReadings(70, 120, 70),
      ...recentReadings(70, 104, 70),
    ]
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert?.severity).toBe('warning')
    expect(alert?.triggeredBy).toContain('sbp_drop')
  })

  it('returns critical when MAP drop >= 10%', () => {
    // Baseline MAP = 86.67, 10% drop = 8.67
    // systolicBP=93 → MAP = 70 + 23/3 = 77.67, drop = 9.0 → critical
    const buffer = [
      ...baselineReadings(70, 120, 70),
      ...recentReadings(70, 93, 70),
    ]
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert?.severity).toBe('critical')
    expect(alert?.triggeredBy).toContain('sbp_drop')
  })

  it('returns null when all values are within normal range', () => {
    const buffer = [
      ...baselineReadings(70, 120),
      ...recentReadings(72, 119),
    ]
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert).toBeNull()
  })

  it('debounces — does not re-emit identical severity+triggeredBy within 60 s', () => {
    const buffer = [
      ...baselineReadings(70, 120),
      ...recentReadings(112, 120),
    ]
    const first = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(first.alert).not.toBeNull()
    const second = evaluateBuffer(buffer, adultProfile(), NOW, first.nextLastAlert)
    expect(second.alert).toBeNull()
  })

  it('re-emits after debounce window expires', () => {
    const buffer = [
      ...baselineReadings(70, 120),
      ...recentReadings(112, 120),
    ]
    const first = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(first.alert).not.toBeNull()
    const later = NOW + DEBOUNCE_MS + 1_000
    const second = evaluateBuffer(buffer, adultProfile(), later, first.nextLastAlert)
    expect(second.alert).not.toBeNull()
  })
})
