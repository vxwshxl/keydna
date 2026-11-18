/**
 * One FAQ, three consumers: the visible landing-page section, FAQPage JSON-LD (answer engines)
 * and /llms.txt (generative engines). Numbers come from metrics.json, never typed by hand.
 */
import metricsJson from "../../public/model/metrics.json";
import type { Metrics } from "./keydna/metrics";

const m = metricsJson as unknown as Metrics;
const p = (v: number) => `${(v * 100).toFixed(1)}%`;
const synthetic = m.dataset.kind !== "real";

export const FAQ: { q: string; a: string }[] = [
  {
    q: "What is KeyDNA?",
    a: "KeyDNA is a machine-learning-based continuous authentication system. Instead of checking identity only at login, it keeps verifying that the person typing is the person who logged in, by comparing their keystroke timing — key hold duration, inter-key intervals, rhythm, pauses and corrections — against an enrolled behavioural profile.",
  },
  {
    q: "What is keystroke dynamics?",
    a: "Keystroke dynamics is a behavioural biometric: the measurable way a person types. It uses timing — how long each key is held (dwell time), the gap between keys (flight time), rhythm and correction habits — rather than what is typed.",
  },
  {
    q: "What is continuous authentication?",
    a: "Continuous authentication re-verifies a user throughout a session instead of once at login. It targets the post-login gap: stolen sessions, unattended unlocked computers, account sharing and insider misuse.",
  },
  {
    q: "How does KeyDNA detect a session takeover?",
    a: "Every 15 keystrokes it scores the latest 60-keystroke window. 25 timing features are compared with your profile, a Random Forest outputs the probability that the same person is typing, an exponential moving average smooths that into an identity-confidence score, and configurable thresholds turn it into LOW, MEDIUM, HIGH or CRITICAL risk. Crossing into CRITICAL raises a “possible session takeover” alert with re-authenticate and lock options.",
  },
  {
    q: "Why not just use typing speed (WPM)?",
    a: "WPM measures performance, not identity. Two people can share a WPM and still have very different hold times, rhythm, pauses and corrections. In KeyDNA's trained model, WPM carries well under 1% of feature importance.",
  },
  {
    q: "Does KeyDNA record what I type?",
    a: "No. It records only key-down and key-up timestamps and which hand zone a key belongs to (left, right, space, backspace, enter) — never the character. Password fields are ignored completely, and by default the model runs in your browser, so keystrokes never leave the device.",
  },
  {
    q: "How accurate is it?",
    a: `On ${synthetic ? "a synthetic demo dataset" : "collected data"} of ${m.dataset.users} typists, evaluated with leave-users-out cross-validation, the Random Forest verifier reaches an equal error rate of ${p(m.evaluation.rf.eer)} (ROC AUC ${m.evaluation.rf.auc.toFixed(3)}), versus ${p(m.evaluation.baseline_scaled_manhattan.eer)} for the classic scaled-Manhattan baseline. In continuous replay it flagged ${p(m.evaluation.continuous.impostor_detection_rate)} of takeovers${m.evaluation.continuous.median_keystrokes_to_detect ? ` after a median of ${m.evaluation.continuous.median_keystrokes_to_detect} keystrokes` : ""}.${synthetic ? " These are preliminary results on generated typists, not evidence about real people." : ""}`,
  },
  {
    q: "What do FAR, FRR and EER mean?",
    a: "False Acceptance Rate (FAR) is how often an impostor is wrongly accepted. False Rejection Rate (FRR) is how often the real user is wrongly rejected. Moving the decision threshold trades one for the other; the Equal Error Rate (EER) is the point where they are equal — the standard single-number summary for biometric systems.",
  },
  {
    q: "Can an attacker spoof typing behaviour?",
    a: "Potentially. No behavioural biometric is perfect, and a knowledgeable attacker could try to imitate someone's rhythm. KeyDNA is designed as a continuous risk signal to layer on top of passwords, MFA and device or context signals — not as a replacement for them.",
  },
  {
    q: "How does Monkeytype fit in?",
    a: "Monkeytype history is an optional enrollment data source. Imported tests (speed, accuracy, consistency, key spacing and key duration statistics) form a historical baseline; the live model scores fine-grained windows captured during a one-minute calibration.",
  },
  {
    q: "Is KeyDNA open source?",
    a: "Yes — the web app, the Python training pipeline and the exported model are on GitHub at github.com/vxwshxl/keydna.",
  },
];

export const HOW_TO = [
  { name: "Enroll", text: "Optionally import Monkeytype history, then type naturally for about a minute (320 keystrokes) to build your behavioural profile." },
  { name: "Keep working", text: "KeyDNA scores every rolling 60-keystroke window against your profile while you type." },
  { name: "Watch the confidence", text: "The dashboard shows identity confidence, the model's raw output, risk level and the features that deviate most." },
  { name: "Respond to alerts", text: "If someone else takes over, confidence falls below the critical threshold and KeyDNA recommends re-authentication or locking the session." },
];
