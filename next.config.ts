import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep `highs` as an external Node module so it resolves its own
  // build/highs.wasm relative to node_modules instead of being bundled
  // by Turbopack (which rewrites the path to a non-existent location).
  serverExternalPackages: ["highs"],
};

export default nextConfig;
