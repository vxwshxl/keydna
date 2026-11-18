"use client";
import { Laptop, Lock, Radio } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { RISK_STYLE } from "@/components/ui/risk";
import { useMounted } from "@/hooks/use-mounted";
import { useKeyDNA, useLive } from "@/lib/store";

export function SessionBar() {
  const mounted = useMounted();
  const profile = useKeyDNA((s) => s.profile);
  const status = useLive((s) => s.status);
  const risk = useLive((s) => s.current?.risk ?? null);
  const replay = useLive((s) => s.replayLabel);

  const label = !mounted
    ? "Loading…"
    : !profile
      ? "Not enrolled"
      : status === "locked"
        ? "Session locked"
        : status === "collecting"
          ? "Collecting keystrokes"
          : risk === "CRITICAL" || risk === "HIGH"
            ? "Session at risk"
            : "Protected session";
  const dot = status === "locked" ? "var(--ds-danger)" : risk ? RISK_STYLE[risk].dot : "var(--ds-fg-muted)";

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b-2 border-border bg-elevated/90 px-4 backdrop-blur sm:px-6">
      <Link href="/" className="lg:hidden" aria-label="KeyDNA home">
        <LogoMark className="size-8" />
      </Link>
      <div className="flex min-w-0 items-center gap-3">
        {status === "locked" ? <Lock className="size-4 text-danger" aria-hidden /> : <span className="live-dot" style={{ ["--dot" as string]: dot }} aria-hidden />}
        <span className="truncate text-sm font-extrabold tracking-wide uppercase">{label}</span>
      </div>
      {mounted && profile && (
        <div className="ml-auto flex min-w-0 items-center gap-2 text-sm font-bold text-secondary-fg">
          {replay && (
            <span className="hidden items-center gap-1 rounded-full bg-dna-subtle px-2.5 py-1 text-xs font-extrabold text-dna sm:inline-flex">
              <Radio className="size-3.5" aria-hidden /> Replaying: {replay}
            </span>
          )}
          <span className="truncate">{profile.name}</span>
          <span aria-hidden>·</span>
          <span className="hidden items-center gap-1 truncate sm:inline-flex">
            <Laptop className="size-4" aria-hidden /> {profile.device}
          </span>
          {profile.demo && <span className="rounded-md bg-warning-subtle px-2 py-0.5 text-[11px] font-extrabold text-warning-ink uppercase">Demo data</span>}
        </div>
      )}
    </header>
  );
}
