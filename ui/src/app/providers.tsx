"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

import { isApiMockMode } from "@/shared/config/api-mode";
import { makeQueryClient } from "@/shared/config/query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  const content = (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  if (isApiMockMode()) {
    return content;
  }

  return <SessionProvider>{content}</SessionProvider>;
}
