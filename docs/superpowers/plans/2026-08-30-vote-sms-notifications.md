# Vote SMS Notifications Implementation Plan

> **For agentic workers:** Follow the repository `AGENTS.md` policy. Execute inline in this session; do not invoke subagent execution skills unless the user explicitly requests them.

**Goal:** Expose four SMS notification commands whose availability is governed by vote lifecycle and field-voting channel rules, with a development-only random outbound SMS adapter.

**Architecture:** A shared outbound `SmsSenderPort` expresses four business-specific recipient scopes, including non-participating electors for reminders. Vote and field-voting command handlers load authoritative aggregates, enforce a pure domain policy, then call the outbound port outside any database transaction. Dedicated controllers expose fixed-purpose POST endpoints, and the composition root registers a development-only random adapter that performs no external network calls.

**Tech Stack:** NestJS, TypeScript, Jest, Swagger

**Spec:** User requirements from 2026-08-30: reminders only while a vote is open, result notices only after close, upcoming notices only before open, and field/visit session notices only while the vote is open and the corresponding field channel is enabled. A later requirement adds a random development adapter so the API can be exercised without a real SMS provider.

## Global Constraints

- `VOTE_PARTICIPATION_REMINDER` targets only electors who have not cast a participation in the vote.
- `VOTE_RESULT_NOTICE` and `UPCOMING_VOTE_NOTICE` target vote electors through purpose-specific port methods.
- `FIELD_VOTING_SESSION_NOTICE` includes the field-voting session ID and targets the session's vote electors.
- Vote state and channel decisions use authoritative aggregates, never projections or client flags.
- SMS provider I/O is outside database transactions.
- Raw phone numbers are never logged, returned by the API, or added to command results.
- No vendor-backed SMS adapter or external provider SDK is implemented; a random development adapter is registered.

---

### Task 1: SMS policy and outbound port

**Files:**

- Create: `server/src/shared/domain/voting/type/sms-message-purpose.type.ts`
- Create: `server/src/shared/application/port/gateway/sms-sender.port.ts`
- Create: `server/src/shared/domain/voting/vote-sms.policy.ts`
- Test: `server/test/domain/vote/vote-sms-policy.spec.ts`

**Interfaces:**

- Produces: `SmsSenderPort.sendParticipationReminderToNonParticipants()`, `sendResultNotice()`, `sendUpcomingVoteNotice()`, and `sendFieldVotingSessionNotice()`.
- Produces: `VoteSmsPolicy.assertVoteMessageAllowed(vote, purpose)` and `assertFieldSessionMessageAllowed(vote, session)`.

- [x] Define fixed SMS purposes and purpose-specific port request/result contracts with no provider types.
- [x] Test all allowed lifecycle combinations and rejection of every invalid lifecycle combination.
- [x] Test that field-session notices require an open vote, an onsite/visit session, matching vote IDs, and the session channel enabled on the vote.
- [x] Implement the pure domain policy without NestJS imports.

### Task 2: Application command handlers

**Files:**

- Create: `server/src/modules/vote/application/command/dto/request/send-vote-sms.command.ts`
- Create: `server/src/modules/vote/application/command/dto/response/send-vote-sms-result.dto.ts`
- Create: `server/src/modules/vote/application/command/handler/send-vote-sms.handler.ts`
- Create: `server/src/modules/field-voting/application/command/dto/request/send-field-voting-session-sms.command.ts`
- Create: `server/src/modules/field-voting/application/command/handler/send-field-voting-session-sms.handler.ts`
- Modify: `server/src/shared/application/error/managed-resource.error.ts`
- Test: `server/test/application/command/handler/send-sms.handlers.spec.ts`

**Interfaces:**

```ts
SendVoteSmsCommand.of({ voteId, purpose, message })
SendFieldVotingSessionSmsCommand.of({ fieldVotingSessionId, message })
SendVoteSmsResult.of({ purpose, voteId, recipientCount })
SendFieldVotingSessionSmsResult.of({ fieldVotingSessionId, voteId, recipientCount })
```

- [x] Test that each valid command calls only its matching port method and returns the accepted recipient count.
- [x] Test vote/session not-found paths, blank-message rejection, lifecycle rejection, channel rejection, and missing-port rejection.
- [x] Implement handlers with `@Optional()` SMS port injection so Nest can start without an adapter.
- [x] Keep SMS calls outside `@Transactional()` methods and return no phone numbers.

### Task 3: HTTP API and module wiring

**Files:**

- Create: `server/src/modules/vote/presentation/vote-sms/vote-sms.controller.ts`
- Create: `server/src/modules/vote/presentation/vote-sms/dto/send-vote-sms-request.dto.ts`
- Create: `server/src/modules/vote/presentation/vote-sms/dto/send-vote-sms-response.dto.ts`
- Create: `server/src/modules/field-voting/presentation/field-voting-session-sms/field-voting-session-sms.controller.ts`
- Create: `server/src/modules/field-voting/presentation/field-voting-session-sms/dto/send-field-voting-session-sms-request.dto.ts`
- Modify: `server/src/app.module.ts`
- Test: `server/test/presentation/route/sms/sms.controllers.spec.ts`

**Interfaces:**

```text
POST /votes/:voteId/sms/participation-reminder
POST /votes/:voteId/sms/result-notice
POST /votes/:voteId/sms/upcoming-notice
POST /field-voting-sessions/:fieldVotingSessionId/sms
Body: { "message": "..." }
Response: 202 { purpose, voteId, fieldVotingSessionId?, recipientCount }
```

- [x] Test fixed endpoint-to-purpose mapping and response serialization.
- [x] Map a missing SMS port to HTTP 503 while preserving 404 and 409 behavior through the common exception filter.
- [x] Register both controllers, handlers, and the development `SMS_SENDER_PORT` Adapter in `AppModule`.
- [x] Verify the application module compiles with the optional port absent.

### Task 4: Documentation and verification

**Files:**

- Create: `docs/api/sms-notifications.md`
- Modify: `README.md`

- [x] Document routes, state gates, recipient scopes, responses, and the development-only random adapter.
- [x] Run focused policy, handler, controller, and module tests with Node 24.
- [x] Run the complete server Jest suite and server build with Node 24.
- [x] Run ESLint without auto-fix on changed TypeScript files and run `git diff --check`.
