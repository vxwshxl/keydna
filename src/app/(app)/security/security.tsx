"use client";
import { Download, Keyboard, Play, Radio, RotateCcw, Square, Trash2, UserRound, UserRoundX } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChartLegend, ConfidenceChart } from "@/components/keydna/confidence-chart";
import { EventList, NoProfile } from "@/components/keydna/widgets";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { RiskPill, SEVERITY_STYLE } from "@/components/ui/risk";
import { useMounted } from "@/hooks/use-mounted";
import type { Severity } from "@/lib/keydna/engine";
import type { KeyEvent } from "@/lib/keydna/features";
import { enrollDemoTypist, loadDemoPack, replay, restartSession } from "@/lib/runtime";
import { useKeyDNA, useLive } from "@/lib/store";
import { cn, pct } from "@/lib/utils";

type Phase = "legit" | "attack";
interface Source {
  id: string;
  label: string;
  kind: "live" | "replay";
  note: string;
  events?: KeyEvent[];
}

export function Security() {
  const mounted = useMounted();
  const profile = useKeyDNA((s) => s.profile);
  const wantsDemo = useSearchParams().get("demo") === "1";
  const [enrolling, setEnrolling] = useState(false);

  if (!mounted) return <div className="h-96" aria-busy="true" />;
  if (!profile) {
    return wantsDemo ? (
      <div className="card3d mx-auto max-w-xl p-8 text-center">
        <p className="eyebrow">Security demo · synthetic data</p>
        <h1 className="mt-1 text-2xl font-black">Run the takeover demo without enrolling</h1>
        <p className="mt-2 text-secondary-fg">
          KeyDNA will enroll <b>Demo typist A</b> — a generated typist held out of training — then replay A&apos;s unseen sessions and a takeover by <b>Demo typist B</b>. Every score is real model output on DEMO DATA.
        </p>
        <Button size="lg" className="mt-6" disabled={enrolling} onClick={async () => { setEnrolling(true); await enrollDemoTypist(); setEnrolling(false); }}>
          {enrolling ? "Enrolling demo typist…" : "Enroll demo typist A"}
        </Button>
      </div>
    ) : (
      <NoProfile title="Enroll to run the attack simulation" />
    );
  }
  return <SecurityConsole />;
}

function SecurityConsole() {
  const profile = useKeyDNA((s) => s.profile)!;
  const recordings = useKeyDNA((s) => s.recordings);
  const events = useKeyDNA((s) => s.events);
  const clearEvents = useKeyDNA((s) => s.clearEvents);
  const thresholds = useKeyDNA((s) => s.settings.thresholds);
  const live = useLive();
  const [phase, setPhase] = useState<Phase>("legit");
  const [demoMode, setDemoMode] = useState(profile.demo);
  const [demo, setDemo] = useState<{ a: KeyEvent[][]; b: KeyEvent[][] } | null>(null);
  const [speed, setSpeed] = useState(2);
  const [running, setRunning] = useState<string | null>(null);
  const [stop, setStop] = useState<(() => void) | null>(null);
  const [filter, setFilter] = useState<Severity | "ALL">("ALL");

  useEffect(() => {
    loadDemoPack().then((p) => setDemo({ a: p.typists["demo-a"]!.probes, b: p.typists["demo-b"]!.probes }), () => setDemo(null));
  }, []);

  const legitSources: Source[] = [
    { id: "live-legit", label: `${profile.name} types live`, kind: "live", note: "Type in the box below — your real keystrokes" },
    ...(profile.demo && demo ? [{ id: "demo-a", label: "Replay demo typist A", kind: "replay" as const, note: "Unseen session of the enrolled synthetic typist", events: demo.a[1] }] : []),
  ];
  const attackSources: Source[] = [
    { id: "live-attack", label: "Another person types", kind: "live", note: "Hand over the keyboard — real human data" },
    ...recordings.map((r) => ({ id: r.id, label: `Replay ${r.participant}`, kind: "replay" as const, note: `Recorded ${new Date(r.recordedAt).toLocaleDateString()} · ${r.events.length} keys · real human`, events: r.events })),
    ...(demo ? [{ id: "demo-b", label: "Replay demo typist B", kind: "replay" as const, note: "Synthetic typist, never seen in training", events: demo.b[0] }] : []),
  ];

  const run = (s: Source) => {
    stop?.();
    if (s.kind === "live" || !s.events) {
      setRunning(null);
      document.getElementById("attack-typing")?.focus();
      return;
    }
    setRunning(s.id);
    const cancel = replay(s.events, s.label.replace("Replay ", ""), speed, () => {
      setRunning(null);
      setStop(null);
    });
    setStop(() => cancel);
  };

  const halt = () => {
    stop?.();
    setStop(null);
    setRunning(null);
  };

  const fresh = () => {
    halt();
    restartSession(true);
    setPhase("legit");
  };

  const cur = live.current;
  const shown = filter === "ALL" ? events : events.filter((e) => e.severity === filter);

  const exportLog = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `keydna-security-events-${Date.now()}.json` });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Session takeover detection</p>
          <h1 className="text-3xl font-black tracking-tight">Attack simulation</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button tone="plain" size="sm" selected={demoMode} onClick={() => setDemoMode((d) => !d)} aria-pressed={demoMode}>
            <Radio className="size-4" aria-hidden /> Demo mode {demoMode ? "on" : "off"}
          </Button>
          <Button tone="plain" size="sm" onClick={fresh}>
            <RotateCcw className="size-4" aria-hidden /> New run
          </Button>
        </div>
      </div>

      {demoMode && (
        <div className={cn("card3d anim-pop flex items-center justify-center gap-3 p-5 text-center text-2xl font-black tracking-wide uppercase sm:text-3xl", phase === "legit" ? "text-success" : "text-danger")} data-tone={phase === "legit" ? "success" : "danger"} aria-live="polite">
          {phase === "legit" ? <UserRound className="size-8" aria-hidden /> : <UserRoundX className="size-8" aria-hidden />}
          {phase === "legit" ? "Legitimate user" : "Attacker simulation"}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <ol className="flex flex-col gap-5">
            {(["legit", "attack"] as const).map((p, i) => (
              <li key={p}>
                <button type="button" onClick={() => setPhase(p)} className="mb-3 flex w-full items-center gap-3 text-left" aria-expanded={phase === p}>
                  <span className={cn("flex size-9 items-center justify-center rounded-xl font-black", phase === p ? (p === "legit" ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger") : "bg-muted text-secondary-fg")}>{i + 1}</span>
                  <span>
                    <span className="block font-extrabold">{p === "legit" ? "Legitimate user types" : "Someone else takes over"}</span>
                    <span className="block text-sm text-secondary-fg">{p === "legit" ? "Confidence should stay high" : "Confidence should fall and trigger an alert"}</span>
                  </span>
                </button>
                {phase === p && (
                  <div className="anim-rise flex flex-col gap-2">
                    {(p === "legit" ? legitSources : attackSources).map((s) => (
                      <Button key={s.id} tone="plain" selected={running === s.id} onClick={() => run(s)} faceClassName="justify-start text-left py-2">
                        {s.kind === "live" ? <Keyboard className="size-5 shrink-0" aria-hidden /> : <Play className="size-5 shrink-0" aria-hidden />}
                        <span className="flex flex-col">
                          <span>{s.label}</span>
                          <span className="text-xs font-bold tracking-normal text-secondary-fg normal-case">{s.note}</span>
                        </span>
                      </Button>
                    ))}
                    {p === "legit" && (
                      <Button tone="danger" className="mt-2" onClick={() => setPhase("attack")}>
                        Next: simulate takeover
                      </Button>
                    )}
                    {p === "attack" && recordings.length === 0 && (
                      <p className="text-xs font-bold text-secondary-fg">
                        Tip: record friends on <ButtonLink href="/collect" tone="ghost" size="sm" className="mx-1 align-middle">Collect data</ButtonLink> to replay real human attackers here.
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-5 flex items-center justify-between gap-3 border-t-2 border-border pt-4">
            <label className="flex items-center gap-2 text-sm font-bold">
              Replay speed
              <select className="field !min-h-9 !w-auto !py-1" value={speed} onChange={(e) => setSpeed(+e.target.value)}>
                <option value={1}>1× (real time)</option>
                <option value={2}>2×</option>
                <option value={4}>4×</option>
              </select>
            </label>
            <span className="hidden text-xs font-bold text-secondary-fg sm:inline">Playback only — the model sees the recorded timing.</span>
            {running && (
              <Button tone="plain" size="sm" onClick={halt}>
                <Square className="size-4" aria-hidden /> Stop replay
              </Button>
            )}
          </div>
          <textarea
            id="attack-typing"
            data-keydna-monitor
            className="field mt-4 min-h-24 resize-none"
            placeholder={phase === "legit" ? `${profile.name}: type anything here…` : "Attacker: type anything here…"}
            aria-label="Live typing for the simulation (content is never stored)"
            autoComplete="off"
            spellCheck={false}
          />
        </Card>

        <Card tone={cur?.risk === "CRITICAL" ? "danger" : undefined}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Identity confidence</p>
              <p className={cn("metric text-5xl font-medium", cur?.risk === "CRITICAL" ? "text-danger" : cur?.risk === "LOW" ? "text-success" : "")} aria-live="polite">
                {cur ? pct(cur.confidence) : "—"}
              </p>
              <p className="metric mt-1 text-xs text-secondary-fg">model P(genuine) {cur ? cur.raw.toFixed(3) : "—"} · {live.source === "replay" ? `replaying ${live.replayLabel}` : "keyboard"}</p>
            </div>
            {cur ? <RiskPill risk={cur.risk} className="text-sm" /> : <span className="text-sm font-bold text-secondary-fg">{live.collected}/{live.windowSize} keys to first score</span>}
          </div>
          {live.scores.length > 1 ? <ConfidenceChart scores={live.scores} thresholds={thresholds} height={240} /> : <p className="rounded-xl bg-muted p-6 text-center text-secondary-fg">Start step 1 — the trace appears after {live.windowSize} keystrokes.</p>}
          <div className="mt-3"><ChartLegend /></div>
        </Card>
      </div>

      <Card>
        <CardTitle
          eyebrow="Every event has a timestamp, severity, confidence and explanation"
          title="Security events"
          action={
            <div className="flex gap-2">
              <Button tone="plain" size="sm" onClick={exportLog} disabled={!events.length} aria-label="Export events as JSON"><Download className="size-4" aria-hidden /></Button>
              <Button tone="plain" size="sm" onClick={clearEvents} disabled={!events.length} aria-label="Clear events"><Trash2 className="size-4" aria-hidden /></Button>
            </div>
          }
        />
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filter by severity">
          {(["ALL", "INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setFilter(s)} aria-pressed={filter === s} className={cn("metric min-h-8 rounded-lg px-3 text-xs font-medium", filter === s ? (s === "ALL" ? "bg-foreground text-background" : SEVERITY_STYLE[s]) : "bg-muted text-secondary-fg")}>
              {s}
            </button>
          ))}
        </div>
        <EventList events={shown} limit={80} />
      </Card>
    </div>
  );
}
