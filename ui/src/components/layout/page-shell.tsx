import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

interface PageShellProps {
  actions?: ReactNode;
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}

export function PageShell({
  actions,
  children,
  description,
  eyebrow,
  title,
}: PageShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="grid gap-4 border-b pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Badge variant="secondary">{eyebrow}</Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal">
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
  );
}
