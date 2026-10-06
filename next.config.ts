import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Keep file tracing rooted at this project (a stray parent lockfile
  // otherwise makes Next infer the wrong workspace root).
  outputFileTracingRoot: path.join(__dirname),
  // Hide the floating Next.js dev-tools "N" badge (dev only).
  devIndicators: false,
};

export default nextConfig;
