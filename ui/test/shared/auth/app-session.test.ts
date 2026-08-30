import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth/auth", () => ({
  auth: authMock,
}));

import { getAppSession } from "@/shared/auth/app-session";

describe("app session", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a local user without contacting NextAuth in mock mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_VOTE_API_MODE", "mock");

    await expect(getAppSession()).resolves.toEqual(
      expect.objectContaining({
        user: expect.objectContaining({
          name: "Mock 관리자",
          email: "mock-admin@example.local",
        }),
      }),
    );
    expect(authMock).not.toHaveBeenCalled();
  });

  it("delegates session resolution to NextAuth in live mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_VOTE_API_MODE", "live");
    const liveSession = {
      user: { name: "Live 관리자" },
      expires: "2026-09-01T00:00:00.000Z",
    };
    authMock.mockResolvedValue(liveSession);

    await expect(getAppSession()).resolves.toBe(liveSession);
    expect(authMock).toHaveBeenCalledOnce();
  });
});
