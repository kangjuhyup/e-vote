# UI Initial Setup Design

## Goal

Initialize the `ui` workspace as a Next.js frontend for the electronic voting service.

## Scope

- Convert the existing `ui` placeholder package into a Next.js application.
- Use Node 24 as the frontend runtime baseline.
- Use Next.js latest stable from npm at setup time: `next@16.3.0`.
- Use React latest stable from npm at setup time: `react@19.2.8` and `react-dom@19.2.8`.
- Use Zustand for client UI state.
- Use TanStack React Query for server state.
- Use shadcn/ui as the default component design system.
- Organize frontend source code with a feature slice structure.
- Keep server code unchanged.

## Architecture

The frontend is a single Next.js App Router application under `ui`. Next app routes stay in `ui/src/app`, while feature-owned UI, hooks, queries, stores, and model code live under `ui/src/features/<feature>`.

Shared cross-feature code lives under `ui/src/shared`. Application-wide providers live under `ui/src/app/providers.tsx` so App Router layouts can wrap the full client tree without leaking provider setup into feature slices.

Directory shape:

```text
ui/
  src/
    app/
      globals.css
      layout.tsx
      page.tsx
      providers.tsx
    features/
      dashboard/
        api/
          dashboard-query-options.ts
        model/
          dashboard.types.ts
        store/
          dashboard-ui.store.ts
        ui/
          dashboard-page.tsx
    shared/
      config/
        query-client.ts
      lib/
        utils.ts
      ui/
        badge.tsx
        button.tsx
        card.tsx
        separator.tsx
```

## Feature Slice Rules

Each feature owns its route-level composition, feature-specific API query options, local Zustand stores, and feature-only types.

`src/app` imports feature entry components but does not hold feature logic.

`src/shared` contains reusable primitives and infrastructure that are not owned by a single feature. shadcn/ui components are stored in `src/shared/ui` to keep design primitives separate from feature slices.

Cross-feature imports should point to `src/shared` or explicit feature entry files. A feature must not reach into another feature's internal `api`, `store`, or `model` folders in this setup phase.

## State Management

Zustand is used for synchronous client UI state. The initial dashboard slice stores selected vote status and display density, proving the wiring without inventing backend behavior.

React Query is used for asynchronous server state. The setup includes a shared `QueryClient` factory and app-level `QueryClientProvider`. The initial dashboard query returns mock operational metrics through an async function so future API integration can replace the function body without changing the component boundary.

React Query Devtools are not included in this phase to keep dependencies minimal.

## Design System

shadcn/ui is configured with Tailwind CSS and CSS variables. The initial component set is intentionally small:

- `Button`
- `Badge`
- `Card`
- `Separator`

The initial dashboard page uses these components directly from `src/shared/ui`.

## Runtime And Tooling

Root package metadata records Node 24 as the expected runtime. The root workspace scripts delegate UI commands through pnpm filters:

- `dev:ui`
- `build:ui`
- `lint:ui`

The `ui` package defines its own Next.js scripts:

- `dev`
- `build`
- `start`
- `lint`

TypeScript path alias `@/*` points to `ui/src/*`.

## Initial Screen

The first screen is a working electronic voting operations dashboard starter. It should demonstrate:

- shadcn/ui primitives rendering correctly.
- Zustand state changing through client controls.
- React Query loading dashboard metrics.
- Feature slice imports through a route-level page component.

The screen is a starter UI, not a complete voting product workflow.

## Testing And Verification

Verification commands:

```bash
pnpm --filter @vote/ui lint
pnpm --filter @vote/ui build
```

If the local Node executable is not Node 24, implementation should still be compatible with Node 24 and should document the local version used for verification.

## Out Of Scope

- Server API integration.
- Authentication.
- Internationalization.
- Real vote, elector, candidate, or participation management flows.
- Shared package extraction.
- Deployment or hosting.
