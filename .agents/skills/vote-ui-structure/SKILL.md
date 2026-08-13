---
name: vote-ui-structure
description: Use when adding, changing, or reviewing vote frontend UI structure, Next.js routes, React components, shadcn/ui primitives, Zustand stores, React Query query options, or feature slice boundaries under the ui workspace.
---

# Vote UI Structure

Canonical rules: `../../../skills/ui-structure.md`

Before working on vote frontend UI code, read and apply the canonical rules above.

Non-negotiable boundary: reusable components are feature-independent. Do not place feature-slice folders under `ui/src/components`, and do not import `@/features` from `ui/src/components`. Put feature-aware React Query/Zustand wiring in `ui/src/features/<feature>/container`, hookless feature-specific JSX composition in `ui/src/features/<feature>/ui`, and view-model adapters in `ui/src/features/<feature>/lib`. Put UI tests under `ui/test`, not under `ui/src`.
