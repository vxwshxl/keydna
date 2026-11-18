"use client";
import { CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import type { Thresholds, WindowScore } from "@/lib/keydna/engine";

/**
 * Line = displayed identity confidence (EMA of model output).
 * Dots = raw model P(genuine) for each 60-key window. Bands = your risk thresholds.
 */
export function ConfidenceChart({ scores, thresholds, height = 260 }: { scores: WindowScore[]; thresholds: Thresholds; height?: number }) {
  const data = scores.map((s) => ({ keys: s.keys, confidence: +s.confidence.toFixed(2), raw: +(s.raw * 100).toFixed(2) }));
  return (
    <div style={{ height }} className="w-full" role="img" aria-label={`Identity confidence over the last ${data.length} windows`}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
          <ReferenceArea y1={thresholds.low} y2={100} fill="var(--ds-success-face)" fillOpacity={0.07} />
          <ReferenceArea y1={thresholds.medium} y2={thresholds.low} fill="var(--ds-warning-face)" fillOpacity={0.08} />
          <ReferenceArea y1={thresholds.high} y2={thresholds.medium} fill="var(--ds-danger)" fillOpacity={0.06} />
          <ReferenceArea y1={0} y2={thresholds.high} fill="var(--ds-danger)" fillOpacity={0.12} />
          <CartesianGrid stroke="var(--ds-border)" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="keys" type="number" domain={["dataMin", "dataMax"]} tick={{ fontSize: 11, fill: "var(--ds-fg-muted)", fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={{ stroke: "var(--ds-border-strong)" }} label={{ value: "keystrokes", position: "insideBottomRight", offset: -2, fontSize: 11, fill: "var(--ds-fg-muted)" }} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: "var(--ds-fg-muted)", fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} />
          <ReferenceLine y={thresholds.high} stroke="var(--ds-danger)" strokeDasharray="4 4" label={{ value: "critical", position: "insideTopLeft", fontSize: 10, fill: "var(--ds-danger)" }} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "2px solid var(--ds-border)", fontFamily: "var(--font-mono)", fontSize: 12 }}
            labelFormatter={(k) => `after ${k} keystrokes`}
            formatter={(v, n) => [`${Number(v).toFixed(1)}%`, n === "confidence" ? "Identity confidence (EMA)" : "Model P(genuine)"]}
          />
          <Scatter dataKey="raw" fill="var(--ds-dna)" fillOpacity={0.55} isAnimationActive={false} />
          <Line dataKey="confidence" type="monotone" stroke="var(--ds-accent)" strokeWidth={3} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-secondary-fg">
      <span className="inline-flex items-center gap-2"><span className="h-1 w-5 rounded-full bg-primary" /> Identity confidence (EMA, displayed)</span>
      <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-dna opacity-60" /> Model output P(genuine), per window</span>
      <span className="inline-flex items-center gap-2"><span className="h-3 w-5 rounded bg-danger-subtle" /> Risk bands (your thresholds)</span>
    </div>
  );
}

