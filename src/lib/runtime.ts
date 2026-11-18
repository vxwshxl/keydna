"use client";
/**
 * The live session: one verifier per enrolled profile, fed by the keyboard or by a replay.
 * Everything the dashboard, security page and companion show comes through here.
 */
import { eventsFor, LiveVerifier, manualEvent, type SecurityEvent, type WindowScore } from "./keydna/engine";
import type { KeyEvent } from "./keydna/features";
import { buildEnrollment } from "./keydna/enroll";
import { loadModel, predictProba, type ForestModel } from "./keydna/model";
import { useKeyDNA, useLive, type EnrolledProfile, type Pulse } from "./store";

let model: ForestModel | null = null;
let verifier: LiveVerifier | null = null;
let builtFor: EnrolledProfile | null = null;
let queue: Promise<void> = Promise.resolve();
let lastDown: number | null = null;
let lastUp = 0;
/** Added to incoming timestamps so live typing after a sped-up replay stays monotonic. */
let shift = 0;
let pulseSeq = 0;
let stopReplay: (() => void) | null = null;

export function getModel() {
  return model;
}

function alpha() {
  return useKeyDNA.getState().settings.emaAlpha ?? model?.config.ema_alpha ?? 0.35;
}

function rebuild() {
  const { profile, settings } = useKeyDNA.getState();
  builtFor = profile;
  if (!model) return;
  if (!profile) {
    verifier = null;
    useLive.setState({ status: "no-profile", scores: [], current: null, collected: 0 });
    return;
  }
  verifier = new LiveVerifier(profile.profile, model.config, alpha(), settings.thresholds);
  useLive.setState({ status: "collecting", scores: [], current: null, collected: 0, windowSize: model.config.window_size });
}

let initialised: Promise<void> | null = null;
export function initRuntime(): Promise<void> {
  initialised ??= (async () => {
    try {
      model = await loadModel();
    } catch (e) {
      useLive.setState({ status: "error", error: e instanceof Error ? e.message : String(e) });
      initialised = null;
      return;
    }
    rebuild();
    useKeyDNA.subscribe((s, prev) => {
      if (s.profile !== builtFor) rebuild();
      else if (s.settings.thresholds !== prev.settings.thresholds) verifier?.setThresholds(s.settings.thresholds);
      else if (s.settings.emaAlpha !== prev.settings.emaAlpha) rebuild();
    });
  })();
  return initialised;
}

function record(cur: WindowScore) {
  const live = useLive.getState();
  const prev = live.current;
  const events = eventsFor(prev, cur);
  useKeyDNA.getState().addEvents(events);
  const becameCritical = cur.risk === "CRITICAL" && prev?.risk !== "CRITICAL";
  useLive.setState({
    current: cur,
    scores: [...live.scores, cur].slice(-240),
    status: live.status === "locked" ? "locked" : "active",
    alertOpen: live.alertOpen || becameCritical,
  });
}

async function serverScore(features: number[]): Promise<number> {
  const p = useKeyDNA.getState().profile!;
  const res = await fetch("/api/predict", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ features, profile: p.profile }),
  });
  if (!res.ok) throw new Error(`server inference failed (${res.status})`);
  return ((await res.json()) as { proba: number }).proba;
}

/** Feed one keystroke into the session. */
export function ingest(raw: KeyEvent) {
  const live = useLive.getState();
  if (!verifier || !model || live.status === "locked") return;
  // A clock jump backwards (live keys after a fast-forwarded replay) becomes an idle gap,
  // never a negative interval. Small reorderings from key rollover are left alone.
  if (lastDown !== null && raw[0] + shift < lastDown - model.config.idle_ms) shift = lastUp + model.config.idle_ms + 1 - raw[0];
  const ev: KeyEvent = [raw[0] + shift, raw[1] + shift, raw[2]];
  lastUp = Math.max(lastUp, ev[1]);

  const pulse: Pulse = { id: pulseSeq++, zone: ev[2], hold: ev[1] - ev[0], interval: lastDown === null ? null : ev[0] - lastDown, at: Date.now() };
  lastDown = ev[0];
  const pending = verifier.push(ev);
  useLive.setState({ pulses: [...live.pulses, pulse].slice(-18), collected: verifier.collected });
  if (!pending) return;

  const v = verifier;
  if (useKeyDNA.getState().settings.inference === "server") {
    queue = queue
      .then(() => serverScore(pending.features))
      .then((raw) => {
        if (v === verifier) record(v.commit(pending, raw));
      })
      .catch((e) => useLive.setState({ error: e instanceof Error ? e.message : String(e) }));
  } else {
    record(v.commit(pending, predictProba(model, pending.distances)));
  }
}

function log(e: SecurityEvent) {
  useKeyDNA.getState().addEvents([e]);
}

export function lockSession(reason = "Session locked by user") {
  stopReplay?.();
  useLive.setState({ status: "locked", alertOpen: false });
  log(manualEvent("locked", "Session locked", "HIGH", reason, useLive.getState().current?.confidence ?? null));
}

export function reauthenticate() {
  stopReplay?.();
  verifier?.reset(1);
  lastDown = null;
  useLive.setState({ status: "collecting", alertOpen: false, current: null, collected: 0, pulses: [] });
  log(manualEvent("reauthenticated", "User re-authenticated", "INFO", "Identity re-confirmed (simulated MFA). Smoothing restarted from a verified state; the next 60 keystrokes are scored fresh."));
}

export function dismissAlert() {
  useLive.setState({ alertOpen: false });
  log(manualEvent("dismissed", "Alert dismissed", "LOW", "A takeover alert was dismissed without re-authentication.", useLive.getState().current?.confidence ?? null));
}

/** Clear the chart and window, keeping the profile (e.g. before a demo run). */
export function restartSession(startVerified = false) {
  stopReplay?.();
  verifier?.reset(startVerified ? 1 : null);
  lastDown = null;
  useLive.setState({ status: verifier ? "collecting" : "no-profile", scores: [], current: null, collected: 0, pulses: [], alertOpen: false });
}

/**
 * Replay recorded keystrokes at their real timing through the exact live pipeline.
 * The model scores them like any other keystrokes — nothing about the result is scripted.
 */
export function replay(events: KeyEvent[], label: string, speed = 1, onDone?: () => void): () => void {
  stopReplay?.();
  if (!events.length) return () => {};
  const t0 = events[0]![0];
  // Speed only changes *when* events are delivered. The timestamps the model sees keep the
  // recorded spacing — compressing them would change the typing behaviour being verified.
  const base = Math.max(performance.now(), lastUp) + 50;
  const sorted = [...events].sort((a, b) => a[1] - b[1]);
  const timers: number[] = [];
  useLive.setState({ source: "replay", replayLabel: label });
  sorted.forEach((e, i) => {
    const at = (e[1] - t0) / speed;
    timers.push(
      window.setTimeout(() => {
        ingest([base + (e[0] - t0), base + (e[1] - t0), e[2]]);
        if (i === sorted.length - 1) finish();
      }, at),
    );
  });
  const finish = () => {
    useLive.setState({ source: "keyboard", replayLabel: null });
    stopReplay = null;
    onDone?.();
  };
  const stop = () => {
    timers.forEach(clearTimeout);
    if (stopReplay === stop) finish();
  };
  stopReplay = stop;
  return stop;
}

export interface DemoPack {
  notice: string;
  typists: Record<string, { enroll: KeyEvent[]; probes: KeyEvent[][] }>;
}

let demoPack: Promise<DemoPack> | null = null;
export function loadDemoPack(): Promise<DemoPack> {
  demoPack ??= fetch("/demo/demo-pack.json").then((r) => {
    if (!r.ok) throw new Error("demo data unavailable");
    return r.json() as Promise<DemoPack>;
  });
  return demoPack;
}

/** Enroll the synthetic demo typist A so the security demo works without a real enrollment. */
export async function enrollDemoTypist(): Promise<void> {
  await initRuntime();
  const [pack, m] = [await loadDemoPack(), model!];
  const events = pack.typists["demo-a"]!.enroll;
  const r = buildEnrollment(events, m);
  useKeyDNA.getState().setProfile({
    name: "Demo typist A",
    device: "Synthetic demo data",
    createdAt: Date.now(),
    modelVersion: m.model_version,
    demo: true,
    profile: r.profile,
    enrollKeys: events.length,
    calibration: { seconds: r.seconds, wpm: r.wpm, accuracy: null, holdMean: r.holdMean, flightMean: r.flightMean },
    quality: { selfMatch: r.selfMatch, timing: r.timing, rhythm: r.rhythm, samples: r.samples },
    digraphs: [],
  });
  log(manualEvent("enrolled", "Demo profile enrolled", "INFO", "Synthetic demo typist A enrolled from generated keystrokes (DEMO DATA, not a real person)."));
}
