import { ShieldAlert, ShieldCheck, ShieldQuestion, ShieldX } from "lucide-react";
import type { Risk, Severity } from "@/lib/keydna/engine";
import { cn } from "@/lib/utils";

export const RISK_STYLE: Record<Risk, { text: string; bg: string; dot: string; label: string }> = {
  LOW: { text: "text-success", bg: "bg-success-subtle", dot: "var(--ds-success-face)", label: "Low" },
  MEDIUM: { text: "text-warning-ink", bg: "bg-warning-subtle", dot: "var(--ds-warning-face)", label: "Medium" },
  HIGH: { text: "text-danger", bg: "bg-danger-subtle", dot: "var(--ds-warning-lip)", label: "High" },
  CRITICAL: { text: "text-danger", bg: "bg-danger-subtle", dot: "var(--ds-danger)", label: "Critical" },
};

const ICON = { LOW: ShieldCheck, MEDIUM: ShieldQuestion, HIGH: ShieldAlert, CRITICAL: ShieldX };

export function RiskPill({ risk, className }: { risk: Risk; className?: string }) {
  const s = RISK_STYLE[risk];
  const Icon = ICON[risk];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold tracking-wide uppercase", s.bg, s.text, className)}>
      <Icon className="size-3.5" aria-hidden /> {s.label} risk
    </span>
  );
}

export const SEVERITY_STYLE: Record<Severity, string> = {
  INFO: "bg-accent-subtle text-primary",
  LOW: "bg-muted text-secondary-fg",
  MEDIUM: "bg-warning-subtle text-warning-ink",
  HIGH: "bg-danger-subtle text-danger",
  CRITICAL: "bg-danger text-primary-foreground",
};

export function SeverityBadge({ s }: { s: Severity }) {
  return <span className={cn("metric inline-flex w-[76px] justify-center rounded-md px-2 py-0.5 text-[11px] font-medium", SEVERITY_STYLE[s])}>{s}</span>;
}
