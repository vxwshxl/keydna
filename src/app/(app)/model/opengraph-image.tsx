import { ImageResponse } from "next/og";
import { C, Card, Frame, Pill, fonts } from "../../_og/kit";
import { metrics } from "../../_og/data";

export const alt = "KeyDNA model performance — Random Forest verifier evaluated with leave-users-out cross-validation (preliminary, synthetic demo data).";
export { size, contentType } from "../../_og/kit";

const p = (v: number) => `${(v * 100).toFixed(1)}%`;

export default async function Image() {
  const m = await metrics();
  const e = m.evaluation;
  const tiles = [
    { k: "EER", v: p(e.rf.eer), note: `baseline ${p(e.baseline_scaled_manhattan.eer)}`, tone: C.blue },
    { k: "ROC AUC", v: e.rf.auc.toFixed(3), note: "random forest verifier", tone: C.violet },
    { k: "TAKEOVERS CAUGHT", v: p(e.continuous.impostor_detection_rate), note: e.continuous.median_keystrokes_to_detect ? `median ${e.continuous.median_keystrokes_to_detect} keystrokes` : "", tone: C.green },
    { k: "FALSE ALARMS", v: p(e.continuous.genuine_false_alarm_rate), note: "genuine sessions", tone: C.amber },
  ];
  return new ImageResponse(
    (
      <Frame eyebrow="MODEL PERFORMANCE">
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", paddingBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", fontSize: 60, fontWeight: 900, letterSpacing: -2 }}>Real ML. Measured honestly.</div>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
            <Pill fg={C.ink2} bg={C.card}>LEAVE-USERS-OUT CV</Pill>
            <Pill fg={C.ink2} bg={C.card}>{`${m.dataset.users} TYPISTS`}</Pill>
            <Pill fg="#3B2700" bg="#FFF5DF">{m.dataset.kind === "real" ? "REAL DATA" : "SYNTHETIC DEMO · PRELIMINARY"}</Pill>
          </div>
          <div style={{ display: "flex", gap: 22, marginTop: 28 }}>
            {tiles.map((t) => (
              <Card key={t.k} edge={t.tone} lip={t.tone} style={{ flex: 1, padding: "20px 24px", gap: 4 }}>
                <span style={{ fontFamily: "Geist Mono", fontSize: 17, letterSpacing: 2, color: C.ink3 }}>{t.k}</span>
                <span style={{ fontFamily: "Geist Mono", fontSize: 46, color: C.ink }}>{t.v}</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: C.ink2 }}>{t.note}</span>
              </Card>
            ))}
          </div>
        </div>
      </Frame>
    ),
    { width: 1200, height: 630, fonts: await fonts() },
  );
}
