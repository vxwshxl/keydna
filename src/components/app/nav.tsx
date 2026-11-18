"use client";
import { BrainCircuit, Dna, LayoutDashboard, Settings, ShieldAlert, Smartphone, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/typing-dna", label: "Typing DNA", icon: Dna },
  { href: "/security", label: "Security", icon: ShieldAlert },
  { href: "/model", label: "Model", icon: BrainCircuit },
  { href: "/collect", label: "Collect data", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r-2 border-border bg-elevated px-4 py-6 lg:flex">
      <Link href="/" className="mb-8 px-3" aria-label="KeyDNA home">
        <Logo />
      </Link>
      <nav aria-label="Main" className="flex flex-col gap-1.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-extrabold tracking-wide uppercase transition-colors duration-100",
                active ? "bg-accent-subtle text-primary shadow-[inset_0_0_0_2px_var(--ds-accent)]" : "text-secondary-fg hover:bg-muted",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <Link href="/companion" className="mt-auto flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-secondary-fg hover:bg-muted">
        <Smartphone className="size-5" aria-hidden /> Phone companion
      </Link>
    </aside>
  );
}

export function BottomNav() {
  const path = usePathname();
  const items = NAV.filter((n) => n.href !== "/collect");
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 flex border-t-2 border-border bg-elevated pb-[env(safe-area-inset-bottom)] lg:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-extrabold uppercase", active ? "text-primary" : "text-secondary-fg")}>
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
