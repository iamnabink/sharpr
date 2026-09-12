import type { NextConfig } from "next";

/**
 * The browser talks to the API through this same-origin proxy (/api/v1/* → API_INTERNAL_URL),
 * so cookies, CORS and media streaming just work. Set NEXT_PUBLIC_API_URL only if you want
 * the browser to call the API directly (e.g. a separate domain).
 */
const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const target = (process.env.API_INTERNAL_URL ?? "http://localhost:8000").replace(/\/$/, "");
    return [
      { source: "/api/:path*", destination: `${target}/api/:path*` },
      { source: "/admin", destination: `${target}/admin` },
      { source: "/admin/:path*", destination: `${target}/admin/:path*` },
      { source: "/docs", destination: `${target}/docs` },
      { source: "/openapi.json", destination: `${target}/openapi.json` },
    ];
  },
};

export default nextConfig;
