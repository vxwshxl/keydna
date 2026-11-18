"use client";
import { Laptop, Lock, ShieldCheck, TriangleAlert, WifiOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { RiskPill } from "@/components/ui/risk";
import type { Risk } from "@/lib/keydna/engine";
import { cn } from "@/lib/utils";

interface Status {
  name: string;
  device: string;
  status: string;
  confidence: number | null;
  risk: Risk | null;
  alert: boolean;
  demo: boolean;
}

export function Companion() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get("code")?.toUpperCase() ?? null;
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [sentAt, setSentAt] = useState<number | null>(null);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(`/api/companion/${code}`, { cache: "no-store" });
        const b = (await r.json()) as { status: Status | null; updatedAt: number | null };
        if (!alive) return;
        setStatus(b.status);
        setUpdatedAt(b.updatedAt);
      } catch {
        /* keep last state */
      }
      setNow(Date.now());
    };
    void poll();
    const id = setInterval(poll, 1500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [code]);

  const lock = async () => {
    await fetch(`/api/companion/${code}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "command", command: "lock" }) });
    setSentAt(Date.now());
  };

  if (!code)
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
        <Logo className="self-center" />
        <div className="card3d p-6">
          <h1 className="text-xl font-black">Pair with your laptop</h1>
          <p className="mt-1 text-sm text-secondary-fg">On the laptop: Settings → iPhone companion → Pair a phone.</p>
          <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); router.push(`/companion?code=${input.trim().toUpperCase()}`); }}>
            <input className="field metric text-center text-2xl tracking-[0.3em] uppercase" value={input} onChange={(e) => setInput(e.target.value)} maxLength={6} placeholder="CODE" aria-label="Pairing code" autoCapitalize="characters" />
            <Button type="submit" size="lg" disabled={input.trim().length !== 6}>Pair</Button>
          </form>
        </div>
      </main>
    );

  const stale = !updatedAt || now - updatedAt > 8000;
  const alert = !!status && !stale && (status.alert || status.risk === "CRITICAL");
  const locked = status?.status === "locked";
  const sent = sentAt !== null && now - sentAt < 6000;

  return (
    <main className={cn("flex min-h-dvh flex-col p-6 transition-colors duration-200", alert ? "bg-danger-subtle" : "bg-subtle")}>
      <header className="flex items-center justify-between">
        <Logo />
        <span className="metric rounded-lg bg-muted px-2 py-1 text-xs">{code}</span>
      </header>

      <div className="flex flex-1 flex-col justify-center gap-5 py-8">
        {stale ? (
          <div className="card3d p-6 text-center">
            <WifiOff className="mx-auto size-10 text-secondary-fg" aria-hidden />
            <p className="mt-3 text-lg font-black">Waiting for the laptop…</p>
            <p className="text-sm text-secondary-fg">Keep KeyDNA open on the paired computer.</p>
          </div>
        ) : alert ? (
          <div className="card3d anim-shake p-6 text-center" data-tone="danger" role="alert">
            <TriangleAlert className="mx-auto size-12 text-danger" aria-hidden />
            <p className="eyebrow mt-3 !text-danger">KeyDNA security alert</p>
            <h1 className="text-2xl font-black">Behavioural anomaly detected</h1>
            <p className="mt-4 eyebrow">Confidence</p>
            <p className="metric text-5xl font-medium text-danger">{status!.confidence?.toFixed(0)}%</p>
            <Button tone="danger" size="lg" className="mt-6 w-full" onClick={lock} disabled={sent || locked}>
              <Lock className="size-5" aria-hidden /> {locked ? "Session locked" : sent ? "Locking…" : "Lock session"}
            </Button>
          </div>
        ) : (
          <div className="card3d p-6" data-tone={locked ? "danger" : "accent"}>
            <p className="eyebrow">KeyDNA</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-black"><Laptop className="size-5" aria-hidden /> {status!.device}</p>
            <p className="eyebrow mt-5">Session</p>
            <p className={cn("flex items-center gap-2 text-2xl font-black", locked ? "text-danger" : "text-success")}>
              {locked ? <Lock className="size-6" aria-hidden /> : <ShieldCheck className="size-6" aria-hidden />} {locked ? "Locked" : status!.status === "collecting" ? "Collecting" : "Protected"}
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-4">
              <div><dt className="eyebrow">Identity</dt><dd className="font-extrabold">{status!.name}</dd></div>
              <div><dt className="eyebrow">Confidence</dt><dd className="metric text-2xl font-medium">{status!.confidence === null ? "—" : `${status!.confidence.toFixed(0)}%`}</dd></div>
              <div className="col-span-2"><dt className="eyebrow mb-1">Risk</dt><dd>{status!.risk ? <RiskPill risk={status!.risk} /> : "—"}</dd></div>
            </dl>
            {status!.demo && <p className="mt-4 text-xs font-bold text-warning-ink">Demo profile — synthetic data</p>}
          </div>
        )}
      </div>
      <p className="text-center text-xs font-bold text-secondary-fg">Add to Home Screen for a full-screen companion.</p>
    </main>
  );
}
