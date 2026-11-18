/**
 * Profile distances + Random Forest scoring. Mirrors ml/keydna/verifier.py and the tree
 * export in ml/train.py. The forest was trained in scikit-learn; this file only walks it.
 */
import { FEATURE_NAMES, featureMatrix, type KeyEvent } from "./features";

export interface ModelConfig {
  window_size: number;
  window_stride: number;
  live_stride: number;
  enroll_keys: number;
  enroll_stride: number;
  pause_ms: number;
  idle_ms: number;
  rel_floor: number;
  /** Per-feature minimum spread, in each feature's units (see STD_FLOOR in features.py). */
  abs_floor: number[];
  d_cap: number;
  ema_alpha: number;
}

interface Tree {
  f: number[];
  t: number[];
  l: number[];
  r: number[];
  v: number[];
}

export interface ForestModel {
  format: "keydna.rf.v1";
  model: string;
  model_version: string;
  trained_at: string;
  dataset: { kind: "synthetic-demo" | "real" | "combined"; version: string; users: number; sessions: number; keystrokes: number };
  feature_names: string[];
  config: ModelConfig;
  thresholds: { decision: number; eer: number; critical_ema: number };
  trees: Tree[];
}

export interface Profile {
  mean: number[];
  std: number[];
  n_windows: number;
}

export function profileFromMatrix(F: number[][]): Profile {
  if (F.length < 2) throw new Error("need at least 2 enrollment windows");
  const k = F[0]!.length;
  const mean = Array.from({ length: k }, (_, j) => F.reduce((s, r) => s + r[j]!, 0) / F.length);
  const std = mean.map((m, j) => Math.sqrt(F.reduce((s, r) => s + (r[j]! - m) ** 2, 0) / F.length));
  return { mean, std, n_windows: F.length };
}

export function profileFromEvents(events: readonly KeyEvent[], cfg: ModelConfig): Profile {
  return profileFromMatrix(featureMatrix(events, cfg.window_size, cfg.enroll_stride));
}

/** d_f = min(|x - μ| / max(σ, rel·|μ|, floor_f), cap) — "how many standard deviations off". */
export function distances(x: readonly number[], p: Profile, cfg: Pick<ModelConfig, "rel_floor" | "abs_floor" | "d_cap">): number[] {
  return x.map((v, j) => {
    const m = p.mean[j]!;
    const sd = Math.max(p.std[j]!, cfg.rel_floor * Math.abs(m), cfg.abs_floor[j]!);
    return Math.min(Math.abs(v - m) / sd, cfg.d_cap);
  });
}

/** P(genuine) — the mean over trees of the leaf's genuine-class fraction (= sklearn predict_proba). */
export function predictProba(model: ForestModel, d: readonly number[]): number {
  // sklearn casts inputs to float32 before comparing against thresholds; match it exactly.
  const x = d.map((v) => Math.fround(v));
  let total = 0;
  for (const t of model.trees) {
    let i = 0;
    while (t.f[i] !== -1) i = x[t.f[i]!]! <= t.t[i]! ? t.l[i]! : t.r[i]!;
    total += t.v[i]!;
  }
  return total / model.trees.length;
}

export function assertCompatible(model: ForestModel): void {
  if (model.format !== "keydna.rf.v1") throw new Error(`unsupported model format ${model.format}`);
  const same = model.feature_names.length === FEATURE_NAMES.length && model.feature_names.every((n, i) => n === FEATURE_NAMES[i]);
  if (!same) throw new Error("model feature order does not match this build — retrain or redeploy");
}

let cached: Promise<ForestModel> | null = null;
export function loadModel(): Promise<ForestModel> {
  cached ??= fetch("/model/keydna-rf.json")
    .then((r) => {
      if (!r.ok) throw new Error(`model download failed (${r.status})`);
      return r.json() as Promise<ForestModel>;
    })
    .then((m) => {
      assertCompatible(m);
      return m;
    })
    .catch((e) => {
      cached = null;
      throw e;
    });
  return cached;
}
