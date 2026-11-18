"use client";
import { TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card3d mx-auto my-16 max-w-md p-8 text-center" data-tone="danger" role="alert">
      <TriangleAlert className="mx-auto size-10 text-danger" aria-hidden />
      <h1 className="mt-3 text-2xl font-black">Something broke</h1>
      <p className="mt-2 text-secondary-fg">{error.message || "An unexpected error occurred."}</p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" tone="plain">Home</ButtonLink>
      </div>
    </div>
  );
}
