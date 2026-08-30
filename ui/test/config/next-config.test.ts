import { describe, expect, it } from "vitest";

import { createNextConfig } from "../../next.config";

describe("next config", () => {
  it("proxies vote API requests through the same-origin route", async () => {
    const nextConfig = createNextConfig({
      mode: "live",
      voteApiBaseUrl: "http://localhost:3100/",
    });

    if (typeof nextConfig.rewrites !== "function") {
      throw new Error("expected vote API rewrite configuration");
    }

    await expect(nextConfig.rewrites()).resolves.toEqual([
      {
        source: "/api/vote-server/:path*",
        destination: "http://localhost:3100/:path*",
      },
    ]);
  });

  it("does not proxy vote API requests in mock mode", async () => {
    const nextConfig = createNextConfig({
      mode: "mock",
      voteApiBaseUrl: "https://api.example.com",
    });

    if (typeof nextConfig.rewrites !== "function") {
      throw new Error("expected vote API rewrite configuration");
    }

    await expect(nextConfig.rewrites()).resolves.toEqual([]);
  });
});
