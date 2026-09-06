# Electoral Roll Identity Profile UI Implementation Plan

> **For agentic workers:** Execute this plan in the current UI worktree without committing, merging, pulling, or restarting any running process.

**Goal:** Add optional electoral-roll identity profile fields to the UI contract, editing/import workflows, masked detail display, and identity-required vote attachment error handling.

**Architecture:** Keep transport state in the feature API layer, pure member validation in the feature lib layer, query/mutation coordination in containers, and hook-free rendering in feature UI components. Preserve masked GET values without sending unchanged masks back in PATCH requests.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Testing Library, ExcelJS, pnpm.

**Spec:** User-provided server API contract dated 2026-09-03.

## Task 1: Extend electoral-roll contracts and mock/live APIs

- [x] Add optional `name`, `phoneNumber`, and `birthDate` fields to member request/response and draft types.
- [x] Pass the fields through bulk create and member update requests.
- [x] Keep raw profile values in mock state while returning server-equivalent masked values from mock GET responses.
- [x] Add HTTP status to `VoteApiError` without exposing request bodies or sensitive values.

## Task 2: Add reusable validation and spreadsheet support

- [x] Validate name/phone pairing, normalized phone digit length, real `YYYY-MM-DD` dates, and birth-date profile dependency.
- [x] Avoid sending unchanged masked profile fields in PATCH; require both raw name and phone when either identity value is replaced.
- [x] Expand the template/import columns and parsing rules to include the three optional fields.
- [x] Add focused unit tests for validation and workbook behavior.

## Task 3: Update electoral-roll member UI and container flow

- [x] Add accessible add/edit fields and guidance for identity data.
- [x] Display masked values exactly as returned by the API and include them in member search.
- [x] Preserve identity fields through draft, import, create, and update flows.
- [x] Extend component/container regression tests.

## Task 4: Handle identity-required vote attachment failures

- [x] Pass the vote identity-verification requirement into roll attachment calls.
- [x] Map applicable 400 responses to the requested Korean guidance while retaining other server errors.
- [x] Mirror the contract in mock vote creation/attachment behavior and add API regression tests.

## Task 5: Verify without changing process or Git state

- [x] Run targeted Vitest suites.
- [x] Run the full UI test suite and lint.
- [x] Run the UI build as the TypeScript/typecheck validation available in this package.
- [x] Report changed files, verification results, and the pending need to synchronize the future server commit. Do not commit, push, open a PR, merge, or restart processes.
