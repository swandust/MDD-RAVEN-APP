interface Vital {
  created_at: string;
  heart_rate: number | null;
  systolic: number | null;
  diastolic: number | null;
  session_id: string;
}

interface Alert {
  session_id: string;
  alert_type: string;
  severity: 'warning' | 'critical';
  heart_rate: number | null;
  delta_hr: number | null;
  map_value: number | null;
  delta_map: number | null;
  baseline_hr: number | null;
  baseline_map: number | null;
  message: string;
  auto_dismiss_at: string;
}

// Alert thresholds
const HR_WARNING_THRESHOLD = 30;  // bpm
const HR_CRITICAL_THRESHOLD = 40; // bpm
const MAP_WARNING_THRESHOLD = -5; // mmHg
const MAP_CRITICAL_PERCENT = 0.10; // 10%

const AUTO_DISMISS_MINUTES = 5;
const WINDOW_SIZE_MS = 10 * 60 * 1000; // 10 minutes
const MIN_DATA_POINTS = 6; // change to 300 after testing

export class SyncopeDetector {
  private vitalsHistory: Map<string, Vital[]> = new Map();

  calculateMAP(systolic: number | null, diastolic: number | null): number | null {
    if (!systolic || !diastolic || systolic === 0) return null;
    return diastolic + (systolic - diastolic) / 3;
  }

  getBaseline(vitals: Vital[]): { hr: number | null; map: number | null } {
    const hrs = vitals
      .map(v => v.heart_rate)
      .filter((hr): hr is number => hr !== null && hr > 0);
    
    const maps = vitals
      .map(v => this.calculateMAP(v.systolic, v.diastolic))
      .filter((map): map is number => map !== null && map > 0);

    return {
      hr: hrs.length > 0 ? Math.min(...hrs) : null,
      map: maps.length > 0 ? Math.min(...maps) : null,
    };
  }

  checkHRAlert(currentHR: number, baselineHR: number): {
    severity: 'warning' | 'critical' | null;
    delta: number;
  } {
    const delta = currentHR - baselineHR;

    if (delta >= HR_CRITICAL_THRESHOLD) {
      return { severity: 'critical', delta };
    } else if (delta >= HR_WARNING_THRESHOLD) {
      return { severity: 'warning', delta };
    }

    return { severity: null, delta };
  }

  checkMAPAlert(currentMAP: number, baselineMAP: number): {
    severity: 'warning' | 'critical' | null;
    delta: number;
  } {
    if (baselineMAP === 0) return { severity: null, delta: 0 };

    const delta = currentMAP - baselineMAP;
    const percentDrop = Math.abs(delta) / baselineMAP;

    if (delta <= MAP_WARNING_THRESHOLD || percentDrop >= MAP_CRITICAL_PERCENT) {
      if (percentDrop >= MAP_CRITICAL_PERCENT) {
        return { severity: 'critical', delta };
      } else {
        return { severity: 'warning', delta };
      }
    }

    return { severity: null, delta };
  }

  processVital(vital: Vital): Alert | null {
    const sessionId = vital.session_id || 'unknown';
    const currentTime = new Date(vital.created_at).getTime();

    // Initialize history for session
    if (!this.vitalsHistory.has(sessionId)) {
      this.vitalsHistory.set(sessionId, []);
    }

    const history = this.vitalsHistory.get(sessionId)!;
    
    // Add current vital
    history.push(vital);

    // Keep only last 10 minutes
    const cutoffTime = currentTime - WINDOW_SIZE_MS;
    const recentVitals = history.filter(
      v => new Date(v.created_at).getTime() >= cutoffTime
    );
    this.vitalsHistory.set(sessionId, recentVitals);

    // Need at least 5 minutes of data
    if (recentVitals.length < MIN_DATA_POINTS) {
      return null;
    }

    // Calculate current MAP
    const currentMAP = this.calculateMAP(vital.systolic, vital.diastolic);
    const currentHR = vital.heart_rate;

    if (!currentHR || !currentMAP) return null;

    // Get baseline values
    const { hr: baselineHR, map: baselineMAP } = this.getBaseline(recentVitals);

    if (!baselineHR || !baselineMAP) return null;

    // Check HR alert
    const hrAlert = this.checkHRAlert(currentHR, baselineHR);
    if (hrAlert.severity) {
      return this.createAlert(
        sessionId,
        `hr_${hrAlert.severity}`,
        hrAlert.severity,
        currentHR,
        hrAlert.delta,
        currentMAP,
        null,
        baselineHR,
        baselineMAP
      );
    }

    // Check MAP alert
    const mapAlert = this.checkMAPAlert(currentMAP, baselineMAP);
    if (mapAlert.severity) {
      return this.createAlert(
        sessionId,
        `map_${mapAlert.severity}`,
        mapAlert.severity,
        currentHR,
        null,
        currentMAP,
        mapAlert.delta,
        baselineHR,
        baselineMAP
      );
    }

    return null;
  }

  private createAlert(
    sessionId: string,
    alertType: string,
    severity: 'warning' | 'critical',
    hr: number,
    deltaHR: number | null,
    mapValue: number,
    deltaMAP: number | null,
    baselineHR: number,
    baselineMAP: number
  ): Alert {
    let message: string;

    const hrDelta = deltaHR ?? (hr - baselineHR);
    if (severity === 'critical') {
      message = `Your heart rate jumped from ${baselineHR} to ${hr} bpm (+${hrDelta}). Sit or lie down immediately - high fainting risk!`;
    } else {
      message = `Your heart rate increased from ${baselineHR} to ${hr} bpm (+${hrDelta}). Sit down if you feel dizzy, lightheaded, or unwell.`;
    }

    const autoDismissAt = new Date(Date.now() + AUTO_DISMISS_MINUTES * 60 * 1000);

    return {
      session_id: sessionId,
      alert_type: alertType,
      severity,
      heart_rate: hr,
      delta_hr: deltaHR,
      map_value: mapValue,
      delta_map: deltaMAP,
      baseline_hr: baselineHR,
      baseline_map: baselineMAP,
      message,
      auto_dismiss_at: autoDismissAt.toISOString(),
    };
  }
}
