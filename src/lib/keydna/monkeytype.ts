/**
 * Monkeytype history → historical baseline.
 *
 * Monkeytype is an enrollment *data source*, never the live engine. Its results carry
 * per-test aggregates (speed, accuracy, consistency and — on per-result fetches only —
 * key spacing / key duration mean and SD). Those set the historical baseline shown on
 * /typing-dna; the fine-grained windows the model scores come from live calibration.
 *
 * API facts (api.monkeytype.com/docs, schemas/results.ts):
 *  - GET /results lists ≤1000 results but omits keySpacingStats / keyDurationStats / chartData.
 *  - GET /results/id/:id and /results/last include them.
 *  - Auth header `Authorization: ApeKey <key>`; ApeKey limits: list 30/day, by-id 60/hour.
 */
import { z } from "zod";

const KeyStats = z.object({ average: z.number().nonnegative(), sd: z.number().nonnegative() });

export const MonkeytypeResult = z.object({
  _id: z.string(),
  wpm: z.number().nonnegative(),
  rawWpm: z.number().nonnegative(),
  acc: z.number().min(0).max(100),
  consistency: z.number().min(0).max(100).optional(),
  keyConsistency: z.number().min(0).max(100).optional(),
  timestamp: z.number().nonnegative(),
  testDuration: z.number().positive(),
  mode: z.string().optional(),
  mode2: z.union([z.string(), z.number()]).optional(),
  language: z.string().optional(),
  keySpacingStats: KeyStats.optional(),
  keyDurationStats: KeyStats.optional(),
});
export type MonkeytypeResult = z.infer<typeof MonkeytypeResult>;

/** Only what KeyDNA keeps: numbers, no text, no account identifiers beyond result ids. */
export interface HistoryTest {
  id: string;
  at: number;
  wpm: number;
  raw: number;
  acc: number;
  consistency: number | null;
  keyConsistency: number | null;
  duration: number;
  spacing: { average: number; sd: number } | null;
  hold: { average: number; sd: number } | null;
}

export function toHistoryTest(r: MonkeytypeResult): HistoryTest {
  return {
    id: r._id,
    at: r.timestamp,
    wpm: r.wpm,
    raw: r.rawWpm,
    acc: r.acc,
    consistency: r.consistency ?? null,
    keyConsistency: r.keyConsistency ?? null,
    duration: r.testDuration,
    spacing: r.keySpacingStats ?? null,
    hold: r.keyDurationStats ?? null,
  };
}

/**
 * Accepts an API response (`{data: [...]}` or `{data: {...}}`), a bare array, or a single
 * result. Invalid items are skipped and counted rather than failing the whole import.
 */
export function parseMonkeytypeJson(input: unknown): { tests: HistoryTest[]; skipped: number } {
  const data = (input && typeof input === "object" && "data" in input ? (input as { data: unknown }).data : input) as unknown;
  const items = Array.isArray(data) ? data : data ? [data] : [];
  const tests: HistoryTest[] = [];
  let skipped = 0;
  for (const it of items) {
    const r = MonkeytypeResult.safeParse(it);
    if (r.success) tests.push(toHistoryTest(r.data));
    else skipped++;
  }
  return { tests, skipped };
}

/** Merge by result id; detailed fetches (with key stats) win over list entries. */
export function mergeTests(a: HistoryTest[], b: HistoryTest[]): HistoryTest[] {
  const map = new Map(a.map((t) => [t.id, t]));
  for (const t of b) {
    const old = map.get(t.id);
    map.set(t.id, old ? { ...old, ...t, spacing: t.spacing ?? old.spacing, hold: t.hold ?? old.hold } : t);
  }
  return [...map.values()].sort((x, y) => x.at - y.at);
}

const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const sd = (a: number[]) => {
  const m = avg(a);
  return m === null ? null : Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);
};

export interface HistorySummary {
  tests: number;
  detailed: number; // tests with key timing stats
  minutes: number;
  estKeystrokes: number; // raw wpm × 5 chars × minutes — an estimate, labelled as such
  wpm: number | null;
  raw: number | null;
  acc: number | null;
  consistency: number | null;
  keyConsistency: number | null;
  spacing: number | null;
  hold: number | null;
  /** 100 × (1 − CV of WPM across tests): how stable your speed is between sessions. */
  stability: number | null;
  firstAt: number | null;
  lastAt: number | null;
}

export function summarize(tests: HistoryTest[]): HistorySummary {
  const pick = <T>(f: (t: HistoryTest) => T | null) => tests.map(f).filter((v): v is T => v !== null);
  const wpms = tests.map((t) => t.wpm);
  const m = avg(wpms);
  const s = sd(wpms);
  return {
    tests: tests.length,
    detailed: tests.filter((t) => t.spacing || t.hold).length,
    minutes: tests.reduce((acc, t) => acc + t.duration, 0) / 60,
    estKeystrokes: Math.round(tests.reduce((acc, t) => acc + (t.raw * 5 * t.duration) / 60, 0)),
    wpm: m,
    raw: avg(tests.map((t) => t.raw)),
    acc: avg(tests.map((t) => t.acc)),
    consistency: avg(pick((t) => t.consistency)),
    keyConsistency: avg(pick((t) => t.keyConsistency)),
    spacing: avg(pick((t) => t.spacing?.average ?? null)),
    hold: avg(pick((t) => t.hold?.average ?? null)),
    stability: m && s !== null && tests.length > 1 ? Math.max(0, 100 * (1 - s / m)) : null,
    firstAt: tests[0]?.at ?? null,
    lastAt: tests.at(-1)?.at ?? null,
  };
}
