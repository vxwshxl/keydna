import type { Metadata } from "next";
import { TypingDNA } from "./typing-dna";

export const metadata: Metadata = { title: "Your typing DNA" };

export default function Page() {
  return <TypingDNA />;
}
