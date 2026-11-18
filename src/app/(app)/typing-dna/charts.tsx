"use client";
import { CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ProfileRadar({ data }: { data: { axis: string; value: number }[] }) {
  return (
    <div className="h-80 w-full" role="img" aria-label={`Behavioural profile radar: ${data.map((d) => `${d.axis} ${d.value.toFixed(0)}`).join(", ")}`}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--ds-border-strong)" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fontWeight: 800, fill: "var(--ds-fg)" }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke="var(--ds-dna)" strokeWidth={3} fill="var(--ds-dna)" fillOpacity={0.22} isAnimationActive={false} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HistoryChart({ data }: { data: { at: number; wpm: number; acc: number }[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Monkeytype WPM history">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
          <CartesianGrid stroke="var(--ds-border)" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="at" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })} tick={{ fontSize: 11, fill: "var(--ds-fg-muted)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--ds-fg-muted)", fontFamily: "var(--font-mono)" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "2px solid var(--ds-border)", fontSize: 12 }} labelFormatter={(t) => new Date(Number(t)).toLocaleString()} formatter={(v, n) => [Number(v).toFixed(1), n === "wpm" ? "WPM" : "Accuracy %"]} />
          <Line dataKey="wpm" stroke="var(--ds-accent)" strokeWidth={2.5} dot={{ r: 2.5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
