import { OG_BASE } from "@/lib/site";
import type { Metadata } from "next";
import { Enroll } from "./enroll";

export const metadata: Metadata = {
  title: "Build your typing DNA",
  description: "Enroll in KeyDNA in about a minute: import Monkeytype history, type naturally, and get a behavioural typing profile. Nothing you type is stored.",
  alternates: { canonical: "/enroll" },
  openGraph: { ...OG_BASE, url: "/enroll", title: "Build your typing DNA · KeyDNA", description: "Enroll in KeyDNA in about a minute: import Monkeytype history, type naturally, and get a behavioural typing profile. Nothing you type is stored." },
  twitter: { card: "summary_large_image", title: "Build your typing DNA · KeyDNA", description: "Enroll in KeyDNA in about a minute: import Monkeytype history, type naturally, and get a behavioural typing profile. Nothing you type is stored." },
};

export default function Page() {
  return <Enroll />;
}
