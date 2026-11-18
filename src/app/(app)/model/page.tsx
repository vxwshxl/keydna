import { FlaskConical, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { Card, CardTitle } from "@/components/ui/card";
import type { Metrics } from "@/lib/keydna/metrics";
import { cn } from "@/lib/utils";
import metricsJson from "../../../../public/model/metrics.json";
import { ErrorRateChart, RocChart } from "./charts";

export const metadata: Metadata = { title: "Model performance" };

const m = metricsJson as unknown as Metrics;
const p = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;

const EXPLAIN: { key: string; label: string; value: string; text: string }[] = (() => {
  const r = m.evaluation.rf.at_0_5;
  return [
    { key: "acc", label: "Accuracy", value: p(r.accuracy), text: "Share of all test windows the verifier labelled correctly (genuine or impostor)." },
    { key: "prec", label: "Precision", value: p(r.precision), text: "When KeyDNA says “this is the enrolled user”, how often it is right." },
    { key: "rec", label: "Recall", value: p(r.recall), text: "Of the enrolled user’s own windows, how many it recognised." },
    { key: "f1", label: "F1 score", value: p(r.f1), text: "Harmonic mean of precision and recall — one balanced number." },
    { key: "far", label: "False acceptance (FAR)", value: p(r.far), text: "How often the system incorrectly accepts an unauthorised user." },
    { key: "frr", label: "False rejection (FRR)", value: p(r.frr), text: "How often the system incorrectly rejects the legitimate user." },
    { key: "eer", label: "Equal error rate (EER)", value: p(m.evaluation.rf.eer), text: `The threshold where FAR = FRR (P = ${m.evaluation.rf.eer_threshold.toFixed(3)}). Lower is better; the standard single number for biometrics.` },
    { key: "auc", label: "ROC AUC", value: m.evaluation.rf.auc.toFixed(3), text: "Probability a random genuine window scores higher than a random impostor window." },
  ];
})();

export default function ModelPage() {
  const ev = m.evaluation;
  const c = ev.rf.at_0_5.confusion;
  const synthetic = m.dataset.kind !== "real";
  const maxGroup = Math.max(...m.group_importance.map((g) => g.importance));
  const maxFeat = Math.max(...m.feature_importance.map((f) => f.importance));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="eyebrow">Evaluation & explainability</p>
        <h1 className="text-3xl font-black tracking-tight">Model performance</h1>
      </div>

      <div className={cn("card3d flex gap-4 p-5", synthetic ? "" : "")} data-tone={synthetic ? "warning" : "success"} role="note">
        {synthetic ? <TriangleAlert className="size-6 shrink-0 text-warning" aria-hidden /> : <FlaskConical className="size-6 shrink-0 text-success" aria-hidden />}
        <div>
          <p className="font-extrabold">
            {m.preliminary ? "Preliminary evaluation" : "Evaluation"} · dataset: {synthetic ? "SYNTHETIC DEMO DATA" : "real collected typing"}
            {m.dataset.kind === "combined" && " + synthetic"}
          </p>
          <p className="text-sm text-secondary-fg">
            {synthetic
              ? "These numbers come from generated typists (ml/generate_demo_data.py) and show the pipeline works end to end. They are not evidence about real people. Record participants at /collect and run `pnpm ml:train --data real` to replace them."
              : `Computed from ${m.dataset.users} real participants.`}{" "}
            Generated {new Date(m.generated_at).toLocaleString()} by ml/train.py — nothing on this page is typed by hand.
          </p>
        </div>
      </div>

      <Card>
        <CardTitle eyebrow="How it was tested" title="Leave-users-out cross-validation" />
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-secondary-fg">
            <li><b className="text-foreground">Verifier, not identifier.</b> The Random Forest scores the distance between a 60-key window and an enrolled profile: P(same person).</li>
            <li><b className="text-foreground">No leakage by user.</b> {ev.folds} folds; test typists are never seen in training — just like a new person enrolling.</li>
            <li><b className="text-foreground">No leakage by session.</b> Each typist enrolls on their first {m.config.enroll_keys} keystrokes; only <i>later sessions</i> are scored. The rest of the enrollment session is discarded.</li>
          </ul>
          <dl className="grid grid-cols-2 gap-3">
            {[
              ["Typists", m.dataset.users],
              ["Sessions", m.dataset.sessions],
              ["Keystrokes", m.dataset.keystrokes.toLocaleString()],
              ["Test pairs", ev.test_pairs.toLocaleString()],
              ["Features", m.n_features],
              ["Trees", m.rf_params.n_estimators],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-muted p-3">
                <dt className="eyebrow">{k}</dt>
                <dd className="metric text-xl font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {EXPLAIN.map((x) => (
          <div key={x.key} className="card3d p-4" data-tone={x.key === "eer" ? "accent" : undefined}>
            <p className="eyebrow">{x.label}</p>
            <p className="metric mt-1 text-3xl font-medium">{x.value}</p>
            <p className="mt-2 text-xs font-bold text-secondary-fg">{x.text}</p>
          </div>
        ))}
      </div>
      <p className="-mt-2 text-xs font-bold text-secondary-fg">Accuracy, precision, recall, F1, FAR and FRR at the fixed decision threshold P(genuine) ≥ 0.5, chosen before evaluation.</p>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle eyebrow={`Random Forest AUC ${ev.rf.auc.toFixed(3)} · baseline ${ev.baseline_scaled_manhattan.auc.toFixed(3)}`} title="ROC curve" />
          <RocChart rf={ev.rf.roc} base={ev.baseline_scaled_manhattan.roc} eer={ev.rf.eer} />
          <p className="mt-2 text-xs font-bold text-secondary-fg">
            Baseline: scaled-Manhattan anomaly detector (mean σ-distance), the classic keystroke-dynamics reference. EER {p(ev.baseline_scaled_manhattan.eer)} vs Random Forest {p(ev.rf.eer)}.
          </p>
        </Card>
        <Card>
          <CardTitle eyebrow={`EER ${p(ev.rf.eer)} at threshold ${ev.rf.eer_threshold.toFixed(3)}`} title="FAR vs FRR trade-off" />
          <ErrorRateChart rf={ev.rf.roc} eerThreshold={ev.rf.eer_threshold} />
          <p className="mt-2 text-xs font-bold text-secondary-fg">Raise the threshold and fewer impostors get in (FAR ↓) but the real user is challenged more often (FRR ↑).</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardTitle eyebrow="Threshold 0.5, all test windows" title="Confusion matrix" />
          <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-center text-sm">
            <span />
            <span className="eyebrow self-end">Predicted genuine</span>
            <span className="eyebrow self-end">Predicted impostor</span>
            <span className="eyebrow self-center [writing-mode:vertical-rl] rotate-180">Genuine</span>
            <Cell n={c.tp} label="True accept" good />
            <Cell n={c.fn} label="False reject (FRR)" />
            <span className="eyebrow self-center [writing-mode:vertical-rl] rotate-180">Impostor</span>
            <Cell n={c.fp} label="False accept (FAR)" />
            <Cell n={c.tn} label="True reject" good />
          </div>
        </Card>
        <Card>
          <CardTitle eyebrow={`Replays whole unseen sessions with EMA α = ${ev.continuous.ema_alpha}, like the dashboard`} title="Continuous takeover detection" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Big label="Takeovers detected" value={p(ev.continuous.impostor_detection_rate)} note={`of ${ev.continuous.impostor_sessions} impostor sessions reached confidence < ${ev.continuous.critical_threshold * 100}%`} />
            <Big label="Median time to detect" value={ev.continuous.median_keystrokes_to_detect === null ? "—" : `${ev.continuous.median_keystrokes_to_detect} keys`} note="keystrokes after the attacker starts, including the first 60-key window" />
            <Big label="Genuine false alarms" value={p(ev.continuous.genuine_false_alarm_rate)} note={`of ${ev.continuous.genuine_sessions} genuine sessions ever hit the critical level`} />
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle eyebrow="Mean decrease in impurity, from the trained forest" title="Feature importance" />
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-extrabold">By behaviour</p>
            <ul className="flex flex-col gap-3">
              {m.group_importance.map((g) => (
                <Bar key={g.group} label={g.group} value={g.importance} max={maxGroup} tone="var(--ds-dna)" />
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-extrabold">Top individual features</p>
            <ul className="flex flex-col gap-3">
              {m.feature_importance.slice(0, 10).map((f) => (
                <Bar key={f.name} label={f.label} value={f.importance} max={maxFeat} tone="var(--ds-accent)" />
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs font-bold text-secondary-fg">
          Each feature is the σ-distance between a window and the profile, so importance means “how useful a deviation in this behaviour is for telling people apart”. Impurity importance can favour correlated features; treat it as a ranking, not a causal claim.
          {synthetic && " On synthetic data, importances reflect how the simulator varies typists."}
        </p>
      </Card>

      <Card>
        <CardTitle eyebrow="Reproduce it" title="Model card" />
        <div className="grid gap-4 sm:grid-cols-2">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="font-extrabold">Model</dt><dd className="text-secondary-fg">{m.model}</dd>
            <dt className="font-extrabold">Version</dt><dd className="metric">{m.model_version}</dd>
            <dt className="font-extrabold">Dataset</dt><dd className="metric">{m.dataset.kind} · {m.dataset.version}</dd>
            <dt className="font-extrabold">Params</dt><dd className="metric text-xs">{Object.entries(m.rf_params).map(([k, v]) => `${k}=${v}`).join(", ")}</dd>
            <dt className="font-extrabold">Window</dt><dd className="metric">{m.config.window_size} keys · live stride {m.config.live_stride}</dd>
          </dl>
          <pre className="overflow-x-auto rounded-xl bg-muted p-4 font-mono text-xs leading-6">
{`pnpm ml:data           # synthetic demo typists
pnpm ml:train          # train + evaluate + export
pnpm ml:train --data real   # your /collect sessions
pnpm test              # TS ↔ sklearn parity`}
          </pre>
        </div>
      </Card>
    </div>
  );
}

function Cell({ n, label, good }: { n: number; label: string; good?: boolean }) {
  return (
    <div className={cn("rounded-xl p-4", good ? "bg-success-subtle" : "bg-danger-subtle")}>
      <p className={cn("metric text-2xl font-medium", good ? "text-success" : "text-danger")}>{n.toLocaleString()}</p>
      <p className="text-xs font-bold text-secondary-fg">{label}</p>
    </div>
  );
}

function Big({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl bg-muted p-4">
      <p className="eyebrow">{label}</p>
      <p className="metric text-2xl font-medium">{value}</p>
      <p className="mt-1 text-xs font-bold text-secondary-fg">{note}</p>
    </div>
  );
}

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  return (
    <li>
      <div className="mb-1 flex justify-between gap-3 text-sm font-bold">
        <span>{label}</span>
        <span className="metric font-medium">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="track !h-3">
        <div className="fill" style={{ transform: `scaleX(${value / max})`, ["--fill" as string]: tone }} />
      </div>
    </li>
  );
}
