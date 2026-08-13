# Create Vote API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add API boundaries for `POST /votes`, `PUT /votes/:voteId/sub-votes`, `PUT /votes/:voteId/electors`, `PUT /votes/:voteId/electors/:electorId/authentication`, and candidate creation through presentation, application, domain, and persistence ports.

**Architecture:** Resource controllers map HTTP input to command handlers. `VoteController` owns parent votes, `VoteDetailController` owns child votes, `ElectorController` owns elector creation/authentication, and `CandidateController` owns candidates. Handlers create or update domain aggregates and save them through repository ports. No persistence adapters are added in this task; Nest module provider wiring is deferred until real adapters exist.

**Tech Stack:** NestJS 11, TypeScript, Jest, Supertest, existing vote domain aggregates.

## Global Constraints

- POST routes call command handlers.
- Controllers stay thin and do not contain business logic.
- Application/domain stay framework-free except Nest provider decoration on handlers where required for DI.
- Define application ports only; do not add persistence adapters in this task.
- Controller request/response DTOs live in presentation and are transport-local schemas.
- Controller DTOs must not import application, domain, or infrastructure modules; they must declare OAS fields/enums with Swagger decorators and map to application commands at the controller boundary.
- Absence is represented with `undefined`, not `null`, across DTO, application, and domain models. Optional OAS fields are omitted rather than marked `nullable`.
- Controllers are split by resource ownership, not URL prefix: `VoteController` owns parent vote creation, `VoteDetailController` owns child vote creation, `ElectorController` owns elector creation/authentication, and `CandidateController` owns candidate creation.
- Application ports and handlers communicate with domain models only. Infrastructure adapters must map infrastructure payloads/entities to domain models before crossing into application.
- Elector authentication uses an application port that accepts `ElectorAggregate` plus domain identity verification evidence/result models. Provider payloads and SDK response shapes must stay in infrastructure adapters.
- Infrastructure types, ORM entities, provider payloads, cache payloads, and SDK results must not leak into application/domain.
- Command classes use private constructor plus static `of()`.
- Write handler returns a small command result: `id` and `status`.

---

## Task 1: Command Handlers and Repository Ports

- [ ] Write a failing command handler unit test that verifies a valid command saves a draft vote and returns `{ id, status: 'DRAFT' }`.
- [ ] Write failing command handler unit tests for child vote and elector creation.
- [ ] Add `CreateVoteCommand`, `CreateVoteDetailCommand`, and `CreateElectorCommand`.
- [ ] Add `CreateVoteHandler`, `CreateVoteDetailHandler`, and `CreateElectorHandler`.
- [ ] Add `VoteRepositoryPort`, `VoteDetailRepositoryPort`, and `ElectorRepositoryPort`.
- [ ] Run command handler tests until green.

## Task 2: HTTP Controller Boundary

- [ ] Add `create-vote-request.dto.ts`.
- [ ] Add `create-vote-response.dto.ts`.
- [ ] Add child vote request/response DTOs.
- [ ] Add elector request/response DTOs.
- [ ] Update `VoteController` methods for `POST /votes`, `PUT /votes/:voteId/sub-votes`, and `PUT /votes/:voteId/electors`.
- [ ] Do not register `VoteController` or handlers in `AppModule` until repository adapters are available.
- [ ] Run controller unit tests until green.

## Task 3: Final Verification

- [ ] Run `nvm use 24 && pnpm --filter @vote/server test -- --runInBand`.
- [ ] Run `nvm use 24 && pnpm --filter @vote/server exec jest --config ./test/jest-e2e.json --runInBand`.
- [ ] Run `nvm use 24 && pnpm --filter @vote/server build`.
