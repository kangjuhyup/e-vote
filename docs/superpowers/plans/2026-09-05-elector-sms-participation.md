# Elector SMS Participation Implementation Plan

> Execute inline in the current worktree. Preserve all existing tracked/untracked changes and running processes. Do not commit, push, or merge without a separate user request.

**Goal:** Let an elector open a capability link received by SMS, review every ballot in the assigned vote, and cast choices without exposing or trusting a client-supplied elector ID.

**Security contract:** Generate at least 256 bits of randomness, store only its SHA-256 digest, bind the credential to exactly one vote and elector, enforce expiry/revocation on every read and cast, and derive `voteId`, `electorId`, `ONLINE`, and participation time on the server. Put the raw credential in the SMS URL fragment (`/participate#token`) so it is excluded from HTTP request targets and referrers. The UI removes the fragment from browser history immediately and forwards the credential only through `X-Participation-Token` to a same-origin proxy. Never log or persist the raw credential.

**Architecture:** Add a participation invitation aggregate and persistence port in the participation module. A protected management command issues/rotates a link for an elector; public capability-authenticated read/cast endpoints expose only the ballot context needed by that elector. Reuse the existing participation aggregate and transaction/policy enforcement for casting. Add a dedicated unauthenticated Next proxy that only forwards the narrow participation endpoints and token header. Keep the normal OAuth proxy and management APIs unchanged.

## Tasks

1. **Invitation domain and persistence**
   - Add invitation aggregate with vote/elector binding, expiry, revocation, rotation, and usability checks.
   - Add token generator/digest port and Node crypto adapter.
   - Add MikroORM entity/repository and a migration with digest uniqueness and vote/elector lookup indexes.
   - Register the entity and repository through the existing composition roots.

2. **Secure server commands and queries**
   - Add protected `POST /votes/:voteId/electors/:electorId/participation-invitation` that creates or rotates a credential and returns the one-time URL once.
   - Add public `GET /participation-access` authenticated exclusively by `X-Participation-Token`; return safe vote, elector, ballot, candidate, and already-cast state.
   - Add public `POST /participation-access/participations`; accept only ballot and candidate IDs, derive all identity/context fields server-side, and invoke the existing cast handler.
   - Map invalid, expired, revoked, mismatched, duplicate, closed, and identity-verification failures to stable HTTP responses without credential disclosure.

3. **SMS linkage**
   - Extend participation-reminder sending so each eligible recipient receives their own capability URL rather than a shared client-composed elector identifier.
   - Keep delivery audit data free of raw credentials and add explicit configuration for the public participation base URL.

4. **Elector-facing UI**
   - Add `/participate` as a public route that is not blocked by the normal OAuth session boundary.
   - Extract and remove the URL-fragment credential, call the narrow participation proxy, and render vote schedule, elector label, progress, ballots, candidates, confirmation, success, duplicate, expired, revoked, and unavailable states.
   - Prevent double submission, provide accessible radio groups/errors/status announcements, and never store the credential in local storage or query strings.
   - Add live and mock API clients/types/fixtures plus query/mutation options.

5. **Management UI linkage**
   - Update the existing participation-reminder UI/API contract only as required to explain that personalized links are generated server-side.

6. **Verification**
   - Add focused domain, handler, controller/repository, proxy/API client, and component tests covering token secrecy, identity binding, expiry/revocation, duplicate ballots, and multi-ballot participation.
   - Run targeted tests, then server/UI test suites, lint, typecheck, and builds without restarting or terminating running processes.
