import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

interface PageShellProps {
  account?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  description: string;
  eyebrow: string;
  navigation?: ReactNode;
  title: string;
}

export function PageShell({
  account,
  actions,
  children,
  description,
  eyebrow,
  navigation,
  title,
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-50 -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-transform motion-reduce:transition-none focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        본문 바로가기
      </a>
      <header className="border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="mr-auto min-w-0">
            <p className="truncate font-semibold">전자투표 운영</p>
            <p className="text-xs text-muted-foreground">안전한 투표 운영 콘솔</p>
          </div>
          {navigation}
          {account}
        </div>
      </header>
      <main id="main-content">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <header className="grid gap-4 border-b pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <Badge variant="secondary">{eyebrow}</Badge>
              <h1 className="mt-3 text-pretty text-3xl font-semibold tracking-normal">
                {title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {description}
              </p>
            </div>
            {actions ? (
              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                {actions}
              </div>
            ) : null}
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
