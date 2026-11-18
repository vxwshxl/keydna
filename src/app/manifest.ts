import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KeyDNA Companion",
    short_name: "KeyDNA",
    description: "Session alerts from KeyDNA continuous authentication.",
    start_url: "/companion",
    display: "standalone",
    background_color: "#F6F7F9",
    theme_color: "#1672D1",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
