import { ImageResponse } from "next/og";
import { C, Card, Frame, fonts } from "../../_og/kit";

export const alt = "Build your typing DNA with KeyDNA — import Monkeytype history, type for about a minute, get a behavioural profile.";
export { size, contentType } from "../../_og/kit";

const STEPS = [
  { n: "1", t: "Import history", d: "Monkeytype tests as your baseline", c: C.blue, l: C.blueLip },
  { n: "2", t: "Type ~1 minute", d: "320 keystrokes of natural typing", c: C.violet, l: C.violetLip },
  { n: "3", t: "Profile ready", d: "25 timing traits, mean ± σ", c: C.green, l: C.greenLip },
];

export default async function Image() {
  return new ImageResponse(
    (
      <Frame eyebrow="ENROLLMENT">
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 900, letterSpacing: -3 }}>
            Build your typing<span style={{ color: C.violet, marginLeft: 20 }}>DNA</span>.
          </div>
          <div style={{ display: "flex", marginTop: 12, fontSize: 30, fontWeight: 700, color: C.ink2 }}>
            About a minute. Nothing you type is stored — only timing.
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 40 }}>
            {STEPS.map((s) => (
              <Card key={s.n} style={{ flex: 1, gap: 12 }}>
                <div style={{ display: "flex", width: 60, height: 60, borderRadius: 18, background: s.c, boxShadow: `0 6px 0 0 ${s.l}`, color: "#fff", fontSize: 32, fontWeight: 900, alignItems: "center", justifyContent: "center" }}>{s.n}</div>
                <span style={{ fontSize: 32, fontWeight: 900 }}>{s.t}</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: C.ink2 }}>{s.d}</span>
              </Card>
            ))}
          </div>
        </div>
      </Frame>
    ),
    { width: 1200, height: 630, fonts: await fonts() },
  );
}
