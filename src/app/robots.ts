import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Search and AI answer engines are welcome on the public pages (GEO); personal app
// screens and the API are not useful to index.
const PRIVATE = ["/api/", "/dashboard", "/settings", "/collect", "/companion", "/typing-dna"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"], allow: ["/", "/llms.txt"], disallow: PRIVATE },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
