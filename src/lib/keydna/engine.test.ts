/**
 * End-to-end replay on the held-out demo typists (never seen in training):
 * demo-a enrolls; demo-a's later sessions should stay verified, and demo-b taking over
 * an already-verified session should be flagged.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyRisk, DEFAULT_THRESHOLDS, eventsFor, LiveVerifier, validThresholds, type WindowScore } from "./engine";
import type { KeyEvent } from "./features";
import { predictProba, profileFromEvents, type ForestModel } from "./model";
import { buildEnrollment, implausibleReason } from "./enroll";
import { mergeTests, parseMonkeytypeJson, summarize } from "./monkeytype";

const model = JSON.parse(readFileSync(new URL("../../../public/model/keydna-rf.json", import.meta.url), "utf8")) as ForestModel;
const pack = JSON.parse(readFileSync(new URL("../../../public/demo/demo-pack.json", import.meta.url), "utf8")) as {
  typists: Record<string, { enroll: KeyEvent[]; probes: KeyEvent[][] }>;
};

function replay(v: LiveVerifier, events: KeyEvent[], offset = 0) {
  const scores: WindowScore[] = [];
  for (const [d, u, z] of events) {
    const w = v.push([d + offset, u + offset, z]);
    if (w) scores.push(v.commit(w, predictProba(model, w.distances)));
  }
  return scores;
}

describe("risk engine", () => {
  it("classifies with configurable thresholds", () => {
    expect(classifyRisk(90, DEFAULT_THRESHOLDS)).toBe("LOW");
    expect(classifyRisk(75, DEFAULT_THRESHOLDS)).toBe("MEDIUM");
    expect(classifyRisk(55, DEFAULT_THRESHOLDS)).toBe("HIGH");
    expect(classifyRisk(10, DEFAULT_THRESHOLDS)).toBe("CRITICAL");
    expect(classifyRisk(75, { low: 95, medium: 80, high: 60 })).toBe("HIGH");
    expect(validThresholds({ low: 50, medium: 70, high: 30 })).toBe(false);
  });

  it("smooths with an EMA instead of jumping", () => {
    const profile = profileFromEvents(pack.typists["demo-a"]!.enroll, model.config);
    const v = new LiveVerifier(profile, model.config, 0.35, DEFAULT_THRESHOLDS, 0.94);
    const w = { features: [], distances: [] };
    expect(v.commit(w, 0.72).confidence).toBeCloseTo(100 * (0.35 * 0.72 + 0.65 * 0.94), 6);
  });
});

describe("continuous verification replay", () => {
  const a = pack.typists["demo-a"]!;
  const b = pack.typists["demo-b"]!;
  const profile = profileFromEvents(a.enroll, model.config);

  it("keeps the enrolled typist verified on unseen sessions", () => {
    const v = new LiveVerifier(profile, model.config, model.config.ema_alpha, DEFAULT_THRESHOLDS);
    const scores = a.probes.flatMap((s, i) => replay(v, s, i * 1e7));
    const low = scores.filter((s) => s.risk === "LOW").length / scores.length;
    expect(low).toBeGreaterThan(0.8);
  });

  it("detects a takeover by another typist", () => {
    const v = new LiveVerifier(profile, model.config, model.config.ema_alpha, DEFAULT_THRESHOLDS);
    const legit = replay(v, a.probes[0]!);
    expect(legit.at(-1)!.risk).toBe("LOW");
    const attack = replay(v, b.probes[0]!, 1e7);
    const critical = attack.findIndex((s) => s.risk === "CRITICAL");
    expect(critical).toBeGreaterThanOrEqual(0);
    // smoothing means it takes a few windows, but well under one session
    expect(attack[critical]!.keys - legit.at(-1)!.keys).toBeLessThan(200);

    const events = attack.flatMap((s, i) => eventsFor(i ? attack[i - 1]! : legit.at(-1)!, s));
    expect(events.map((e) => e.type)).toContain("takeover");
    expect(events.find((e) => e.type === "takeover")!.severity).toBe("CRITICAL");
  });
});

describe("monkeytype import", () => {
  const listItem = { _id: "r1", wpm: 80, rawWpm: 84, acc: 97, consistency: 78, keyConsistency: 60, timestamp: 1_700_000_000_000, testDuration: 30, mode: "time", mode2: "30" };
  it("parses API envelopes and skips invalid items", () => {
    const { tests, skipped } = parseMonkeytypeJson({ message: "ok", data: [listItem, { nope: 1 }] });
    expect(tests).toHaveLength(1);
    expect(skipped).toBe(1);
  });
  it("merges detail fetches that carry key timing stats", () => {
    const list = parseMonkeytypeJson([listItem, { ...listItem, _id: "r2", wpm: 90 }]).tests;
    const detail = parseMonkeytypeJson({ data: { ...listItem, keySpacingStats: { average: 140, sd: 50 }, keyDurationStats: { average: 95, sd: 20 } } }).tests;
    const s = summarize(mergeTests(list, detail));
    expect(s.tests).toBe(2);
    expect(s.detailed).toBe(1);
    expect(s.hold).toBe(95);
    expect(s.wpm).toBe(85);
    expect(s.estKeystrokes).toBe(Math.round(2 * (84 * 5 * 30) / 60));
  });
});

describe("enrollment", () => {
  it("accepts a human calibration and rejects scripted input", () => {
    const human = buildEnrollment(pack.typists["demo-a"]!.enroll, model);
    expect(implausibleReason(human)).toBeNull();
    expect(human.samples).toBe(27);
    const robot: KeyEvent[] = Array.from({ length: 320 }, (_, i) => [i * 2, i * 2 + 1, i % 2 ? "L" : "R"]);
    expect(implausibleReason(buildEnrollment(robot, model))).toMatch(/script/);
  });
});
