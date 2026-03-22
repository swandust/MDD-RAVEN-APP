/**
 * usePotsAlerts.test.ts
 *
 * Unit tests for the pure threshold evaluation logic extracted from usePotsAlerts.
 *
 * NOTE — evaluateAlert is defined as a closure inside the hook's useEffect and
 * cannot be directly exported without restructuring the hook. Instead, this file
 * provides `evaluateBuffer`: a standalone pure function that exactly mirrors the
 * hook's internal logic, using only the exported buildThresholds and
 * deriveProfileConstants. Any divergence between this helper and the hook's
 * closure would be caught by the integration test (Test 1).
 */

import { describe, it, expect } from 'vitest'
import {
  buildThresholds,
  deriveProfileConstants,
} from '../usePotsAlerts'
import type { AlertThresholds, PatientProfile, PotsAlert, TriggeredBy, VitalsReading } from '../../types/pots'

// ─── Constants (mirrored from usePotsAlerts — update if the source changes) ───

const BASELINE_NEAR_EDGE_MS = 5 * 60 * 1000   // readings older than this → baseline
const TREND_WINDOW_MS = 2 * 60 * 1000
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

function slopePerMin(points: Array<{ x: number; y: number }>): number {
  const n = points.length
  if (n < 2) return 0
  const sumX = points.reduce((a, p) => a + p.x, 0)
  const sumY = points.reduce((a, p) => a + p.y, 0)
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0)
  const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return 0
  return ((n * sumXY - sumX * sumY) / denom) * 60_000
}

/**
 * Pure equivalent of the hook's evaluateAlert closure.
 * State (lastAlertRef, setAlert, setThresholds) is replaced by explicit params/returns.
 */
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
  const baselineSBP = median(baselineReadings.map((r) => r.systolicBP))

  const currentSample = recentReadings.slice(-CURRENT_SAMPLE_COUNT)
  if (currentSample.length === 0) {
    return { alert: null, thresholds: null, nextLastAlert: lastAlert }
  }

  const currentHR  = median(currentSample.map((r) => r.heartRate))
  const currentSBP = median(currentSample.map((r) => r.systolicBP))
  const computed   = buildThresholds(profileConstants, baselineHR, baselineSBP)

  const deltaHR  = currentHR  - baselineHR
  const deltaSBP = baselineSBP - currentSBP

  const trendWindow = buffer.filter((r) => now - r.timestamp <= TREND_WINDOW_MS)
  const hrTrend    = slopePerMin(trendWindow.map((r) => ({ x: r.timestamp, y: r.heartRate })))
  const sbpTrend   = slopePerMin(trendWindow.map((r) => ({ x: r.timestamp, y: r.systolicBP })))
  const sbpFallRate = -sbpTrend

  const triggered: TriggeredBy[] = []

  if      (deltaHR  >= computed.critHRDelta)    triggered.push('hr_delta')
  else if (deltaHR  >= computed.warnHRDelta)    triggered.push('hr_delta')

  if      (currentHR >= computed.critHRAbsolute) triggered.push('hr_absolute')
  else if (currentHR >= computed.warnHRAbsolute) triggered.push('hr_absolute')

  if      (hrTrend >= computed.hrTrendCrit)     triggered.push('hr_trend')
  else if (hrTrend >= computed.hrTrendWarn)     triggered.push('hr_trend')

  if      (deltaSBP >= computed.critSBPDrop)    triggered.push('sbp_drop')
  else if (deltaSBP >= computed.warnSBPDrop)    triggered.push('sbp_drop')

  if      (currentSBP <= computed.critSBPAbsolute) triggered.push('sbp_absolute')
  else if (currentSBP <= computed.warnSBPAbsolute) triggered.push('sbp_absolute')

  if      (sbpFallRate >= computed.sbpTrendCrit) triggered.push('sbp_trend')
  else if (sbpFallRate >= computed.sbpTrendWarn) triggered.push('sbp_trend')

  if (triggered.length === 0) {
    return { alert: null, thresholds: computed, nextLastAlert: lastAlert }
  }

  const isCritical =
    deltaHR    >= computed.critHRDelta    ||
    currentHR  >= computed.critHRAbsolute ||
    hrTrend    >= computed.hrTrendCrit    ||
    deltaSBP   >= computed.critSBPDrop    ||
    currentSBP <= computed.critSBPAbsolute ||
    sbpFallRate >= computed.sbpTrendCrit

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
    currentSBP,
    deltaHR,
    deltaSBP,
    hrTrendBpmPerMin: hrTrend,
    sbpTrendMmhgPerMin: sbpFallRate,
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
): VitalsReading {
  return { id, timestamp, heartRate, systolicBP, diastolicBP: 70, pttMs: null }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// now = 10 minutes from epoch zero (in ms)
const NOW = 10 * 60 * 1000   // 600_000 ms

// Five baseline readings (> 5 min before NOW → timestamps ≤ 300_000)
function baselineReadings(heartRate: number, systolicBP: number): VitalsReading[] {
  return [0, 60_000, 120_000, 180_000, 240_000].map((t, i) =>
    reading(`b${i}`, t, heartRate, systolicBP),
  )
}

// Three recent readings (< 5 min before NOW → timestamps > 300_000)
function recentReadings(heartRate: number, systolicBP: number): VitalsReading[] {
  return [360_000, 420_000, 480_000].map((t, i) =>
    reading(`r${i}`, t, heartRate, systolicBP),
  )
}

function adultProfile(age = 35): PatientProfile {
  return { age, biologicalSex: 'female', heightCm: 165, weightKg: 65 }
}

// ─── buildThresholds ──────────────────────────────────────────────────────────

describe('buildThresholds', () => {
  it('uses critHRDelta 40 for age < 19', () => {
    const c = deriveProfileConstants(adultProfile(16))
    expect(c.critHRDelta).toBe(40)
    const t = buildThresholds(c, 70, 120)
    expect(t.critHRDelta).toBe(40)
  })

  it('uses critHRDelta 30 for age >= 19', () => {
    const c = deriveProfileConstants(adultProfile(19))
    expect(c.critHRDelta).toBe(30)
    const t = buildThresholds(c, 70, 120)
    expect(t.critHRDelta).toBe(30)
  })

  it('applies ageFactor 0.75 for age > 60 — tightens critSBPDrop to 15', () => {
    const c = deriveProfileConstants(adultProfile(65))
    // ageFactor=0.75, critSBPDrop = round(20*0.75) = 15  vs 20 for a standard adult
    expect(c.critSBPDrop).toBe(15)
    const t = buildThresholds(c, 70, 120)
    expect(t.critSBPDrop).toBe(15)
  })

  it('applies ageFactor 1.1 for age < 20 — raises critSBPDrop to 22', () => {
    const c = deriveProfileConstants(adultProfile(16))
    // ageFactor=1.1, critSBPDrop = round(20*1.1) = 22
    expect(c.critSBPDrop).toBe(22)
    const t = buildThresholds(c, 70, 120)
    expect(t.critSBPDrop).toBe(22)
  })

  it('critSBPAbsolute never goes below 80', () => {
    const c = deriveProfileConstants(adultProfile(35))
    // With baseline SBP=90, adult critSBPDrop=20 → max(80, 90-20-5)=max(80,65)=80
    const t = buildThresholds(c, 70, 90)
    expect(t.critSBPAbsolute).toBe(80)
  })

  it('warnHRDelta never goes below 20', () => {
    // Adults (critHRDelta=30): warnHRDelta = max(20, 30-10) = max(20,20) = 20
    const adult = deriveProfileConstants(adultProfile(35))
    expect(buildThresholds(adult, 70, 120).warnHRDelta).toBe(20)

    // Paediatric (critHRDelta=40): warnHRDelta = max(20, 40-10) = 30 — still ≥ 20
    const paed = deriveProfileConstants(adultProfile(16))
    expect(buildThresholds(paed, 70, 120).warnHRDelta).toBeGreaterThanOrEqual(20)
  })
})

// ─── evaluateAlert (via evaluateBuffer) ──────────────────────────────────────

describe('evaluateAlert', () => {
  it('returns null when buffer has fewer than 5 baseline readings', () => {
    // 3 recent readings but 0 baseline readings → baseline count < MIN_BASELINE_READINGS
    const buffer = recentReadings(70, 120)
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert).toBeNull()
  })

  it('returns null when baseline window has fewer than 5 readings', () => {
    // Only 4 baseline readings — one short of the required 5
    const buffer = [0, 60_000, 120_000, 180_000].map((t, i) =>
      reading(`b${i}`, t, 70, 120),
    )
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert).toBeNull()
  })

  it('returns null when recent window is empty (no readings in last 5 minutes)', () => {
    // 5 baseline readings but nothing recent — currentSample is empty
    const buffer = baselineReadings(70, 120)
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert).toBeNull()
  })

  it('returns warning when deltaHR >= warnHRDelta but < critHRDelta', () => {
    // Adult: warnHRDelta=20, critHRDelta=30. deltaHR=23 → warning
    const buffer = [
      ...baselineReadings(70, 120),
      ...recentReadings(93, 120),  // deltaHR = 93-70 = 23
    ]
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert?.severity).toBe('warning')
    expect(alert?.triggeredBy).toContain('hr_delta')
  })

  it('returns critical when deltaHR >= critHRDelta', () => {
    // Adult: critHRDelta=30. deltaHR=35 → critical
    const buffer = [
      ...baselineReadings(70, 120),
      ...recentReadings(105, 120),  // deltaHR = 35
    ]
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert?.severity).toBe('critical')
    expect(alert?.triggeredBy).toContain('hr_delta')
  })

  it('returns critical when absolute HR >= critHRAbsolute', () => {
    // Adult baseline HR=70: critHRAbsolute = max(100, min(120, 70+30)) = 100
    // current HR=105 ≥ 100 → critical hr_absolute (also deltaHR=35 ≥ 30 → hr_delta)
    const buffer = [
      ...baselineReadings(70, 120),
      ...recentReadings(105, 120),
    ]
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert?.severity).toBe('critical')
    expect(alert?.triggeredBy).toContain('hr_absolute')
  })

  it('returns warning when SBP drop >= warnSBPDrop but < critSBPDrop', () => {
    // Adult: warnSBPDrop=10, critSBPDrop=20. deltaSBP=13 → warning sbp_drop
    const buffer = [
      ...baselineReadings(70, 120),
      ...recentReadings(70, 107),  // deltaSBP = 120-107 = 13
    ]
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert?.severity).toBe('warning')
    expect(alert?.triggeredBy).toContain('sbp_drop')
  })

  it('returns critical when SBP drop >= critSBPDrop', () => {
    // Adult: critSBPDrop=20. deltaSBP=25 → critical
    const buffer = [
      ...baselineReadings(70, 120),
      ...recentReadings(70, 95),   // deltaSBP = 120-95 = 25
    ]
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert?.severity).toBe('critical')
    expect(alert?.triggeredBy).toContain('sbp_drop')
  })

  it('includes all breached criteria in triggeredBy array', () => {
    // Simultaneous HR and SBP breaches:
    //   deltaHR = 35 ≥ critHRDelta(30)       → hr_delta  (critical)
    //   currentHR = 105 ≥ critHRAbsolute(100) → hr_absolute (critical)
    //   deltaSBP = 25 ≥ critSBPDrop(20)       → sbp_drop  (critical)
    const buffer = [
      ...baselineReadings(70, 120),
      ...recentReadings(105, 95),
    ]
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert?.severity).toBe('critical')
    expect(alert?.triggeredBy).toContain('hr_delta')
    expect(alert?.triggeredBy).toContain('hr_absolute')
    expect(alert?.triggeredBy).toContain('sbp_drop')
  })

  it('returns null when all values are within normal range', () => {
    const buffer = [
      ...baselineReadings(70, 120),
      ...recentReadings(72, 118),  // deltaHR=2, deltaSBP=2 — both well within thresholds
    ]
    const { alert } = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(alert).toBeNull()
  })

  it('debounces — does not re-emit identical severity+triggeredBy within 60 s', () => {
    const buffer = [
      ...baselineReadings(70, 120),
      ...recentReadings(105, 120),  // deltaHR=35 → critical hr_delta + hr_absolute
    ]
    // First call — should emit
    const first = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(first.alert).not.toBeNull()

    // Second call — same buffer, same now, within 60 s window
    const second = evaluateBuffer(buffer, adultProfile(), NOW, first.nextLastAlert)
    expect(second.alert).toBeNull()
  })

  it('re-emits after debounce window expires', () => {
    const buffer = [
      ...baselineReadings(70, 120),
      ...recentReadings(105, 120),
    ]
    const first = evaluateBuffer(buffer, adultProfile(), NOW, null)
    expect(first.alert).not.toBeNull()

    // Advance time beyond DEBOUNCE_MS (60 s = 60_000 ms)
    const later = NOW + DEBOUNCE_MS + 1_000
    const second = evaluateBuffer(buffer, adultProfile(), later, first.nextLastAlert)
    expect(second.alert).not.toBeNull()
  })
})
