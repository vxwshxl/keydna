import { OG_BASE } from "@/lib/site";
import type { Metadata } from "next";
import { Collect } from "./collect";

export const metadata: Metadata = {
  title: "Collect typing data",
  description: "Record consenting participants to build a real keystroke-dynamics dataset for training and evaluation.",
  alternates: { canonical: "/collect" },
  openGraph: { ...OG_BASE, url: "/collect", title: "Collect typing data · KeyDNA", description: "Record consenting participants to build a real keystroke-dynamics dataset for training and evaluation." },
  twitter: { card: "summary_large_image", title: "Collect typing data · KeyDNA", description: "Record consenting participants to build a real keystroke-dynamics dataset for training and evaluation." },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <Collect />;
}
