import { cn } from "@/lib/utils";

const FILL = {
  accent: "var(--ds-accent)",
  dna: "var(--ds-dna)",
  success: "var(--ds-success-face)",
  warning: "var(--ds-warning-face)",
  danger: "var(--ds-danger)",
  signal: "var(--ds-signal)",
} as const;

export function Progress({ value, tone = "accent", className, label }: { value: number; tone?: keyof typeof FILL; className?: string; label: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={cn("track", className)} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}>
      <div className="fill" style={{ transform: `scaleX(${v})`, ["--fill" as string]: FILL[tone] }} />
    </div>
  );
}
