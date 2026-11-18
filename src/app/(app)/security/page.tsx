import { OG_BASE } from "@/lib/site";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Security } from "./security";

export const metadata: Metadata = {
  title: "Attack simulation — session takeover detection",
  description: "Watch KeyDNA detect a session takeover: a legitimate typist, then an attacker, scored live by a Random Forest on keystroke dynamics. Real model output, demo data clearly labelled.",
  alternates: { canonical: "/security" },
  openGraph: { ...OG_BASE, url: "/security", title: "Attack simulation — session takeover detection · KeyDNA", description: "Watch KeyDNA detect a session takeover: a legitimate typist, then an attacker, scored live by a Random Forest on keystroke dynamics. Real model output, demo data clearly labelled." },
  twitter: { card: "summary_large_image", title: "Attack simulation — session takeover detection · KeyDNA", description: "Watch KeyDNA detect a session takeover: a legitimate typist, then an attacker, scored live by a Random Forest on keystroke dynamics. Real model output, demo data clearly labelled." },
};

export default function Page() {
  return (
    <Suspense>
      <Security />
    </Suspense>
  );
}
