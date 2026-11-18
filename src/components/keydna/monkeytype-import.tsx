"use client";
import { FileJson, KeyRound, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { mergeTests, parseMonkeytypeJson, summarize, type HistoryTest } from "@/lib/keydna/monkeytype";
import { useKeyDNA } from "@/lib/store";
import { cn, pct } from "@/lib/utils";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function HistoryStats({ tests }: { tests: HistoryTest[] }) {
  const s = summarize(tests);
  const items = [
    ["Tests imported", s.tests.toLocaleString()],
    ["Typing samples (est.)", s.estKeystrokes.toLocaleString()],
    ["Average WPM", s.wpm?.toFixed(1) ?? "—"],
    ["Average accuracy", pct(s.acc)],
    ["Consistency", pct(s.consistency)],
    ["With key timing", `${s.detailed} tests`],
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k} className="rounded-xl bg-muted p-3">
          <dt className="eyebrow">{k}</dt>
          <dd className="metric text-xl font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Import Monkeytype history with an ApeKey (via our proxy) or by pasting JSON.
 * The list endpoint omits key timing, so the newest N results are re-fetched one by one,
 * spaced out to respect Monkeytype's rate limits (ApeKey: 60 result fetches / hour).
 */
export function MonkeytypeImport() {
  const history = useKeyDNA((s) => s.history);
  const setHistory = useKeyDNA((s) => s.setHistory);
  const [mode, setMode] = useState<"key" | "json">("key");
  const [key, setKey] = useState("");
  const [detailN, setDetailN] = useState(10);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [json, setJson] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const call = async (body: object) => {
    const res = await fetch("/api/monkeytype", { method: "POST", headers: { "content-type": "application/json", "x-ape-key": key }, body: JSON.stringify(body) });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) throw new Error(`${res.status}: ${data.message ?? "Monkeytype request failed"}`);
    return data;
  };

  const importKey = async () => {
    setError(null);
    setBusy("Fetching result list…");
    setProgress(0);
    try {
      const list = parseMonkeytypeJson(await call({ op: "list", limit: 200 })).tests;
      let merged = mergeTests(history, list);
      setHistory(merged);
      const newest = [...list].sort((a, b) => b.at - a.at).slice(0, detailN);
      for (let i = 0; i < newest.length; i++) {
        setBusy(`Fetching key timing for result ${i + 1} of ${newest.length}…`);
        merged = mergeTests(merged, parseMonkeytypeJson(await call({ op: "result", id: newest[i]!.id })).tests);
        setHistory(merged);
        setProgress((i + 1) / newest.length);
        if (i < newest.length - 1) await sleep(2200); // global limit is 30 requests / minute
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const importJson = (text: string) => {
    setError(null);
    try {
      const { tests, skipped } = parseMonkeytypeJson(JSON.parse(text));
      if (!tests.length) throw new Error("No Monkeytype results found in that JSON.");
      setHistory(mergeTests(history, tests));
      if (skipped) setError(`Imported ${tests.length}; skipped ${skipped} items that weren't valid results.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That isn't valid JSON.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3" role="tablist" aria-label="Import method">
        <Button tone="plain" selected={mode === "key"} role="tab" aria-selected={mode === "key"} onClick={() => setMode("key")}>
          <KeyRound className="size-4" aria-hidden /> ApeKey
        </Button>
        <Button tone="plain" selected={mode === "json"} role="tab" aria-selected={mode === "json"} onClick={() => setMode("json")}>
          <FileJson className="size-4" aria-hidden /> Paste JSON
        </Button>
      </div>

      {mode === "key" ? (
        <div className="flex flex-col gap-3">
          <label className="text-sm font-extrabold" htmlFor="ape">Monkeytype ApeKey</label>
          <input id="ape" type="password" className="field" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Account settings → Ape keys → generate & activate" autoComplete="off" />
          <label className="flex items-center justify-between gap-3 text-sm font-bold" htmlFor="detail">
            <span>Fetch key timing for the newest <span className="metric">{detailN}</span> tests</span>
            <input id="detail" type="range" min={0} max={25} value={detailN} onChange={(e) => setDetailN(+e.target.value)} className="w-32 accent-[var(--ds-accent)]" />
          </label>
          <p className="text-xs font-bold text-secondary-fg">The key is sent once through KeyDNA&apos;s proxy to api.monkeytype.com and is never stored. Only numbers (WPM, accuracy, timing stats) are kept, on this device.</p>
          <Button onClick={importKey} disabled={!key || !!busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} {busy ? "Importing…" : "Import history"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="text-sm font-extrabold" htmlFor="mtjson">Monkeytype results JSON</label>
          <textarea id="mtjson" className="field min-h-28 font-mono text-xs" value={json} onChange={(e) => setJson(e.target.value)} placeholder='{"data":[{"_id":"…","wpm":82,"rawWpm":86,"acc":96.8,…}]}' />
          <div className="flex gap-3">
            <Button onClick={() => importJson(json)} disabled={!json.trim()} className="flex-1">Import JSON</Button>
            <Button tone="plain" onClick={() => fileRef.current?.click()}>Upload file</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) importJson(await f.text()); }} />
          </div>
          <p className="text-xs font-bold text-secondary-fg">Accepts a GET /results or /results/id response, an array of results, or a single result.</p>
        </div>
      )}

      {busy && (
        <div aria-live="polite">
          <p className="mb-1 text-sm font-bold">{busy}</p>
          <Progress value={progress} tone="dna" label="Monkeytype import progress" />
        </div>
      )}
      {error && <p className={cn("rounded-xl p-3 text-sm font-bold", error.startsWith("Imported") ? "bg-warning-subtle text-warning-ink" : "bg-danger-subtle text-danger")} role="alert">{error}</p>}
      {history.length > 0 && <HistoryStats tests={history} />}
    </div>
  );
}
