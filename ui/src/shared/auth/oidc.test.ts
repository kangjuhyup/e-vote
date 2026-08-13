import { describe, expect, it } from "vitest";

import { buildTenantOidcIssuer, mapEVoteProfileToUser } from "./oidc";

describe("buildTenantOidcIssuer", () => {
  it("builds a tenant-scoped OIDC issuer from an origin and tenant code", () => {
    expect(
      buildTenantOidcIssuer({
        issuerOrigin: "http://localhost:3000/",
        tenantCode: "acme",
      }),
    ).toBe("http://localhost:3000/t/acme/oidc");
  });

  it("encodes tenant codes when composing the issuer path", () => {
    expect(
      buildTenantOidcIssuer({
        issuerOrigin: "https://auth.example.com",
        tenantCode: "tenant one",
      }),
    ).toBe("https://auth.example.com/t/tenant%20one/oidc");
  });
});

describe("mapEVoteProfileToUser", () => {
  it("maps userinfo claims into an Auth.js user without exposing tokens", () => {
    expect(
      mapEVoteProfileToUser({
        sub: "user-1",
        name: "Kim User",
        email: "kim@example.com",
      }),
    ).toEqual({
      id: "user-1",
      name: "Kim User",
      email: "kim@example.com",
      image: null,
    });
  });

  it("falls back to email or subject when the display name is absent", () => {
    expect(
      mapEVoteProfileToUser({
        sub: "user-2",
        email: "fallback@example.com",
      }).name,
    ).toBe("fallback@example.com");

    expect(mapEVoteProfileToUser({ sub: "user-3" }).name).toBe("user-3");
  });
});
