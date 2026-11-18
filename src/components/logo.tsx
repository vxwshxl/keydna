import { cn } from "@/lib/utils";

/** Keycap with a two-strand helix — the KeyDNA mark. Original artwork. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <rect x="2" y="6" width="36" height="32" rx="9" fill="var(--ds-accent-lip)" />
      <rect x="2" y="2" width="36" height="32" rx="9" fill="var(--ds-accent)" />
      <path d="M14.5 10.5h11M14.5 25.5h11" stroke="var(--ds-accent-fg)" strokeOpacity=".55" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M13 8c0 5 14 5 14 10s-14 5-14 10M27 8c0 5-14 5-14 10s14 5 14 10" stroke="var(--ds-accent-fg)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-xl font-black tracking-tight">
        Key<span className="text-dna">DNA</span>
      </span>
    </span>
  );
}
