"use client";
import { CartesianGrid, Legend, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RocPoint } from "@/lib/keydna/metrics";

const axis = { fontSize: 11, fill: "var(--ds-fg-muted)", fontFamily: "var(--font-mono)" };
const tip = { borderRadius: 12, border: "2px solid var(--ds-border)", fontFamily: "var(--font-mono)", fontSize: 12 };

export function RocChart({ rf, base, eer }: { rf: RocPoint[]; base: RocPoint[]; eer: number }) {
  const merged = [
    ...rf.map((p) => ({ fpr: p.fpr, rf: p.tpr })),
    ...base.map((p) => ({ fpr: p.fpr, base: p.tpr })),
    { fpr: 0, chance: 0 },
    { fpr: 1, chance: 1 },
  ].sort((a, b) => a.fpr - b.fpr);
  return (
    <div className="h-72 w-full" role="img" aria-label="ROC curves for the Random Forest verifier and the scaled-Manhattan baseline">
      <ResponsiveContainer>
        <LineChart data={merged} margin={{ top: 8, right: 16, bottom: 18, left: -8 }}>
          <CartesianGrid stroke="var(--ds-border)" strokeDasharray="3 5" />
          <XAxis dataKey="fpr" type="number" domain={[0, 1]} tick={axis} label={{ value: "False acceptance rate (FPR)", position: "insideBottom", offset: -10, fontSize: 11, fill: "var(--ds-fg-secondary)" }} />
          <YAxis type="number" domain={[0, 1]} tick={axis} label={{ value: "True acceptance (TPR)", angle: -90, position: "insideLeft", offset: 18, fontSize: 11, fill: "var(--ds-fg-secondary)" }} />
          <Tooltip contentStyle={tip} formatter={(v) => Number(v).toFixed(3)} labelFormatter={(v) => `FPR ${Number(v).toFixed(3)}`} />
          <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
          <Line name="Random Forest" dataKey="rf" stroke="var(--ds-accent)" strokeWidth={3} dot={false} connectNulls isAnimationActive={false} />
          <Line name="Scaled Manhattan baseline" dataKey="base" stroke="var(--ds-dna)" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls isAnimationActive={false} />
          <Line name="Chance" dataKey="chance" stroke="var(--ds-border-strong)" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} legendType="none" />
          <ReferenceDot x={eer} y={1 - eer} r={5} fill="var(--ds-danger)" stroke="none" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** FAR and FRR as the decision threshold moves; they cross at the EER. */
export function ErrorRateChart({ rf, eerThreshold }: { rf: RocPoint[]; eerThreshold: number }) {
  const data = rf
    .filter((p) => p.threshold <= 1)
    .map((p) => ({ t: p.threshold, far: p.fpr * 100, frr: (1 - p.tpr) * 100 }))
    .sort((a, b) => a.t - b.t);
  return (
    <div className="h-72 w-full" role="img" aria-label="False acceptance and false rejection rate against decision threshold">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 18, left: -8 }}>
          <CartesianGrid stroke="var(--ds-border)" strokeDasharray="3 5" />
          <XAxis dataKey="t" type="number" domain={[0, 1]} tick={axis} label={{ value: "Decision threshold on P(genuine)", position: "insideBottom", offset: -10, fontSize: 11, fill: "var(--ds-fg-secondary)" }} />
          <YAxis tick={axis} unit="%" />
          <Tooltip contentStyle={tip} formatter={(v) => `${Number(v).toFixed(1)}%`} labelFormatter={(v) => `threshold ${Number(v).toFixed(3)}`} />
          <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
          <Line name="FAR — impostor accepted" dataKey="far" stroke="var(--ds-danger)" strokeWidth={3} dot={false} isAnimationActive={false} />
          <Line name="FRR — genuine user rejected" dataKey="frr" stroke="var(--ds-accent)" strokeWidth={3} dot={false} isAnimationActive={false} />
          <ReferenceDot x={eerThreshold} y={data.find((d) => d.t >= eerThreshold)?.far ?? 0} r={5} fill="var(--ds-fg)" stroke="none" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
