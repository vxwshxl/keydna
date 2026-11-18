"use client";
import { Lock, ShieldX, TriangleAlert } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { dismissAlert, lockSession, reauthenticate } from "@/lib/runtime";
import { useLive } from "@/lib/store";
import { pct } from "@/lib/utils";

/** "Possible session takeover" — opens when smoothed confidence first crosses into CRITICAL. */
export function TakeoverAlert() {
  const open = useLive((s) => s.alertOpen);
  const current = useLive((s) => s.current);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className="modal" aria-labelledby="takeover-title" onCancel={(e) => (e.preventDefault(), dismissAlert())} data-keydna-ignore>
      <div className="p-6 sm:p-8">
        <div className="anim-shake mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-danger text-primary-foreground shadow-[0_4px_0_0_var(--ds-danger-lip)]">
          <TriangleAlert className="size-8" aria-hidden />
        </div>
        <p className="eyebrow text-center !text-danger">Behavioural anomaly detected</p>
        <h2 id="takeover-title" className="mt-1 text-center text-2xl font-black">Possible session takeover</h2>
        <p className="mx-auto mt-3 max-w-sm text-center text-secondary-fg">
          The typing on this session no longer matches the enrolled profile. Behavioural deviation exceeds the critical threshold.
        </p>
        {current && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-danger-subtle p-3 text-center">
              <p className="eyebrow">Identity confidence</p>
              <p className="metric text-2xl font-medium text-danger">{pct(current.confidence)}</p>
            </div>
            <div className="rounded-xl bg-muted p-3 text-center">
              <p className="eyebrow">Model P(genuine)</p>
              <p className="metric text-2xl font-medium">{pct(current.raw * 100)}</p>
            </div>
            <p className="col-span-2 text-center text-sm text-secondary-fg">
              Largest deviations: {current.deviations.map((d) => `${d.label} (${d.sigma.toFixed(1)}σ)`).join(", ")}
            </p>
          </div>
        )}
        <p className="eyebrow mt-6 mb-2 text-center">Recommended action</p>
        <div className="flex flex-col gap-3">
          <Button tone="primary" size="lg" onClick={reauthenticate}>
            Re-authenticate
          </Button>
          <Button tone="danger" onClick={() => lockSession("Locked after a takeover alert")}>
            <Lock className="size-4" aria-hidden /> Lock session
          </Button>
          <Button tone="plain" onClick={dismissAlert}>
            Dismiss
          </Button>
        </div>
      </div>
    </dialog>
  );
}

/** Simulated lock screen. It never locks the operating system. */
export function LockOverlay() {
  const locked = useLive((s) => s.status === "locked");
  if (!locked) return null;
  return (
    <div className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-subtle/95 p-6 backdrop-blur" role="alertdialog" aria-modal="true" aria-labelledby="lock-title" data-keydna-ignore>
      <div className="card3d w-full max-w-md p-8 text-center">
        <div className="anim-pop mx-auto mb-5 flex size-20 items-center justify-center rounded-3xl bg-danger text-primary-foreground shadow-[0_5px_0_0_var(--ds-danger-lip)]">
          <ShieldX className="size-10" aria-hidden />
        </div>
        <h2 id="lock-title" className="text-2xl font-black">Session locked</h2>
        <p className="mt-2 text-secondary-fg">KeyDNA locked this session because the typing behaviour did not match the enrolled user. Keystrokes are not being analysed.</p>
        <p className="mt-4 rounded-xl bg-muted p-3 text-sm text-secondary-fg">
          Simulated lock screen for the demo. A production deployment would hand off to the identity provider for MFA here.
        </p>
        <Button tone="primary" size="lg" className="mt-6 w-full" onClick={reauthenticate} autoFocus>
          Re-authenticate (simulated MFA)
        </Button>
      </div>
    </div>
  );
}
