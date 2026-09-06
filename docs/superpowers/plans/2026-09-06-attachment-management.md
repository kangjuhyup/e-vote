# Attachment Management Completion Plan

**Goal:** Complete vote, vote-detail, and candidate attachment management without exposing storage internals or weakening vote ownership and mutability rules.

## Contract

- Upload URL and confirmation commands carry the authenticated user principal ID and allow only the vote creator.
- Vote and candidate read models expose active attachment metadata, never `storageKey`, checksum, or a permanent object URL.
- An owner-only endpoint issues a short-lived download URL after resolving the attachment against the full target path.
- An owner-only delete endpoint removes the object and marks/removes its attachment metadata while the vote remains mutable.
- Existing target hierarchy validation and vote lifecycle locking remain authoritative; adapters do not fork an `EntityManager`.

## Implementation

1. Add failing application and controller tests for ownership propagation, fail-closed legacy votes, download authorization, deletion, and transaction-time revalidation.
2. Extend the attachment command/query ports and storage gateway with attachment lookup/delete operations, then implement them in MikroORM and Wasabi adapters.
3. Add download/delete handlers, response DTOs, error mapping, Swagger contracts, routes, and Nest provider registration for all three attachment targets.
4. Extend vote/candidate read projections with sanitized active attachment metadata and load collection relations via `SELECT_IN` to avoid N+1 queries and joined-populate identity-map regressions.
5. Add persistence/projection/storage regression coverage, run focused tests, full tests, lint, build, and an isolated PostgreSQL integration check where available.

## Safety

- Preserve all existing worktree changes and running processes.
- Do not modify the UI worktree or expose secrets/DB connection information.
- Do not commit, merge, push, or open a PR without a separate request.
