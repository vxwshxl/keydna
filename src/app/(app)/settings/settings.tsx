"use client";
import { Download, Lock, Smartphone, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { RiskPill } from "@/components/ui/risk";
import { useMounted } from "@/hooks/use-mounted";
import { DEFAULT_THRESHOLDS, validThresholds, type Thresholds } from "@/lib/keydna/engine";
import { getModel } from "@/lib/runtime";
import { useKeyDNA } from "@/lib/store";
import { cn } from "@/lib/utils";

function newCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(buf, (b) => chars[b % chars.length]).join("");
}

function Toggle({ on, onChange, label, desc }: { on: boolean; onChange: (v: boolean) => void; label: string; desc: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block font-extrabold">{label}</span>
        <span className="block text-sm text-secondary-fg">{desc}</span>
      </span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className={cn("relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ds-focus-ring)]", on ? "bg-primary" : "bg-border-strong")}>
        <span className={cn("absolute top-1 left-1 size-5 rounded-full bg-elevated transition-transform duration-150", on && "translate-x-5")} />
      </span>
    </label>
  );
}

export function SettingsPanel() {
  const mounted = useMounted();
  const s = useKeyDNA((x) => x.settings);
  const update = useKeyDNA((x) => x.updateSettings);
  const profile = useKeyDNA((x) => x.profile);
  const wipe = useKeyDNA((x) => x.wipe);
  const [draft, setDraft] = useState<Thresholds | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  if (!mounted) return <div className="h-96" aria-busy="true" />;

  const t = draft ?? s.thresholds;
  const ok = validThresholds(t);
  const modelAlpha = getModel()?.config.ema_alpha ?? 0.35;
  const alpha = s.emaAlpha ?? modelAlpha;
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const exportProfile = () => {
    const blob = new Blob([JSON.stringify({ profile, settings: s }, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "keydna-profile.json" });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="eyebrow">Thresholds, profile, privacy</p>
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
      </div>

      <Card>
        <CardTitle eyebrow="UI risk classification — applied to smoothed model output" title="Risk thresholds" />
        <div className="flex flex-col gap-5">
          {([
            ["low", "LOW risk at or above", "LOW"],
            ["medium", "MEDIUM risk at or above", "MEDIUM"],
            ["high", "HIGH risk at or above (below = CRITICAL)", "HIGH"],
          ] as const).map(([k, label, risk]) => (
            <label key={k} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2">
              <span className="flex items-center gap-3 font-extrabold"><RiskPill risk={risk} /> {label}</span>
              <span className="metric text-lg font-medium">{t[k]}%</span>
              <input type="range" min={0} max={100} value={t[k]} onChange={(e) => setDraft({ ...t, [k]: +e.target.value })} className="col-span-2 accent-[var(--ds-accent)]" aria-label={label} />
            </label>
          ))}
          {!ok && <p className="rounded-xl bg-danger-subtle p-3 text-sm font-bold text-danger" role="alert">Thresholds must decrease: LOW &gt; MEDIUM &gt; HIGH.</p>}
          <div className="flex gap-3">
            <Button disabled={!ok || !draft} onClick={() => { update({ thresholds: t }); setDraft(null); }}>Save thresholds</Button>
            <Button tone="plain" onClick={() => { update({ thresholds: DEFAULT_THRESHOLDS }); setDraft(null); }}>Reset to defaults</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle eyebrow="How fast confidence reacts" title="Confidence smoothing" />
          <label className="grid grid-cols-[1fr_auto] items-center gap-2">
            <span className="font-extrabold">EMA α</span>
            <span className="metric text-lg font-medium">{alpha.toFixed(2)}</span>
            <input type="range" min={0.1} max={0.9} step={0.05} value={alpha} onChange={(e) => update({ emaAlpha: +e.target.value })} className="col-span-2 accent-[var(--ds-accent)]" aria-label="EMA alpha" />
          </label>
          <p className="mt-2 text-sm text-secondary-fg">confidence = α × new score + (1 − α) × previous. Higher α detects takeovers faster but flickers more. The model was evaluated with α = {modelAlpha}.</p>
          {s.emaAlpha !== null && <Button tone="plain" size="sm" className="mt-3" onClick={() => update({ emaAlpha: null })}>Use model default</Button>}
        </Card>
        <Card>
          <CardTitle eyebrow="Where the model runs" title="Inference & capture" />
          <div className="divide-y-2 divide-border">
            <Toggle on={s.inference === "local"} onChange={(v) => update({ inference: v ? "local" : "server" })} label="Process locally" desc="Score in this browser. Off = send the 25 derived features (never keystrokes or text) to /api/predict." />
            <Toggle on={s.monitorEverywhere} onChange={(v) => update({ monitorEverywhere: v })} label="Monitor all typing in KeyDNA" desc="Off = only the typing boxes on Dashboard and Security are analysed." />
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle eyebrow="Optional · responsive web app" title="iPhone companion" />
        {s.companionCode ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="rounded-2xl bg-accent-subtle px-6 py-4 text-center">
              <p className="eyebrow">Pairing code</p>
              <p className="metric text-3xl font-medium tracking-[0.3em] text-primary">{s.companionCode}</p>
            </div>
            <div className="flex-1 text-sm text-secondary-fg">
              <p>On your phone, open <span className="metric break-all text-foreground">{origin}/companion</span> and enter the code. It shows live confidence and can lock this session.</p>
              <p className="mt-1">Status relays every 2 s through this server&apos;s memory (no database). Best on <span className="metric">pnpm dev</span> over your LAN.</p>
            </div>
            <Button tone="plain" onClick={() => update({ companionCode: null })}>Unpair</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-secondary-fg">Pair a phone to receive takeover alerts and remotely lock the session.</p>
            <Button onClick={() => update({ companionCode: newCode() })}><Smartphone className="size-4" aria-hidden /> Pair a phone</Button>
          </div>
        )}
      </Card>

      <Card tone="accent">
        <CardTitle eyebrow="KeyDNA analyses typing behaviour, not what you type" title="Privacy" />
        <ul className="grid gap-3 text-sm sm:grid-cols-2">
          {[
            ["Never stored", "Passwords (password fields are ignored completely), typed text, messages, browser content."],
            ["Captured", "Key-down / key-up times and which hand zone (left, right, space, backspace, enter) — not the character."],
            ["Kept on this device", "Your profile (feature means ± σ), security events, Monkeytype numbers. Nothing is uploaded."],
            ["Limitations", "A risk signal, not a perfect biometric. A skilled attacker might imitate timing; pair it with MFA and device signals."],
          ].map(([k, v]) => (
            <li key={k} className="rounded-xl bg-muted p-3"><p className="font-extrabold">{k}</p><p className="text-secondary-fg">{v}</p></li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle eyebrow="Your data" title="Profile" />
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/enroll" tone="plain">Re-enroll</ButtonLink>
          <Button tone="plain" onClick={exportProfile} disabled={!profile}><Download className="size-4" aria-hidden /> Export profile JSON</Button>
          {confirmWipe ? (
            <Button tone="danger" onClick={() => { wipe(); setConfirmWipe(false); }}><Trash2 className="size-4" aria-hidden /> Confirm: delete everything</Button>
          ) : (
            <Button tone="plain" onClick={() => setConfirmWipe(true)}><Lock className="size-4" aria-hidden /> Delete all KeyDNA data</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
