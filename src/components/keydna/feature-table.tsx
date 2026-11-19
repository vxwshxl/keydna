import { FEATURE_NAMES, type FeatureName } from "@/lib/keydna/features";
import { FEATURE_GROUP_ORDER, FEATURE_INFO, FEATURE_LABELS, formatFeature } from "@/lib/keydna/labels";
import { cn } from "@/lib/utils";

interface Props {
  /** Enrolled profile (mean and spread per feature, in model order). */
  profile?: { mean: number[]; std: number[] };
  /** Feature values of the current window, in model order. */
  current?: number[];
  /** Distance of each feature from the profile, in the user's own standard deviations. */
  distances?: number[];
  className?: string;
}

const sigmaTone = (s: number) => (s > 3 ? "var(--ds-danger)" : s > 1.5 ? "var(--ds-warning-face)" : "var(--ds-success-face)");

/** All 25 model features, grouped by behaviour. Works as a static glossary, a profile view or a live view. */
export function FeatureTable({ profile, current, distances, className }: Props) {
  const idx = (n: FeatureName) => FEATURE_NAMES.indexOf(n);
  const shown = [current, profile, distances].filter(Boolean).length;
  const grid = shown === 0 ? "sm:grid-cols-[2rem_1fr]" : shown === 1 ? "sm:grid-cols-[2rem_1.8fr_1fr]" : shown === 2 ? "sm:grid-cols-[2rem_1.6fr_1fr_1fr]" : "sm:grid-cols-[2rem_1.4fr_repeat(3,minmax(0,1fr))]";
  let row = 0;
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {FEATURE_GROUP_ORDER.map((group) => {
        const names = FEATURE_NAMES.filter((n) => FEATURE_INFO[n].group === group);
        return (
          <div key={group}>
            <p className="eyebrow mb-2">{group} · {names.length}</p>
            <div className="overflow-hidden rounded-xl shadow-[inset_0_0_0_2px_var(--ds-surface-lip)]">
              {names.map((n, k) => {
                const i = idx(n);
                row++;
                const d = distances?.[i];
                return (
                  <div key={n} className={cn("grid grid-cols-[2rem_1fr] items-center gap-x-3 gap-y-1 px-3 py-2.5", grid, k % 2 ? "bg-subtle" : "bg-elevated")}>
                    <span className="metric text-xs text-secondary-fg">{String(row).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold">{FEATURE_LABELS[n]}</p>
                      <p className="text-xs font-semibold text-secondary-fg">{FEATURE_INFO[n].description}</p>
                    </div>
                    {current && (
                      <div className="col-start-2 sm:col-start-auto">
                        <p className="eyebrow sm:hidden">This window</p>
                        <p className="metric text-sm font-medium">{formatFeature(n, current[i]!)}</p>
                      </div>
                    )}
                    {profile && (
                      <div className="col-start-2 sm:col-start-auto">
                        <p className="eyebrow sm:hidden">Your normal</p>
                        <p className="metric text-sm text-secondary-fg">
                          {formatFeature(n, profile.mean[i]!)} <span className="text-xs">± {formatFeature(n, profile.std[i]!).replace(/ (ms|keys|wpm)$/, "")}</span>
                        </p>
                      </div>
                    )}
                    {d !== undefined && (
                      <div className="col-start-2 flex items-center gap-2 sm:col-start-auto">
                        <div className="track !h-2 flex-1">
                          <div className="fill" style={{ transform: `scaleX(${Math.min(1, d / 6)})`, ["--fill" as string]: sigmaTone(d) }} />
                        </div>
                        <span className="metric w-12 text-right text-xs font-medium">{d.toFixed(1)}σ</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
