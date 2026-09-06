# Participant Mock authentication

This development simulator does not verify a real identity. It requires an existing Bearer login and explicitly enabled Mock mode. It is disabled by default; enabling it outside `NODE_ENV=development` or `test` fails startup. Production identity-provider integration remains separate work.

Use Node 24 and pnpm 9.15.9. Apply database migrations to your intended local database before starting the server:

```sh
pnpm --filter @vote/server run db:migration:up
NODE_ENV=development VOTE_IDENTITY_VERIFICATION_MODE=mock pnpm --filter @vote/server run start:dev
```

Existing database and OIDC environment configuration is still required. `Migration20260906020000` adds `user_principal_id` and `is_mock` to verification history. Existing verification records do not grant participant access because they have no principal binding. The migration does not fabricate bindings.

1. Log in and obtain a Bearer access token. Use the same account for both requests below.
2. Use the vote and elector UUIDs from prepared local test data. The elector must be eligible.
3. Authenticate the elector:

```http
PUT /votes/{voteId}/electors/{electorId}/authentication
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "provider": "MOCK",
  "transactionId": "mock-success:11111111-1111-4111-8111-111111111111"
}
```

Use a fresh identifier per attempt. `mock-success:<unique-id>` succeeds; `mock-failure:<unique-id>` records a failed attempt and returns `identityVerified: false`. The identifier after the colon accepts 8–100 ASCII letters, digits or hyphens. Reusing a consumed transaction returns 409, including failed transactions. A previously authenticated elector cannot be rebound to another account (403).

4. Request a signature upload URL with the same login, PUT the exact image bytes to the returned `uploadUrl`, and confirm the upload. PNG, JPEG and WebP images up to 5 MiB are accepted.

```http
POST /votes/{voteId}/electors/{electorId}/signature/upload-url
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "originalName": "signature.png",
  "mimeType": "image/png",
  "sizeBytes": 1024
}
```

After uploading, confirm the same metadata and returned opaque key:

```http
POST /votes/{voteId}/electors/{electorId}/signature/confirm
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "storageKey": "<returned storage key>",
  "originalName": "signature.png",
  "mimeType": "image/png",
  "sizeBytes": 1024
}
```

The confirm response includes the persisted `fileId`. Uploading bytes alone is not sufficient; confirm must return HTTP 201 before participation can be submitted.

5. Submit a ballot using the same login:

```http
POST /participations
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "voteId": "<vote UUID>",
  "voteDetailId": "<child vote UUID>",
  "electorId": "<authenticated elector UUID>",
  "selectedCandidateId": "<candidate UUID>",
  "votingChannel": "ONLINE"
}
```

Success returns HTTP 201 and the participation identifier, child vote identifier and status. The existing response envelope wraps endpoint data. The parent and child vote must be open, the channel enabled, the candidate selectable, and the elector signature confirmed. Duplicate individual/group participation remains rejected. Secret ballots keep candidate selections out of participation records.

`verifiedAt` and `participatedAt` are optional compatibility fields. Supplied values are not trusted: timestamps are recorded by the server. The authenticated principal always comes from the Bearer token, never a request-body user ID.

All participation channels now require the caller's own verified elector binding and confirmed signature, even if the vote does not require external identity verification. Onsite/visit participation still requires the appropriate field session; this API does not grant operators authority to submit on another participant's behalf.

401 means login is missing/invalid; 403 means there is no matching participant binding; 409 covers state conflicts and duplicate/replayed requests; 503 means no identity provider is configured. Turning Mock mode off also makes persisted Mock bindings unusable for participation.

Swagger UI: `/docs`; OpenAPI JSON: `/docs-json`.
