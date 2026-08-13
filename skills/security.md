# Skill: Electronic Voting Security

## Trigger

- voting secrecy
- identity verification
- elector eligibility
- vote participation
- result storage
- blockchain recording
- file upload
- audit logging
- any security-sensitive backend change

## Rules

Security correctness overrides convenience.

### Secret Vote Handling

- Secret votes must not persist `candidate_id` or equivalent elector-to-choice linkage.
- Participation can store who voted, but not what they selected.
- Result counts must be updated in the same transaction as participation.
- Participation casting must be protected by application-level duplicate checks and database unique constraints. Use a transaction isolation level strong enough for the command's concurrent duplicate/result-count invariant.

### Public Vote Handling

- Public votes may store selected `candidate_id`.
- Public behavior must be gated by the effective privacy mode.

### Identity Data

- Store CI, DI, phone, and similar sensitive values as hashes only.
- Keep provider transaction identifiers for audit and replay checks.
- Do not log raw identity payloads.
- Do not hold a database transaction open while calling an identity provider.
- Persist verification success/failure in a short transaction after provider verification, and re-check the elector before marking identity as verified.

### Attachments

- Validate MIME type and size.
- Store files by opaque storage key.
- Signature files are elector-sensitive data.
- File metadata checks and evidence records may be transactional, but file binary storage and presigned URL generation must stay outside database transactions.

### Blockchain And Result Storage

- Result finalization must persist the approved result or result hash before any external blockchain call.
- Blockchain calls run after the database transaction commits.
- Blockchain transaction hash, network, block number, status, and failure reason are persisted in separate short transactions for audit and retry.

### Audit

Log without secrets:

- admin changes to vote content/policies
- identity verification success/failure
- participation attempts and duplicate attempts
- result finalization and blockchain storage attempts

## Do

- Enforce duplicate voting at DB and application level.
- Keep policy fields locked after vote opening unless explicitly audited.
- Store result hashes for integrity checks.
- Split external verification/storage/blockchain calls from transaction-decorated persistence.

## Don't

- Link elector to selected candidate in secret votes.
- Log identity raw payloads, tokens, signatures, or private keys.
- Trust client-provided vote weight, group key, or identity verification result.
- Wrap identity provider, storage, or blockchain calls in database transactions.

## Checklist

- [ ] Secret vote linkage is impossible in persisted data.
- [ ] Identity values are hashed.
- [ ] Duplicate vote constraints exist.
- [ ] Result storage has audit trail.
- [ ] Sensitive files are handled through storage ports.
- [ ] Participation/result updates that must be atomic share one database transaction.
- [ ] External security-sensitive calls are persisted through short post-call transactions.
