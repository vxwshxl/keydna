"use client";
/**
 * Free typing: proof that verification works on any text, not just the prompted words.
 * The session guard reads the timing (data-keydna-monitor); the text itself only lives in
 * this box until it is cleared and is never stored or sent anywhere.
 */
import { Eraser, PenLine } from "lucide-react";
import { useRef, useState } from "react";

export function FreeTyping() {
  const [text, setText] = useState("");
  const [keys, setKeys] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <textarea
          ref={ref}
          data-keydna-monitor
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (!e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) setKeys((k) => k + 1);
          }}
          onPaste={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          rows={4}
          placeholder="Type anything here: a message to a friend, notes from class, or random letters. KeyDNA only reads the timing."
          aria-label="Free typing box. Only key timing is analysed, the text is never stored"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="field min-h-36 resize-y text-lg leading-relaxed"
        />
        <PenLine className="pointer-events-none absolute right-3 bottom-3 size-5 text-secondary-fg opacity-50" aria-hidden />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-bold text-secondary-fg">
        <span><span className="metric text-base text-foreground">{keys}</span> keys typed here</span>
        <span><span className="metric text-base text-foreground">{words}</span> words</span>
        <span>Pasting is blocked, since only real typing counts.</span>
        <button
          type="button"
          onClick={() => {
            setText("");
            setKeys(0);
            ref.current?.focus();
          }}
          className="ml-auto inline-flex min-h-9 items-center gap-2 rounded-lg px-3 font-extrabold hover:bg-muted"
        >
          <Eraser className="size-4" aria-hidden /> Clear
        </button>
      </div>
    </div>
  );
}
