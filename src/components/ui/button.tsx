import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "dna" | "success" | "warning" | "danger" | "plain" | "ghost";
type Size = "sm" | "md" | "lg";

interface Common {
  tone?: Tone;
  size?: Size;
  selected?: boolean;
  faceClassName?: string;
  children: ReactNode;
}

const attrs = (tone: Tone, size: Size, selected?: boolean) => ({
  "data-tone": tone === "primary" ? undefined : tone,
  "data-size": size === "md" ? undefined : size,
  "data-selected": selected ? "true" : undefined,
});

/** Chunky 3D button (globals.css › .btn3d). */
export function Button({ tone = "primary", size = "md", selected, faceClassName, className, children, type = "button", ...rest }: Common & ComponentProps<"button">) {
  return (
    <button type={type} className={cn("btn3d", className)} {...attrs(tone, size, selected)} {...rest}>
      <span className={cn("face", faceClassName)}>{children}</span>
    </button>
  );
}

export function ButtonLink({ tone = "primary", size = "md", selected, faceClassName, className, children, ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={cn("btn3d", className)} {...attrs(tone, size, selected)} {...rest}>
      <span className={cn("face", faceClassName)}>{children}</span>
    </Link>
  );
}
