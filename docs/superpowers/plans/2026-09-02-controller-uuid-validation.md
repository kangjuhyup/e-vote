# Controller UUID Validation Implementation Plan

> **For agentic workers:** Execute this plan inline. Repository policy does not permit `executing-plans` or `subagent-driven-development` unless the user explicitly requests those skills.

**Goal:** Reject every malformed database UUID received by a controller DTO with HTTP 400 before a handler or repository is invoked.

**Architecture:** Keep validation in presentation request DTOs with `class-validator` decorators and activate Nest's global `ValidationPipe`. Validate required scalar UUIDs with `@IsUUID()`, optional UUIDs with `@IsOptional()` plus `@IsUUID()`, and UUID arrays with `@IsUUID('all', { each: true })`; external string identifiers such as OIDC subjects, identity-provider transaction IDs, and storage keys remain strings.

**Tech Stack:** NestJS 11, class-validator, class-transformer, Jest, Supertest

**Spec:** User request dated 2026-09-02 in the current conversation.

## Global Constraints

- Validation belongs to presentation DTOs; application and domain layers remain framework-free.
- Database UUIDs of any canonical UUID version are accepted.
- Invalid UUIDs return HTTP 400 before command/query handlers execute.
- Existing concurrent electoral-roll commission-decoupling changes must be preserved.

---

### Task 1: Activate request validation

**Files:**
- Modify: `server/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `server/src/main.ts`
- Modify: `server/test/main.spec.ts`

**Interfaces:**
- Consumes: Nest application bootstrap
- Produces: one global `ValidationPipe` used by all controller request DTOs

- [x] Add direct `class-transformer` and `class-validator` runtime dependencies.
- [x] Add `app.useGlobalPipes(new ValidationPipe())` before the application starts listening.
- [x] Extend the bootstrap unit test to verify that a global pipe is registered.

### Task 2: Decorate every database UUID request field

**Files:**
- Modify request DTOs under `server/src/modules/{billing,election-commission,elector,electoral-roll,field-voting,participation,vote}/presentation/**/dto/`.

**Interfaces:**
- Consumes: `IsUUID` and `IsOptional` from `class-validator`
- Produces: UUID validation metadata for `billingOrderId`, `voteId`, `commissionId`, `electorId`, `electoralRollId`, `memberId`, `fieldVotingSessionId`, `managerIds`, `verifiedByCommissionMemberId`, `evidenceFileId`, `participationId`, `voteDetailId`, `selectedCandidateId`, `candidateId`, and `smsDispatchId`

- [x] Add `@IsUUID()` to every required scalar database UUID property.
- [x] Add `@IsOptional()` and `@IsUUID()` to optional database UUID properties.
- [x] Add `@IsUUID('all', { each: true })` to UUID arrays.
- [x] Mark OpenAPI UUID properties with `format: 'uuid'` and replace pseudo-ID examples with valid UUID examples where examples exist.
- [x] Leave `userPrincipalId`, `transactionId`, `storageKey`, business identifiers, and hashes as strings because their persistence types are not UUID.

### Task 3: Prove rejection occurs at the HTTP boundary

**Files:**
- Create: `server/test/presentation/request-uuid-validation.spec.ts`
- Modify: `server/test/app.e2e-spec.ts`

**Interfaces:**
- Consumes: decorated request DTO classes and the global `ValidationPipe`
- Produces: regression coverage for all audited UUID fields and an HTTP 400 assertion

- [x] Add a table-driven metadata test that submits malformed values to each audited DTO through `ValidationPipe.transform()` and expects `BadRequestException`.
- [x] Add valid UUID cases, including optional absence and UUID arrays, to prevent over-rejection.
- [x] Configure the e2e application with the production `ValidationPipe` and assert authenticated requests containing malformed UUID route/body values receive wrapped HTTP 400 responses.
- [x] Run the focused validation tests, complete server unit suite, e2e suite, build, and lint check.
