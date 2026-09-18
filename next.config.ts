import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.TOPH_E2E === "1" ? ".next-e2e" : ".next",
  poweredByHeader: false,
  devIndicators: false,
  // Live database mutations must be visible during local development too.
  experimental: { serverComponentsHmrCache: false },
};

export default nextConfig;
