import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AuthRegistrationError,
  registerAuthAccount,
} from "@/shared/auth/registration";

describe("registerAuthAccount", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends account credentials directly to the configured auth service", async () => {
    vi.stubEnv("AUTH_OIDC_ISSUER", "https://auth.example.com/");
    vi.stubEnv("AUTH_OIDC_TENANT_CODE", "vote-tenant");
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "user-1" }), { status: 201 }),
    );

    await registerAuthAccount(
      {
        username: "voter01",
        password: "password123",
        email: "voter@example.com",
      },
      fetcher,
    );

    expect(fetcher).toHaveBeenCalledWith(
      "https://auth.example.com/auth/signup",
      expect.objectContaining({
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenant-code": "vote-tenant",
        },
        body: JSON.stringify({
          username: "voter01",
          password: "password123",
          email: "voter@example.com",
        }),
      }),
    );
  });

  it("maps duplicate account responses to a safe user-facing error", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "duplicate key value" }), {
        status: 409,
      }),
    );

    await expect(
      registerAuthAccount(
        { username: "voter01", password: "password123" },
        fetcher,
      ),
    ).rejects.toEqual(
      new AuthRegistrationError(
        "이미 사용 중인 아이디, 이메일 또는 전화번호입니다.",
        409,
      ),
    );
  });
});
