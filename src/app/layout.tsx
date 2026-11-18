import type { Metadata, Viewport } from "next";
import { mono, rounded } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "KeyDNA — Your typing has a DNA", template: "%s · KeyDNA" },
  description: "Continuous authentication powered by machine learning and keystroke dynamics. A university AI/ML + cybersecurity project.",
  applicationName: "KeyDNA",
  appleWebApp: { capable: true, title: "KeyDNA", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#F6F7F9", colorScheme: "light" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${rounded.variable} ${mono.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
