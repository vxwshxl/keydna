"use client";
import { Gauge as GaugeIcon, Hand, Keyboard, Repeat, Target, Timer, Waves } from "lucide-react";
import { HistoryStats } from "@/components/keydna/monkeytype-import";
import { NoProfile } from "@/components/keydna/widgets";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { useMounted } from "@/hooks/use-mounted";
import { FEATURE_INDEX as I, FEATURE_NAMES } from "@/lib/keydna/features";
import { MATCH_GROUPS } from "@/lib/keydna/labels";
import { summarize } from "@/lib/keydna/monkeytype";
import { useKeyDNA } from "@/lib/store";
import { cn, ms, pct } from "@/lib/utils";
import { HistoryChart, ProfileRadar } from "./charts";

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export function TypingDNA() {
  const mounted = useMounted();
  const p = useKeyDNA((s) => s.profile);
  const history = useKeyDNA((s) => s.history);
  if (!mounted) return <div className="h-96" aria-busy="true" />;
  if (!p) return <NoProfile />;

  const mu = p.profile.mean;
  const sd = p.profile.std;
  const v = (i: number) => mu[i]!;
  const backspace = v(I.backspace_rate);
  const accuracy = p.calibration.accuracy ?? clamp(100 * (1 - 10 * backspace));
  const radar = [
    { axis: "Speed", value: clamp(v(I.wpm) / 1.2) },
    { axis: "Rhythm", value: clamp(100 * (1 - v(I.rhythm_cv))) },
    { axis: "Consistency", value: p.quality.timing },
    { axis: "Accuracy", value: accuracy },
    { axis: "Timing", value: clamp(100 * (1 - v(I.hold_std) / v(I.hold_mean))) },
    { axis: "Corrections", value: backspace > 0 ? clamp(100 * (1 - Math.min(v(I.correction_latency), 1000) / 1000)) : 100 },
  ];

  const cards = [
    { icon: GaugeIcon, label: "Speed", value: `${v(I.wpm).toFixed(0)} wpm`, note: "Performance, not identity" },
    { icon: Waves, label: "Rhythm", value: `CV ${v(I.rhythm_cv).toFixed(2)}`, note: "Variation between keystrokes" },
    { icon: Timer, label: "Key duration", value: `${v(I.hold_mean).toFixed(0)} ± ${v(I.hold_std).toFixed(0)} ms`, note: "Average hold (dwell) time" },
    { icon: Keyboard, label: "Key spacing", value: ms(v(I.flight_mean)), note: "Average key-to-key transition" },
    { icon: Target, label: "Accuracy", value: pct(accuracy), note: `${pct(backspace * 100)} of keys are backspace` },
    { icon: Repeat, label: "Consistency", value: pct(p.quality.timing, 0), note: "Session stability across windows" },
  ];

  // Helix rungs: one per feature, coloured by behaviour family, length = how stable that trait is for you.
  const family = (n: string) => (MATCH_GROUPS.corrections as readonly string[]).includes(n) ? "var(--ds-danger)" : (MATCH_GROUPS.rhythm as readonly string[]).includes(n) ? "var(--ds-dna)" : "var(--ds-accent)";
  const stability = FEATURE_NAMES.map((n, i) => ({ n, s: mu[i] ? clamp(100 * (1 - sd[i]! / Math.abs(mu[i]!))) : 0 }));

  const hands = [
    { label: "Left-hand hold", value: v(I.hold_left_mean) },
    { label: "Right-hand hold", value: v(I.hold_right_mean) },
    { label: "Space bar hold", value: v(I.hold_space_mean) },
    { label: "Cross-hand transition", value: v(I.flight_cross_mean) },
    { label: "Same-hand transition", value: v(I.flight_same_mean) },
    { label: "Word-boundary transition", value: v(I.flight_space_mean) },
  ];
  const handMax = Math.max(...hands.map((h) => h.value));
  const hs = summarize(history);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{p.demo ? "Synthetic demo typist" : `${p.name} · enrolled ${new Date(p.createdAt).toLocaleDateString()}`}</p>
          <h1 className="text-3xl font-black tracking-tight">Your typing DNA</h1>
          <p className="text-secondary-fg">A behavioural signature generated from your typing patterns — not a biological fingerprint.</p>
        </div>
        <ButtonLink href="/enroll" tone="plain" size="sm">Re-enroll</ButtonLink>
      </div>

      <Card tone="dna" className="overflow-hidden">
        <CardTitle eyebrow={`${FEATURE_NAMES.length} traits · ${p.quality.samples} enrollment windows`} title="Behavioural signature" />
        <svg viewBox="0 0 500 120" className="h-28 w-full" role="img" aria-label="Signature strip: one rung per feature; longer rungs are more stable traits">
          {stability.map(({ n, s }, i) => {
            const x = 10 + i * 19.6;
            const phase = (i / FEATURE_NAMES.length) * Math.PI * 4;
            const amp = 10 + (s / 100) * 38;
            const y1 = 60 + Math.sin(phase) * amp;
            const y2 = 60 - Math.sin(phase) * amp;
            return (
              <g key={n}>
                <line x1={x} x2={x} y1={y1} y2={y2} stroke={family(n)} strokeWidth="5" strokeLinecap="round" opacity={0.85} />
                <circle cx={x} cy={y1} r="4" fill="var(--ds-accent)" />
                <circle cx={x} cy={y2} r="4" fill="var(--ds-dna)" />
              </g>
            );
          })}
        </svg>
        <p className="mt-2 text-xs font-bold text-secondary-fg">Each rung is one feature. Rung length = your stability on that trait (1 − σ/μ across windows). Blue: timing · violet: rhythm · red: corrections.</p>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card3d flex gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-subtle text-primary"><c.icon className="size-5" aria-hidden /></span>
            <div className="min-w-0">
              <p className="eyebrow">{c.label}</p>
              <p className="metric text-xl font-medium">{c.value}</p>
              <p className="text-xs font-bold text-secondary-fg">{c.note}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle eyebrow="0–100 per axis" title="Behavioural profile" />
          <ProfileRadar data={radar} />
          <p className="text-xs font-bold text-secondary-fg">
            Speed = wpm ÷ 1.2 · Rhythm = 1 − interval CV · Consistency = timing stability · Accuracy = calibration accuracy · Timing = 1 − hold CV · Corrections = faster fixes score higher.
          </p>
        </Card>
        <Card>
          <CardTitle eyebrow="Hand & transition timing" title="How your hands move" />
          <ul className="flex flex-col gap-3">
            {hands.map((h) => (
              <li key={h.label}>
                <div className="mb-1 flex justify-between text-sm font-bold"><span className="flex items-center gap-2"><Hand className="size-4 text-secondary-fg" aria-hidden />{h.label}</span><span className="metric font-medium">{ms(h.value)}</span></div>
                <div className="track !h-3"><div className="fill" style={{ transform: `scaleX(${h.value / handMax})`, ["--fill" as string]: h.label.includes("hold") ? "var(--ds-dna)" : "var(--ds-accent)" }} /></div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs font-bold text-secondary-fg">Cross/same-hand ratio {v(I.cross_same_ratio).toFixed(2)} · rollover on {pct(v(I.overlap_rate) * 100, 0)} of transitions.</p>
        </Card>
      </div>

      <Card>
        <CardTitle eyebrow="Measured during calibration, kept on this device only" title="Common transitions" />
        {p.digraphs.length ? (
          <ul className="flex flex-wrap gap-3">
            {p.digraphs.map((d) => (
              <li key={d.pair} className="card3d flex items-center gap-3 px-4 py-2">
                <span className="text-lg font-black tracking-widest">{d.pair}</span>
                <span className="metric text-sm text-secondary-fg">{Math.round(d.ms)} ms</span>
                <span className="metric text-[11px] text-secondary-fg">×{d.n}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-secondary-fg">{p.demo ? "Synthetic typists have no letter-level data." : "Not enough repeated letter pairs in calibration."}</p>
        )}
      </Card>

      <Card>
        <CardTitle eyebrow="Historical baseline" title="Monkeytype history" action={!history.length ? <ButtonLink href="/enroll" tone="ghost" size="sm">Import</ButtonLink> : undefined} />
        {history.length ? (
          <div className="flex flex-col gap-5">
            <HistoryStats tests={history} />
            <HistoryChart data={history.map((t) => ({ at: t.at, wpm: t.wpm, acc: t.acc }))} />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="eyebrow"><th className="py-2">Measure</th><th>Monkeytype history</th><th>Live calibration</th></tr></thead>
                <tbody className="divide-y-2 divide-border font-bold">
                  <Row k="Speed (wpm)" a={hs.wpm?.toFixed(1)} b={p.calibration.wpm.toFixed(1)} />
                  <Row k="Key duration (ms)" a={hs.hold?.toFixed(0)} b={p.calibration.holdMean.toFixed(0)} />
                  <Row k="Key spacing (ms)" a={hs.spacing?.toFixed(0)} b={p.calibration.flightMean.toFixed(0)} note="Monkeytype spacing includes pauses; KeyDNA's excludes gaps ≥ 600 ms, so expect it lower." />
                  <Row k="Accuracy" a={pct(hs.acc)} b={pct(p.calibration.accuracy)} />
                  <Row k="Speed stability" a={pct(hs.stability)} b="—" />
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-secondary-fg">No history imported. Monkeytype tests add a weeks-long baseline for speed, accuracy and key timing.</p>
        )}
      </Card>
    </div>
  );
}

function Row({ k, a, b, note }: { k: string; a?: string; b: string; note?: string }) {
  return (
    <tr>
      <td className="py-2 pr-4">{k}{note && <span className="block text-xs font-semibold text-secondary-fg">{note}</span>}</td>
      <td className={cn("metric pr-4", !a && "text-secondary-fg")}>{a ?? "—"}</td>
      <td className="metric">{b}</td>
    </tr>
  );
}
