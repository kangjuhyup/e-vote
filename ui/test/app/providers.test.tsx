/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sessionProviderMock = vi.hoisted(() =>
  vi.fn(({ children }: { children: ReactNode }) => children),
);

vi.mock("next-auth/react", () => ({
  SessionProvider: sessionProviderMock,
}));

import { Providers } from "@/app/providers";

describe("app providers", () => {
  beforeEach(() => {
    sessionProviderMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("omits the NextAuth session provider in mock mode", () => {
    vi.stubEnv("NEXT_PUBLIC_VOTE_API_MODE", "mock");

    render(
      <Providers>
        <span>Mock 화면</span>
      </Providers>,
    );

    expect(screen.getByText("Mock 화면")).toBeTruthy();
    expect(sessionProviderMock).not.toHaveBeenCalled();
  });

  it("provides the NextAuth session in live mode", () => {
    vi.stubEnv("NEXT_PUBLIC_VOTE_API_MODE", "live");

    render(
      <Providers>
        <span>Live 화면</span>
      </Providers>,
    );

    expect(screen.getByText("Live 화면")).toBeTruthy();
    expect(sessionProviderMock).toHaveBeenCalledOnce();
  });
});
