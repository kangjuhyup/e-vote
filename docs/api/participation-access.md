# SMS participation access API

This public capability flow applies only when a vote has
`identityVerificationPolicy.required=false`. It does not use OIDC and it does
not change the existing identity-verified participation API.

## Administration

- `POST /votes/:voteId/participation-invitation-dispatches` queues links for
  every eligible elector, or for the optional `electorIds` body selection.
- `POST /votes/:voteId/electors/:electorId/participation-invitation/reissue`
  revokes the previous generation and queues a new link.
- Only the vote creator can call these endpoints. Votes must be `FINALIZED`,
  `OPEN`, or `CLOSED`, and the identity-verification policy must be optional.

The API only records durable delivery work. The separate worker sends SMS.
Recipients without a stored phone number are counted as skipped. Responses
never contain phone numbers or raw links.

## Participant link and session

The worker sends `/participate#access_token=<signed-reference>`. The reference
has no expiry timestamp. The UI must remove the fragment immediately and call:

```text
POST /participation-access/exchange
```

with `{ "token": "..." }` and credentialed CORS. The API sets the
`vote_participant_session` HttpOnly/Secure/SameSite=Strict cookie and returns a
CSRF token. Before close, the first browser owns the only `PARTICIPATE` session.
After close, the permanent current-generation link creates `RESULT_READ`
sessions on any browser. Reissue, refund to draft, elector ineligibility, or
explicit revocation invalidates access.

`GET /participation-access` restores the CSRF token and returns the sanitized
vote, sub-votes, active candidates, confirmed-signature flag, per-sub-vote
participation flag, and server-computed `permittedActions`. It never returns
elector identity data. The ballot is read with a fixed-query projection rather
than per-candidate queries.

All capability responses use `Cache-Control: no-store`. Every mutation requires
an allowed `Origin`, the session cookie, and `x-csrf-token`.

## Mutations and results

- `POST /participation-access/signature/upload-url`
- `POST /participation-access/signature/confirm`
- `POST /participation-access/participations`
- `GET /participation-access/sub-votes/:voteDetailId/results`
- `DELETE /participation-access/session`

Participation accepts only `voteDetailId` and `selectedCandidateId`. Vote,
elector, weight, group, and the `ONLINE` channel are derived on the server. A
confirmed signature is mandatory. Result access is aggregate-only and is
available only through a `RESULT_READ` session after close.

## Runtime configuration

- `PARTICIPATION_LINK_SIGNING_KEY`: at least 32 bytes; API fails closed when
  absent.
- `PARTICIPATION_LINK_SIGNING_KEY_ID`: current key identifier.
- `PARTICIPATION_LINK_VERIFICATION_KEYS`: JSON object containing retained old
  verification keys during rotation.
- `PARTICIPATION_UI_URL`: server-controlled link target; defaults to
  `http://localhost:3001/participate`.
- `PARTICIPATION_ALLOWED_ORIGINS`: comma-separated exact origins; `*` is
  rejected.

API and worker deployments must receive the same signing configuration. A key
must not be removed while invitations signed by it remain live unless those
invitations are explicitly revoked/reissued.
