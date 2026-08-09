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

### Public Vote Handling

- Public votes may store selected `candidate_id`.
- Public behavior must be gated by the effective privacy mode.

### Identity Data

- Store CI, DI, phone, and similar sensitive values as hashes only.
- Keep provider transaction identifiers for audit and replay checks.
- Do not log raw identity payloads.

### Attachments

- Validate MIME type and size.
- Store files by opaque storage key.
- Signature files are elector-sensitive data.

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

## Don't

- Link elector to selected candidate in secret votes.
- Log identity raw payloads, tokens, signatures, or private keys.
- Trust client-provided vote weight, group key, or identity verification result.

## Checklist

- [ ] Secret vote linkage is impossible in persisted data.
- [ ] Identity values are hashed.
- [ ] Duplicate vote constraints exist.
- [ ] Result storage has audit trail.
- [ ] Sensitive files are handled through storage ports.
