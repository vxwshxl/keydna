import { OG_BASE } from "@/lib/site";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Companion } from "./companion";

export const metadata: Metadata = {
  title: "Phone companion",
  description: "Pair your phone to see KeyDNA session confidence and lock the session when a takeover is detected.",
  alternates: { canonical: "/companion" },
  openGraph: { ...OG_BASE, url: "/companion", title: "Phone companion · KeyDNA", description: "Pair your phone to see KeyDNA session confidence and lock the session when a takeover is detected." },
  twitter: { card: "summary_large_image", title: "Phone companion · KeyDNA", description: "Pair your phone to see KeyDNA session confidence and lock the session when a takeover is detected." },
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <Suspense>
      <Companion />
    </Suspense>
  );
}
