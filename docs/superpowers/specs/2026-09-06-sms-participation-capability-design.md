# SMS Participation Capability Design

**Date:** 2026-09-06
**Status:** Implemented in the server worktree

## Context

The authenticated participation path currently authorizes an elector only when a successful `elector_identity_verifications` row binds the elector to an OIDC `UserPrincipal`. Consequently, setting `identityVerificationPolicy.required=false` does not actually make identity verification optional.

For votes where identity verification is optional, an administrator will send each eligible elector an individual SMS link. Possession of that link is the elector credential. OIDC login is not required. The link establishes a browser-scoped capability; it never calls the existing authenticated participation command endpoint directly.

An earlier unauthenticated invitation implementation was removed because a bearer token could invoke voting directly and bypass the authenticated principal and confirmed-signature invariants. This design restores invitations with a narrower session boundary, server-derived elector identity, mandatory signatures, CSRF protection, revocation, concurrency control, and read-only behavior after voting closes.

## Goals

- Make `identityVerificationPolicy.required=false` meaningful without trusting a client-supplied elector ID.
- Let an administrator deliver a per-elector SMS link that remains useful indefinitely for closed-vote result access.
- Bind voting authority to the first browser that claims the link before the vote closes.
- Require a confirmed signature before every participation submission.
- Preserve the existing vote-state, eligibility, hierarchy, result-integrity, and duplicate-vote invariants.
- Keep SMS network I/O in the worker and make dispatch durable and idempotent.
- Avoid logging or unnecessarily persisting phone numbers, capability tokens, cookies, signatures, or private elector data.

## Non-goals

- Replacing the OIDC and external identity-verification path for votes where identity verification is required.
- Treating browser fingerprinting as authentication.
- Exposing an elector's selected candidate after the vote.
- Guaranteeing exactly-once SMS delivery.
- Automatically activating or sending historical invitation rows.

## Core Decisions

1. The SMS link is a revocable, non-expiring bearer capability. It has no time-based expiry independent of data retention.
2. Before close, the first browser claim receives the only active `PARTICIPATE` session for that elector. Another browser cannot take over without administrator reissue.
3. At and after close, the link can be exchanged repeatedly for `RESULT_READ` sessions on any browser. Those sessions cannot perform mutations.
4. Reissue increments an invitation generation and revokes the previous link and every active participation session.
5. The client never supplies `voteId`, `electorId`, vote weight, group key, or voting channel to a capability-authorized mutation. The server derives them from the session and fixes the channel to `ONLINE`.
6. Existing OIDC endpoints remain unchanged. Capability endpoints are a separate public HTTP surface protected by `ElectorSessionGuard`, not by an optional branch in the authenticated guard.

## Architecture

### Administration boundary

The authenticated administration API authorizes the vote creator and creates or rotates invitations. In one database transaction it persists the invitation generation, SMS dispatch intent, and durable outbox message. It performs no SMS network I/O.

### Worker boundary

The existing separate worker process gains an `@rvkang/batch` invitation-SMS worker. It claims outbox messages with the existing PostgreSQL lease and `FOR UPDATE SKIP LOCKED` mechanism, rejects stale generations, loads the current encrypted phone number, constructs the signed link, sends the SMS, and records delivery outcome in short transactions.

Delivery is at least once. The stable provider idempotency key is `participation-invitation:{invitationId}:{generation}`. A retry uses the same message ID, generation, and link. An old-generation retry is acknowledged without sending.

### Participant boundary

`/participation-access/*` is reachable without OIDC, but every operation except token exchange requires a valid capability session and an allowed Origin. Token exchange creates a server-side session. Participant reads and mutations use the session reference rather than accepting an elector reference from the browser.

## Domain and Persistence Model

### Participation invitation

The existing `participation_invitations` table is extended rather than replaced:

- `id`
- `vote_id`
- `elector_id`
- `token_digest`
- `generation`, starting at 1 for the new design
- `claimed_at`, nullable
- `claimed_session_id`, nullable
- `revoked_at`, nullable
- `issued_by_user_principal_id`
- `created_at`, `updated_at`
- legacy `expires_at`, changed to nullable and left null for new invitations

There is one current invitation row per `(vote_id, elector_id)`. Reissue rotates that row atomically: increment generation, replace the digest, clear claim state, set the new issuer, and revoke all prior sessions. The old signed link becomes invalid because its generation and digest no longer match.

Invitation domain operations are `issue`, `claimForParticipation`, `rotate`, `revoke`, `assertCurrentToken`, and `allowResultAccess`. Time does not invalidate an invitation. Revocation, generation mismatch, elector state, vote state, or data removal can invalidate it.

### Elector participant session

A new `elector_participant_sessions` table stores:

- `id`
- `token_digest` for a random 256-bit session token
- `invitation_id`, `vote_id`, `elector_id`
- `invitation_generation`
- `scope`: `PARTICIPATE` or `RESULT_READ`
- `expires_at`
- `revoked_at`
- `created_at`, `last_used_at`

Only the digest is stored. A partial unique index permits at most one non-revoked `PARTICIPATE` session per `(vote_id, elector_id, invitation_generation)`.

`PARTICIPATE` sessions expire at `vote.endAt`. They also become unusable immediately when the vote is no longer `FINALIZED` or `OPEN`, the elector is not `ELIGIBLE`, the invitation generation changes, or the invitation/session is revoked.

`RESULT_READ` sessions have a rolling 30-day cookie lifetime to limit stale browser credentials. The permanent SMS link can issue a new result session whenever needed. A result session is usable only while the parent and requested child vote are both `CLOSED` and result consistency checks pass.

## Link and Token Format

The SMS URL uses a fragment so the capability is not sent in the initial HTTP request, proxy access log, or Referer:

```text
https://vote.example/participate#access_token=<signed-reference>
```

The UI reads the fragment once, immediately removes it with `history.replaceState`, then sends it in the body of `POST /participation-access/exchange`. Request-body logging and error telemetry must redact the `token` field.

The signed reference contains only a random invitation ID, generation, key ID, and signature. It contains no elector ID, vote ID, phone number, name, or expiry. HMAC-SHA-256 signs a canonical representation using a dedicated participation-link signing key. Verification uses constant-time comparison. `token_digest` is the SHA-256 digest of the complete signed reference and is compared after signature verification.

The API and worker share a signing port, not raw configuration access. Key rotation retains verification keys for every live invitation generation. Removing an old key requires an audited bulk revocation/reissue of invitations signed by that key; it must never silently break permanent links.

An HTTP GET never claims an invitation. This prevents SMS provider scanners and browser prefetch from consuming it.

## State-dependent Behavior

| Vote state | Issue/reissue SMS | Exchange behavior | Signature/vote | Result |
|---|---:|---|---:|---:|
| `DRAFT` | No | Reject | No | No |
| `FINALIZED` | Yes | First browser gets `PARTICIPATE` | Signature allowed; vote submission waits for `OPEN` | No |
| `OPEN` | Yes | First browser gets `PARTICIPATE` | Yes | No |
| `CLOSED` | Yes | Any valid current link gets `RESULT_READ` | No | Yes |
| `CANCELED` | No | Reject and revoke | No | No |

Returning a paid vote to `DRAFT` through cancellation/refund revokes every invitation and session. Closing a vote does not revoke the link; it disables participation scope and enables result-read exchange. Blocking an elector invalidates all of that elector's sessions on the next request and is followed by explicit session revocation for auditability.

Before close, exchanging an already claimed link is idempotent only when the request already carries the matching active session cookie. A different browser receives a conflict and needs administrator reissue. After close, claim ownership is irrelevant because only aggregate result reads are available.

## API Contract

### Authenticated administration

```text
POST /votes/:voteId/participation-invitation-dispatches
POST /votes/:voteId/electors/:electorId/participation-invitation/reissue
GET  /votes/:voteId/participation-invitation-dispatches/:dispatchId
```

The batch-dispatch body optionally accepts `electorIds`. Omission means all `ELIGIBLE` electors. The server rejects the command unless the caller created the vote, identity verification is optional, and the vote state is `FINALIZED`, `OPEN`, or `CLOSED`.

Electors without a usable phone number produce a delivery entry with `SKIPPED_NO_PHONE`; they do not receive an invitation outbox message. Templates and link origins are server-controlled. The request cannot supply arbitrary URLs. The result exposes counts and sanitized per-elector delivery status but never phone numbers or links.

### Capability exchange and session

```text
POST   /participation-access/exchange
GET    /participation-access
DELETE /participation-access/session
```

`POST /exchange` accepts `{ token }`, validates the signed reference and current invitation row under a row lock, and atomically claims or authorizes the correct session scope. It sets an HttpOnly, Secure cookie and returns sanitized access metadata plus a CSRF token. The cookie uses the narrowest viable domain/path and `SameSite=Strict` where the deployed UI/API topology permits it.

`GET /participation-access` returns the effective session scope, vote state, permitted actions, sanitized vote/sub-vote/candidate data, signature status, participation status, result availability, and a renewed CSRF token. It does not expose electoral-roll identity data.

### Capability mutations and result reads

```text
POST /participation-access/signature/upload-url
POST /participation-access/signature/confirm
POST /participation-access/participations
GET  /participation-access/sub-votes/:voteDetailId/results
```

Signature requests accept file metadata only. The server derives target vote/elector from the `PARTICIPATE` session and preserves opaque storage keys, MIME/size checks, object metadata binding, and confirmed-signature persistence.

Participation accepts only `voteDetailId` and `selectedCandidateId`. The server derives vote/elector/channel, requires the vote and sub-vote to be open, requires a confirmed signature, validates candidate hierarchy, elector eligibility, effective participation policy, and field-session absence, then commits participation and result count atomically.

Result access requires `RESULT_READ`, derives the vote from the session, verifies the requested sub-vote belongs to it, and reuses the existing closed-state and aggregate-consistency checks. It returns aggregate results only, never the elector's stored selection or identity linkage.

## Browser Security

- Credentialed CORS uses an explicit UI-origin allowlist; wildcard origins are forbidden.
- State-changing endpoints require both a valid session cookie and session-bound CSRF token header.
- Exchange is rate-limited by IP and invitation reference. Failures use bounded generic messages to reduce token enumeration signals.
- Session cookies are HttpOnly and Secure. Browser fingerprinting is not collected or trusted.
- Tokens, cookies, links, phone numbers, signature metadata, and request bodies containing credentials are redacted from HTTP, application, analytics, and error logs.
- Cache headers on all capability responses are `Cache-Control: no-store`.

## Error Semantics

- `401`: malformed signature, unknown invitation, revoked/stale generation, invalid session, or disallowed token reuse. Public responses do not distinguish these internal causes.
- `403`: missing/invalid Origin or CSRF proof; authenticated administrator lacks vote ownership.
- `404`: a session-authorized child resource is not part of the session vote.
- `409`: another browser owns the active participation claim, identity verification is required for this vote, signature is missing, vote state disallows the action, elector is ineligible, or participation conflicts.
- `503`: SMS or storage provider is not configured/available where synchronous confirmation requires it.

Internal audit reason codes remain specific even when public HTTP messages are generic.

## Audit and Observability

Audit events record administrator dispatch, reissue, revocation, SMS outcome, first claim, session issuance/revocation, result-session issuance, and participation/signature allow or deny reason. Records use IDs and reason codes only. They exclude raw tokens, URLs, cookie values, phone numbers, identity payloads, and file contents.

Operational metrics cover pending invitation outbox count, oldest age, lease recovery, send attempt count, dead messages, skipped stale generations, claim conflicts, exchange rejection reasons, active participation sessions, and result-session issuance. Alerts cover dead invitation messages and sustained backlog age.

## Migration and Historical Safety

The reconciliation migration already guarantees that `participation_invitations` exists, but no current runtime entity uses it. A new uniquely named forward migration:

1. makes legacy `expires_at` nullable;
2. adds generation, claim, issuer, and signing-key fields;
3. creates `elector_participant_sessions` and its indexes/constraints;
4. classifies every pre-migration invitation as legacy-revoked with generation 0;
5. does not create outbox rows, send SMS, or activate a historical token.

New invitations start at generation 1. Deployment does not backfill links. Administrators explicitly issue them after the new API and worker are deployed. Publishing remains disabled until every API writer is invitation/outbox-aware and the worker version understands generation checks.

## Required Tests

### Domain and application

- issue, first claim, matching-session idempotency, conflicting-browser rejection, rotate, revoke, and permanent result access;
- state matrix for `DRAFT`, `FINALIZED`, `OPEN`, `CLOSED`, and `CANCELED`;
- optional-identity-only issuance, vote creator authorization, missing-phone skip, and no client-controlled elector identity;
- confirmed signature requirement and all existing individual/group duplicate rules.

### Token, cookie, and HTTP

- signature tampering, digest mismatch, unknown key ID, stale generation, and constant public error shape;
- scanner GET does not consume a link;
- fragment removal and credential redaction contract;
- CSRF, Origin, CORS, cookie flags, no-store headers, and session logout;
- two concurrent browsers race to claim and exactly one participation session wins;
- after close, a new browser receives result-only access and every mutation is rejected.

### Persistence and worker

- actual PostgreSQL migration from both an empty table and legacy invitation rows;
- invitation/session row-locking, partial uniqueness, reissue revocation, and rollback atomicity;
- invitation + dispatch + outbox atomic write;
- duplicate publish/send, lease recovery, retry/dead behavior, stable provider idempotency key, stale-generation suppression, and no historical side effects;
- encrypted phone handling without sensitive output.

### Regression

- existing OIDC identity-required participation continues to work unchanged;
- API and worker remain separate processes;
- server unit/integration/E2E, lint, and build;
- UI link landing, exchange, refresh, signature, voting, conflict recovery, close transition, and result reopening.

## UI Contract

The public `/participate` page must not initiate OIDC login. It reads and clears the URL fragment, exchanges the token with credentialed requests, and renders entirely from `GET /participation-access`. It must never persist the SMS token in local storage, query caches, analytics, error reporting, or application logs.

Before close, a claim conflict instructs the elector to request administrator reissue. After close, reopening the permanent SMS link produces a result-only session and renders aggregate results. The UI must use server-provided permitted actions rather than infer authority from time alone.
