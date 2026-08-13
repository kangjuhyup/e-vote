"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";

interface PageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: PageShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="grid gap-4 border-b pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              {title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button type="button" variant="outline" asChild>
              <Link href="/">대시보드</Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/votes">투표 목록</Link>
            </Button>
            {actions}
            <SignOutButton />
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
