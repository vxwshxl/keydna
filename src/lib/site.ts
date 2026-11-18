/** Single source for names, URLs and copy used by metadata, JSON-LD, OG images and llms.txt. */
export const SITE = {
  url: "https://keydna.vercel.app",
  name: "KeyDNA",
  tagline: "Your typing has a DNA.",
  title: "KeyDNA — Continuous authentication from keystroke dynamics",
  academicTitle: "KeyDNA: A Machine Learning-Based Continuous Authentication System Using Keystroke Dynamics",
  description:
    "KeyDNA continuously verifies who is typing. A Random Forest compares every 60-keystroke window against your behavioural typing profile — key hold time, rhythm, pauses and corrections — and flags possible session takeover. Privacy-first: it analyses timing, never what you type.",
  short: "Continuous authentication powered by machine learning and keystroke dynamics.",
  repo: "https://github.com/vxwshxl/keydna",
  keywords: [
    "keystroke dynamics",
    "continuous authentication",
    "behavioral biometrics",
    "typing biometrics",
    "session takeover detection",
    "session hijacking",
    "random forest",
    "machine learning security",
    "typing DNA",
    "keystroke authentication",
    "FAR FRR EER",
    "Monkeytype",
    "cybersecurity project",
  ],
} as const;

export const abs = (path: string) => new URL(path, SITE.url).toString();

/** Serialise JSON-LD safely for a <script> tag (no `</script>` breakouts). */
export const jsonLd = (data: unknown) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });

/** Next replaces (not merges) a parent's openGraph/twitter objects — spread this into page metadata. */
export const OG_BASE = { type: "website", siteName: SITE.name, locale: "en_US" } as const;
