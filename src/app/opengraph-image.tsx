import { ImageResponse } from "next/og";
import { C, Card, Frame, Pill, fonts, Bars } from "./_og/kit";
import { demoKeystrokes } from "./_og/data";

export const alt = "KeyDNA — Your typing has a DNA. Continuous authentication powered by machine learning and keystroke dynamics.";
export { size, contentType } from "./_og/kit";

export default async function Image() {
  const keys = await demoKeystrokes(18);
  const last = keys.at(-1)!;
  return new ImageResponse(
    (
      <Frame eyebrow="BEHAVIOURAL BIOMETRICS">
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1.15 }}>
            <div style={{ display: "flex", fontSize: 96, fontWeight: 900, lineHeight: 1, letterSpacing: -4, flexDirection: "column" }}>
              <span>Your typing</span>
              <span style={{ display: "flex" }}>
                has a<span style={{ color: C.violet, marginLeft: 24 }}>DNA</span>.
              </span>
            </div>
            <div style={{ display: "flex", marginTop: 28, fontSize: 30, fontWeight: 700, color: C.ink2, lineHeight: 1.35 }}>
              Continuous authentication powered by machine learning and keystroke dynamics.
            </div>
          </div>
          <Card edge={C.blue} lip={C.blueLip} style={{ width: 500, gap: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", fontFamily: "Geist Mono", fontSize: 18, letterSpacing: 3, color: C.ink }}>
                <span>KEYDNA</span>
                <span style={{ color: C.ink3, marginTop: 6 }}>CONTINUOUS AUTH</span>
              </div>
              <Pill fg={C.greenLip} bg={C.greenWash}>
                <div style={{ width: 12, height: 12, borderRadius: 6, background: C.green }} /> PROTECTED
              </Pill>
            </div>
            <Bars holds={keys} h={130} />
            <div style={{ display: "flex", gap: 12 }}>
              {[
                ["HOLD", `${Math.round(last.ms)} ms`],
                ["INTERVAL", `${Math.round(last.gap ?? 0)} ms`],
                ["WINDOW", "60 keys"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", flexDirection: "column", flex: 1, padding: "10px 14px", borderRadius: 14, background: C.canvas, fontFamily: "Geist Mono" }}>
                  <span style={{ fontSize: 15, color: C.ink3, letterSpacing: 2 }}>{k}</span>
                  <span style={{ fontSize: 24, color: C.ink }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Frame>
    ),
    { width: 1200, height: 630, fonts: await fonts() },
  );
}
