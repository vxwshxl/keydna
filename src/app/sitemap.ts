import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: [string, number][] = [
    ["/", 1],
    ["/security", 0.8],
    ["/model", 0.8],
    ["/enroll", 0.7],
  ];
  return routes.map(([path, priority]) => ({ url: `${SITE.url}${path}`, changeFrequency: "weekly", priority }));
}
