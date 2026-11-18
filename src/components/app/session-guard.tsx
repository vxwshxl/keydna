"use client";
/**
 * Mounted once in the app layout. Loads the model, listens to the keyboard on every app
 * page (except fields marked data-keydna-own / data-keydna-ignore and password inputs),
 * and keeps the companion phone in sync.
 */
import { useEffect } from "react";
import { startCapture } from "@/lib/keydna/capture";
import { ingest, initRuntime, lockSession } from "@/lib/runtime";
import { useKeyDNA, useLive } from "@/lib/store";

export function SessionGuard() {
  const monitor = useKeyDNA((s) => s.settings.monitorEverywhere);
  const code = useKeyDNA((s) => s.settings.companionCode);

  useEffect(() => {
    void initRuntime();
  }, []);

  useEffect(() => {
    return startCapture(window, {
      onEvent: (ev) => ingest(ev),
      accept: (t) => {
        if (t instanceof HTMLElement && t.closest("[data-keydna-own]")) return false;
        if (monitor) return true;
        return t instanceof HTMLElement && t.closest("[data-keydna-monitor]") !== null;
      },
    });
  }, [monitor]);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    const tick = async () => {
      const { profile } = useKeyDNA.getState();
      const live = useLive.getState();
      try {
        const res = await fetch(`/api/companion/${code}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind: "status",
            status: {
              name: profile?.name ?? "Not enrolled",
              device: profile?.device ?? "Unknown device",
              status: live.status,
              confidence: live.current?.confidence ?? null,
              risk: live.current?.risk ?? null,
              alert: live.alertOpen,
              demo: profile?.demo ?? false,
            },
          }),
        });
        const body = (await res.json()) as { command?: string | null };
        if (alive && body.command === "lock" && useLive.getState().status !== "locked") lockSession("Locked remotely from the KeyDNA companion");
      } catch {
        /* offline — try again next tick */
      }
    };
    void tick();
    const id = window.setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [code]);

  return null;
}
