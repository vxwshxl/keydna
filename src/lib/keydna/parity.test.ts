/**
 * Python ↔ TypeScript parity. ml/train.py writes __fixtures__/parity.json from the held-out
 * demo typists; this test recomputes everything in TS and demands the same numbers.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { windowFeatures, type KeyEvent } from "./features";
import { distances, predictProba, profileFromEvents, type ForestModel } from "./model";

const fixture = JSON.parse(readFileSync(new URL("./__fixtures__/parity.json", import.meta.url), "utf8")) as {
  enroll_events: KeyEvent[];
  profile: { mean: number[]; std: number[]; n_windows: number };
  cases: { label: string; events: KeyEvent[]; features: number[]; distances: number[]; proba: number }[];
};
const model = JSON.parse(readFileSync(new URL("../../../public/model/keydna-rf.json", import.meta.url), "utf8")) as ForestModel;

const close = (a: number[], b: number[], tol: number) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i]!, tol));

describe("python parity", () => {
  it("builds the same enrollment profile", () => {
    const p = profileFromEvents(fixture.enroll_events, model.config);
    expect(p.n_windows).toBe(fixture.profile.n_windows);
    close(p.mean, fixture.profile.mean, 9);
    close(p.std, fixture.profile.std, 9);
  });

  it.each(fixture.cases.map((c, i) => [i, c] as const))("case %i: features, distances and probability match", (_, c) => {
    const x = windowFeatures(c.events);
    close(x, c.features, 9);
    const d = distances(x, fixture.profile, model.config);
    close(d, c.distances, 9);
    expect(predictProba(model, d)).toBeCloseTo(c.proba, 6);
  });

  it("separates the genuine and impostor fixture windows", () => {
    const mean = (l: string) => {
      const cs = fixture.cases.filter((c) => c.label === l);
      return cs.reduce((s, c) => s + c.proba, 0) / cs.length;
    };
    expect(mean("genuine")).toBeGreaterThan(mean("impostor"));
  });
});
