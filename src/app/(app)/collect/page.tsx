import type { Metadata } from "next";
import { Collect } from "./collect";

export const metadata: Metadata = { title: "Collect typing data" };

export default function Page() {
  return <Collect />;
}
