/**
 * Continuous verification engine.
 *
 *   keystroke → rolling window (last 60 keys) → features → distance to profile
 *   → Random Forest P(genuine)  [MODEL OUTPUT]
 *   → exponential moving average → identity confidence  [SMOOTHED MODEL OUTPUT]
 *   → thresholds → LOW / MEDIUM / HIGH / CRITICAL  [UI RISK CLASSIFICATION]
 *
 * Pure and synchronous so it can be unit-tested and replayed; the scorer is injected.
 */
import { FEATURE_INDEX, FEATURE_NAMES, windowFeatures, type FeatureName, type KeyEvent } from "./features";
import { FEATURE_LABELS, MATCH_GROUPS, type MatchGroup } from "./labels";
import { distances, type ModelConfig, type Profile } from "./model";

export type Risk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Confidence (0–100) at or above `low` is LOW risk, ≥ `medium` MEDIUM, ≥ `high` HIGH, else CRITICAL. */
export interface Thresholds {
  low: number;
  medium: number;
  high: number;
}
export const DEFAULT_THRESHOLDS: Thresholds = { low: 85, medium: 70, high: 50 };

export function classifyRisk(confidence: number, t: Thresholds): Risk {
  if (confidence >= t.low) return "LOW";
  if (confidence >= t.medium) return "MEDIUM";
  if (confidence >= t.high) return "HIGH";
  return "CRITICAL";
}

export function validThresholds(t: Thresholds): boolean {
  return t.low <= 100 && t.low > t.medium && t.medium > t.high && t.high >= 0;
}

export interface Deviation {
  name: FeatureName;
  label: string;
  sigma: number;
}

export interface WindowScore {
  index: number;
  at: number; // wall clock, ms
  keys: number; // keystrokes seen this session
  raw: number; // model P(genuine), 0–1
  confidence: number; // EMA of raw, 0–100
  risk: Risk;
  features: number[];
  distances: number[];
  match: Record<MatchGroup, number>; // 0–100, distance-derived
  deviations: Deviation[]; // top 3
}

export interface PendingWindow {
  features: number[];
  distances: number[];
}

type Cfg = Pick<ModelConfig, "window_size" | "live_stride" | "rel_floor" | "abs_floor" | "d_cap">;

export function matchScores(d: readonly number[], cap: number): Record<MatchGroup, number> {
  const out = {} as Record<MatchGroup, number>;
  for (const [g, names] of Object.entries(MATCH_GROUPS) as [MatchGroup, FeatureName[]][]) {
    const m = names.reduce((s, n) => s + d[FEATURE_INDEX[n]]!, 0) / names.length;
    out[g] = Math.max(0, 100 * (1 - m / cap));
  }
  return out;
}

export function topDeviations(d: readonly number[], k = 3): Deviation[] {
  return FEATURE_NAMES.map((name, i) => ({ name, label: FEATURE_LABELS[name], sigma: d[i]! }))
    .sort((a, b) => b.sigma - a.sigma)
    .slice(0, k);
}

export class LiveVerifier {
  private buffer: KeyEvent[] = [];
  private sinceScore = 0;
  private ema: number | null = null;
  private count = 0;
  private windows = 0;

  constructor(
    private readonly profile: Profile,
    private readonly cfg: Cfg,
    private readonly alpha: number,
    private thresholds: Thresholds,
    /** Confidence the EMA starts from. null = start from the first window's score. */
    private readonly start: number | null = null,
  ) {
    this.ema = start;
  }

  get keys() {
    return this.count;
  }
  get collected() {
    return Math.min(this.buffer.length, this.cfg.window_size);
  }

  setThresholds(t: Thresholds) {
    this.thresholds = t;
  }

  /** Add a keystroke; returns a window to score when one is due, else null. */
  push(ev: KeyEvent): PendingWindow | null {
    // keyups can arrive out of down-order during rollover; keep the buffer sorted by down.
    let i = this.buffer.length;
    while (i > 0 && this.buffer[i - 1]![0] > ev[0]) i--;
    this.buffer.splice(i, 0, ev);
    if (this.buffer.length > this.cfg.window_size) this.buffer.shift();
    this.count++;
    this.sinceScore++;
    if (this.buffer.length < this.cfg.window_size) return null;
    if (this.windows > 0 && this.sinceScore < this.cfg.live_stride) return null;
    this.sinceScore = 0;
    const features = windowFeatures(this.buffer);
    return { features, distances: distances(features, this.profile, this.cfg) };
  }

  /** Record the model's probability for the window `push` returned. */
  commit(w: PendingWindow, raw: number, at = Date.now()): WindowScore {
    this.ema = this.ema === null ? raw : this.alpha * raw + (1 - this.alpha) * this.ema;
    const confidence = this.ema * 100;
    return {
      index: this.windows++,
      at,
      keys: this.count,
      raw,
      confidence,
      risk: classifyRisk(confidence, this.thresholds),
      features: w.features,
      distances: w.distances,
      match: matchScores(w.distances, this.cfg.d_cap),
      deviations: topDeviations(w.distances),
    };
  }

  /** After re-authentication: forget the window and restart smoothing from a verified state. */
  reset(start: number | null = this.start) {
    this.buffer = [];
    this.sinceScore = 0;
    this.ema = start;
    this.windows = 0;
  }
}

export interface SecurityEvent {
  id: string;
  at: number;
  type:
    | "verified"
    | "deviation"
    | "risk_elevated"
    | "takeover"
    | "reauth_recommended"
    | "reauthenticated"
    | "locked"
    | "dismissed"
    | "restored"
    | "enrolled"
    | "monitoring";
  title: string;
  severity: Severity;
  confidence: number | null;
  explanation: string;
}

const RANK: Record<Risk, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

function explain(s: WindowScore): string {
  const devs = s.deviations.map((d) => `${d.label} ${d.sigma.toFixed(1)}σ`).join(", ");
  return `Model P(genuine) ${(s.raw * 100).toFixed(1)}% on the last 60 keystrokes. Largest deviations from profile: ${devs}.`;
}

let seq = 0;
const id = (at: number) => `${at.toString(36)}-${(seq++).toString(36)}`;

/** Turn a new window score into zero or more security events. */
export function eventsFor(prev: WindowScore | null, cur: WindowScore, heartbeatEvery = 12): SecurityEvent[] {
  const base = { at: cur.at, confidence: cur.confidence, explanation: explain(cur) };
  const before = prev ? RANK[prev.risk] : 0;
  const now = RANK[cur.risk];
  const out: SecurityEvent[] = [];
  if (now > before) {
    if (cur.risk === "MEDIUM") out.push({ ...base, id: id(cur.at), type: "deviation", title: "Typing deviation detected", severity: "MEDIUM" });
    if (cur.risk === "HIGH") out.push({ ...base, id: id(cur.at), type: "risk_elevated", title: "Risk elevated", severity: "HIGH" });
    if (cur.risk === "CRITICAL") {
      out.push({ ...base, id: id(cur.at), type: "takeover", title: "Possible session takeover", severity: "CRITICAL" });
      out.push({
        ...base,
        id: id(cur.at),
        type: "reauth_recommended",
        title: "Re-authentication recommended",
        severity: "CRITICAL",
        explanation: "Behavioural deviation exceeds the critical threshold. Verify the user before continuing.",
      });
    }
  } else if (now < before && cur.risk === "LOW") {
    out.push({ ...base, id: id(cur.at), type: "restored", title: "Behaviour matches profile again", severity: "INFO" });
  } else if (cur.risk === "LOW" && (cur.index === 0 || cur.index % heartbeatEvery === 0)) {
    out.push({ ...base, id: id(cur.at), type: "verified", title: "Behaviour verified", severity: "INFO" });
  }
  return out;
}

export function manualEvent(type: SecurityEvent["type"], title: string, severity: Severity, explanation: string, confidence: number | null = null): SecurityEvent {
  const at = Date.now();
  return { id: id(at), at, type, title, severity, confidence, explanation };
}
