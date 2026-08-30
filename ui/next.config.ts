import type { NextConfig } from "next";

interface CreateNextConfigOptions {
  mode?: string;
  voteApiBaseUrl?: string;
}

export function createNextConfig(
  options: CreateNextConfigOptions = {},
): NextConfig {
  const mode = options.mode ?? process.env.NEXT_PUBLIC_VOTE_API_MODE;
  const voteApiBaseUrl = (
    options.voteApiBaseUrl ??
    process.env.VOTE_API_BASE_URL ??
    "http://localhost:3000"
  ).replace(/\/+$/, "");

  return {
    async rewrites() {
      if (mode === "mock") {
        return [];
      }

      return [
        {
          source: "/api/vote-server/:path*",
          destination: `${voteApiBaseUrl}/:path*`,
        },
      ];
    },
  };
}

const nextConfig = createNextConfig();

export default nextConfig;
