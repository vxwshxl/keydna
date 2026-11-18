import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Server inference reads the exported forest from disk; ship it with those functions.
  outputFileTracingIncludes: {
    "/api/predict": ["./public/model/keydna-rf.json"],
    "/api/model/metrics": ["./public/model/metrics.json"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
