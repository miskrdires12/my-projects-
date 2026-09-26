// ============================================================================
// STUDENT BRIDGE — SENDER TELEMETRY FORMATTING & CADENCE UTILITIES
// ============================================================================

export function formatIntervalSeconds(seconds: number): string {
  if (seconds <= 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
