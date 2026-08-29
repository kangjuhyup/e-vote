# UI Initial Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the placeholder `ui` workspace into a Node 24, Next.js 16, React 19 frontend using Zustand, TanStack React Query, shadcn/ui, and feature slice source organization.

**Architecture:** The app uses Next.js App Router under `ui/src/app`, feature-owned logic under `ui/src/features/<feature>`, all React component declarations under `ui/src/components`, and cross-feature infrastructure under `ui/src/shared`. App-wide providers are composed once in `ui/src/app/providers.tsx`.

**Tech Stack:** Node 24, pnpm workspace, Next.js `16.3.0`, React `19.2.8`, TypeScript `5.9.3`, ESLint `9.39.5`, Tailwind CSS `4.3.3`, shadcn/ui-style primitives, Zustand `5.0.15`, TanStack React Query `5.101.4`.

## Global Constraints

- Use Node 24 as the frontend runtime baseline.
- Keep `server` code unchanged.
- Keep `ui/src/app` thin: routes and providers only.
- Put feature-owned dashboard query options, model types, and store under `ui/src/features/dashboard`.
- Do not declare React components under `ui/src/features`.
- Put all React components under `ui/src/components`.
- Put shadcn/ui primitives under `ui/src/components/ui`.
- Put reusable non-component infrastructure under `ui/src/shared`.
- Use `@/*` as the TypeScript alias for `ui/src/*`.
- Verify with `pnpm --filter @vote/ui lint` and `pnpm --filter @vote/ui build`.

---

## File Structure

Create or modify these files:

```text
.nvmrc
package.json
README.md
ui/package.json
ui/components.json
ui/eslint.config.mjs
ui/next-env.d.ts
ui/next.config.ts
ui/postcss.config.mjs
ui/tsconfig.json
ui/src/app/globals.css
ui/src/app/layout.tsx
ui/src/app/page.tsx
ui/src/app/providers.tsx
ui/src/features/dashboard/api/dashboard-query-options.ts
ui/src/features/dashboard/model/dashboard.types.ts
ui/src/features/dashboard/store/dashboard-ui.store.ts
ui/src/components/dashboard/activity-list.tsx
ui/src/components/dashboard/dashboard-page.tsx
ui/src/components/dashboard/metric-card.tsx
ui/src/components/dashboard/operations-panel.tsx
ui/src/components/ui/badge.tsx
ui/src/components/ui/button.tsx
ui/src/components/ui/card.tsx
ui/src/components/ui/separator.tsx
ui/src/shared/config/query-client.ts
ui/src/shared/lib/utils.ts
```

`ui/src/app` is responsible for Next route composition only. `ui/src/features/dashboard` owns starter dashboard logic. `ui/src/components` owns every React component declaration. `ui/src/shared` owns non-component cross-cutting config and utilities.

### Task 1: Runtime, Workspace Scripts, And Next Tooling

**Files:**
- Create/modify: `.nvmrc`
- Modify: `package.json`
- Modify: `ui/package.json`
- Create: `ui/next.config.ts`
- Create: `ui/tsconfig.json`
- Create: `ui/postcss.config.mjs`
- Create: `ui/eslint.config.mjs`
- Create: `ui/next-env.d.ts`
- Create: `ui/components.json`

**Interfaces:**
- Produces: `@vote/ui` package scripts `dev`, `build`, `start`, `lint`.
- Produces: root scripts `dev:ui`, `build:ui`, `start:ui`, `lint:ui`.
- Produces: TypeScript path alias `@/* -> ui/src/*`.

- [ ] **Step 1: Declare Node 24**

Set `.nvmrc` to:

```text
24
```

- [ ] **Step 2: Add root UI scripts and runtime metadata**

Update root `package.json` so it contains these new fields while preserving existing server scripts:

```json
{
  "engines": {
    "node": ">=24.0.0"
  },
  "scripts": {
    "dev:ui": "pnpm --filter @vote/ui dev",
    "build:ui": "pnpm --filter @vote/ui build",
    "start:ui": "pnpm --filter @vote/ui start",
    "lint:ui": "pnpm --filter @vote/ui lint"
  }
}
```

- [ ] **Step 3: Define UI dependencies**

Replace `ui/package.json` with:

```json
{
  "name": "@vote/ui",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint ."
  },
  "dependencies": {
    "@radix-ui/react-slot": "latest",
    "@tanstack/react-query": "5.101.4",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "lucide-react": "1.31.0",
    "next": "16.3.0",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "tailwind-merge": "latest",
    "zustand": "5.0.15"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "latest",
    "@types/node": "24.13.3",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "eslint": "9.39.5",
    "eslint-config-next": "latest",
    "tailwindcss": "4.3.3",
    "tw-animate-css": "latest",
    "typescript": "5.9.3"
  }
}
```

- [ ] **Step 4: Add Next config**

Create `ui/next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 5: Add TypeScript config**

Create `ui/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 6: Add PostCSS config**

Create `ui/postcss.config.mjs`:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 7: Add ESLint flat config**

Create `ui/eslint.config.mjs`:

```js
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
```

- [ ] **Step 8: Add Next env declarations**

Create `ui/next-env.d.ts`:

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/dev/types/routes.d.ts";

// NOTE: This file should not be edited.
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

- [ ] **Step 9: Add shadcn component config**

Create `ui/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/shared/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/shared/lib",
    "hooks": "@/shared/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 10: Install dependencies**

Run:

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` updates and `ui/node_modules` resolution succeeds.

### Task 2: App Shell, Providers, And Global Styles

**Files:**
- Create: `ui/src/app/globals.css`
- Create: `ui/src/app/layout.tsx`
- Create: `ui/src/app/page.tsx`
- Create: `ui/src/app/providers.tsx`
- Create: `ui/src/shared/config/query-client.ts`

**Interfaces:**
- Consumes: `@tanstack/react-query`.
- Produces: `makeQueryClient(): QueryClient`.
- Produces: `Providers({ children }: { children: React.ReactNode })`.
- Produces: root route rendering `<DashboardPage />`.

- [ ] **Step 1: Add query client factory**

Create `ui/src/shared/config/query-client.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 60_000,
      },
    },
  });
}
```

- [ ] **Step 2: Add client providers**

Create `ui/src/app/providers.tsx`:

```tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { makeQueryClient } from "@/shared/config/query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

- [ ] **Step 3: Add global shadcn/Tailwind styles**

Create `ui/src/app/globals.css` with Tailwind v4 and shadcn CSS variables:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 0.5rem;
  --background: oklch(0.99 0 0);
  --foreground: oklch(0.17 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.17 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.17 0 0);
  --primary: oklch(0.25 0.04 255);
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.95 0.01 250);
  --secondary-foreground: oklch(0.22 0.02 255);
  --muted: oklch(0.96 0.01 250);
  --muted-foreground: oklch(0.48 0.02 255);
  --accent: oklch(0.93 0.04 175);
  --accent-foreground: oklch(0.18 0.04 175);
  --destructive: oklch(0.58 0.22 28);
  --border: oklch(0.9 0.01 250);
  --input: oklch(0.9 0.01 250);
  --ring: oklch(0.62 0.11 255);
}

.dark {
  --background: oklch(0.15 0.02 255);
  --foreground: oklch(0.97 0 0);
  --card: oklch(0.2 0.02 255);
  --card-foreground: oklch(0.97 0 0);
  --popover: oklch(0.2 0.02 255);
  --popover-foreground: oklch(0.97 0 0);
  --primary: oklch(0.76 0.11 255);
  --primary-foreground: oklch(0.14 0.02 255);
  --secondary: oklch(0.27 0.02 255);
  --secondary-foreground: oklch(0.97 0 0);
  --muted: oklch(0.27 0.02 255);
  --muted-foreground: oklch(0.72 0.02 255);
  --accent: oklch(0.4 0.08 175);
  --accent-foreground: oklch(0.97 0 0);
  --destructive: oklch(0.7 0.19 25);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.56 0.11 255);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground;
    font-family:
      Arial,
      Helvetica,
      sans-serif;
  }
}
```

- [ ] **Step 4: Add root layout**

Create `ui/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";

import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Vote Operations",
  description: "Electronic voting operations dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Add root page**

Create `ui/src/app/page.tsx`:

```tsx
import { DashboardPage } from "@/components/dashboard/dashboard-page";

export default function Home() {
  return <DashboardPage />;
}
```

### Task 3: Component Directory And shadcn-Style UI Primitives

**Files:**
- Create: `ui/src/shared/lib/utils.ts`
- Create: `ui/src/components/ui/button.tsx`
- Create: `ui/src/components/ui/badge.tsx`
- Create: `ui/src/components/ui/card.tsx`
- Create: `ui/src/components/ui/separator.tsx`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string`.
- Produces: `Button`, `buttonVariants`.
- Produces: `Badge`, `badgeVariants`.
- Produces: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`.
- Produces: `Separator`.

- [ ] **Step 1: Add class name utility**

Create `ui/src/shared/lib/utils.ts`:

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Add Button primitive**

Create `ui/src/components/ui/button.tsx` using the shadcn button API with variants `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` and sizes `default`, `sm`, `lg`, `icon`.

- [ ] **Step 3: Add Badge primitive**

Create `ui/src/components/ui/badge.tsx` using the shadcn badge API with variants `default`, `secondary`, `destructive`, `outline`.

- [ ] **Step 4: Add Card primitive**

Create `ui/src/components/ui/card.tsx` using shadcn card exports `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, and `CardFooter`.

- [ ] **Step 5: Add Separator primitive**

Create `ui/src/components/ui/separator.tsx` with a simple semantic separator that supports `orientation?: "horizontal" | "vertical"` and `decorative?: boolean`.

### Task 4: Dashboard Feature Logic Slice

**Files:**
- Create: `ui/src/features/dashboard/model/dashboard.types.ts`
- Create: `ui/src/features/dashboard/api/dashboard-query-options.ts`
- Create: `ui/src/features/dashboard/store/dashboard-ui.store.ts`

**Interfaces:**
- Produces: `VoteStatusFilter`, `DashboardDensity`, `DashboardMetric`, `DashboardActivity`, `DashboardMetrics`.
- Produces: `dashboardMetricsQueryOptions()`.
- Produces: `useDashboardUiStore`.

- [ ] **Step 1: Add dashboard types**

Create `ui/src/features/dashboard/model/dashboard.types.ts`:

```ts
export type VoteStatusFilter = "all" | "draft" | "open" | "closed" | "canceled";

export type DashboardDensity = "comfortable" | "compact";

export interface DashboardMetric {
  label: string;
  value: string;
  delta: string;
  tone: "default" | "success" | "warning";
}

export interface DashboardActivity {
  id: string;
  title: string;
  detail: string;
  status: "stable" | "attention" | "pending";
}

export interface DashboardMetrics {
  metrics: DashboardMetric[];
  activities: DashboardActivity[];
  generatedAt: string;
}
```

- [ ] **Step 2: Add dashboard query options**

Create `ui/src/features/dashboard/api/dashboard-query-options.ts`:

```ts
import { queryOptions } from "@tanstack/react-query";

import type { DashboardMetrics } from "../model/dashboard.types";

async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  await new Promise((resolve) => setTimeout(resolve, 150));

  return {
    generatedAt: new Date().toISOString(),
    metrics: [
      { label: "진행 중 투표", value: "12", delta: "+3", tone: "success" },
      { label: "본인인증 대기", value: "248", delta: "18분 평균", tone: "warning" },
      { label: "집계 완료", value: "37", delta: "오늘 5건", tone: "default" },
    ],
    activities: [
      {
        id: "vote-open",
        title: "정기 주주총회 의안 투표",
        detail: "공개 투표 · 후보 4명 · 참여율 68%",
        status: "stable",
      },
      {
        id: "identity-review",
        title: "본인인증 재시도 증가",
        detail: "모바일 인증 제공자 응답 지연",
        status: "attention",
      },
      {
        id: "secret-ballot",
        title: "비밀 투표 집계 준비",
        detail: "선택 후보 비저장 정책 적용",
        status: "pending",
      },
    ],
  };
}

export function dashboardMetricsQueryOptions() {
  return queryOptions({
    queryKey: ["dashboard", "metrics"],
    queryFn: fetchDashboardMetrics,
  });
}
```

- [ ] **Step 3: Add dashboard Zustand store**

Create `ui/src/features/dashboard/store/dashboard-ui.store.ts`:

```ts
"use client";

import { create } from "zustand";

import type {
  DashboardDensity,
  VoteStatusFilter,
} from "../model/dashboard.types";

interface DashboardUiState {
  density: DashboardDensity;
  statusFilter: VoteStatusFilter;
  setDensity: (density: DashboardDensity) => void;
  setStatusFilter: (statusFilter: VoteStatusFilter) => void;
}

export const useDashboardUiStore = create<DashboardUiState>((set) => ({
  density: "comfortable",
  statusFilter: "open",
  setDensity: (density) => set({ density }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
}));
```

### Task 5: Dashboard Components

**Files:**
- Create: `ui/src/components/dashboard/activity-list.tsx`
- Create: `ui/src/components/dashboard/metric-card.tsx`
- Create: `ui/src/components/dashboard/operations-panel.tsx`
- Create: `ui/src/components/dashboard/dashboard-page.tsx`

**Interfaces:**
- Consumes: `DashboardMetric`, `DashboardActivity`, `DashboardDensity`, and `VoteStatusFilter` from `@/features/dashboard/model/dashboard.types`.
- Consumes: `dashboardMetricsQueryOptions()` from `@/features/dashboard/api/dashboard-query-options`.
- Consumes: `useDashboardUiStore` from `@/features/dashboard/store/dashboard-ui.store`.
- Consumes: shadcn primitives from `@/components/ui/*`.
- Produces: `MetricCard`, `ActivityList`, `OperationsPanel`, and `DashboardPage`.

- [ ] **Step 1: Add metric card component**

Create `ui/src/components/dashboard/metric-card.tsx`. It must accept `{ metric: DashboardMetric }`, render a shadcn `Card`, and use a lucide icon based on `metric.tone`.

- [ ] **Step 2: Add activity list component**

Create `ui/src/components/dashboard/activity-list.tsx`. It must accept `{ activities: DashboardActivity[]; density: DashboardDensity }`, render a shadcn `Card`, and map activity status to `Badge` variants.

- [ ] **Step 3: Add operations panel component**

Create `ui/src/components/dashboard/operations-panel.tsx`. It must accept current `statusFilter`, current `density`, `onStatusFilterChange`, and `onDensityChange`, then render shadcn `Button` controls without owning Zustand directly.

- [ ] **Step 4: Add dashboard page component**

Create `ui/src/components/dashboard/dashboard-page.tsx` as a client component. It must use `useQuery(dashboardMetricsQueryOptions())`, `useDashboardUiStore`, and compose only `MetricCard`, `ActivityList`, `OperationsPanel`, and primitives from `@/components/ui/*`.

### Task 6: Documentation And Verification

**Files:**
- Modify: `README.md`
- Update: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: documented UI commands.

- [ ] **Step 1: Update README UI section**

Add Node 24 and UI commands:

```markdown
## UI

```bash
# use Node 24
nvm use

# development
pnpm dev:ui

# production build
pnpm build:ui

# lint
pnpm lint:ui
```
```

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm --filter @vote/ui lint
```

Expected: command exits with code 0.

- [ ] **Step 3: Run build**

Run:

```bash
pnpm --filter @vote/ui build
```

Expected: command exits with code 0 and `.next` build output is generated under `ui/.next`.

- [ ] **Step 4: Check git status**

Run:

```bash
git status --short
```

Expected: only intended UI setup, lockfile, README, `.nvmrc`, and plan files are modified or added.
