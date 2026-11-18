/** Shape of public/model/metrics.json, written by ml/train.py. */
export interface Report {
  threshold: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  far: number;
  frr: number;
  confusion: { tn: number; fp: number; fn: number; tp: number };
}
export interface RocPoint {
  fpr: number;
  tpr: number;
  threshold: number;
}
export interface Metrics {
  generated_at: string;
  preliminary: boolean;
  dataset: { kind: "synthetic-demo" | "real" | "combined"; version: string; users: number; sessions: number; keystrokes: number; probe_windows: number; training_pairs: number };
  model_version: string;
  model: string;
  rf_params: Record<string, string | number | null>;
  config: Record<string, number>;
  thresholds: { decision: number; eer: number; critical_ema: number };
  n_features: number;
  evaluation: {
    folds: number;
    test_pairs: number;
    rf: { auc: number; eer: number; eer_threshold: number; at_0_5: Report; at_eer: Report; roc: RocPoint[] };
    baseline_scaled_manhattan: { auc: number; eer: number; roc: RocPoint[] };
    continuous: {
      critical_threshold: number;
      ema_alpha: number;
      impostor_detection_rate: number;
      genuine_false_alarm_rate: number;
      median_keystrokes_to_detect: number | null;
      impostor_sessions: number;
      genuine_sessions: number;
    };
  };
  feature_importance: { name: string; label: string; group: string; importance: number }[];
  group_importance: { group: string; importance: number }[];
}
