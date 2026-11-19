"use client";
import { Check, Dna, Keyboard, Loader2, ShieldCheck, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MonkeytypeImport } from "@/components/keydna/monkeytype-import";
import { TypingTest, type CaptureResult } from "@/components/keydna/typing-test";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMounted } from "@/hooks/use-mounted";
import { manualEvent } from "@/lib/keydna/engine";
import { buildEnrollment, digraphStats, implausibleReason, type EnrollmentResult } from "@/lib/keydna/enroll";
import { FEATURE_NAMES } from "@/lib/keydna/features";
import { loadModel, type ForestModel } from "@/lib/keydna/model";
import { summarize } from "@/lib/keydna/monkeytype";
import { useKeyDNA, type EnrolledProfile } from "@/lib/store";
import { cn, pct } from "@/lib/utils";

const STEPS = ["Welcome", "History", "Calibrate", "Learn", "Profile"] as const;

function guessDevice() {
  if (typeof navigator === "undefined") return "This computer";
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Mac/.test(ua)) return "MacBook";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Linux/.test(ua)) return "Linux PC";
  return "This computer";
}

export function Enroll() {
  // Reads localStorage + the user agent, so render only on the client.
  const mounted = useMounted();
  return mounted ? <EnrollFlow /> : <div className="min-h-dvh bg-elevated" aria-busy="true" />;
}

function EnrollFlow() {
  const router = useRouter();
  const history = useKeyDNA((s) => s.history);
  const setProfile = useKeyDNA((s) => s.setProfile);
  const addEvents = useKeyDNA((s) => s.addEvents);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [device, setDevice] = useState(guessDevice);
  const [model, setModel] = useState<ForestModel | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [capture, setCapture] = useState<CaptureResult | null>(null);
  const [result, setResult] = useState<EnrollmentResult | null>(null);
  const [calibError, setCalibError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    loadModel().then(setModel, (e: Error) => setModelError(e.message));
  }, []);

  const target = model?.config.enroll_keys ?? 320;

  const finish = (r: EnrollmentResult, c: CaptureResult) => {
    const p: EnrolledProfile = {
      name: name.trim() || "You",
      device: device.trim() || "This computer",
      createdAt: Date.now(),
      modelVersion: model!.model_version,
      demo: false,
      profile: r.profile,
      enrollKeys: c.events.length,
      calibration: { seconds: r.seconds, wpm: r.wpm, accuracy: c.accuracy, holdMean: r.holdMean, flightMean: r.flightMean },
      quality: { selfMatch: r.selfMatch, timing: r.timing, rhythm: r.rhythm, samples: r.samples },
      digraphs: digraphStats(c.keys),
    };
    setProfile(p);
    addEvents([manualEvent("enrolled", "Profile enrolled", "INFO", `${p.name} enrolled from ${c.events.length} calibration keystrokes (${r.samples} windows).`)]);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-elevated">
      <header className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 pt-6 sm:px-6">
        <Link href="/" aria-label="Leave enrollment" className="rounded-lg p-1 text-secondary-fg hover:bg-muted">
          <X className="size-6" aria-hidden />
        </Link>
        <Progress value={(step + (step === 4 ? 1 : 0.4)) / STEPS.length} label={`Step ${step + 1} of ${STEPS.length}`} className="flex-1" />
        <span className="metric text-sm text-secondary-fg">{step + 1}/{STEPS.length}</span>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6">
        {step === 0 && (
          <section className="anim-rise flex flex-1 flex-col items-center justify-center text-center">
            <div className="anim-bob mb-6 flex size-24 items-center justify-center rounded-3xl bg-dna text-primary-foreground shadow-[0_6px_0_0_var(--ds-dna-lip)]">
              <Dna className="size-12" aria-hidden />
            </div>
            <h1 className="text-3xl font-black sm:text-4xl">Welcome to KeyDNA</h1>
            <p className="mt-3 max-w-md text-lg text-secondary-fg">Build your behavioural typing profile. It takes about a minute, and nothing you type is stored.</p>
            <div className="mt-8 grid w-full max-w-md gap-4 text-left">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-extrabold">Your name</span>
                <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" maxLength={40} autoFocus />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-extrabold">This device</span>
                <input className="field" value={device} onChange={(e) => setDevice(e.target.value)} maxLength={40} />
              </label>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="anim-rise">
            <p className="eyebrow">Step 2 · optional</p>
            <h1 className="text-3xl font-black">Import your Monkeytype history</h1>
            <p className="mt-2 mb-6 text-secondary-fg">
              Your past tests become your <b>historical baseline</b> — speed, accuracy, consistency and key timing over weeks. Speed is performance; timing behaviour is identity, so the live model still learns from calibration next.
            </p>
            <MonkeytypeImport />
          </section>
        )}

        {step === 2 && (
          <section className="anim-rise">
            <p className="eyebrow">Step 3 · live calibration</p>
            <h1 className="text-3xl font-black">Type naturally for about a minute</h1>
            <p className="mt-2 mb-6 flex items-start gap-2 text-secondary-fg">
              <Keyboard className="mt-1 size-5 shrink-0" aria-hidden />
              <span>Don&apos;t rush and don&apos;t worry about typos. KeyDNA learns how you <i>normally</i> type, mistakes included.</span>
            </p>
            {modelError ? (
              <p className="rounded-xl bg-danger-subtle p-4 font-bold text-danger" role="alert">Model failed to load: {modelError}</p>
            ) : (
              <>
                {calibError && (
                  <p className="anim-shake mb-4 rounded-xl bg-danger-subtle p-4 font-bold text-danger" role="alert">
                    {calibError} Let&apos;s try that again.
                  </p>
                )}
                <TypingTest
                  key={attempt}
                  target={target}
                  onComplete={(c) => {
                    const reason = model ? implausibleReason(buildEnrollment(c.events, model)) : null;
                    if (reason) {
                      setCalibError(reason);
                      setAttempt((a) => a + 1);
                      return;
                    }
                    setCalibError(null);
                    setCapture(c);
                    setTimeout(() => setStep(3), 400);
                  }}
                />
              </>
            )}
          </section>
        )}

        {step === 3 && capture && model && (
          <Learning
            capture={capture}
            model={model}
            historyTests={history.length}
            onDone={(r) => {
              setResult(r);
              finish(r, capture);
              setStep(4);
            }}
          />
        )}

        {step === 4 && result && capture && <ProfileReady r={result} c={capture} historyStability={summarize(history).stability} />}
      </main>

      <footer className="border-t-2 border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
          {step === 1 ? (
            <Button tone="plain" size="lg" onClick={() => setStep(2)}>Skip</Button>
          ) : (
            <span />
          )}
          {step === 0 && <Button size="lg" onClick={() => setStep(1)} disabled={!name.trim()}>Continue</Button>}
          {step === 1 && <Button size="lg" onClick={() => setStep(2)} disabled={!history.length}>Continue</Button>}
          {step === 2 && <p className="text-sm font-bold text-secondary-fg">Continues automatically at {target} keystrokes</p>}
          {step === 4 && <Button tone="success" size="lg" onClick={() => router.push("/dashboard")}>Open dashboard</Button>}
        </div>
      </footer>
    </div>
  );
}

/** Real pipeline steps, paced so each is visible. The numbers shown are the computed ones. */
function Learning({ capture, model, historyTests, onDone }: { capture: CaptureResult; model: ForestModel; historyTests: number; onDone: (r: EnrollmentResult) => void }) {
  const [shown, setShown] = useState(0);
  const [r] = useState(() => buildEnrollment(capture.events, model));
  const steps = [
    { title: "Collecting data", detail: `${capture.events.length} keystrokes over ${r.seconds.toFixed(0)} s${historyTests ? ` + ${historyTests} Monkeytype tests` : ""}` },
    { title: "Extracting timing features", detail: `${FEATURE_NAMES.length} features × ${r.samples} sliding windows of ${model.config.window_size} keys` },
    { title: "Learning behavioural pattern", detail: `Mean hold ${r.holdMean.toFixed(0)} ms · mean interval ${r.flightMean.toFixed(0)} ms · ${r.wpm.toFixed(0)} wpm` },
    { title: "Building typing DNA", detail: r.selfMatch === null ? "Self-match check skipped (not enough windows)" : `Self-match on held-out last third: ${pct(r.selfMatch * 100)} (Random Forest)` },
    { title: "Profile ready", detail: `Profile of mean ± σ for ${FEATURE_NAMES.length} features, model v${model.model_version}` },
  ];

  useEffect(() => {
    if (shown >= steps.length) {
      const t = setTimeout(() => onDone(r), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((s) => s + 1), 650);
    return () => clearTimeout(t);
  }, [shown, steps.length, onDone, r]);

  return (
    <section className="anim-rise flex flex-1 flex-col items-center justify-center">
      <h1 className="mb-8 text-center text-3xl font-black">Learning how you type</h1>
      <ol className="flex w-full max-w-lg flex-col gap-3" aria-live="polite">
        {steps.map((s, i) => {
          const state = i < shown ? "done" : i === shown ? "active" : "todo";
          return (
            <li key={s.title} className={cn("card3d flex items-center gap-4 p-4 transition-opacity duration-200", state === "todo" && "opacity-40")} data-tone={state === "done" ? "success" : undefined}>
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", state === "done" ? "bg-success-subtle text-success" : "bg-muted text-secondary-fg")}>
                {state === "done" ? <Check className="size-5" aria-hidden /> : state === "active" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <span className="metric text-sm">{i + 1}</span>}
              </span>
              <div>
                <p className="font-mono text-sm font-medium tracking-wider uppercase">{s.title}</p>
                {state !== "todo" && <p className="text-sm text-secondary-fg">{s.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ProfileReady({ r, c, historyStability }: { r: EnrollmentResult; c: CaptureResult; historyStability: number | null }) {
  const strength = r.selfMatch === null ? null : r.selfMatch * 100;
  const rows = [
    { label: "Typing DNA strength", value: strength, hint: "Self-match: model score on calibration windows the profile never saw" },
    { label: "Behavioural stability", value: historyStability, hint: historyStability === null ? "Import Monkeytype history to measure speed stability across sessions" : "1 − CV of your WPM across Monkeytype tests" },
    { label: "Timing consistency", value: r.timing, hint: "1 − window-to-window CV of hold & interval means" },
    { label: "Rhythm stability", value: r.rhythm, hint: "1 − mean coefficient of variation of inter-key intervals" },
  ];
  return (
    <section className="anim-rise">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="anim-pop mb-4 flex size-20 items-center justify-center rounded-3xl bg-success-subtle text-success">
          <ShieldCheck className="size-10" aria-hidden />
        </div>
        <p className="eyebrow">KeyDNA profile</p>
        <h1 className="text-3xl font-black">Your typing DNA is ready <Sparkles className="inline size-7 text-warning" aria-hidden /></h1>
      </div>
      <div className="card3d flex flex-col gap-5 p-6">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex justify-between gap-3">
              <span className="font-extrabold">{row.label}</span>
              <span className="metric font-medium">{row.value === null ? "—" : pct(row.value, 0)}</span>
            </div>
            <Progress value={(row.value ?? 0) / 100} tone={row.label.startsWith("Typing") ? "dna" : "accent"} label={row.label} />
            <p className="mt-1 text-xs font-bold text-secondary-fg">{row.hint}</p>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-3 border-t-2 border-border pt-5 text-center">
          <div><p className="eyebrow">Profile samples</p><p className="metric text-xl">{r.samples}</p></div>
          <div><p className="eyebrow">Keystrokes</p><p className="metric text-xl">{c.events.length}</p></div>
          <div><p className="eyebrow">Accuracy</p><p className="metric text-xl">{pct(c.accuracy)}</p></div>
        </div>
      </div>
    </section>
  );
}
