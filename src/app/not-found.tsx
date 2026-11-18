import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo />
      <div>
        <p className="metric text-6xl font-medium text-dna">404</p>
        <h1 className="mt-2 text-2xl font-black">This page has no DNA on record</h1>
        <p className="mt-1 text-secondary-fg">Let&apos;s get you back to a page that exists.</p>
      </div>
      <ButtonLink href="/dashboard" size="lg">Open dashboard</ButtonLink>
    </main>
  );
}
