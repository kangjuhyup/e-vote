"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { subscribeToVoteApiAuthRequired } from "@/shared/auth/vote-api-auth-events";
import { isApiMockMode } from "@/shared/config/api-mode";
import { makeQueryClient } from "@/shared/config/query-client";

function SessionStatus({ children }: { children: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        {children}
      </p>
    </main>
  );
}

function LiveSessionBoundary({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const refreshStarted = useRef(false);
  const reauthenticationStarted = useRef(false);

  const startReauthentication = useCallback(() => {
    if (reauthenticationStarted.current) return;
    reauthenticationStarted.current = true;
    setIsReauthenticating(true);
    void signOut({ redirectTo: "/" });
  }, []);

  useEffect(
    () => subscribeToVoteApiAuthRequired(startReauthentication),
    [startReauthentication],
  );

  useEffect(() => {
    const authStatus = session?.voteApiAuthStatus;

    if (status !== "authenticated") return;
    if (authStatus === "reauth-required") {
      startReauthentication();
      return;
    }
    if (authStatus === "ready") {
      refreshStarted.current = false;
      return;
    }
    if (authStatus !== "refresh-required" || refreshStarted.current) return;

    refreshStarted.current = true;
    void update({ refreshVoteAccessToken: true })
      .then((nextSession) => {
        if (nextSession?.voteApiAuthStatus !== "ready") {
          startReauthentication();
        }
      })
      .catch(startReauthentication);
  }, [session?.voteApiAuthStatus, startReauthentication, status, update]);

  if (isReauthenticating || session?.voteApiAuthStatus === "reauth-required") {
    return <SessionStatus>로그인 화면으로 이동하는 중…</SessionStatus>;
  }
  if (
    status === "loading" ||
    session?.voteApiAuthStatus === "refresh-required"
  ) {
    return <SessionStatus>인증 정보를 갱신하는 중…</SessionStatus>;
  }

  return children;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  const content = (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  if (isApiMockMode()) {
    return content;
  }

  return (
    <SessionProvider>
      <LiveSessionBoundary>{content}</LiveSessionBoundary>
    </SessionProvider>
  );
}
