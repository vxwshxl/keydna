import type { Metadata } from "next";
import { Suspense } from "react";
import { Companion } from "./companion";

export const metadata: Metadata = { title: "Companion" };

export default function Page() {
  return (
    <Suspense>
      <Companion />
    </Suspense>
  );
}
