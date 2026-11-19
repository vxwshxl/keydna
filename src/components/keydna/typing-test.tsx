"use client";
/** Prompted typing for enrollment and data collection, on the Monkeytype-style surface. */
import { TypingSurface, type CaptureResult } from "./typing-surface";

export type { CaptureResult };

export function TypingTest({ target, onProgress, onComplete }: { target: number; onProgress?: (n: number) => void; onComplete: (r: CaptureResult) => void }) {
  return <TypingSurface mode="own" target={target} onProgress={onProgress} onComplete={onComplete} label="Type the words shown" />;
}
