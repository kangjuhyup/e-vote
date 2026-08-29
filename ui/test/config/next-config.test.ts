import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  delete process.env.VOTE_API_BASE_URL;
});

import nextConfig from "../../next.config";

describe("next config", () => {
  it("proxies vote API requests through the same-origin route", async () => {
    if (typeof nextConfig.rewrites !== "function") {
      throw new Error("expected vote API rewrite configuration");
    }

    await expect(nextConfig.rewrites()).resolves.toEqual([
      {
        source: "/api/vote-server/:path*",
        destination: "http://localhost:3000/:path*",
      },
    ]);
  });
});
