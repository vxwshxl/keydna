import { OG_BASE } from "@/lib/site";
import type { Metadata } from "next";
import { Dashboard } from "./dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Live continuous authentication: identity confidence, model output, risk level and keystroke timing for your session.",
  alternates: { canonical: "/dashboard" },
  openGraph: { ...OG_BASE, url: "/dashboard", title: "Dashboard · KeyDNA", description: "Live continuous authentication: identity confidence, model output, risk level and keystroke timing for your session." },
  twitter: { card: "summary_large_image", title: "Dashboard · KeyDNA", description: "Live continuous authentication: identity confidence, model output, risk level and keystroke timing for your session." },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <Dashboard />;
}
