import { GeistMono } from "geist/font/mono";
import localFont from "next/font/local";

// Nunito (SIL OFL, licence in public/fonts/Nunito-OFL.txt). One variable file, Latin subset.
export const rounded = localFont({
  src: "../../public/fonts/Nunito-Variable.woff2",
  variable: "--font-rounded",
  weight: "200 1000",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
});

export const mono = GeistMono;
