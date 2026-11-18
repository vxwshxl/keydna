"use client";
/**
 * Hero keystroke visual. Idle: a gentle waveform. Once you type anywhere on the page it
 * shows your real key holds and intervals — capture only, no model, no stored data.
 */
import { useEffect, useState } from "react";
import { startCapture } from "@/lib/keydna/capture";
import type { KeyEvent } from "@/lib/keydna/features";
import { cn } from "@/lib/utils";

const IDLE = Array.from({ length: 28 }, (_, i) => 18 + Math.round(14 * Math.sin(i / 2.2) + 8 * Math.sin(i / 0.9)));

export function HeroVisual() {
  const [evs, setEvs] = useState<KeyEvent[]>([]);
  useEffect(() => startCapture(window, { onEvent: (e) => setEvs((a) => [...a, e].slice(-28)) }), []);
  const live = evs.length > 0;
  const last = evs.at(-1);
  const prev = evs.at(-2);
  const bars = live ? evs.map((e) => Math.max(8, Math.min(64, (e[1] - e[0]) / 2.2))) : IDLE;

  return (
    <div className="card3d relative overflow-hidden p-6" data-tone="accent">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="metric text-xs font-medium tracking-[0.2em]">KEYDNA</p>
          <span className="inline-flex items-center gap-2 rounded-full bg-success-subtle px-3 py-1 text-xs font-extrabold text-success">
            <span className="live-dot" aria-hidden /> PROTECTED
          </span>
        </div>
        <p className="metric mt-1 text-[11px] tracking-[0.18em] text-secondary-fg">CONTINUOUS AUTHENTICATION</p>
        <div className="mt-6 flex h-20 items-end gap-1.5" aria-hidden>
          {bars.map((h, i) => (
            <div
              key={live ? i + evs.length * 100 : i}
              className={cn("flex-1 rounded-md", live ? "anim-key" : "anim-bob", live && evs[i]?.[2] === "R" ? "bg-dna" : live && evs[i]?.[2] === "B" ? "bg-danger" : "bg-primary")}
              style={{ height: h, animationDelay: live ? undefined : `${i * 60}ms`, opacity: live ? 1 : 0.35 + (i / bars.length) * 0.65 }}
            />
          ))}
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-2">
          {[
            ["HOLD", last ? `${Math.round(last[1] - last[0])} ms` : "—"],
            ["INTERVAL", last && prev ? `${Math.round(last[0] - prev[0])} ms` : "—"],
            ["KEYS", live ? String(evs.length === 28 ? "28+" : evs.length) : "0"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-elevated px-3 py-2 shadow-[inset_0_0_0_2px_var(--ds-surface-lip)]">
              <dt className="eyebrow">{k}</dt>
              <dd className="metric text-sm font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-center text-sm font-bold text-secondary-fg">{live ? "That's your rhythm. Blue: left hand · violet: right hand." : "Type anything on this page to see your keystroke rhythm."}</p>
      </div>
    </div>
  );
}
