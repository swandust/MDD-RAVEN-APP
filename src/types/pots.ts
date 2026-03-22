export interface PatientProfile {
  age: number;
  biologicalSex: 'male' | 'female' | 'other';
  heightCm: number;
  weightKg: number;
}

export interface VitalsReading {
  id: string;
  /** Unix milliseconds, parsed from `created_at`. */
  timestamp: number;
  heartRate: number;
  systolicBP: number;
  diastolicBP: number;
  pttMs: number | null;
}

export type TriggeredBy =
  | 'hr_delta'
  | 'hr_absolute'
  | 'hr_trend'
  | 'sbp_drop'
  | 'sbp_absolute'
  | 'sbp_trend';

export interface AlertThresholds {
  warnHRDelta: number;
  critHRDelta: number;
  warnHRAbsolute: number;
  critHRAbsolute: number;
  /** bpm/min */
  hrTrendWarn: number;
  /** bpm/min */
  hrTrendCrit: number;
  warnSBPDrop: number;
  critSBPDrop: number;
  warnSBPAbsolute: number;
  critSBPAbsolute: number;
  /** mmHg/min */
  sbpTrendWarn: number;
  /** mmHg/min */
  sbpTrendCrit: number;
}

export interface PotsAlert {
  severity: 'warning' | 'critical';
  triggeredBy: TriggeredBy[];
  currentHR: number;
  currentSBP: number;
  /** current HR − baseline HR */
  deltaHR: number;
  /** baseline SBP − current SBP (positive = drop) */
  deltaSBP: number;
  hrTrendBpmPerMin: number;
  sbpTrendMmhgPerMin: number;
  thresholds: AlertThresholds;
  timestamp: number;
}
