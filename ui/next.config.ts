import type { NextConfig } from "next";

const voteApiBaseUrl = (
  process.env.VOTE_API_BASE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/vote-server/:path*",
        destination: `${voteApiBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
