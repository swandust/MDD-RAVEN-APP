/**
 * AlertBanner — fixed-position POTS alert banner.
 *
 * Reads exclusively from AlertContext; requires no props.
 *
 * IMPORTANT — CSS stacking context:
 *   `position: fixed` is positioned relative to the nearest containing block
 *   that establishes a new stacking context. Any ancestor with a CSS `transform`,
 *   `perspective`, or `will-change: transform` applied will silently break
 *   fixed positioning — the banner would scroll with that ancestor instead of
 *   the viewport. If the app shell ever gains a CSS transform for animation,
 *   either move this banner outside the transformed subtree (e.g. a React portal
 *   into document.body) or convert it to a portal now.
 */

import { useEffect, useState } from 'react';
import { useAlertContext } from '../../context/AlertContext';

// ─── Colour tokens (inline — never rely on Tailwind for alert colours) ─────────

const COLOURS = {
  critical: {
    light: { background: '#FEE2E2', border: '#FCA5A5', text: '#7F1D1D', icon: '#DC2626' },
    dark:  { background: '#450a0a', border: '#7F1D1D', text: '#FECACA', icon: '#F87171' },
  },
  warning: {
    light: { background: '#FEF3C7', border: '#FCD34D', text: '#78350F', icon: '#D97706' },
    dark:  { background: '#451a03', border: '#78350F', text: '#FDE68A', icon: '#FBBF24' },
  },
} as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────


// Simple SVG icons — avoids adding a dependency for two glyphs.
function WarningIcon({ color }: { color: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CriticalIcon({ color }: { color: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function AlertBanner() {
  const { activeAlert, dismissAlert } = useAlertContext();

  /**
   * `shown` drives the CSS slide-in transition.
   * It is set to true one animation frame after the banner mounts with an alert,
   * so the initial `translateY(-100%)` is painted before the transition begins.
   * It is set back to false immediately when the alert clears, allowing a
   * slide-out (if a CSS exit transition is added later).
   */
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!activeAlert) {
      setShown(false);
      return;
    }
    const rafId = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(rafId);
  }, [activeAlert]);

  if (!activeAlert) return null;

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const palette = COLOURS[activeAlert.severity][isDark ? 'dark' : 'light'];

  const severityLabel =
    activeAlert.severity === 'critical' ? '🚨 Critical POTS Alert' : '⚠️ Warning POTS Alert';

  const baselineHR = Math.round(activeAlert.currentHR - activeAlert.deltaHR);
  const currentHR = Math.round(activeAlert.currentHR);
  const deltaHR = Math.round(activeAlert.deltaHR);
  const alertBody =
    activeAlert.severity === 'critical'
      ? `Your heart rate jumped from ${baselineHR} to ${currentHR} bpm (+${deltaHR}). Sit or lie down immediately - high fainting risk!`
      : `Your heart rate increased from ${baselineHR} to ${currentHR} bpm (+${deltaHR}). Sit down if you feel dizzy, lightheaded, or unwell.`;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        // Fixed at the top of the viewport — see JSDoc warning about transformed
        // ancestors breaking this. If the app shell gains a CSS transform, move
        // this component into a React.createPortal(…, document.body) instead.
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 9999,

        // Slide-in transition
        transform: shown ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',

        // Colours
        background: palette.background,
        borderBottom: `2px solid ${palette.border}`,
        color: palette.text,

        // Layout
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 16px',
        boxSizing: 'border-box',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
      }}
    >
      {/* Icon */}
      <div style={{ flexShrink: 0, paddingTop: '1px' }}>
        {activeAlert.severity === 'critical' ? (
          <CriticalIcon color={palette.icon} />
        ) : (
          <WarningIcon color={palette.icon} />
        )}
      </div>

      {/* Message area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: '14px',
            lineHeight: '1.3',
            marginBottom: '2px',
          }}
        >
          {severityLabel}
        </div>
        <div
          style={{
            fontSize: '13px',
            lineHeight: '1.4',
          }}
        >
          {alertBody}
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={dismissAlert}
        aria-label="Dismiss alert"
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: palette.text,
          fontSize: '20px',
          lineHeight: 1,
          padding: '0 2px',
          opacity: 0.7,
          alignSelf: 'flex-start',
        }}
      >
        ×
      </button>
    </div>
  );
}
