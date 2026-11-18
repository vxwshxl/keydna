/** /llms.txt — a plain-markdown brief for generative engines (llmstxt.org). Built from live data. */
import metricsJson from "../../../public/model/metrics.json";
import type { Metrics } from "@/lib/keydna/metrics";
import { FAQ, HOW_TO } from "@/lib/faq";
import { SITE } from "@/lib/site";

const m = metricsJson as unknown as Metrics;

export function GET() {
  const top = m.group_importance.slice(0, 5).map((g) => `${g.group} (${(g.importance * 100).toFixed(1)}%)`).join(", ");
  const body = `# ${SITE.name}

> ${SITE.description}

${SITE.academicTitle}. A university AI/ML + cybersecurity project; open source at ${SITE.repo}.

## Key facts
- Category: behavioural biometrics, continuous authentication, session-takeover detection.
- Model: scikit-learn Random Forest (${m.rf_params.n_estimators} trees) used as a user-independent verifier on per-feature σ-distances between a ${m.config.window_size}-keystroke window and an enrolled profile; outputs P(same person).
- Features: ${m.n_features} timing features per window — key hold, inter-key interval, rhythm, rollover, pauses and bursts, hand transitions, corrections, WPM.
- Most important behaviours: ${top}.
- Evaluation (${m.dataset.kind}, ${m.dataset.users} typists, leave-users-out CV${m.preliminary ? ", preliminary" : ""}): EER ${(m.evaluation.rf.eer * 100).toFixed(1)}%, ROC AUC ${m.evaluation.rf.auc.toFixed(3)}; scaled-Manhattan baseline EER ${(m.evaluation.baseline_scaled_manhattan.eer * 100).toFixed(1)}%.
- Privacy: records only key timing and hand zone, never characters; password fields ignored; inference runs in the browser by default.
- Limitation: a risk signal to layer with passwords/MFA, not a perfect biometric.

## How it works
${HOW_TO.map((s, i) => `${i + 1}. **${s.name}** — ${s.text}`).join("\n")}

## Pages
- [Home](${SITE.url}/): overview of the problem and approach
- [Attack simulation](${SITE.url}/security?demo=1): live takeover demo with real model output on synthetic typists
- [Model performance](${SITE.url}/model): accuracy, precision, recall, F1, ROC, FAR/FRR/EER, confusion matrix, feature importance
- [Enroll](${SITE.url}/enroll): build a typing profile in about a minute
- [Source code](${SITE.repo}): Next.js app + Python training pipeline

## FAQ
${FAQ.map((f) => `### ${f.q}\n${f.a}`).join("\n\n")}
`;
  return new Response(body, { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
