# Authenticated Participant Voting UI Implementation Plan

> **For agentic workers:** Execute this plan incrementally, preserving the existing UI worktree and safety stashes. Do not commit, push, or restart running processes without an explicit user request.

**Goal:** Connect the elector participation screen to the server's authenticated Mock identity-verification and per-ballot participation APIs.

**Architecture:** Keep HTTP contracts in the participation API module, orchestration and partial-success state in the participation container, and accessible rendering in the participation view. The route accepts real `voteId` and `electorId` UUIDs; missing or malformed identifiers are blocked before any request.

**Tech Stack:** Next.js, React, TypeScript, TanStack Query, Vitest, Testing Library

**Source of truth:** `docs/participant-mock-authentication.md` and the server controllers/DTOs introduced by `5376dea`.

## Task 1: Synchronize and verify contracts

- Preserve tracked/untracked work in a named safety stash without dropping existing stashes.
- Merge local `master` and restore the safety stash.
- Read the merged documentation, controllers, DTOs, and existing UI auth/proxy boundaries.

## Task 2: Implement participation API contracts

- Add typed Mock authentication and participation submission functions using the authenticated Vote API proxy.
- Generate a fresh Mock transaction ID per attempt.
- Validate response envelopes and require `identityVerified === true` or `status === "CAST"`.
- Map 401/403/409/503 failures to actionable Korean messages without treating conflicts as success.

## Task 3: Wire route and lifecycle state

- Validate real `voteId` and `electorId` route parameters before fetching or mutating.
- Load the vote and child ballots through the existing authenticated vote query.
- Gate ballot submission on successful Mock verification.
- Submit each child ballot independently and retain partial successes without automatic retries.

## Task 4: Update the participant UI and tests

- Clearly label the identity step as development-only Mock verification.
- Render missing-link, loading, verification, voting, partial-completion, and completed states accessibly.
- Cover invalid identifiers, authentication failure, request deduplication, successful casting, and partial failures.

## Task 5: Verify integration

- Apply the required local database migration without restarting running processes.
- Run focused tests, full UI tests, lint, typecheck, build, and `git diff --check` under the repository Node version.
- Inspect the live route without sending hardcoded/example identifiers and report any runtime environment blocker.
