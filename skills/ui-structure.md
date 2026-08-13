# Vote UI Structure Rules

Use these rules for the `ui` workspace.

## Core Boundary

Feature slice means feature logic is sliced by feature. It does not mean React components live inside feature folders.
Reusable components are feature-independent presentation units. They must not know feature slices, feature model types, query options, selectors, or Zustand stores.

```text
ui/src/
  app/                  # Next App Router route files, auth gates, providers
  components/           # reusable feature-independent presentation components
    collections/        # reusable list/table/card collection components
    data/               # reusable data display components
    feedback/           # loading/error/empty states
    filters/            # reusable filter controls
    forms/              # reusable form controls
    layout/             # reusable page/layout shells
    ui/                 # shadcn/ui primitives
  features/             # feature logic only
    <feature>/
      api/
      container/         # feature-aware route wiring: hooks, queries, stores
      ui/                # feature-specific hookless page/section composition
      lib/               # feature view-model mappers and labels
      model/
      store/
  shared/               # non-component infrastructure and utilities
```

## Directory Rules

`ui/src/app`:
- Keep route files thin.
- Import feature-aware containers from `@/features/<feature>/container/...` or generic components from `@/components/...`.
- Put app-wide providers in `providers.tsx`.
- Do not put reusable UI components here.

`ui/src/components`:
- Put reusable presentation components here.
- Put shadcn primitives in `ui/src/components/ui`.
- Organize by UI role (`layout`, `feedback`, `data`, `filters`, `forms`, `collections`), not by feature name.
- Do not create folders that mirror feature slice names such as `components/votes` or `components/dashboard`.
- Do not import from `@/features`.
- Do not import feature model types, query options, selectors, or Zustand stores.
- Components receive data, state, labels, and callbacks through props.
- Component prop types must be component-local view types, primitives, or generic React types.
- Keep components small and single-purpose. Split large composed views into shell, section, row, control, state, and summary components.

`ui/src/features`:
- Put feature-owned query options, API functions, model types, schemas, Zustand stores, feature containers, feature UI, and feature view-model helpers here.
- Put feature-aware route wiring in `ui/src/features/<feature>/container`.
- Put feature-specific hookless page/section/row composition in `ui/src/features/<feature>/ui`.
- Put feature view-model mappers, labels, and display adapters in `ui/src/features/<feature>/lib`.
- Container files may be `.tsx` and may import feature query options, selectors, model types, Zustand stores, shared utilities, reusable components, feature UI, and feature lib helpers.
- Containers adapt feature data into UI props/view models before passing it to feature UI.
- Container folders contain route-level `*-container.tsx` entries and container tests only. Move rows, sections, cards, controls, summaries, and other JSX composition to `ui`.
- Feature UI files may be `.tsx`, may import reusable components, feature model types, and feature lib helpers, but must not import React Query, Zustand stores, feature API modules, or selectors.
- Feature lib files must stay non-React and must not import reusable components.
- Do not create `.tsx` files outside `ui/src/features/<feature>/container` or `ui/src/features/<feature>/ui`.
- Do not declare reusable presentation components here; reusable components still belong in `ui/src/components`.
- Do not import from `@/components` outside `ui/src/features/<feature>/container` or `ui/src/features/<feature>/ui`.

`ui/src/shared`:
- Put cross-feature non-component utilities, config, adapters, constants, and helpers here.
- `shared/lib/utils.ts` owns `cn`.
- `shared/config/query-client.ts` owns React Query client setup.

## Import Rules

Allowed directions:

```text
app -> features/<feature>/container, components, shared
features/<feature>/container -> features/<feature>/ui, features/<feature>/lib, components, feature siblings, shared
features/<feature>/ui -> features/<feature>/lib, components, feature model types, shared
features/<feature>/lib -> feature model types, shared
components -> components, shared
features/<feature>/{api,model,store} -> shared
shared -> no app/components/features imports
components/ui -> shared/lib/utils only
```

Feature internals should be consumed from containers, not from components:

```ts
import { dashboardMetricsQueryOptions } from "@/features/dashboard/api/dashboard-query-options";
import type { DashboardMetric } from "@/features/dashboard/model/dashboard.types";
import { useDashboardUiStore } from "@/features/dashboard/store/dashboard-ui.store";
```

Route files should compose containers:

```tsx
import { DashboardContainer } from "@/features/dashboard/container/dashboard-container";

export default function Home() {
  return <DashboardContainer />;
}
```

## State Rules

Use Zustand for synchronous client/UI state: selected filters, display density, open panels, local draft state.

Use TanStack React Query for asynchronous server state: queries, mutations, cache keys, invalidation, loading/error state.

Do not duplicate server state into Zustand.

Use Zustand and TanStack React Query from containers or app-level wiring, not from reusable components. Components receive current values and event callbacks as props.
Do not use Zustand or TanStack React Query from feature UI files. Feature UI receives current values, filtered data, display labels, and callbacks from its container.

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

Keep shadcn primitives generic. Do not add feature-specific behavior to `components/ui/*`.
Keep all `components/*` generic. Feature-specific composition belongs in `features/<feature>/ui/*`, and feature-aware data/state wiring belongs in `features/<feature>/container/*`.

## Naming

Use kebab-case filenames.

Use these suffixes:

- Feature query options: `<feature>-query-options.ts`
- Feature Zustand store: `<feature>-ui.store.ts`
- Feature types: `<feature>.types.ts`
- Route-level container: `<feature>-container.tsx`
- Feature UI files: name by feature role, e.g. `<feature>-list-row.tsx`, `<feature>-detail-summary.tsx`
- Feature lib files: name by adapter role, e.g. `<feature>-view-models.ts`
- shadcn primitive files: `button.tsx`, `card.tsx`, `badge.tsx`
- Generic component files: name by UI role, e.g. `page-shell.tsx`, `retry-error-card.tsx`, `segmented-filter.tsx`

## Checklist

Before finishing a UI change:

- No `.tsx` files exist under `ui/src/features` outside `<feature>/container` or `<feature>/ui`.
- No non-container JSX composition files exist in `<feature>/container`.
- No `@/components` imports exist under `ui/src/features` outside `<feature>/container` or `<feature>/ui`.
- No React Query, Zustand store, feature API, or selector imports exist under `<feature>/ui`.
- No React component imports exist under `<feature>/lib`.
- No `@/features` imports exist under `ui/src/components`.
- No `components` subdirectory mirrors a feature slice name.
- Route files in `ui/src/app` stay thin.
- shadcn primitives are under `ui/src/components/ui`.
- Reusable components are feature-independent and props-only.
- Feature-aware wiring lives under `ui/src/features/<feature>/container`.
- Feature-specific hookless UI composition lives under `ui/src/features/<feature>/ui`.
- Feature view-model adapters live under `ui/src/features/<feature>/lib`.
- Large page-level units are split into focused shell, state, control, section, row, and summary units.
- React Query logic is not copied into Zustand.
- `pnpm --filter @vote/ui lint` passes.
- `pnpm --filter @vote/ui build` passes for structural or route changes.
