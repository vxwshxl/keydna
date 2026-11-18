import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Tone = "accent" | "danger" | "success" | "warning" | "dna";

export function Card({ tone, className, ...rest }: ComponentProps<"section"> & { tone?: Tone }) {
  return <section data-tone={tone} className={cn("card3d p-5 sm:p-6", className)} {...rest} />;
}

export function CardTitle({ eyebrow, title, action, className }: { eyebrow?: string; title: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}
