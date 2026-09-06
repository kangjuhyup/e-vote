/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sessionProviderMock = vi.hoisted(() =>
  vi.fn(({ children }: { children: ReactNode }) => children),
);
const useSessionMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({
  SessionProvider: sessionProviderMock,
  signOut: signOutMock,
  useSession: useSessionMock,
}));

import { Providers } from "@/app/providers";

describe("app providers", () => {
  beforeEach(() => {
    sessionProviderMock.mockClear();
    signOutMock.mockReset();
    useSessionMock.mockReset();
    useSessionMock.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });
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

  it("refreshes an expired access token before rendering live query children", () => {
    vi.stubEnv("NEXT_PUBLIC_VOTE_API_MODE", "live");
    const update = vi.fn(() => new Promise(() => {}));
    useSessionMock.mockReturnValue({
      data: { voteApiAuthStatus: "refresh-required" },
      status: "authenticated",
      update,
    });

    render(
      <Providers>
        <span>Live 화면</span>
      </Providers>,
    );

    expect(screen.queryByText("Live 화면")).toBeNull();
    expect(screen.getByText("인증 정보를 갱신하는 중…")).toBeTruthy();
    expect(update).toHaveBeenCalledWith({ refreshVoteAccessToken: true });
  });

  it("starts reauthentication instead of rendering children when refresh is impossible", () => {
    vi.stubEnv("NEXT_PUBLIC_VOTE_API_MODE", "live");
    signOutMock.mockReturnValue(new Promise(() => {}));
    useSessionMock.mockReturnValue({
      data: { voteApiAuthStatus: "reauth-required" },
      status: "authenticated",
      update: vi.fn(),
    });

    render(
      <Providers>
        <span>Live 화면</span>
      </Providers>,
    );

    expect(screen.queryByText("Live 화면")).toBeNull();
    expect(screen.getByText("로그인 화면으로 이동하는 중…")).toBeTruthy();
    expect(signOutMock).toHaveBeenCalledWith({ redirectTo: "/" });
  });
});
