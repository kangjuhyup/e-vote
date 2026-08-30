import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/registration/route";

describe("POST /api/registration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("rejects malformed registration input without calling auth", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    const response = await POST(
      new Request("http://localhost/api/registration", {
        method: "POST",
        body: JSON.stringify({ username: "voter01" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "회원가입 입력값을 확인하세요.",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("forwards valid registration input to auth with server-side tenant config", async () => {
    vi.stubEnv("AUTH_OIDC_ISSUER", "https://auth.example.com");
    vi.stubEnv("AUTH_OIDC_TENANT_CODE", "acme");
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(undefined, { status: 201 }));
    vi.stubGlobal("fetch", fetcher);

    const response = await POST(
      new Request("http://localhost/api/registration", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "voter01",
          password: "password123",
          email: "",
          phone: "",
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(fetcher).toHaveBeenCalledWith(
      "https://auth.example.com/auth/signup",
      expect.objectContaining({
        body: JSON.stringify({
          username: "voter01",
          password: "password123",
        }),
      }),
    );
  });
});
