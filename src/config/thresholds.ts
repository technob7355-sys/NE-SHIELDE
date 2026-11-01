/**
 * Central operational risk thresholds (score bands 0–100).
 *
 * These are configurable operational cutoffs chosen for the NE-SHIELD
 * control-room workflow — they are NOT scientifically universal constants.
 * Changing them re-bands every live score, alert and notification in the app.
 * Import from here; never hardcode 80/65/40 elsewhere.
 */
export const RISK_THRESHOLDS = {
  critical: 80,
  high: 65,
  moderate: 40,
} as const
