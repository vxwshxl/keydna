import { ImageResponse } from "next/og";
import { C, Card, Frame, Pill, fonts } from "../../_og/kit";
import { takeoverTrace } from "../../_og/data";

export const alt = "KeyDNA attack simulation — identity confidence collapses when a different typist takes over the session (real model output on synthetic demo typists).";
export { size, contentType } from "../../_og/kit";

export default async function Image() {
  const { points, switchAt, detectedAfter, thresholds } = await takeoverTrace();
  const W = 556;
  const H = 220;
  const maxK = points.at(-1)!.keys;
  const minK = points[0]!.keys;
  const x = (k: number) => ((k - minK) / (maxK - minK)) * W;
  const y = (c: number) => H - (c / 100) * H;
  const legit = points.filter((p) => !p.attacker);
  const attack = [legit.at(-1)!, ...points.filter((p) => p.attacker)];
  const path = (ps: typeof points) => ps.map((p, i) => `${i ? "L" : "M"}${x(p.keys).toFixed(1)} ${y(p.conf).toFixed(1)}`).join(" ");
  const final = points.at(-1)!.conf;

  return new ImageResponse(
    (
      <Frame eyebrow="SESSION TAKEOVER DETECTION">
        <div style={{ display: "flex", flex: 1, gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 440 }}>
            <Pill fg={C.redLip} bg={C.redWash}>⚠ ANOMALY DETECTED</Pill>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 22, fontSize: 60, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2 }}>
              <span>Someone else</span>
              <span>is typing.</span>
            </div>
            <div style={{ display: "flex", marginTop: 20, fontSize: 26, fontWeight: 700, color: C.ink2, lineHeight: 1.35 }}>
              {detectedAfter !== null ? `Flagged ${detectedAfter} keystrokes after the takeover.` : "Confidence falls as behaviour deviates."}
            </div>
          </div>
          <Card edge={C.red} lip={C.redLip} style={{ width: 620, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontFamily: "Geist Mono", fontSize: 16, letterSpacing: 2, color: C.ink3 }}>IDENTITY CONFIDENCE</span>
                <span style={{ fontFamily: "Geist Mono", fontSize: 48, color: C.red }}>{final.toFixed(1)}%</span>
              </div>
              <Pill fg="#fff" bg={C.red}>CRITICAL</Pill>
            </div>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <rect x="0" y={y(100)} width={W} height={y(thresholds.low) - y(100)} fill={C.greenWash} />
              <rect x="0" y={y(thresholds.high)} width={W} height={H - y(thresholds.high)} fill={C.redWash} />
              <line x1="0" x2={W} y1={y(thresholds.high)} y2={y(thresholds.high)} stroke={C.red} strokeDasharray="6 6" strokeWidth="2" />
              <line x1={x(switchAt)} x2={x(switchAt)} y1="0" y2={H} stroke={C.ink3} strokeDasharray="4 6" strokeWidth="2" />
              <path d={path(legit)} stroke={C.blue} strokeWidth="6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
              <path d={path(attack)} stroke={C.red} strokeWidth="6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <div style={{ display: "flex", gap: 22, marginTop: 12, fontFamily: "Geist Mono", fontSize: 16, color: C.ink3 }}>
              <span style={{ color: C.blue }}>● legitimate user</span>
              <span style={{ color: C.red }}>● attacker</span>
              <span style={{ marginLeft: "auto" }}>real model output</span>
            </div>
          </Card>
        </div>
      </Frame>
    ),
    { width: 1200, height: 630, fonts: await fonts() },
  );
}
