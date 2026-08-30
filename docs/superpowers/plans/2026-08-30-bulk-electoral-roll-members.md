# Bulk Electoral Roll Members Implementation Plan

> **For agentic workers:** Implement these tasks in order and keep each task independently verifiable.

**Goal:** Allow one electoral-roll request to register thousands or tens of thousands of members atomically while creating one automatic snapshot for the resulting revision.

**Architecture:** Keep the HTTP request shape in presentation, model the batch as one application command, and persist all new member aggregates through a batch repository port. The handler advances the roll revision once and creates one snapshot in the same serializable transaction.

**Tech Stack:** NestJS 11, TypeScript, MikroORM 7, PostgreSQL, Jest

**Spec:** `docs/api/electoral-rolls.md`

## Global Constraints

- `PUT /electoral-rolls/{electoralRollId}/members` receives `{ "members": [...] }`.
- A request contains between 1 and 50,000 members.
- The whole batch succeeds or rolls back; duplicate identifiers are conflicts.
- One accepted batch advances the source roll by one revision and creates one snapshot.
- The command response contains only the roll ID, revision, and added count.

---

### Task 1: Batch command and handler

**Files:**
- Create: `server/src/modules/electoral-roll/application/command/dto/request/add-electoral-roll-members.command.ts`
- Create: `server/src/modules/electoral-roll/application/command/dto/response/add-electoral-roll-members-result.dto.ts`
- Create: `server/src/modules/electoral-roll/application/command/handler/add-electoral-roll-members.handler.ts`
- Modify: `server/src/modules/electoral-roll/application/command/electoral-roll.error.ts`
- Test: `server/test/application/command/handler/electoral-roll.handlers.spec.ts`

**Interfaces:**
- Consumes: `ElectoralRollRepositoryPort.saveMembers(members)` and `ElectoralRollSnapshotCreator.createForCurrentRevision(...)`.
- Produces: `AddElectoralRollMembersHandler.execute(command): Promise<AddElectoralRollMembersResult>`.

- [ ] Add a failing handler test with two members and assert one repository batch save, one revision increase, and one snapshot containing both members.
- [ ] Add failure tests for an empty batch, more than 50,000 members, and duplicate normalized identifiers.
- [ ] Implement immutable member input values and command validation with the exact 1..50,000 limit.
- [ ] Create all member aggregates before persistence, batch-save them, save the roll once, and snapshot once inside a serializable transaction.
- [ ] Run `pnpm test -- electoral-roll.handlers.spec.ts` and confirm all focused tests pass.

### Task 2: Batch persistence adapter

**Files:**
- Modify: `server/src/modules/electoral-roll/application/port/persistence/command/electoral-roll-repository.port.ts`
- Modify: `server/src/modules/electoral-roll/infrastructure/database/repository/command/electoral-roll-repository.adapter.ts`
- Test: `server/test/infrastructure/database/repository/electoral-roll-repository.adapters.spec.ts`

**Interfaces:**
- Consumes: `readonly ElectoralRollMemberAggregate[]`.
- Produces: `saveMembers(...): Promise<void>` that enqueues all entities and flushes once.

- [ ] Add an adapter test proving multiple members are persisted with one flush.
- [ ] Add `saveMembers` to the port and implement one ORM unit-of-work flush for the batch.
- [ ] Keep `saveMember` for the existing single-member update path.
- [ ] Run the repository adapter spec and confirm it passes.

### Task 3: HTTP contract and payload capacity

**Files:**
- Create: `server/src/modules/electoral-roll/presentation/electoral-roll/dto/add-electoral-roll-members-request.dto.ts`
- Create: `server/src/modules/electoral-roll/presentation/electoral-roll/dto/add-electoral-roll-members-response.dto.ts`
- Modify: `server/src/modules/electoral-roll/presentation/electoral-roll/electoral-roll.controller.ts`
- Modify: `server/src/modules/electoral-roll/presentation/electoral-roll/electoral-roll-error.mapper.ts`
- Modify: `server/src/app.module.ts`
- Modify: `server/src/main.ts`
- Test: `server/test/presentation/route/electoral-roll/electoral-roll.controller.spec.ts`

**Interfaces:**
- Consumes: `{ members: Array<{ identifier, groupKey?, voteWeight? }> }`.
- Produces: `{ electoralRollId, revision, addedMemberCount }` with HTTP 201.

- [ ] Add a controller test asserting all request members are mapped into one command.
- [ ] Replace the single-member handler wiring with the batch handler and summary response.
- [ ] Map invalid batch sizes to HTTP 400 and duplicate identifiers to HTTP 409.
- [ ] Configure a bounded 32 MB JSON body parser so tens of thousands of compact member records can reach the endpoint.
- [ ] Run the controller and module specs.

### Task 4: Contract documentation and verification

**Files:**
- Modify: `docs/api/electoral-rolls.md`

- [ ] Document the request, response, limits, atomicity, duplicate behavior, and automatic snapshot behavior.
- [ ] Run focused electoral-roll tests.
- [ ] Run the full server test suite, build, and no-fix lint.
- [ ] Run `git diff --check` and review the final diff for unrelated changes.
