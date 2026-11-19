"use client";
/**
 * Monkeytype-style typing surface: words instead of a text box, per-letter colouring, a smooth
 * caret, a three-line scrolling view and live WPM / accuracy.
 *
 * Two capture modes:
 *  - "monitor": the session guard listens (dashboard, attack simulation).
 *  - "own": this component captures for itself (enrollment, data collection) and reports the
 *    [down, up, zone] events through onComplete. The text never leaves this component.
 */
import { MousePointerClick, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { startCapture } from "@/lib/keydna/capture";
import type { KeyEvent } from "@/lib/keydna/features";
import { SENTENCES } from "@/lib/keydna/prompts";
import { cn } from "@/lib/utils";

export interface CaptureResult {
  events: KeyEvent[];
  keys: { key: string | null; down: number }[];
  accuracy: number | null;
}

interface Props {
  mode: "own" | "monitor";
  target?: number;
  onComplete?: (r: CaptureResult) => void;
  onProgress?: (n: number) => void;
  autoFocus?: boolean;
  /** Focus the surface when a printable key is pressed anywhere on the page. */
  grabKeys?: boolean;
  label?: string;
  className?: string;
  id?: string;
}

function makeWords(n: number): string[] {
  const out: string[] = [];
  while (out.length < n) {
    const s = SENTENCES[Math.floor(Math.random() * SENTENCES.length)]!;
    for (const w of s.toLowerCase().split(/\s+/)) {
      const clean = w.replace(/[^a-z']/g, "");
      if (clean) out.push(clean);
    }
  }
  return out;
}

const LINES = 3;

export function TypingSurface({ mode, target, onComplete, onProgress, autoFocus = true, grabKeys = false, label = "Typing area", className, id }: Props) {
  const [words, setWords] = useState<string[]>(() => makeWords(80));
  const [typed, setTyped] = useState<string[]>([""]);
  const [wi, setWi] = useState(0);
  const [focused, setFocused] = useState(false);
  const [stats, setStats] = useState({ correct: 0, total: 0, start: 0, now: 0 });
  const [captured, setCaptured] = useState(0);
  const [shift, setShift] = useState(0);
  const [caret, setCaret] = useState({ x: 0, y: 0, h: 32 });
  const [idle, setIdle] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const events = useRef<KeyEvent[]>([]);
  const keys = useRef<{ key: string | null; down: number }[]>([]);
  const done = useRef(false);
  const idleTimer = useRef<number | null>(null);
  const cbs = useRef({ onComplete, onProgress });
  const statsRef = useRef(stats);
  const wordsRef = useRef<string[]>(words);
  const typedRef = useRef<string[]>([""]);
  const wiRef = useRef(0);
  const sync = () => {
    setTyped([...typedRef.current]);
    setWi(wiRef.current);
  };

  useEffect(() => {
    cbs.current = { onComplete, onProgress };
    statsRef.current = stats;
  });

  // Own-mode capture: timing only, from the hidden input.
  useEffect(() => {
    if (mode !== "own") return;
    const el = inputRef.current;
    if (!el) return;
    return startCapture(el, {
      withKeys: true,
      onEvent: (ev, key) => {
        if (done.current) return;
        events.current.push(ev);
        keys.current.push({ key, down: ev[0] });
        const n = events.current.length;
        setCaptured(n);
        cbs.current.onProgress?.(n);
        if (target && n >= target) {
          done.current = true;
          const s = statsRef.current;
          cbs.current.onComplete?.({
            events: [...events.current].sort((a, b) => a[0] - b[0]),
            keys: [...keys.current].sort((a, b) => a.down - b.down),
            accuracy: s.total ? (100 * s.correct) / s.total : null,
          });
        }
      },
    });
  }, [mode, target]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  // Like Monkeytype: start typing anywhere and the surface takes focus.
  useEffect(() => {
    if (!grabKeys) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
      const a = document.activeElement;
      if (a && a !== document.body && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT" || (a as HTMLElement).isContentEditable)) return;
      if (document.querySelector("dialog[open]")) return;
      inputRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [grabKeys]);

  // Place the caret and keep the current line as the second visible line.
  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner || !words.length) return;
    const wordEl = inner.querySelector<HTMLElement>(`[data-w="${wi}"]`);
    if (!wordEl) return;
    const letters = wordEl.querySelectorAll<HTMLElement>("[data-l]");
    const pos = typed[wi]?.length ?? 0;
    const lineH = wordEl.offsetHeight;
    let x: number, y: number;
    if (pos < letters.length) {
      const l = letters[pos]!;
      x = l.offsetLeft; // letters share the word's offsetParent (the inner wrapper)
      y = wordEl.offsetTop;
    } else {
      const l = letters[letters.length - 1]!;
      x = l.offsetLeft + l.offsetWidth;
      y = wordEl.offsetTop;
    }
    setCaret({ x, y, h: lineH });
    const line = Math.round(y / lineH);
    setShift(Math.max(0, line - 1) * lineH);
  }, [wi, typed, words]);

  const bumpIdle = () => {
    setIdle(false);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), 900);
  };

  const restart = useCallback(() => {
    const w = makeWords(80);
    wordsRef.current = w;
    typedRef.current = [""];
    wiRef.current = 0;
    setWords(w);
    setTyped([""]);
    setWi(0);
    setStats({ correct: 0, total: 0, start: 0, now: 0 });
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (done.current) return;
    if (e.key === "Tab") {
      if (mode === "monitor") {
        e.preventDefault();
        restart();
      }
      return;
    }
    const W = wordsRef.current;
    const T = typedRef.current;
    const i = wiRef.current;
    const word = W[i] ?? "";
    const cur = T[i] ?? "";
    const now = performance.now();
    if (e.key === " ") {
      e.preventDefault();
      if (!cur.length) return;
      const ok = cur === word;
      setStats((s) => ({ ...s, total: s.total + 1, correct: s.correct + (ok ? 1 : 0), start: s.start || now, now }));
      typedRef.current = [...T.slice(0, i + 1), ""];
      wiRef.current = i + 1;
      if (i + 40 > W.length) {
        wordsRef.current = [...W, ...makeWords(60)];
        setWords(wordsRef.current);
      }
      sync();
      bumpIdle();
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      if (cur.length) typedRef.current = T.map((v, k) => (k === i ? v.slice(0, -1) : v));
      else if (i > 0 && T[i - 1] !== W[i - 1]) {
        typedRef.current = T.slice(0, i);
        wiRef.current = i - 1;
      }
      setStats((s) => ({ ...s, total: s.total + 1, start: s.start || now, now }));
      sync();
      bumpIdle();
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      if (cur.length >= word.length + 8) return;
      const ok = word[cur.length] === e.key;
      typedRef.current = T.map((v, k) => (k === i ? v + e.key : v));
      setStats((s) => ({ ...s, total: s.total + 1, correct: s.correct + (ok ? 1 : 0), start: s.start || now, now }));
      sync();
      bumpIdle();
    }
  };

  const minutes = stats.start ? Math.max((stats.now - stats.start) / 60000, 1 / 60) : 0;
  const wpm = minutes ? Math.round(stats.correct / 5 / minutes) : 0;
  const acc = stats.total ? Math.round((100 * stats.correct) / stats.total) : 100;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Stat label="wpm" value={stats.start ? String(wpm) : "–"} accent />
        <Stat label="acc" value={stats.start ? `${acc}%` : "–"} />
        {mode === "own" && target ? <Stat label="keys" value={`${Math.min(captured, target)}/${target}`} /> : null}
        {mode === "monitor" && (
          <button type="button" onClick={restart} className="ml-auto inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-extrabold text-secondary-fg hover:bg-muted" aria-label="Restart words">
            <RotateCcw className="size-4" aria-hidden /> restart <kbd className="metric rounded bg-muted px-1.5 py-0.5 text-[11px]">tab</kbd>
          </button>
        )}
      </div>

      <div
        ref={boxRef}
        className="relative cursor-text select-none"
        onMouseDown={(e) => {
          e.preventDefault();
          inputRef.current?.focus({ preventScroll: true });
        }}
      >
        <input
          ref={inputRef}
          id={id}
          value=""
          onChange={() => {}}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label={label}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-keydna-own={mode === "own" ? "" : undefined}
          data-keydna-monitor={mode === "monitor" ? "" : undefined}
          className="absolute left-0 top-0 h-px w-px opacity-0"
        />
        <div className="overflow-hidden" style={{ height: `calc(${LINES} * 1.7em)` }} aria-hidden>
          <div
            ref={innerRef}
            className={cn("metric relative text-[22px] leading-[1.7] transition-[transform,filter,opacity] duration-200 sm:text-[26px]", !focused && "opacity-40 blur-[3px]")}
            style={{ transform: `translateY(-${shift}px)` }}
          >
            {words.map((w, i) => {
              const t = typed[i] ?? "";
              const extra = t.length > w.length ? t.slice(w.length) : "";
              const passedWrong = i < wi && t !== w;
              return (
                <span key={i} data-w={i} className={cn("mr-[0.6em] inline-block", passedWrong && "underline decoration-[var(--ds-danger)] decoration-2 underline-offset-[6px]")}>
                  {w.split("").map((ch, j) => {
                    const c = t[j];
                    return (
                      <span key={j} data-l className={cn(c === undefined ? "text-secondary-fg opacity-45" : c === ch ? "text-foreground" : "text-danger")}>
                        {ch}
                      </span>
                    );
                  })}
                  {extra.split("").map((ch, j) => (
                    <span key={`x${j}`} data-l className="text-danger opacity-60">{ch}</span>
                  ))}
                </span>
              );
            })}
            {focused && (
              <span
                className={cn("pointer-events-none absolute left-0 top-0 w-[3px] rounded-full bg-primary transition-transform duration-100 ease-out", idle && "animate-[caret-blink_1s_ease-in-out_infinite]")}
                style={{ height: caret.h * 0.72, transform: `translate(${caret.x - 1}px, ${caret.y + caret.h * 0.14}px)` }}
              />
            )}
          </div>
        </div>
        {!focused && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-base font-extrabold text-foreground">
            <MousePointerClick className="size-5" aria-hidden /> Click here or start typing
          </div>
        )}
      </div>

      {mode === "own" && target ? <Progress value={captured / target} tone="success" label="Keystrokes captured" /> : null}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={cn("metric text-2xl font-medium", accent ? "text-primary" : "text-foreground")}>{value}</span>
      <span className="text-xs font-extrabold tracking-wider text-secondary-fg uppercase">{label}</span>
    </div>
  );
}
