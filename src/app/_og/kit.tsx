/**
 * Shared Open Graph banner kit (1200×630). Satori (next/og) supports a CSS subset and
 * static fonts only, so colours are literal here — this mirrors tokens.css, it is not
 * feature code.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const C = {
  canvas: "#F6F7F9",
  card: "#FFFFFF",
  ink: "#1B1F27",
  ink2: "#545B6A",
  ink3: "#7F8695",
  line: "#E3E6EB",
  blue: "#1672D1",
  blueLip: "#0E559E",
  blueWash: "#E8F2FD",
  violet: "#6F4EF0",
  violetLip: "#4F31C4",
  violetWash: "#F1EDFE",
  green: "#1E9650",
  greenLip: "#157339",
  greenWash: "#E6F6EC",
  red: "#D93A3F",
  redLip: "#A82A2E",
  redWash: "#FDECEC",
  amber: "#F2A100",
} as const;

export async function fonts() {
  const [black, bold, mono] = await Promise.all([
    readFile(join(process.cwd(), "src/app/_og/Nunito-Black.ttf")),
    readFile(join(process.cwd(), "src/app/_og/Nunito-Bold.ttf")),
    readFile(join(process.cwd(), "src/app/_og/GeistMono-Medium.ttf")),
  ]);
  return [
    { name: "Nunito", data: black, weight: 900 as const, style: "normal" as const },
    { name: "Nunito", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Geist Mono", data: mono, weight: 500 as const, style: "normal" as const },
  ];
}

export function Mark({ s = 64 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 40 40">
      <rect x="2" y="6" width="36" height="32" rx="9" fill={C.blueLip} />
      <rect x="2" y="2" width="36" height="32" rx="9" fill={C.blue} />
      <path d="M14.5 10.5h11M14.5 25.5h11" stroke="#fff" strokeOpacity=".55" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M13 8c0 5 14 5 14 10s-14 5-14 10M27 8c0 5-14 5-14 10s14 5 14 10" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Wordmark({ s = 40 }: { s?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <Mark s={s * 1.4} />
      <div style={{ display: "flex", fontSize: s, fontWeight: 900, letterSpacing: -1, color: C.ink }}>
        Key<span style={{ color: C.violet }}>DNA</span>
      </div>
    </div>
  );
}

export function Pill({ children, fg, bg }: { children: ReactNode; fg: string; bg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 18px", borderRadius: 999, background: bg, color: fg, fontFamily: "Geist Mono", fontSize: 20, letterSpacing: 2 }}>
      {children}
    </div>
  );
}

/** Chunky card with the 3D lip, like .card3d. */
export function Card({ children, edge = C.line, lip = C.line, style }: { children: ReactNode; edge?: string; lip?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", background: C.card, borderRadius: 28, border: `3px solid ${edge}`, boxShadow: `0 8px 0 0 ${lip}`, padding: 32, ...style }}>
      {children}
    </div>
  );
}

/** Page frame: grid canvas, wordmark, URL footer. */
export function Frame({ children, eyebrow }: { children: ReactNode; eyebrow: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "48px 64px",
        background: C.canvas,
        backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        fontFamily: "Nunito",
        color: C.ink,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Wordmark s={36} />
        <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: 20, letterSpacing: 3, color: C.ink3 }}>{eyebrow}</div>
      </div>
      <div style={{ display: "flex", flex: 1, marginTop: 28 }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Geist Mono", fontSize: 20, color: C.ink3 }}>
        <span>keydna.vercel.app</span>
        <span>Continuous authentication · keystroke dynamics · ML</span>
      </div>
    </div>
  );
}

/** Keystroke bars — heights are hold durations, colour is the hand. */
export function Bars({ holds, h = 120 }: { holds: { ms: number; zone: string }[]; h?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: h, width: "100%" }}>
      {holds.map((k, i) => (
        <div key={i} style={{ flex: 1, height: Math.max(12, Math.min(h, k.ms * 0.9)), borderRadius: 7, background: k.zone === "R" ? C.violet : k.zone === "S" ? "#0BA5C4" : C.blue }} />
      ))}
    </div>
  );
}
