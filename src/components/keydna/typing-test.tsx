"use client";
/**
 * Prompted typing capture used by enrollment and data collection. Text lives only in this
 * component's memory; what leaves it is [down, up, zone] events (+ in-memory keys for
 * digraph statistics during enrollment).
 */
import { useEffect, useRef, useState } from "react";
import { startCapture } from "@/lib/keydna/capture";
import type { KeyEvent } from "@/lib/keydna/features";
import { makePrompt } from "@/lib/keydna/prompts";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface CaptureResult {
  events: KeyEvent[];
  keys: { key: string | null; down: number }[];
  accuracy: number | null;
}

export function TypingTest({ target, onProgress, onComplete }: { target: number; onProgress?: (n: number) => void; onComplete: (r: CaptureResult) => void }) {
  const [prompt, setPrompt] = useState(() => makePrompt(5));
  const [typed, setTyped] = useState("");
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);
  const events = useRef<KeyEvent[]>([]);
  const keys = useRef<{ key: string | null; down: number }[]>([]);
  const done = useRef(false);
  const typedRef = useRef("");
  const promptRef = useRef(prompt);
  const cbs = useRef({ onProgress, onComplete });

  useEffect(() => {
    cbs.current = { onProgress, onComplete };
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    return startCapture(el, {
      withKeys: true,
      onEvent: (ev, key) => {
        if (done.current) return;
        events.current.push(ev);
        keys.current.push({ key, down: ev[0] });
        const n = events.current.length;
        setCount(n);
        cbs.current.onProgress?.(n);
        if (n >= target) {
          done.current = true;
          const t = typedRef.current;
          const p = promptRef.current;
          let correct = 0;
          for (let i = 0; i < t.length; i++) if (t[i] === p[i]) correct++;
          cbs.current.onComplete({
            events: [...events.current].sort((a, b) => a[0] - b[0]),
            keys: [...keys.current].sort((a, b) => a.down - b.down),
            accuracy: t.length ? (100 * correct) / t.length : null,
          });
        }
      },
    });
  }, [target]);

  const onChange = (v: string) => {
    typedRef.current = v;
    setTyped(v);
    if (v.length > prompt.length - 40) {
      const next = `${prompt} ${makePrompt(3)}`;
      promptRef.current = next;
      setPrompt(next);
    }
  };

  // Show a moving window of the prompt around the caret, monkeytype-style.
  const start = Math.max(0, typed.lastIndexOf(" ", Math.max(0, typed.length - 60)) + 1);
  const visible = prompt.slice(start, start + 180);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="card3d relative cursor-text p-5 text-xl leading-relaxed font-bold tracking-wide sm:p-6 sm:text-2xl"
        onClick={() => ref.current?.focus()}
        aria-hidden
      >
        {visible.split("").map((ch, i) => {
          const idx = start + i;
          const t = typed[idx];
          const state = t === undefined ? (idx === typed.length ? "caret" : "todo") : t === ch ? "ok" : "bad";
          return (
            <span
              key={idx}
              className={cn(
                state === "ok" && "text-foreground",
                state === "todo" && "text-secondary-fg opacity-60",
                state === "bad" && "rounded-sm bg-danger-subtle text-danger",
                state === "caret" && "rounded-sm bg-accent-subtle text-primary shadow-[inset_0_-3px_0_var(--ds-accent)]",
              )}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <label className="sr-only" htmlFor="kd-typing">Type the text shown above</label>
      <textarea
        id="kd-typing"
        ref={ref}
        data-keydna-own
        value={typed}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        className="field min-h-20 resize-none text-base"
        placeholder="Start typing the text above…"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <div>
        <div className="mb-1.5 flex justify-between text-sm font-extrabold">
          <span>Keystrokes captured</span>
          <span className="metric font-medium">{Math.min(count, target)}/{target}</span>
        </div>
        <Progress value={count / target} tone="success" label="Calibration progress" />
      </div>
    </div>
  );
}
