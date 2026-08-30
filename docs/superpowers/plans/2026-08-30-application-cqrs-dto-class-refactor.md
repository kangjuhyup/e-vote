# Application CQRS DTO Class Refactor Implementation Plan

> **For agentic workers:** Follow the repository `AGENTS.md` policy. Execute inline in this session; do not invoke subagent execution skills unless the user explicitly requests them.

**Goal:** Place application command/query request and response DTOs in dedicated directories and make every DTO constructible only through `static of()`.

**Architecture:** Commands and queries remain the write/read request messages but move under `application/{command,query}/dto/request`. Command handler results become framework-free classes under `application/command/dto/response`, and query read models move from `query/view` to `query/dto/response`. Every DTO has a private constructor, readonly state, and a single public `of()` factory; handlers return DTO instances instead of object literals.

**Tech Stack:** NestJS, TypeScript, Jest

**Spec:** User request from 2026-08-30: replace command/query request and return interfaces with classes in DTO directories and initialize them only through `of()`.

## Global Constraints

- Preserve all HTTP response shapes and application behavior.
- Keep application DTOs free of NestJS, Swagger, ORM, and infrastructure imports.
- Use `private constructor` and `static of()` for every request and response DTO.
- Do not export standalone request/result `type` or `interface` declarations from command/query handlers.
- Keep domain value types as domain types; do not duplicate domain enums or value objects in DTOs.
- Update presentation, infrastructure ports/adapters, and tests to import the new DTO locations.

---

### Task 1: Relocate request DTO classes

**Files:**

- Move: `server/src/application/command/*.command.ts` to `server/src/application/command/dto/request/`
- Move: `server/src/application/query/*.query.ts` to `server/src/application/query/dto/request/`
- Modify: all application handlers, presentation controllers, tests, and local query utilities importing these classes

**Interfaces:**

- Produces the same public command/query class names and `of(params)` signatures at their new locations.

- [x] Move every command request class without changing its data contract.
- [x] Move every query request class without changing its data contract.
- [x] Update relative imports inside moved files and all consumers.
- [x] Verify direct construction remains impossible because constructors stay private.

### Task 2: Convert command results to response DTO classes

**Files:**

- Create: `server/src/application/command/dto/response/*.dto.ts`
- Modify: `server/src/application/command/handler/*.handler.ts`
- Modify: presentation response DTO source imports and command-handler tests

**Interfaces:**

- Produces one response class per existing command result contract, preserving existing result class names where they already exist.
- Produces response classes for previously inferred management results such as vote, vote detail, candidate, elector, and field-session status changes.

- [x] Replace exported handler result `type` declarations with DTO classes.
- [x] Replace every command-handler result object literal with `<ResultClass>.of({...})`.
- [x] Give each response class a private constructor and readonly properties.
- [x] Update handler return types and downstream imports.

### Task 3: Relocate query response DTO classes

**Files:**

- Move: `server/src/application/query/view/*.view.ts` to `server/src/application/query/dto/response/`
- Modify: query handlers, query persistence ports/adapters, presentation DTO sources, and tests

**Interfaces:**

- Produces the same read DTO class names (`VoteView`, `ElectorView`, `VoteResultView`, and peers) at the new path.
- Removes exported `*Props` aliases by accepting inline readonly parameter objects in `static of()`.

- [x] Move every query return class to the response DTO directory.
- [x] Remove exported view-props type aliases where they only serve DTO construction.
- [x] Preserve nested DTO construction through `of()` only.
- [x] Update all read-side consumers to the new locations.

### Task 4: Enforce and verify the convention

**Files:**

- Create: `server/test/application/dto/application-dto-conventions.spec.ts`
- Modify: `docs/superpowers/plans/2026-08-30-application-cqrs-dto-class-refactor.md`

- [x] Add a convention test that finds request/response DTO source files, requires `private constructor` and `static of`, and rejects exported `type`/`interface` DTO declarations.
- [x] Run focused application and presentation tests.
- [x] Run all server tests, build, ESLint, and `git diff --check`.
- [x] Review dependency direction and response-shape compatibility.
- [x] Commit the plan separately from the DTO refactor.
