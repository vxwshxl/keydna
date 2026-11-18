import type { Metadata, Viewport } from "next";
import { SITE } from "@/lib/site";
import { mono, rounded } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: "%s · KeyDNA" },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  category: "security",
  creator: "KeyDNA",
  publisher: "KeyDNA",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    url: SITE.url,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.short,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.short,
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: "default" },
  formatDetection: { telephone: false },
  other: { "llms-txt": `${SITE.url}/llms.txt` },
};

export const viewport: Viewport = { themeColor: "#F6F7F9", colorScheme: "light" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${rounded.variable} ${mono.variable} h-full`}>
      <head>
        <link rel="alternate" type="text/markdown" href="/llms.txt" title="KeyDNA for LLMs" />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
