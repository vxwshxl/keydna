import type { Metadata } from "next";
import { SettingsPanel } from "./settings";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <SettingsPanel />;
}
