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
