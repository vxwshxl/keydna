import type { Metadata } from "next";
import { Enroll } from "./enroll";

export const metadata: Metadata = { title: "Build your typing DNA" };

export default function Page() {
  return <Enroll />;
}
