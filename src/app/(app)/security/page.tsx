import type { Metadata } from "next";
import { Suspense } from "react";
import { Security } from "./security";

export const metadata: Metadata = { title: "Security & attack simulation" };

export default function Page() {
  return (
    <Suspense>
      <Security />
    </Suspense>
  );
}
