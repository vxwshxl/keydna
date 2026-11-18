/** Real numbers for the banners, computed at build time from the shipped model + demo pack. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_THRESHOLDS, LiveVerifier } from "@/lib/keydna/engine";
import type { KeyEvent } from "@/lib/keydna/features";
import { predictProba, profileFromEvents, type ForestModel } from "@/lib/keydna/model";

type Pack = { typists: Record<string, { enroll: KeyEvent[]; probes: KeyEvent[][] }> };
// Literal paths so the bundler traces exactly these files into the image functions.
const parse = async <T,>(file: Promise<string>) => JSON.parse(await file) as T;
const readPack = () => parse<Pack>(readFile(join(process.cwd(), "public/demo/demo-pack.json"), "utf8"));
const readModel = () => parse<ForestModel>(readFile(join(process.cwd(), "public/model/keydna-rf.json"), "utf8"));

export async function demoKeystrokes(n = 26) {
  const pack = await readPack();
  return pack.typists["demo-a"]!.enroll.slice(40, 40 + n).map(([d, u, z], i, a) => ({ ms: u - d, zone: z, gap: i ? d - a[i - 1]![0] : null }));
}

/** Demo typist A types an unseen session, then demo typist B takes over — scored by the real model. */
export async function takeoverTrace() {
  const [model, pack] = await Promise.all([readModel(), readPack()]);
  const a = pack.typists["demo-a"]!;
  const b = pack.typists["demo-b"]!;
  const v = new LiveVerifier(profileFromEvents(a.enroll, model.config), model.config, model.config.ema_alpha, DEFAULT_THRESHOLDS);
  const points: { keys: number; conf: number; attacker: boolean }[] = [];
  let switchAt = 0;
  const run = (events: KeyEvent[], offset: number, attacker: boolean) => {
    for (const [d, u, z] of events) {
      const w = v.push([d + offset, u + offset, z]);
      if (w) {
        const s = v.commit(w, predictProba(model, w.distances));
        points.push({ keys: s.keys, conf: s.confidence, attacker });
      }
    }
  };
  run(a.probes[1]!, 0, false);
  switchAt = v.keys;
  run(b.probes[0]!, 1e7, true);
  const hit = points.find((p) => p.attacker && p.conf < DEFAULT_THRESHOLDS.high);
  return { points, switchAt, detectedAfter: hit ? hit.keys - switchAt : null, thresholds: DEFAULT_THRESHOLDS };
}

export interface MetricsLite {
  preliminary: boolean;
  dataset: { kind: string; users: number };
  evaluation: {
    rf: { auc: number; eer: number };
    baseline_scaled_manhattan: { eer: number };
    continuous: { impostor_detection_rate: number; median_keystrokes_to_detect: number | null; genuine_false_alarm_rate: number };
  };
}
export const metrics = () => parse<MetricsLite>(readFile(join(process.cwd(), "public/model/metrics.json"), "utf8"));
