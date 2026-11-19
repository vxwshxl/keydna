"use client";
import { Cpu, RotateCcw } from "lucide-react";
import Link from "next/link";
import { ChartLegend, ConfidenceChart } from "@/components/keydna/confidence-chart";
import { FeatureTable } from "@/components/keydna/feature-table";
import { FreeTyping } from "@/components/keydna/free-typing";
import { TypingSurface } from "@/components/keydna/typing-surface";
import { DeviationList, EventList, Gauge, KeyPulses, NoProfile, Pipeline, StatusLabel } from "@/components/keydna/widgets";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RiskPill } from "@/components/ui/risk";
import { useMounted } from "@/hooks/use-mounted";
import { FEATURE_INDEX } from "@/lib/keydna/features";
import { restartSession } from "@/lib/runtime";
import { useKeyDNA, useLive } from "@/lib/store";
import { pct } from "@/lib/utils";

export function Dashboard() {
  const mounted = useMounted();
  const profile = useKeyDNA((s) => s.profile);
  const settings = useKeyDNA((s) => s.settings);
  const events = useKeyDNA((s) => s.events);
  const live = useLive();

  if (!mounted) return <div className="h-96" aria-busy="true" />;
  if (!profile) return <NoProfile />;
  if (live.status === "error") return <Card tone="danger"><p className="font-bold">The model could not be loaded: {live.error}</p></Card>;

  const cur = live.current;
  const f = cur?.features;
  const collecting = !cur;

  const metrics = [
    { label: "WPM", value: f ? f[FEATURE_INDEX.wpm]!.toFixed(0) : "—", hint: "speed (not identity)" },
    { label: "Backspace rate", value: f ? pct(f[FEATURE_INDEX.backspace_rate]! * 100) : "—", hint: "correction behaviour" },
    { label: "Timing match", value: cur ? pct(cur.match.timing) : "—", hint: "hold + interval distance" },
    { label: "Rhythm match", value: cur ? pct(cur.match.rhythm) : "—", hint: "variability, pauses, bursts" },
    { label: "Behavioural similarity", value: cur ? pct(cur.match.overall) : "—", hint: "all 25 features" },
    { label: "Model P(genuine)", value: cur ? pct(cur.raw * 100) : "—", hint: "Random Forest output" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Continuous authentication</p>
          <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Button tone="plain" size="sm" onClick={() => restartSession()}>
            <RotateCcw className="size-4" aria-hidden /> Restart session
          </Button>
        </div>
      </div>

      <Card>
        <CardTitle eyebrow="Type anything in KeyDNA · only timing is analysed" title="Type to stay verified" />
        <TypingSurface mode="monitor" grabKeys label="Typing area. Only key timing is analysed, the text is never stored" />
      </Card>

      <Card>
        <CardTitle eyebrow="Any text works · nothing you write is saved" title="Or type anything you like" />
        <p className="-mt-2 mb-4 max-w-3xl text-sm text-secondary-fg">
          KeyDNA doesn&apos;t need the prompted words. It checks the rhythm of whatever you type, so emails, chat messages or random letters all keep the session verified in the same way.
        </p>
        <FreeTyping />
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Card tone={cur?.risk === "CRITICAL" ? "danger" : cur?.risk === "LOW" ? "accent" : undefined} className="flex flex-col items-center gap-6 sm:flex-row">
          <Gauge value={cur?.confidence ?? null} risk={cur?.risk ?? null} />
          <div className="flex flex-1 flex-col gap-3 self-stretch">
            <p className="eyebrow">KeyDNA · {cur?.risk === "CRITICAL" ? "session at risk" : "session protected"}</p>
            <h2 className="text-2xl font-black">Identity confidence</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="eyebrow">User</dt><dd className="font-extrabold">{profile.name}</dd></div>
              <div><dt className="eyebrow">Status</dt><dd><StatusLabel status={live.status} risk={cur?.risk ?? null} /></dd></div>
              <div><dt className="eyebrow">Risk</dt><dd>{cur ? <RiskPill risk={cur.risk} /> : <span className="text-secondary-fg">—</span>}</dd></div>
              <div><dt className="eyebrow">Keystrokes</dt><dd className="metric font-medium">{cur?.keys ?? live.collected}</dd></div>
            </dl>
            {collecting && (
              <div>
                <div className="mb-1 flex justify-between text-sm font-bold">
                  <span>Filling the first window</span>
                  <span className="metric font-medium">{live.collected}/{live.windowSize}</span>
                </div>
                <Progress value={live.collected / live.windowSize} label="Keystrokes collected for the first window" />
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle eyebrow="Live keystrokes" title="What KeyDNA records" />
          <KeyPulses pulses={live.pulses} />
          <p className="mt-4 text-xs font-bold text-secondary-fg">Each bar is one key: its height is the hold time and its colour is the hand zone (L, R, space or backspace). The letter itself is never recorded.</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <div key={m.label} className="card3d p-4">
            <p className="eyebrow">{m.label}</p>
            <p className="metric mt-1 text-2xl font-medium">{m.value}</p>
            <p className="mt-1 text-xs font-bold text-secondary-fg">{m.hint}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardTitle eyebrow="Rolling 60-keystroke windows, re-scored every 15 keys" title="Identity confidence over time" action={<ChartLegend />} />
        {live.scores.length > 1 ? (
          <ConfidenceChart scores={live.scores} thresholds={settings.thresholds} />
        ) : (
          <p className="rounded-xl bg-muted p-6 text-center text-secondary-fg">The graph starts after your first full window of {live.windowSize} keystrokes.</p>
        )}
        <div className="mt-4 border-t-2 border-border pt-4">
          <Pipeline
            steps={[
              { label: "Raw typing", value: `${cur?.keys ?? live.collected} keys` },
              { label: "Features", value: "25 per window" },
              { label: "Profile", value: `${profile.quality.samples} windows` },
              { label: "Model", value: cur ? `P=${cur.raw.toFixed(3)}` : "—" },
              { label: "Confidence", value: cur ? pct(cur.confidence) : "—" },
              { label: "Decision", value: cur?.risk ?? "—" },
            ]}
          />
          <p className="mt-3 flex items-center gap-2 text-xs font-bold text-secondary-fg">
            <Cpu className="size-4" aria-hidden />
            {settings.inference === "local" ? "Inference runs in this browser — keystrokes never leave the device." : "Server inference — only the 25 derived features are sent."} Match percentages are distance summaries, not model output.
          </p>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle eyebrow="Explainability, this window" title="Largest deviations from your profile" />
          {cur ? <DeviationList deviations={cur.deviations} /> : <p className="text-secondary-fg">Waiting for the first window.</p>}
          <p className="mt-4 text-xs font-bold text-secondary-fg">σ = how many of your own standard deviations away from your enrolled average. Under ~1.5σ is normal day-to-day variation.</p>
        </Card>
        <Card>
          <CardTitle eyebrow="Security events" title="Recent activity" action={<Link href="/security" className="text-sm font-extrabold text-primary uppercase hover:underline">View all</Link>} />
          <EventList events={events} limit={6} compact />
        </Card>
      </div>

      <Card>
        <CardTitle
          eyebrow={cur ? "Live · the window the model just scored" : "Your enrolled profile · live values appear after 60 keystrokes"}
          title="All 25 features the model reads"
        />
        <FeatureTable profile={profile.profile} current={cur?.features} distances={cur?.distances} />
        <p className="mt-4 text-xs font-bold text-secondary-fg">Your normal is your enrollment average ± how much you usually vary. The bar shows how many of your own standard deviations this window is away from it, which is exactly what the Random Forest sees.</p>
      </Card>
    </div>
  );
}
