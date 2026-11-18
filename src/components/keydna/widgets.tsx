"use client";
import { ArrowRight, Dna, Keyboard, ShieldCheck } from "lucide-react";
import type { Deviation, Risk, SecurityEvent } from "@/lib/keydna/engine";
import type { Zone } from "@/lib/keydna/features";
import type { Pulse } from "@/lib/store";
import { ButtonLink } from "@/components/ui/button";
import { RISK_STYLE, SeverityBadge } from "@/components/ui/risk";
import { clock, clockMs, cn } from "@/lib/utils";

const RISK_STROKE: Record<Risk, string> = {
  LOW: "var(--ds-success-face)",
  MEDIUM: "var(--ds-warning-face)",
  HIGH: "var(--ds-warning-lip)",
  CRITICAL: "var(--ds-danger)",
};

/** Ring gauge for identity confidence. */
export function Gauge({ value, risk, size = 200 }: { value: number | null; risk: Risk | null; size?: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const v = value === null ? 0 : Math.max(0, Math.min(100, value)) / 100;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--ds-bg-muted)" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={risk ? RISK_STROKE[risk] : "var(--ds-border-strong)"}
          strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset 320ms var(--ease-soft), stroke 240ms" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="metric text-[40px] leading-none font-medium" aria-live="polite">{value === null ? "—" : value.toFixed(1)}</span>
        <span className="eyebrow mt-1">{value === null ? "waiting" : "% confidence"}</span>
      </div>
    </div>
  );
}

const ZONE_GLYPH: Record<Zone, string> = { L: "L", R: "R", S: "␣", B: "←", E: "↵" };
const ZONE_NAME: Record<Zone, string> = { L: "left hand", R: "right hand", S: "space", B: "backspace", E: "enter" };

/** Live keystroke pulses — hand zone and timing only, never the character. */
export function KeyPulses({ pulses, className }: { pulses: Pulse[]; className?: string }) {
  const last = pulses.at(-1);
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex h-14 items-end gap-1.5 overflow-hidden" aria-hidden>
        {pulses.map((p) => (
          <div key={p.id} className="anim-key flex flex-col items-center gap-1">
            <div
              className={cn("w-7 rounded-md", p.zone === "L" ? "bg-primary" : p.zone === "R" ? "bg-dna" : p.zone === "B" ? "bg-danger" : "bg-signal")}
              style={{ height: Math.max(6, Math.min(40, p.hold / 4)) }}
            />
            <span className="metric text-[10px] text-secondary-fg">{ZONE_GLYPH[p.zone]}</span>
          </div>
        ))}
        {!pulses.length && <p className="self-center text-sm text-secondary-fg">Start typing — each keystroke appears here as a pulse.</p>}
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {[
          ["Key down", last ? clockMs(last.at) : "—"],
          ["Hold", last ? `${Math.round(last.hold)} ms` : "—"],
          ["Interval", last?.interval != null ? `${Math.round(last.interval)} ms` : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-muted px-3 py-2">
            <dt className="eyebrow">{k}</dt>
            <dd className="metric text-sm font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      {last && <p className="sr-only" aria-live="polite">{ZONE_NAME[last.zone]}</p>}
    </div>
  );
}

export function DeviationList({ deviations }: { deviations: Deviation[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {deviations.map((d) => (
        <li key={d.name}>
          <div className="mb-1 flex justify-between text-sm font-bold">
            <span>{d.label}</span>
            <span className="metric font-medium">{d.sigma.toFixed(2)}σ</span>
          </div>
          <div className="track !h-2.5">
            <div className="fill" style={{ transform: `scaleX(${Math.min(1, d.sigma / 6)})`, ["--fill" as string]: d.sigma > 3 ? "var(--ds-danger)" : d.sigma > 1.5 ? "var(--ds-warning-face)" : "var(--ds-success-face)" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function EventList({ events, limit, compact }: { events: SecurityEvent[]; limit?: number; compact?: boolean }) {
  const list = limit ? events.slice(0, limit) : events;
  if (!list.length)
    return <p className="rounded-xl bg-muted p-4 text-sm text-secondary-fg">No security events yet — they appear here as soon as KeyDNA scores your first 60 keystrokes.</p>;
  return (
    <ol className="flex flex-col divide-y-2 divide-border">
      {list.map((e) => (
        <li key={e.id} className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 py-3 sm:grid-cols-[84px_86px_1fr_auto]">
          <time className="metric text-xs text-secondary-fg sm:pt-0.5">{clock(e.at)}</time>
          <span className="sm:order-none"><SeverityBadge s={e.severity} /></span>
          <div className="col-span-2 sm:col-span-1">
            <p className="font-extrabold">{e.title}</p>
            {!compact && <p className="text-sm text-secondary-fg">{e.explanation}</p>}
          </div>
          {e.confidence !== null && <span className="metric col-span-2 text-sm font-medium sm:col-span-1 sm:text-right">{e.confidence.toFixed(1)}%</span>}
        </li>
      ))}
    </ol>
  );
}

export function NoProfile({ title = "Build your typing DNA first" }: { title?: string }) {
  return (
    <div className="card3d mx-auto max-w-xl p-8 text-center">
      <div className="anim-bob mx-auto mb-5 flex size-20 items-center justify-center rounded-3xl bg-dna text-primary-foreground shadow-[0_5px_0_0_var(--ds-dna-lip)]">
        <Dna className="size-10" aria-hidden />
      </div>
      <h1 className="text-2xl font-black">{title}</h1>
      <p className="mt-2 text-secondary-fg">KeyDNA needs about a minute of your typing to learn your behavioural signature. Or try the security demo with a synthetic typist.</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <ButtonLink href="/enroll" size="lg">Build my typing DNA</ButtonLink>
        <ButtonLink href="/security?demo=1" tone="ghost" size="lg">View security demo</ButtonLink>
      </div>
    </div>
  );
}

/** RAW TYPING → FEATURES → PROFILE → MODEL → CONFIDENCE → DECISION, with live values. */
export function Pipeline({ steps }: { steps: { label: string; value: string }[] }) {
  return (
    <ol className="flex flex-wrap items-stretch gap-2" aria-label="Verification pipeline">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center gap-2">
          <div className="min-w-[112px] rounded-xl bg-muted px-3 py-2">
            <p className="eyebrow">{s.label}</p>
            <p className="metric text-sm font-medium">{s.value}</p>
          </div>
          {i < steps.length - 1 && <ArrowRight className="size-4 text-secondary-fg" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

export function StatusLabel({ status, risk }: { status: string; risk: Risk | null }) {
  if (status === "collecting" || !risk)
    return (
      <span className="inline-flex items-center gap-2 font-extrabold text-secondary-fg">
        <Keyboard className="size-5" aria-hidden /> Collecting
      </span>
    );
  const verified = risk === "LOW";
  return (
    <span className={cn("inline-flex items-center gap-2 font-extrabold", RISK_STYLE[risk].text)}>
      {verified ? <ShieldCheck className="size-5" aria-hidden /> : <span className="live-dot" style={{ ["--dot" as string]: RISK_STROKE[risk] }} />}
      {verified ? "Verified" : risk === "CRITICAL" ? "Anomaly" : "Deviating"}
    </span>
  );
}
