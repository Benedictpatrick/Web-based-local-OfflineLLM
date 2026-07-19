type HapticPattern = "tap" | "success" | "warning";

// Durations are floored well above typical ERM motor spin-up time (~20-50ms) —
// anything shorter is often accepted by the OS but never physically felt.
// Always use an array, even for a single pulse: a bare number has been observed
// on real devices to be accepted (navigator.vibrate returns true) without the
// motor ever actually firing, while the equivalent single-element array works.
const PATTERNS: Record<HapticPattern, number[]> = {
  tap: [30],
  success: [30, 50, 40],
  warning: [40, 80, 40, 80, 40],
};

export function isHapticSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export type HapticLogEntry = { pattern: HapticPattern; accepted: boolean; at: number };

const MAX_LOG_ENTRIES = 20;
const log: HapticLogEntry[] = [];
const listeners = new Set<(log: HapticLogEntry[]) => void>();

export function getHapticLog(): HapticLogEntry[] {
  return log;
}

export function onHapticLogChange(cb: (log: HapticLogEntry[]) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Returns whether the browser accepted the vibration request — not whether the device actually buzzed. */
export function haptic(pattern: HapticPattern = "tap"): boolean {
  let accepted = false;
  if (isHapticSupported()) {
    try {
      accepted = navigator.vibrate(PATTERNS[pattern]);
    } catch {
      accepted = false;
    }
  }
  log.push({ pattern, accepted, at: Date.now() });
  if (log.length > MAX_LOG_ENTRIES) log.shift();
  for (const cb of listeners) cb(log);
  return accepted;
}
