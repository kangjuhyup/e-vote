# SMS Participation Capability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add permanent administrator-issued SMS participation links that give an elector browser-scoped voting access before close and aggregate-result-only access after close without OIDC.

**Architecture:** Keep the existing OIDC participation surface unchanged. Add a separate participation-access aggregate, persistence adapter, signed-reference/session-token ports, authenticated administration commands, public capability controllers, and a dedicated durable SMS delivery worker. Every mutation derives vote and elector identity from a server-side session, while PostgreSQL locks and uniqueness constraints enforce one active participation browser per invitation generation.

**Tech Stack:** NestJS 11, TypeScript, MikroORM 7/PostgreSQL, `@rvkang/batch-core`, Jest, Node `crypto`, existing storage/SMS ports.

**Spec:** `docs/superpowers/specs/2026-09-06-sms-participation-capability-design.md`

## Global Constraints

- Do not change or weaken the existing OIDC identity-required participation path.
- The SMS link has no time expiry; only explicit revocation, rotation, generation mismatch, vote/elector state, or retention removes access.
- Never store or log raw link tokens, session tokens, phone numbers, signatures, cookies, or elector personal data.
- No network I/O may occur inside a database transaction.
- API and worker remain separate processes; the API only persists durable delivery work.
- Do not modify the UI worktree or unrelated billing/blockchain files already dirty in this worktree.
- New ORM option objects must be created per call and never shared across requests.

---

### Task 1: Participation access domain model

**Files:**

- Create: `server/src/modules/participation/domain/access/participation-invitation.aggregate.ts`
- Create: `server/src/modules/participation/domain/access/elector-participant-session.aggregate.ts`
- Create: `server/src/modules/participation/domain/access/participation-access.error.ts`
- Test: `server/test/domain/participation/participation-access-domain.spec.ts`

**Interfaces:**

- Produces: `ParticipationInvitationAggregate.issue`, `.reconstitute`, `.claimForParticipation`, `.rotate`, `.revoke`, `.allowsResultAccess`.
- Produces: `ElectorParticipantSessionAggregate.issueParticipation`, `.issueResultRead`, `.assertUsable`, `.revoke`, and `ParticipantSessionScope`.

- [ ] **Step 1: Write failing domain tests**

```ts
it('allows exactly one browser claim for a current generation', () => {
  const invitation = issueInvitation();
  invitation.claimForParticipation('session-a', now);
  expect(() => invitation.claimForParticipation('session-b', now)).toThrow(
    ParticipationInvitationAlreadyClaimedError,
  );
});

it('rotates without a time expiry and invalidates the old generation', () => {
  const invitation = issueInvitation();
  invitation.rotate({
    tokenDigest: 'new-digest',
    issuedByUserPrincipalId: userId,
    now,
  });
  expect(invitation.generation).toBe(2);
  expect(() => invitation.assertCurrentToken(1, 'old-digest')).toThrow(
    InvalidParticipationInvitationError,
  );
});
```

- [ ] **Step 2: Run the domain test and verify RED**

Run: `cd server && pnpm test -- --runInBand test/domain/participation/participation-access-domain.spec.ts`

Expected: FAIL because the domain files do not exist.

- [ ] **Step 3: Implement the domain invariants**

Use pure TypeScript aggregates. `claimForParticipation` is idempotent only for the already recorded session ID; `rotate` increments generation and clears claim state; result access ignores claim ownership but rejects revoked invitations. Session usability rejects digest/generation/scope mismatches, revocation, and expiry for session tokens only.

- [ ] **Step 4: Run the domain test and verify GREEN**

Run: `cd server && pnpm test -- --runInBand test/domain/participation/participation-access-domain.spec.ts`

Expected: PASS.

---

### Task 2: PostgreSQL persistence and safe migration

**Files:**

- Create: `server/src/modules/participation/infrastructure/database/entity/participation-access.entities.ts`
- Create: `server/src/modules/participation/application/port/persistence/command/participation-access-repository.port.ts`
- Create: `server/src/modules/participation/infrastructure/database/mapper/participation-access.mapper.ts`
- Create: `server/src/modules/participation/infrastructure/database/repository/command/participation-access-repository.adapter.ts`
- Modify: `server/src/composition/persistence/database-entity.registry.ts`
- Modify: `server/src/composition/persistence/database-repository.providers.ts`
- Create: `server/src/platform/database/migration/Migration20260906040000.ts`
- Test: `server/test/infrastructure/database/migration/participation-access-migration.spec.ts`
- Test: `server/test/infrastructure/database/mapper/participation-access.mapper.spec.ts`
- Test: `server/test/participation-access.database.e2e-spec.ts`

**Interfaces:**

- Produces: `PARTICIPATION_ACCESS_REPOSITORY_PORT` with `findInvitationByIdForUpdate`, `findSessionByDigest`, `saveInvitation`, `saveSession`, `revokeSessions`, and `enqueueDelivery`.
- Produces: `ParticipationInvitationEntity`, `ElectorParticipantSessionEntity`, and `ParticipationInvitationDeliveryEntity` registered in the shared entity registry.

- [ ] **Step 1: Write failing migration, mapper, and concurrency tests**

```ts
it('marks legacy invitations revoked and nullable-expiry without activating them', async () => {
  await insertLegacyInvitation();
  await runMigration();
  expect(await readInvitation()).toMatchObject({
    generation: 0,
    revoked_at: expect.any(Date),
  });
  expect(await countDeliveries()).toBe(0);
});

it('permits only one live participation session per generation', async () => {
  await insertParticipationSession('session-a');
  await expect(insertParticipationSession('session-b')).rejects.toMatchObject({
    code: '23505',
  });
});
```

- [ ] **Step 2: Run focused persistence tests and verify RED**

Run: `cd server && pnpm test -- --runInBand test/infrastructure/database/migration/participation-access-migration.spec.ts test/infrastructure/database/mapper/participation-access.mapper.spec.ts`

Expected: FAIL because schema/entity/mapper support is absent.

- [ ] **Step 3: Implement schema and adapters**

Make `participation_invitations.expires_at` nullable; add `generation`, `claimed_at`, `claimed_session_id`, `issued_by_user_principal_id`, and `signing_key_id`. Create session and delivery tables, FK constraints, token-digest unique indexes, and the partial unique participation-session index. Update every pre-existing invitation to generation 0 and revoked without creating delivery rows.

- [ ] **Step 4: Run focused persistence tests and verify GREEN**

Run the command from Step 2 plus `cd server && pnpm test:e2e -- --runInBand test/participation-access.database.e2e-spec.ts`.

Expected: PASS against actual PostgreSQL.

---

### Task 3: Signed permanent references and opaque sessions

**Files:**

- Create: `server/src/modules/participation/application/port/security/participation-access-token.port.ts`
- Create: `server/src/modules/participation/infrastructure/security/hmac-participation-access-token.adapter.ts`
- Create: `server/src/modules/participation/infrastructure/security/participation-access-token.config.ts`
- Test: `server/test/infrastructure/security/hmac-participation-access-token.adapter.spec.ts`

**Interfaces:**

- Produces: `PARTICIPATION_LINK_TOKEN_PORT` with `issueReference(invitationId, generation)` and `verifyReference(token)`.
- Produces: `PARTICIPANT_SESSION_TOKEN_PORT` with `issue()` and `digest(token)`.
- Returned reference claims contain only `{ invitationId, generation, keyId, digest }`.

- [ ] **Step 1: Write failing tamper and digest tests**

```ts
it('rejects a modified generation with the same signature', () => {
  const token = adapter.issueReference(invitationId, 1);
  expect(() => adapter.verifyReference(mutateGeneration(token, 2))).toThrow(
    InvalidParticipationAccessTokenError,
  );
});

it('never embeds vote, elector, phone, or expiry claims', () => {
  const token = adapter.issueReference(invitationId, 1);
  expect(decodePayload(token)).toEqual({
    invitationId,
    generation: 1,
    keyId: 'current',
  });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `cd server && pnpm test -- --runInBand test/infrastructure/security/hmac-participation-access-token.adapter.spec.ts`

Expected: FAIL because the adapter is absent.

- [ ] **Step 3: Implement HMAC-SHA-256 and SHA-256 digesting**

Use canonical base64url JSON, `timingSafeEqual`, 256-bit random session tokens, configured key IDs, and generic validation errors. Do not emit token values in errors.

- [ ] **Step 4: Run and verify GREEN**

Run the command from Step 2. Expected: PASS.

---

### Task 4: Creator-authorized dispatch and reissue commands

**Files:**

- Create: `server/src/modules/participation/application/command/dto/request/dispatch-participation-invitations.command.ts`
- Create: `server/src/modules/participation/application/command/dto/request/reissue-participation-invitation.command.ts`
- Create: `server/src/modules/participation/application/command/handler/dispatch-participation-invitations.handler.ts`
- Create: `server/src/modules/participation/application/command/handler/reissue-participation-invitation.handler.ts`
- Create: `server/src/modules/participation/application/port/capability/participation-invitation-recipient-access.port.ts`
- Test: `server/test/application/command/handler/participation-invitation-command.handlers.spec.ts`

**Interfaces:**

- Consumes: vote ownership/status/policy from `VoteRepositoryPort`; eligible recipient references from `ParticipationInvitationRecipientAccessPort`; token digests from Task 3; repository from Task 2.
- Produces: transactional commands that persist invitation rotation and one durable delivery row without sending SMS.

- [ ] **Step 1: Write failing authorization and atomicity tests**

```ts
it.each(['DRAFT', 'CANCELED'])('rejects dispatch in %s', async (status) => {
  votes.findById.mockResolvedValue(vote({ status }));
  await expect(handler.execute(command)).rejects.toThrow(
    ParticipationInvitationStateError,
  );
});

it('rejects required identity verification and a non-creator', async () => {
  votes.findById.mockResolvedValue(
    vote({ required: true, creator: anotherUserId }),
  );
  await expect(handler.execute(command)).rejects.toThrow(
    ParticipationInvitationAccessDeniedError,
  );
});
```

- [ ] **Step 2: Run and verify RED**

Run: `cd server && pnpm test -- --runInBand test/application/command/handler/participation-invitation-command.handlers.spec.ts`

Expected: FAIL because handlers are absent.

- [ ] **Step 3: Implement minimal transactional command flow**

Authorize with `vote.isCreatedBy`, require optional identity, validate FINALIZED/OPEN/CLOSED, skip recipients without a usable encrypted phone reference, and atomically save invitation/session revocations/delivery intent. Reissue must rotate the row and revoke all prior sessions.

- [ ] **Step 4: Run and verify GREEN**

Run the command from Step 2. Expected: PASS.

---

### Task 5: Dedicated invitation SMS batch worker

**Files:**

- Create: `server/src/modules/participation/application/port/gateway/participation-invitation-sms-sender.port.ts`
- Create: `server/src/modules/participation/application/command/handler/process-participation-invitation-delivery.handler.ts`
- Create: `server/src/modules/participation/infrastructure/sms/mock-participation-invitation-sms-sender.adapter.ts`
- Create: `server/src/modules/participation/infrastructure/sms/participation-invitation-sms.worker.ts`
- Modify: `server/src/worker.module.ts`
- Test: `server/test/application/command/handler/process-participation-invitation-delivery.handler.spec.ts`
- Test: `server/test/infrastructure/sms/participation-invitation-sms.worker.spec.ts`
- Modify: `server/test/worker.module.spec.ts`

**Interfaces:**

- Consumes: leaseable delivery rows, current invitation generation, encrypted recipient access, and Task 3 link issuer.
- Produces: `ParticipationInvitationSmsWorker` based on `@rvkang/batch-core/polling`; idempotency key `participation-invitation:{invitationId}:{generation}`.

- [ ] **Step 1: Write failing stale-generation, retry, and module separation tests**

```ts
it('acknowledges a stale generation without sending', async () => {
  invitations.findById.mockResolvedValue(invitation({ generation: 2 }));
  await handler.execute(delivery({ generation: 1 }));
  expect(sender.send).not.toHaveBeenCalled();
  expect(deliveries.markSkipped).toHaveBeenCalledWith(
    deliveryId,
    'STALE_GENERATION',
  );
});
```

- [ ] **Step 2: Run and verify RED**

Run: `cd server && pnpm test -- --runInBand test/application/command/handler/process-participation-invitation-delivery.handler.spec.ts test/infrastructure/sms/participation-invitation-sms.worker.spec.ts test/worker.module.spec.ts`

Expected: FAIL because worker/provider support is absent.

- [ ] **Step 3: Implement claim/send/complete flow**

Claim briefly with `FOR UPDATE SKIP LOCKED`, commit, decrypt/load the phone and send outside the transaction, then mark success/failure in a short transaction. Preserve the same idempotency key across retries and skip stale generations.

- [ ] **Step 4: Run and verify GREEN**

Run the command from Step 2. Expected: PASS and `AppModule` contains no invitation worker provider.

---

### Task 6: Public exchange, browser session, CSRF, and access read model

**Files:**

- Create: `server/src/modules/participation/application/command/dto/request/exchange-participation-access.command.ts`
- Create: `server/src/modules/participation/application/command/handler/exchange-participation-access.handler.ts`
- Create: `server/src/modules/participation/application/query/handler/get-participation-access.handler.ts`
- Create: `server/src/modules/participation/presentation/participation-access/participation-access.controller.ts`
- Create: `server/src/modules/participation/presentation/participation-access/elector-session.guard.ts`
- Create: `server/src/modules/participation/presentation/participation-access/participation-access-session.decorator.ts`
- Create: `server/src/modules/participation/presentation/participation-access/dto/participation-access.dto.ts`
- Modify: `server/src/app.module.ts`
- Test: `server/test/application/command/handler/exchange-participation-access.handler.spec.ts`
- Test: `server/test/presentation/route/participation/participation-access.controller.spec.ts`

**Interfaces:**

- Produces: exchange response `{ access, sessionToken, csrfToken }`; controller stores only `sessionToken` in an HttpOnly cookie and returns sanitized access metadata.
- Produces: request-bound context `{ sessionId, voteId, electorId, scope, csrfToken }` for later handlers.

- [ ] **Step 1: Write failing state matrix, concurrent-claim, cookie, Origin, CSRF, and no-store tests**

```ts
it.each([
  ['FINALIZED', 'PARTICIPATE'],
  ['OPEN', 'PARTICIPATE'],
  ['CLOSED', 'RESULT_READ'],
])('issues %s access for %s', async (status, scope) => {
  votes.findById.mockResolvedValue(vote({ status }));
  await expect(handler.execute(command)).resolves.toMatchObject({ scope });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `cd server && pnpm test -- --runInBand test/application/command/handler/exchange-participation-access.handler.spec.ts test/presentation/route/participation/participation-access.controller.spec.ts`

Expected: FAIL because exchange/session HTTP support is absent.

- [ ] **Step 3: Implement public exchange and session guard**

Lock the invitation during exchange. FINALIZED/OPEN creates or reuses only the matching cookie's participation session; CLOSED creates result-read sessions. Validate live vote/elector/generation state on every request. Apply explicit Origin allowlist, session-bound CSRF for mutations, Secure/HttpOnly cookie, and `Cache-Control: no-store`.

- [ ] **Step 4: Run and verify GREEN**

Run the command from Step 2. Expected: PASS.

---

### Task 7: Capability signature and participation commands

**Files:**

- Create: `server/src/modules/participation/application/command/handler/request-participant-signature-upload.handler.ts`
- Create: `server/src/modules/participation/application/command/handler/confirm-participant-signature-upload.handler.ts`
- Create: `server/src/modules/participation/application/command/handler/cast-participation-with-access.handler.ts`
- Modify: `server/src/modules/participation/presentation/participation-access/participation-access.controller.ts`
- Test: `server/test/application/command/handler/participant-capability-command.handlers.spec.ts`
- Test: `server/test/presentation/route/participation/participation-access.controller.spec.ts`

**Interfaces:**

- Consumes: authoritative `{ voteId, electorId }` from the guarded session; existing signature policy/storage/repository and participation repositories.
- Produces: client payloads containing file metadata or `{ voteDetailId, selectedCandidateId }` only.

- [ ] **Step 1: Write failing server-derived-identity and signature-required tests**

```ts
it('ignores no client elector identity because the command has no elector field', async () => {
  await handler.execute(
    command({ voteDetailId, selectedCandidateId }),
    session({ electorId }),
  );
  expect(savedParticipation.electorId).toBe(electorId);
});

it('rejects participation until the session elector has a confirmed signature', async () => {
  signatures.hasConfirmedSignature.mockResolvedValue(false);
  await expect(handler.execute(command, session)).rejects.toThrow(
    ParticipationSignatureRequiredError,
  );
});
```

- [ ] **Step 2: Run and verify RED**

Run: `cd server && pnpm test -- --runInBand test/application/command/handler/participant-capability-command.handlers.spec.ts`

Expected: FAIL because capability handlers are absent.

- [ ] **Step 3: Extract and reuse authoritative core services**

Keep existing OIDC handler behavior intact. Reuse shared application services for signature metadata/storage checks and participation invariants, while supplying vote/elector from the validated access session. Never construct a fake principal or verification record.

- [ ] **Step 4: Run new and existing participation/signature tests**

Run: `cd server && pnpm test -- --runInBand test/application/command/handler/participant-capability-command.handlers.spec.ts test/application/command/handler/cast-participation.handler.spec.ts test/application/command/handler/elector-signature-upload.handlers.spec.ts`

Expected: PASS.

---

### Task 8: Closed-vote result access and lifecycle revocation

**Files:**

- Create: `server/src/modules/participation/application/query/handler/get-participation-result-with-access.handler.ts`
- Modify: `server/src/modules/participation/presentation/participation-access/participation-access.controller.ts`
- Modify: vote refund/cancel lifecycle adapter or handler that returns a vote to DRAFT
- Modify: elector blocking handler to revoke elector sessions
- Test: `server/test/application/query/handler/get-participation-result-with-access.handler.spec.ts`
- Test: relevant vote billing lifecycle and elector block handler specs

**Interfaces:**

- Consumes: `RESULT_READ` session vote ID and existing result projection/consistency checks.
- Produces: aggregate-only result response; DRAFT/CANCELED/refund and elector block revoke affected invitations/sessions.

- [ ] **Step 1: Write failing hierarchy, closed-state, secrecy, and revocation tests**

```ts
it('rejects a child ballot from another vote', async () => {
  details.findById.mockResolvedValue(detail({ voteId: anotherVoteId }));
  await expect(handler.execute(query, session)).rejects.toThrow(
    ParticipationAccessResourceNotFoundError,
  );
});

it('returns aggregate counts without an elector selection', async () => {
  const result = await handler.execute(query, resultSession);
  expect(result).not.toHaveProperty('selectedCandidateId');
});
```

- [ ] **Step 2: Run and verify RED**

Run the focused query and lifecycle test files. Expected: FAIL because the result/session integration is absent.

- [ ] **Step 3: Implement result delegation and revocation hooks**

Validate session scope and hierarchy, then delegate to the existing closed-vote aggregate result query. Add transactional revocation when the vote returns to DRAFT/CANCELED or an elector is blocked; closing does not revoke invitations.

- [ ] **Step 4: Run focused regression tests and verify GREEN**

Run the files from Step 2 plus existing result and billing lifecycle suites. Expected: PASS.

---

### Task 9: Admin HTTP contract, PostgreSQL E2E, documentation, and full verification

**Files:**

- Create: `server/src/modules/participation/presentation/participation-invitation/participation-invitation.controller.ts`
- Create: `server/src/modules/participation/presentation/participation-invitation/dto/participation-invitation.dto.ts`
- Modify: `server/src/app.module.ts`
- Create: `server/test/presentation/route/participation/participation-invitation.controller.spec.ts`
- Modify: `server/test/participation-access.database.e2e-spec.ts`
- Create: `docs/api/participation-access.md`
- Modify: `README.md` only if no conflicting external edit remains; otherwise document the deferred README change in handoff.

**Interfaces:**

- Produces authenticated dispatch/reissue/status routes and public exchange/session/signature/participation/result routes exactly as defined by the spec.

- [ ] **Step 1: Write failing HTTP and actual PostgreSQL workflow tests**

Exercise creator/non-creator, optional/required identity, first/second browser claim, signed-token tampering, signature-before-vote, duplicate voting, close-to-result transition, reissue invalidation, stale worker delivery, and legacy-row migration without exposing secrets in assertions or logs.

- [ ] **Step 2: Run focused HTTP/E2E tests and verify RED**

Run: `cd server && pnpm test -- --runInBand test/presentation/route/participation/participation-invitation.controller.spec.ts test/presentation/route/participation/participation-access.controller.spec.ts`

Run: `cd server && pnpm test:e2e -- --runInBand test/participation-access.database.e2e-spec.ts`

Expected: FAIL until all routes and wiring are complete.

- [ ] **Step 3: Complete module wiring, error mapping, Swagger DTOs, and API documentation**

Expose only sanitized IDs/statuses. Document cookie/CSRF/Origin behavior, permanent fragment link handling, reissue semantics, worker requirement, and the fact that OIDC is not used for this optional-identity path.

- [ ] **Step 4: Run all verification gates**

Run:

```bash
cd server
pnpm test -- --runInBand
pnpm test:e2e -- --runInBand test/participation-access.database.e2e-spec.ts
pnpm lint
pnpm build
```

Expected: all tests pass, lint reports no errors, and build exits 0.

- [ ] **Step 5: Verify process separation safely**

Start an isolated worker instance with delivery polling disabled by test configuration, observe successful Nest application-context startup, then terminate only that process. Confirm `AppModule` does not provide the invitation worker and `WorkerModule` does.

- [ ] **Step 6: Review the final diff without committing**

Run `git status --short`, `git diff --check`, and path-scoped diffs. Confirm unrelated billing/blockchain/README/storage changes remain untouched and excluded. Do not commit, push, merge, or modify the UI worktree without a later user instruction.
