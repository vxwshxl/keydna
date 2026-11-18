import { OG_BASE } from "@/lib/site";
import type { Metadata } from "next";
import { SettingsPanel } from "./settings";

export const metadata: Metadata = {
  title: "Settings",
  description: "Risk thresholds, confidence smoothing, local inference, phone companion pairing and privacy controls.",
  alternates: { canonical: "/settings" },
  openGraph: { ...OG_BASE, url: "/settings", title: "Settings · KeyDNA", description: "Risk thresholds, confidence smoothing, local inference, phone companion pairing and privacy controls." },
  twitter: { card: "summary_large_image", title: "Settings · KeyDNA", description: "Risk thresholds, confidence smoothing, local inference, phone companion pairing and privacy controls." },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <SettingsPanel />;
}
