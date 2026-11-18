/**
 * Keystroke-dynamics feature extraction — a line-for-line port of ml/keydna/features.py.
 * The parity test (features.test.ts) feeds both implementations the same windows and
 * requires identical output, so the browser scores exactly what the model was trained on.
 */

export type Zone = "L" | "R" | "S" | "B" | "E";
/** [down_ms, up_ms, zone] — the only thing KeyDNA ever records about a keystroke. */
export type KeyEvent = [down: number, up: number, zone: Zone];

export const WINDOW_SIZE = 60;
export const WINDOW_STRIDE = 20;
export const PAUSE_MS = 600;
export const IDLE_MS = 2000;

export const FEATURE_NAMES = [
  "hold_mean",
  "hold_std",
  "hold_median",
  "flight_mean",
  "flight_std",
  "flight_median",
  "flight_p10",
  "flight_p90",
  "rhythm_cv",
  "ud_mean",
  "overlap_rate",
  "pause_rate",
  "pause_mean",
  "burst_mean",
  "wpm",
  "backspace_rate",
  "correction_latency",
  "backspace_run_mean",
  "hold_space_mean",
  "hold_left_mean",
  "hold_right_mean",
  "flight_cross_mean",
  "flight_same_mean",
  "flight_space_mean",
  "cross_same_ratio",
] as const;
export type FeatureName = (typeof FEATURE_NAMES)[number];
export const FEATURE_INDEX = Object.fromEntries(FEATURE_NAMES.map((n, i) => [n, i])) as Record<FeatureName, number>;

const LEFT_CODES = new Set([
  "Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Tab",
  "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyA", "KeyS", "KeyD", "KeyF", "KeyG",
  "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB",
]);
const RIGHT_CODES = new Set([
  "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal",
  "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight", "Backslash",
  "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote",
  "KeyN", "KeyM", "Comma", "Period", "Slash",
]);

/**
 * Map a physical key (KeyboardEvent.code) to the hand that types it. Modifiers, arrows and
 * function keys return null and are not recorded. Using `code` (physical position) rather
 * than `key` (character) means no character content is needed at all.
 */
export function codeToZone(code: string): Zone | null {
  if (code === "Space") return "S";
  if (code === "Backspace") return "B";
  if (code === "Enter" || code === "NumpadEnter") return "E";
  if (LEFT_CODES.has(code)) return "L";
  if (RIGHT_CODES.has(code)) return "R";
  return null;
}

const mean = (a: number[], fallback: number) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : fallback);

/** Population standard deviation (numpy ddof=0). */
function std(a: number[]): number {
  if (!a.length) return 0;
  const m = mean(a, 0);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);
}

/** numpy.percentile with the default "linear" method. */
function percentile(a: number[], q: number): number {
  const s = [...a].sort((x, y) => x - y);
  const pos = ((s.length - 1) * q) / 100;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
}

export function windowFeatures(events: readonly KeyEvent[]): number[] {
  const n = events.length;
  if (n < 3) throw new Error("a window needs at least 3 keystrokes");
  const down = events.map((e) => e[0]);
  const up = events.map((e) => e[1]);
  const zone = events.map((e) => e[2]);

  const hold = down.map((d, i) => up[i]! - d);
  const dd: number[] = [];
  const ud: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dd.push(down[i + 1]! - down[i]!);
    ud.push(down[i + 1]! - up[i]!);
  }
  const fluent = dd.map((v) => v < PAUSE_MS);
  const pause = dd.map((v) => v >= PAUSE_MS && v < IDLE_MS);

  let fl = dd.filter((_, i) => fluent[i]);
  if (!fl.length) fl = [0];

  const holdMean = mean(hold, 0);
  const flightMean = mean(fl, 0);
  const flightStd = std(fl);

  // Bursts: runs of keys separated by pauses (or idle gaps).
  const edges = [-1];
  dd.forEach((v, i) => v >= PAUSE_MS && edges.push(i));
  edges.push(n - 1);
  const bursts: number[] = [];
  for (let i = 1; i < edges.length; i++) bursts.push(edges[i]! - edges[i - 1]!);

  const isBs = zone.map((z) => z === "B");
  const typed = isBs.filter((b) => !b).length;
  const activeMs = dd.filter((v) => v < IDLE_MS).reduce((s, v) => s + v, 0);
  const wpm = activeMs > 0 ? typed / 5 / (activeMs / 60000) : 0;

  const corr: number[] = [];
  const runs: number[] = [];
  let run = 0;
  for (let i = 0; i < n; i++) {
    if (isBs[i]) {
      if (run === 0 && i > 0 && dd[i - 1]! < IDLE_MS) corr.push(dd[i - 1]!);
      run++;
    } else {
      if (run) runs.push(run);
      run = 0;
    }
  }
  if (run) runs.push(run);

  const zoneHold = (z: Zone) => mean(hold.filter((_, i) => zone[i] === z), holdMean);

  const cross: number[] = [];
  const same: number[] = [];
  const space: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    if (!fluent[i]) continue;
    const a = zone[i]!;
    const b = zone[i + 1]!;
    const hand = (z: Zone) => z === "L" || z === "R";
    if (hand(a) && hand(b)) (a === b ? same : cross).push(dd[i]!);
    else if ((a === "S" && hand(b)) || (b === "S" && hand(a))) space.push(dd[i]!);
  }
  const crossMean = mean(cross, flightMean);
  const sameMean = mean(same, flightMean);
  const fluentUd = ud.filter((_, i) => fluent[i]);
  const pauses = dd.filter((_, i) => pause[i]);

  return [
    holdMean,
    std(hold),
    percentile(hold, 50),
    flightMean,
    flightStd,
    percentile(fl, 50),
    percentile(fl, 10),
    percentile(fl, 90),
    flightMean > 0 ? flightStd / flightMean : 0,
    mean(fluentUd, 0),
    fluentUd.length ? fluentUd.filter((v) => v < 0).length / fluentUd.length : 0,
    pauses.length / dd.length,
    mean(pauses, 0),
    mean(bursts, 0),
    wpm,
    isBs.filter(Boolean).length / n,
    mean(corr, 0),
    mean(runs, 0),
    zoneHold("S"),
    zoneHold("L"),
    zoneHold("R"),
    crossMean,
    sameMean,
    mean(space, flightMean),
    sameMean > 0 ? crossMean / sameMean : 1,
  ];
}

export function slidingWindows<T>(events: readonly T[], size = WINDOW_SIZE, stride = WINDOW_STRIDE): T[][] {
  const out: T[][] = [];
  for (let s = 0; s + size <= events.length; s += stride) out.push(events.slice(s, s + size));
  return out;
}

export function featureMatrix(events: readonly KeyEvent[], size = WINDOW_SIZE, stride = WINDOW_STRIDE): number[][] {
  return slidingWindows(events, size, stride).map(windowFeatures);
}
