"use client";
import { CheckCircle2, Download, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { TypingTest } from "@/components/keydna/typing-test";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { useMounted } from "@/hooks/use-mounted";
import type { KeyEvent } from "@/lib/keydna/features";
import { useKeyDNA, type Recording } from "@/lib/store";

const TARGET = 360;

/** keydna.session.v1 — the format ml/keydna/data.py reads from ml/data/raw/. */
function toSession(r: Recording, index: number) {
  return {
    format: "keydna.session.v1",
    user_id: r.participant,
    session_id: `${r.participant}-s${String(index).padStart(2, "0")}-${r.id.slice(0, 6)}`,
    source: "collected",
    recorded_at: r.recordedAt,
    events: r.events,
  };
}

function download(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
  a.click();
  URL.revokeObjectURL(a.href);
}

export function Collect() {
  const mounted = useMounted();
  const recordings = useKeyDNA((s) => s.recordings);
  const add = useKeyDNA((s) => s.addRecording);
  const remove = useKeyDNA((s) => s.removeRecording);
  const [participant, setParticipant] = useState("");
  const [consent, setConsent] = useState(false);
  const [running, setRunning] = useState(0); // key to remount the test
  const [saved, setSaved] = useState<Recording | null>(null);
  if (!mounted) return <div className="h-96" aria-busy="true" />;

  const id = participant.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const sessionsFor = (p: string) => recordings.filter((r) => r.participant === p).length;

  const onComplete = (events: KeyEvent[]) => {
    const t0 = events[0]![0];
    const rel = events.map(([d, u, z]) => [Math.round((d - t0) * 10) / 10, Math.round((u - t0) * 10) / 10, z] as KeyEvent);
    const r: Recording = { id: crypto.randomUUID(), participant: id, recordedAt: new Date().toISOString(), events: rel };
    add(r);
    setSaved(r);
    setRunning(0);
  };

  const people = [...new Set(recordings.map((r) => r.participant))];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="eyebrow">Build a real behavioural dataset</p>
        <h1 className="text-3xl font-black tracking-tight">Collect typing data</h1>
        <p className="max-w-2xl text-secondary-fg">
          Record several people typing the same kind of text, ideally 2–5 sessions each on different days. Sessions feed <span className="metric text-sm">ml/train.py</span> and can be replayed as real attackers in the security demo.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.5fr]">
        <Card>
          <CardTitle eyebrow="Step 1" title="Participant" />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-extrabold">Participant ID (no real names needed)</span>
            <input className="field" value={participant} onChange={(e) => setParticipant(e.target.value)} placeholder="e.g. p01 or alice" maxLength={24} data-keydna-own />
          </label>
          {id && <p className="mt-2 text-sm font-bold text-secondary-fg">{sessionsFor(id)} session(s) recorded for <span className="metric">{id}</span></p>}
          <label className="mt-4 flex items-start gap-3 text-sm font-bold">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-4 accent-[var(--ds-accent)]" />
            The participant agrees to their keystroke <i>timing</i> being recorded for this project. No text is stored.
          </label>
          <Button className="mt-5 w-full" size="lg" disabled={!id || !consent || running > 0} onClick={() => { setSaved(null); setRunning(Date.now()); }}>
            Start session
          </Button>
          {saved && (
            <div className="anim-pop mt-4 flex items-center gap-3 rounded-xl bg-success-subtle p-3 font-bold text-success" role="status">
              <CheckCircle2 className="size-5 shrink-0" aria-hidden /> Saved {saved.events.length} keystrokes for {saved.participant}.
            </div>
          )}
        </Card>

        <Card>
          <CardTitle eyebrow="Step 2" title="Type the prompt" />
          {running ? (
            <TypingTest key={running} target={TARGET} onComplete={(r) => onComplete(r.events)} />
          ) : (
            <p className="rounded-xl bg-muted p-6 text-center text-secondary-fg">Enter a participant ID, tick consent and press Start. Each session is {TARGET} keystrokes (≈ 1 minute).</p>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle
          eyebrow={`${recordings.length} sessions · ${people.length} people · stored on this device`}
          title="Recorded sessions"
          action={
            <Button tone="plain" size="sm" disabled={!recordings.length} onClick={() => download(`keydna-sessions-${Date.now()}.json`, { sessions: people.flatMap((p) => recordings.filter((r) => r.participant === p).reverse().map((r, i) => toSession(r, i + 1))) })}>
              <Download className="size-4" aria-hidden /> Export all
            </Button>
          }
        />
        {recordings.length ? (
          <ul className="divide-y-2 divide-border">
            {recordings.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <Users className="size-5 text-secondary-fg" aria-hidden />
                <span className="font-extrabold">{r.participant}</span>
                <span className="metric text-sm text-secondary-fg">{new Date(r.recordedAt).toLocaleString()} · {r.events.length} keys</span>
                <Button tone="plain" size="sm" className="ml-auto" onClick={() => remove(r.id)} aria-label={`Delete session of ${r.participant}`}><Trash2 className="size-4" aria-hidden /></Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-secondary-fg">No sessions yet — record your first participant above.</p>
        )}
        <pre className="mt-4 overflow-x-auto rounded-xl bg-muted p-4 font-mono text-xs leading-6">
{`# put the exported file in ml/data/raw/, then
pnpm ml:train --data real      # needs ≥3 people with ≥2 sessions each
pnpm test                      # re-check TS ↔ Python parity`}
        </pre>
      </Card>
    </div>
  );
}
