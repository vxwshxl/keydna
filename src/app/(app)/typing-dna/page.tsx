import { OG_BASE } from "@/lib/site";
import type { Metadata } from "next";
import { TypingDNA } from "./typing-dna";

export const metadata: Metadata = {
  title: "Your typing DNA",
  description: "Your behavioural typing signature: speed, rhythm, key hold, key spacing, accuracy, consistency and common transitions.",
  alternates: { canonical: "/typing-dna" },
  openGraph: { ...OG_BASE, url: "/typing-dna", title: "Your typing DNA · KeyDNA", description: "Your behavioural typing signature: speed, rhythm, key hold, key spacing, accuracy, consistency and common transitions." },
  twitter: { card: "summary_large_image", title: "Your typing DNA · KeyDNA", description: "Your behavioural typing signature: speed, rhythm, key hold, key spacing, accuracy, consistency and common transitions." },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <TypingDNA />;
}
