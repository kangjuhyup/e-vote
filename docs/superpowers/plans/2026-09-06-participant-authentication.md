# Participant authentication implementation plan

Goal: Enable explicitly configured development Mock identity verification, persist its outcome, and authorize ballot submission against the authenticated principal.
Architecture: Provider call outside transactions; a dedicated verification repository locks and rechecks the elector, records outcomes and prevents transaction replay. Participation checks persisted principal binding inside its existing cast transaction.
Toolchain: Node 24.20.0 (.nvmrc: 24), pnpm 9.15.9.
User scope: Mock provider first. Execute inline under repository Superpowers policy.

- [x] Add development/test-only mock provider, deterministic success/failure transaction prefixes and fail-closed default.
- [x] Persist authenticated principal and mock marker on verification history; reject replay, blocked electors, identity changes and principal rebinding atomically.
- [x] Pass trusted principal from controllers; authorize every participation channel through persisted verification; use server submission time.
- [x] Cover provider configuration, authentication persistence, impersonation, replay, HTTP validation, existing voting rules and database behavior.
- [x] Document local setup and API examples; run backend tests, build and focused lint.

Validation:
- Backend suite: 129 suites / 752 tests passed.
- Dedicated PostgreSQL 16 integration suite: 14 tests passed, including persisted authorization, replay/rebinding, concurrent binding and authenticated casting with atomic results.
- HTTP contracts include login requirement, trusted principal mapping, server timestamps, malformed inputs, 403 and disabled-provider 503.
- Nest build passed. Final changed-file ESLint and diff checks are recorded in the handoff.
- Independent security review found no blocking issue. Real-provider work must define binding invalidation on later identity edits, proof freshness and identity matching; Mock deliberately simulates those checks.
- Migration was applied only to an isolated disposable test database, not the running local application database.
