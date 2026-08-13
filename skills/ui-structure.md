# Vote UI Structure Rules

Use these rules for the `ui` workspace.

## Core Boundary

Feature slice means feature logic is sliced by feature. It does not mean React components live inside feature folders.

```text
ui/src/
  app/                  # Next App Router route files and providers only
  components/           # every React component declaration
    ui/                 # shadcn/ui primitives
    <feature>/          # composed domain components
  features/             # feature logic only
    <feature>/
      api/
      model/
      store/
  shared/               # non-component infrastructure and utilities
```

## Directory Rules

`ui/src/app`:
- Keep route files thin.
- Import composed components from `@/components/...`.
- Put app-wide providers in `providers.tsx`.
- Do not put feature logic or reusable UI components here.

`ui/src/components`:
- Put every React component declaration here.
- Put shadcn primitives in `ui/src/components/ui`.
- Put domain-specific composed components in `ui/src/components/<feature>`.
- Components may consume feature query options, stores, model types, and shared utilities.

`ui/src/features`:
- Put feature-owned query options, API functions, model types, schemas, and Zustand stores here.
- Do not create `.tsx` component files here.
- Do not declare JSX-returning components here.
- Do not import from `@/components`.

`ui/src/shared`:
- Put cross-feature non-component utilities, config, adapters, constants, and helpers here.
- `shared/lib/utils.ts` owns `cn`.
- `shared/config/query-client.ts` owns React Query client setup.

## Import Rules

Allowed directions:

```text
app -> components, shared
components -> components, features, shared
features -> shared
shared -> no app/components/features imports
components/ui -> shared/lib/utils only
```

Feature internals should be consumed through explicit imports such as:

```ts
import { dashboardMetricsQueryOptions } from "@/features/dashboard/api/dashboard-query-options";
import type { DashboardMetric } from "@/features/dashboard/model/dashboard.types";
import { useDashboardUiStore } from "@/features/dashboard/store/dashboard-ui.store";
```

Route files should compose components:

```tsx
import { DashboardPage } from "@/components/dashboard/dashboard-page";

export default function Home() {
  return <DashboardPage />;
}
```

## State Rules

Use Zustand for synchronous client/UI state: selected filters, display density, open panels, local draft state.

Use TanStack React Query for asynchronous server state: queries, mutations, cache keys, invalidation, loading/error state.

Do not duplicate server state into Zustand.

## shadcn/ui Rules

Configure shadcn aliases so generated primitives land in `@/components/ui`.

```json
{
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "utils": "@/shared/lib/utils",
    "lib": "@/shared/lib"
  }
}
```

Keep shadcn primitives generic. Do not add vote-specific behavior to `components/ui/*`; compose vote-specific behavior in `components/<feature>/*`.

## Naming

Use kebab-case filenames.

Use these suffixes:

- Feature query options: `<feature>-query-options.ts`
- Feature Zustand store: `<feature>-ui.store.ts`
- Feature types: `<feature>.types.ts`
- Route-level composed page component: `<feature>-page.tsx`
- shadcn primitive files: `button.tsx`, `card.tsx`, `badge.tsx`

## Checklist

Before finishing a UI change:

- No `.tsx` files exist under `ui/src/features`.
- No `@/components` imports exist under `ui/src/features`.
- Route files in `ui/src/app` stay thin.
- shadcn primitives are under `ui/src/components/ui`.
- Feature-specific components are under `ui/src/components/<feature>`.
- React Query logic is not copied into Zustand.
- `pnpm --filter @vote/ui lint` passes.
- `pnpm --filter @vote/ui build` passes for structural or route changes.
