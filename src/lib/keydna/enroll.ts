/** Turn calibration keystrokes into an enrolled profile plus honest quality numbers. */
import { FEATURE_INDEX, featureMatrix, type KeyEvent } from "./features";
import { distances, predictProba, profileFromMatrix, type ForestModel } from "./model";

export interface EnrollmentResult {
  profile: ReturnType<typeof profileFromMatrix>;
  selfMatch: number | null;
  timing: number;
  rhythm: number;
  samples: number;
  wpm: number;
  holdMean: number;
  flightMean: number;
  seconds: number;
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export function buildEnrollment(events: KeyEvent[], model: ForestModel): EnrollmentResult {
  const cfg = model.config;
  const F = featureMatrix(events, cfg.window_size, cfg.enroll_stride);
  const profile = profileFromMatrix(F);

  // Self-match: enroll on the first two thirds, score windows from the last third that the
  // partial profile never saw. Same model, same pipeline as live verification.
  let selfMatch: number | null = null;
  const cut = Math.floor((events.length * 2) / 3);
  const head = featureMatrix(events.slice(0, cut), cfg.window_size, cfg.enroll_stride);
  const tail = featureMatrix(events.slice(cut), cfg.window_size, cfg.live_stride);
  if (head.length >= 2 && tail.length) {
    const p = profileFromMatrix(head);
    selfMatch = tail.reduce((s, x) => s + predictProba(model, distances(x, p, cfg)), 0) / tail.length;
  }

  const cv = (j: number) => (profile.mean[j]! > 0 ? profile.std[j]! / profile.mean[j]! : 1);
  const timingKeys = [FEATURE_INDEX.hold_mean, FEATURE_INDEX.hold_median, FEATURE_INDEX.flight_mean, FEATURE_INDEX.flight_median];
  const timing = clamp(100 * (1 - timingKeys.reduce((s, j) => s + cv(j), 0) / timingKeys.length));
  const rhythm = clamp(100 * (1 - profile.mean[FEATURE_INDEX.rhythm_cv]!));

  return {
    profile,
    selfMatch,
    timing,
    rhythm,
    samples: F.length,
    wpm: profile.mean[FEATURE_INDEX.wpm]!,
    holdMean: profile.mean[FEATURE_INDEX.hold_mean]!,
    flightMean: profile.mean[FEATURE_INDEX.flight_mean]!,
    seconds: events.length ? (events.at(-1)![1] - events[0]![0]) / 1000 : 0,
  };
}

/** Mean down-to-down latency of the most frequent letter pairs, from in-memory keys only. */
export function digraphStats(keys: { key: string | null; down: number }[], top = 12) {
  const acc = new Map<string, { sum: number; n: number }>();
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]!;
    const b = keys[i]!;
    if (!a.key || !b.key || !/^[a-z]$/i.test(a.key) || !/^[a-z]$/i.test(b.key)) continue;
    const dt = b.down - a.down;
    if (dt <= 0 || dt > 600) continue;
    const pair = (a.key + b.key).toUpperCase();
    const s = acc.get(pair) ?? { sum: 0, n: 0 };
    s.sum += dt;
    s.n++;
    acc.set(pair, s);
  }
  return [...acc.entries()]
    .filter(([, s]) => s.n >= 2)
    .sort((x, y) => y[1].n - x[1].n)
    .slice(0, top)
    .map(([pair, s]) => ({ pair, ms: s.sum / s.n, n: s.n }));
}

/**
 * Reject calibrations no human could produce (scripted input, paste-like bursts, a key
 * held down). Bounds are generous: the fastest recorded typists sit around 200–250 wpm.
 */
export function implausibleReason(r: Pick<EnrollmentResult, "wpm" | "holdMean" | "flightMean">): string | null {
  if (r.holdMean < 15) return `Keys were held for ${r.holdMean.toFixed(0)} ms on average — too short for a human key press. Was this typed by a script?`;
  if (r.wpm > 250) return `${r.wpm.toFixed(0)} wpm is beyond human speed. Was this typed by a script?`;
  if (r.flightMean < 25) return "Keys arrived faster than fingers can move. Was this typed by a script?";
  if (r.holdMean > 600) return "Keys were held down unusually long. Please type normally.";
  return null;
}
