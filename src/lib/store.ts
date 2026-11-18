"use client";
/**
 * Client state. Persisted to localStorage on this device only — KeyDNA has no server-side
 * profile store, so behavioural data never leaves the browser unless the user exports it
 * (or opts into server inference, which sends derived feature vectors, never keystrokes).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_THRESHOLDS, type SecurityEvent, type Thresholds, type WindowScore } from "./keydna/engine";
import type { KeyEvent, Zone } from "./keydna/features";
import type { Profile } from "./keydna/model";
import type { HistoryTest } from "./keydna/monkeytype";

export interface Digraph {
  pair: string;
  ms: number;
  n: number;
}

export interface EnrolledProfile {
  name: string;
  device: string;
  createdAt: number;
  modelVersion: string;
  demo: boolean; // true = synthetic demo typist, not a person
  profile: Profile;
  enrollKeys: number;
  calibration: {
    seconds: number;
    wpm: number;
    accuracy: number | null; // vs. the prompt, when one was used
    holdMean: number;
    flightMean: number;
  };
  quality: {
    selfMatch: number | null; // mean model P(genuine) on the held-out last third of calibration
    timing: number;
    rhythm: number;
    samples: number;
  };
  digraphs: Digraph[];
}

export interface Recording {
  id: string;
  participant: string;
  recordedAt: string;
  events: KeyEvent[];
}

export interface Settings {
  thresholds: Thresholds;
  emaAlpha: number | null; // null = use the model's trained value
  inference: "local" | "server";
  monitorEverywhere: boolean;
  companionCode: string | null;
}

interface Persisted {
  profile: EnrolledProfile | null;
  history: HistoryTest[];
  events: SecurityEvent[];
  recordings: Recording[];
  settings: Settings;
  setProfile: (p: EnrolledProfile | null) => void;
  setHistory: (h: HistoryTest[]) => void;
  addEvents: (e: SecurityEvent[]) => void;
  clearEvents: () => void;
  addRecording: (r: Recording) => void;
  removeRecording: (id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  wipe: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  thresholds: DEFAULT_THRESHOLDS,
  emaAlpha: null,
  inference: "local",
  monitorEverywhere: true,
  companionCode: null,
};

export const useKeyDNA = create<Persisted>()(
  persist(
    (set) => ({
      profile: null,
      history: [],
      events: [],
      recordings: [],
      settings: DEFAULT_SETTINGS,
      setProfile: (profile) => set({ profile }),
      setHistory: (history) => set({ history }),
      addEvents: (e) => e.length && set((s) => ({ events: [...[...e].reverse(), ...s.events].slice(0, 400) })),
      clearEvents: () => set({ events: [] }),
      addRecording: (r) => set((s) => ({ recordings: [r, ...s.recordings].slice(0, 30) })),
      removeRecording: (id) => set((s) => ({ recordings: s.recordings.filter((r) => r.id !== id) })),
      updateSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      wipe: () => set({ profile: null, history: [], events: [], recordings: [], settings: DEFAULT_SETTINGS }),
    }),
    { name: "keydna.v1", version: 1 },
  ),
);

export type SessionStatus = "no-profile" | "loading" | "collecting" | "active" | "locked" | "error";

export interface Pulse {
  id: number;
  zone: Zone;
  hold: number;
  interval: number | null;
  at: number; // wall clock of key-down
}

interface Live {
  status: SessionStatus;
  error: string | null;
  scores: WindowScore[];
  current: WindowScore | null;
  collected: number;
  windowSize: number;
  pulses: Pulse[];
  alertOpen: boolean;
  source: "keyboard" | "replay";
  replayLabel: string | null;
  hydrated: boolean;
}

export const useLive = create<Live>()(() => ({
  status: "loading",
  error: null,
  scores: [],
  current: null,
  collected: 0,
  windowSize: 60,
  pulses: [],
  alertOpen: false,
  source: "keyboard",
  replayLabel: null,
  hydrated: false,
}));
