/**
 * Browser keystroke capture. Records [down, up, zone] using the event's high-resolution
 * timestamp. Never records which character was typed — only which hand's zone — and
 * ignores password fields, IME composition, auto-repeat and shortcut chords entirely.
 */
import { codeToZone, type KeyEvent } from "./features";

export interface CaptureOptions {
  onEvent: (ev: KeyEvent, key: string | null) => void;
  /** Pass the typed character to onEvent (in memory only) — used for calibration digraphs. */
  withKeys?: boolean;
  /** Return false to ignore keys typed into this element. */
  accept?: (target: EventTarget | null) => boolean;
}

export function isSensitiveTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t instanceof HTMLInputElement && t.type === "password") return true;
  return t.closest("[data-keydna-ignore]") !== null;
}

export function startCapture(target: Window | HTMLElement, opts: CaptureOptions): () => void {
  const downs = new Map<string, { t: number; key: string }>();

  const onDown = (e: Event) => {
    const k = e as KeyboardEvent;
    if (k.repeat || k.isComposing || k.ctrlKey || k.metaKey || k.altKey) return;
    if (isSensitiveTarget(k.target) || (opts.accept && !opts.accept(k.target))) return;
    if (!codeToZone(k.code)) return;
    downs.set(k.code, { t: k.timeStamp, key: k.key });
  };
  const onUp = (e: Event) => {
    const k = e as KeyboardEvent;
    const d = downs.get(k.code);
    if (!d) return;
    downs.delete(k.code);
    const zone = codeToZone(k.code)!;
    const up = Math.max(k.timeStamp, d.t);
    opts.onEvent([d.t, up, zone], opts.withKeys ? d.key : null);
  };
  const onBlur = () => downs.clear();

  target.addEventListener("keydown", onDown, true);
  target.addEventListener("keyup", onUp, true);
  window.addEventListener("blur", onBlur);
  return () => {
    target.removeEventListener("keydown", onDown, true);
    target.removeEventListener("keyup", onUp, true);
    window.removeEventListener("blur", onBlur);
  };
}
