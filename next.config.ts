import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    // paper.js (Open Studio's Vector app) pulls these in for Node; the
    // browser build maps them to nothing, so do the same for the server.
    resolveAlias: {
      jsdom: "./src/lib/stubs/empty-module.js",
      "jsdom/lib/jsdom/living/generated/utils": "./src/lib/stubs/empty-module.js",
      canvas: "./src/lib/stubs/empty-module.js",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  outputFileTracingIncludes: {
    "/api/handbook/download": ["./handbook-assets/**/*"],
    "/api/handbook/email": ["./handbook-assets/**/*"],
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "SAMEORIGIN",
        },
        {
          key: "X-XSS-Protection",
          value: "1; mode=block",
        },
      ],
    },
  ],
};

export default nextConfig;
