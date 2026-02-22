import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/gatcha", destination: "/gacha", permanent: true },
      { source: "/gatcha/:path*", destination: "/gacha/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
