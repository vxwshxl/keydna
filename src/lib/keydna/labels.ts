import { FEATURE_NAMES, type FeatureName } from "./features";

export const FEATURE_LABELS: Record<FeatureName, string> = {
  hold_mean: "Key hold duration (mean)",
  hold_std: "Key hold variability",
  hold_median: "Key hold duration (median)",
  flight_mean: "Inter-key interval (mean)",
  flight_std: "Inter-key interval variability",
  flight_median: "Inter-key interval (median)",
  flight_p10: "Fastest transitions (p10)",
  flight_p90: "Slowest fluent transitions (p90)",
  rhythm_cv: "Rhythm irregularity (CV)",
  ud_mean: "Release-to-press gap",
  overlap_rate: "Key rollover rate",
  pause_rate: "Pause frequency",
  pause_mean: "Pause duration",
  burst_mean: "Burst length",
  wpm: "Typing speed (WPM)",
  backspace_rate: "Backspace frequency",
  correction_latency: "Correction latency",
  backspace_run_mean: "Backspace run length",
  hold_space_mean: "Space bar hold",
  hold_left_mean: "Left-hand hold",
  hold_right_mean: "Right-hand hold",
  flight_cross_mean: "Cross-hand transition",
  flight_same_mean: "Same-hand transition",
  flight_space_mean: "Word-boundary transition",
  cross_same_ratio: "Cross / same-hand ratio",
};

/** Dashboard "match" breakdowns. These are distance-derived summaries, not model output. */
export const MATCH_GROUPS = {
  timing: [
    "hold_mean", "hold_median", "flight_mean", "flight_median", "flight_p10", "flight_p90", "ud_mean",
    "hold_space_mean", "hold_left_mean", "hold_right_mean", "flight_cross_mean", "flight_same_mean",
    "flight_space_mean", "cross_same_ratio",
  ],
  rhythm: ["rhythm_cv", "flight_std", "hold_std", "pause_rate", "pause_mean", "burst_mean", "overlap_rate"],
  corrections: ["backspace_rate", "correction_latency", "backspace_run_mean"],
  overall: [...FEATURE_NAMES],
} satisfies Record<string, FeatureName[]>;

export type MatchGroup = keyof typeof MATCH_GROUPS;

export const UNITS: Partial<Record<FeatureName, string>> = {
  hold_mean: "ms", hold_std: "ms", hold_median: "ms", flight_mean: "ms", flight_std: "ms",
  flight_median: "ms", flight_p10: "ms", flight_p90: "ms", ud_mean: "ms", pause_mean: "ms",
  correction_latency: "ms", hold_space_mean: "ms", hold_left_mean: "ms", hold_right_mean: "ms",
  flight_cross_mean: "ms", flight_same_mean: "ms", flight_space_mean: "ms", wpm: "wpm",
};

export type FeatureGroup = "Key hold" | "Inter-key interval" | "Rhythm" | "Pauses and bursts" | "Hand transitions" | "Corrections" | "Speed";

/** Plain-language description of every feature, in the order the model reads them. */
export const FEATURE_INFO: Record<FeatureName, { group: FeatureGroup; description: string; format: "ms" | "pct" | "ratio" | "keys" | "wpm" }> = {
  hold_mean: { group: "Key hold", description: "Average time a key stays pressed", format: "ms" },
  hold_std: { group: "Key hold", description: "How much your press length varies", format: "ms" },
  hold_median: { group: "Key hold", description: "Typical press length, ignoring odd ones", format: "ms" },
  hold_space_mean: { group: "Key hold", description: "How long you hold the space bar", format: "ms" },
  hold_left_mean: { group: "Key hold", description: "Press length for left-hand keys", format: "ms" },
  hold_right_mean: { group: "Key hold", description: "Press length for right-hand keys", format: "ms" },
  flight_mean: { group: "Inter-key interval", description: "Average gap from one key press to the next", format: "ms" },
  flight_std: { group: "Inter-key interval", description: "How steady those gaps are", format: "ms" },
  flight_median: { group: "Inter-key interval", description: "Typical gap between keys", format: "ms" },
  flight_p10: { group: "Inter-key interval", description: "Your fastest transitions (10th percentile)", format: "ms" },
  flight_p90: { group: "Inter-key interval", description: "Your slowest fluent transitions (90th percentile)", format: "ms" },
  rhythm_cv: { group: "Rhythm", description: "Gap variation divided by average gap: steady or jumpy", format: "ratio" },
  ud_mean: { group: "Rhythm", description: "Time from releasing a key to pressing the next (negative means overlap)", format: "ms" },
  overlap_rate: { group: "Rhythm", description: "How often the next key goes down before the last comes up", format: "pct" },
  pause_rate: { group: "Pauses and bursts", description: "How often you stop for 0.6 to 2 seconds", format: "pct" },
  pause_mean: { group: "Pauses and bursts", description: "How long those short stops last", format: "ms" },
  burst_mean: { group: "Pauses and bursts", description: "Keys typed between pauses", format: "keys" },
  flight_cross_mean: { group: "Hand transitions", description: "Gap when switching hands (left to right or back)", format: "ms" },
  flight_same_mean: { group: "Hand transitions", description: "Gap when the same hand types twice", format: "ms" },
  flight_space_mean: { group: "Hand transitions", description: "Gap between a letter and the space bar", format: "ms" },
  cross_same_ratio: { group: "Hand transitions", description: "How much faster hand switches are than same-hand moves", format: "ratio" },
  backspace_rate: { group: "Corrections", description: "Share of keys that are backspace", format: "pct" },
  correction_latency: { group: "Corrections", description: "How quickly you react to a typo", format: "ms" },
  backspace_run_mean: { group: "Corrections", description: "How many characters you delete in one go", format: "keys" },
  wpm: { group: "Speed", description: "Words per minute. Included, but it matters least", format: "wpm" },
};

export const FEATURE_GROUP_ORDER: FeatureGroup[] = ["Key hold", "Inter-key interval", "Rhythm", "Pauses and bursts", "Hand transitions", "Corrections", "Speed"];

export function formatFeature(name: FeatureName, v: number): string {
  if (!Number.isFinite(v)) return "N/A";
  switch (FEATURE_INFO[name].format) {
    case "ms": return `${Math.round(v)} ms`;
    case "pct": return `${(v * 100).toFixed(1)}%`;
    case "ratio": return v.toFixed(2);
    case "keys": return `${v.toFixed(1)} keys`;
    case "wpm": return `${Math.round(v)} wpm`;
  }
}
