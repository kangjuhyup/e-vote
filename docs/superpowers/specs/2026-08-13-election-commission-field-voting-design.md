# Election Commission Field Voting Design

## Scope

Add an election commission domain and design support for onsite and visit voting.

This design covers:

- Election commission organization and commission members.
- Parent-vote-level allowed voting channels.
- Onsite and visit voting operation sessions.
- Field participation evidence for onsite and visit voting.
- API, persistence, security, and testing boundaries.

This design does not implement the code. It is the input for the implementation plan.

## Context

The current backend uses a NestJS layered architecture:

```text
presentation -> application -> domain
infrastructure -> application -> domain
```

The existing domain contains parent votes, vote details, electors, candidates, and participations. Participation already owns the important voting invariants:

- eligible elector requirement
- identity verification requirement
- individual or group duplicate prevention
- equal or share vote weight snapshot
- secret vote candidate linkage prevention
- public vote selected candidate persistence

Onsite and visit voting must extend this model without bypassing those existing rules.

## Design Choice

Use a new `ElectionCommissionAggregate`, keep allowed voting channels on the parent `VoteAggregate`, and model actual onsite or visit operation with a separate `FieldVotingSessionAggregate`.

The rejected alternatives were:

- Put commission, channel policy, and field sessions inside `VoteAggregate`. This makes the vote aggregate too broad and mixes organization, voting policy, and operation audit rules.
- Add only a channel enum to vote or participation. This is too shallow for visit manager, place, schedule, signature, and audit requirements.

The selected design separates responsibilities:

- `ElectionCommissionAggregate`: organization boundary.
- `VoteAggregate`: parent election event and allowed channel policy.
- `FieldVotingSessionAggregate`: one onsite or visit operating session.
- `ParticipationAggregate`: authoritative voting participation record.
- `FieldParticipationEvidenceAggregate`: field verification and evidence record.

## Domain Model

### ElectionCommissionAggregate

Represents the organization that can create and run votes.

Fields:

- `id`
- `name`
- `status`: `ACTIVE | SUSPENDED`
- `createdAt`

Rules:

- Name must not be empty.
- Only active commissions can create votes or field voting sessions.
- Suspension prevents new votes and new field sessions, but does not mutate existing participation records.

Events:

- `ElectionCommissionCreated`
- `ElectionCommissionSuspended`
- `ElectionCommissionReactivated`

### ElectionCommissionMemberAggregate

Represents a commission member who can manage field voting.

Fields:

- `id`
- `commissionId`
- `name`
- `role`: `ADMIN | FIELD_MANAGER`
- `status`: `ACTIVE | INACTIVE`

Rules:

- Name must not be empty.
- Role must be one of the supported values.
- Only active members can be assigned to a field voting session.
- Field voting sessions require at least one active assigned member.

Events:

- `ElectionCommissionMemberRegistered`
- `ElectionCommissionMemberDeactivated`

### VotingChannel

Add a parent-vote-level voting channel policy.

Values:

- `ONLINE`
- `ONSITE`
- `VISIT`

Rules:

- A vote must allow at least one voting channel.
- `votingChannels` belongs to `VoteAggregate`, not `VoteDetailAggregate`.
- Vote details do not override voting channels.
- `ONSITE` and `VISIT` sessions can be created only when the parent vote allows that channel.

### VoteAggregate Changes

Add:

- `commissionId`
- `votingChannels`

Rules:

- `commissionId` is required when creating a vote.
- `votingChannels` must contain at least one channel.
- Allowed channels are locked after the vote is opened. This design does not support changing voting channels after opening.
- Existing default policy fields remain unchanged:
  - `privacyMode`
  - `participationUnit`
  - `resultStorageMode`
  - `voteWeightMode`

Rationale:

Voting channel is an operating and audit policy for the whole parent vote. It is not a vote-detail result policy like privacy, participation unit, result storage, or vote weight mode.

### FieldVotingSessionAggregate

Represents one onsite or visit voting operation.

Fields:

- `id`
- `commissionId`
- `voteId`
- `channel`: `ONSITE | VISIT`
- `title`
- `locationName`
- `address`
- `managerIds`
- `startsAt`
- `endsAt`
- `status`: `SCHEDULED | OPEN | CLOSED | CANCELED`

Rules:

- `channel` must be `ONSITE` or `VISIT`; `ONLINE` sessions are invalid.
- The parent vote must allow the requested channel.
- The commission must be active.
- Each assigned manager must be an active member of the same commission.
- At least one manager is required.
- `startsAt` must be earlier than `endsAt`.
- A session can open only from `SCHEDULED`.
- A session can close only from `OPEN`.
- A session can cancel only from `SCHEDULED` or `OPEN`.
- Location, address, schedule, and managers are locked after opening. Cancel and create a new session for material corrections.

Events:

- `FieldVotingSessionScheduled`
- `FieldVotingSessionOpened`
- `FieldVotingSessionClosed`
- `FieldVotingSessionCanceled`

### ParticipationAggregate Changes

Add:

- `votingChannel`
- `fieldVotingSessionId?`

Rules:

- `ONLINE` participation must not have `fieldVotingSessionId`.
- `ONSITE` and `VISIT` participation require `fieldVotingSessionId`.
- `ONSITE` and `VISIT` participation require an open field voting session.
- The field voting session must match the participation `voteId` through the target vote detail's parent vote.
- The field voting session channel must match `votingChannel`.
- Existing duplicate-prevention rules remain authoritative:
  - individual voting: one cast participation per `voteDetailId + electorId`
  - group voting: one cast participation per `voteDetailId + groupKey`
- Duplicate prevention is not scoped by field session. A voter cannot cast the same vote detail twice by visiting a different onsite or visit session.
- Secret voting still must not persist `candidateId`.
- Public voting still requires and persists `candidateId`.
- Vote weight and group key snapshots stay unchanged.

Events:

- Keep `ParticipationCast` and `ParticipationCanceled`.
- Extend event payload only with non-sensitive channel/session identifiers.

### FieldParticipationEvidenceAggregate

Represents verification evidence collected for onsite or visit participation.

Fields:

- `id`
- `participationId`
- `fieldVotingSessionId`
- `verifiedByCommissionMemberId`
- `evidenceFileId?`
- `verificationNote?`
- `verifiedAt`

Rules:

- Evidence can be created only for `ONSITE` or `VISIT` participation.
- `participationId` and `fieldVotingSessionId` must match the same field participation.
- `verifiedByCommissionMemberId` must be an active manager assigned to the session.
- Evidence file is optional because some field flows may use paper records kept outside the system.
- When evidence file exists, it must reference a stored file by file id or opaque storage key through the storage port.
- Raw identity values, private keys, tokens, CI, DI, and phone numbers must not be stored in the evidence aggregate.
- Evidence does not include selected candidate information.

Events:

- `FieldParticipationEvidenceRecorded`

## Application Layer

Commands:

- `CreateElectionCommissionCommand`
- `RegisterElectionCommissionMemberCommand`
- `CreateVoteCommand`, extended with `commissionId` and `votingChannels`
- `CreateFieldVotingSessionCommand`
- `OpenFieldVotingSessionCommand`
- `CloseFieldVotingSessionCommand`
- `CancelFieldVotingSessionCommand`
- `CastParticipationCommand`, extended with `votingChannel` and optional `fieldVotingSessionId`
- `RecordFieldParticipationEvidenceCommand`

Handlers:

- Mutate one aggregate root when feasible.
- Use repository ports to load authoritative write-side state.
- Do not use read models to decide eligibility, duplicate participation, channel allowance, or session state.
- Return small command results such as `{ id, status }`.

Required ports:

- `ElectionCommissionRepositoryPort`
- `ElectionCommissionMemberRepositoryPort`
- `FieldVotingSessionRepositoryPort`
- `FieldParticipationEvidenceRepositoryPort`
- `VoteRepositoryPort`
- `VoteDetailRepositoryPort`
- `ElectorRepositoryPort`
- `ParticipationRepositoryPort`
- `FileRepositoryPort`
- existing `StoragePort`

Process manager:

- File upload plus evidence registration is a multi-step workflow and should use an application service or process manager once file upload exists.
- The process must be idempotent because file upload and evidence command delivery can be retried.

## Presentation Layer

Controllers stay thin and map request DTOs to application commands only.

Routes:

- `POST /election-commissions`
- `POST /election-commissions/:commissionId/members`
- `POST /votes`
- `POST /votes/:voteId/field-voting-sessions`
- `POST /field-voting-sessions/:fieldVotingSessionId/open`
- `POST /field-voting-sessions/:fieldVotingSessionId/close`
- `POST /field-voting-sessions/:fieldVotingSessionId/cancel`
- `POST /participations`, with `votingChannel` and optional `fieldVotingSessionId`
- `POST /participations/:participationId/field-evidence`

Request DTOs may use validation decorators and Swagger decorators. Application commands and domain models stay framework-free.

## Persistence Design

New tables:

### election_commissions

- `id`
- `name`
- `status`
- `created_at`
- `updated_at`

### election_commission_members

- `id`
- `commission_id`
- `name`
- `role`
- `status`
- `created_at`
- `updated_at`

### vote_voting_channels

- `vote_id`
- `channel`
- `created_at`

Use a join table rather than an enum array. It provides clearer constraints, indexing, and migration behavior.

### field_voting_sessions

- `id`
- `commission_id`
- `vote_id`
- `channel`
- `title`
- `location_name`
- `address`
- `status`
- `starts_at`
- `ends_at`
- `created_at`
- `updated_at`

### field_voting_session_managers

- `field_voting_session_id`
- `commission_member_id`
- `created_at`

### field_participation_evidences

- `id`
- `participation_id`
- `field_voting_session_id`
- `verified_by_commission_member_id`
- `evidence_file_id`
- `verification_note`
- `verified_at`
- `created_at`

Existing table changes:

- `votes.commission_id`
- `vote_participations.voting_channel`
- `vote_participations.field_voting_session_id`

Database constraints:

- `vote_voting_channels.channel in ('ONLINE', 'ONSITE', 'VISIT')`
- `field_voting_sessions.channel in ('ONSITE', 'VISIT')`
- `field_voting_sessions.starts_at < field_voting_sessions.ends_at`
- `vote_participations.voting_channel in ('ONLINE', 'ONSITE', 'VISIT')`
- `vote_participations.field_voting_session_id is null` when `voting_channel = 'ONLINE'`
- `vote_participations.field_voting_session_id is not null` when `voting_channel in ('ONSITE', 'VISIT')`
- secret vote `candidate_id is null` remains required at application/domain level. Do not rely on a simple database check for the initial implementation because effective privacy is derived across vote and vote detail policy. Cover the persistence boundary with mapper and repository tests.
- duplicate vote constraints remain based on vote detail plus elector or group key, not field session

## Security And Audit

Security rules:

- Onsite and visit voting must not create a secret-vote elector-to-candidate link.
- Field participation evidence must not store selected candidate data.
- Raw identity payloads, CI, DI, phone numbers, tokens, signatures, and private keys must not be logged.
- Signature files are elector-sensitive data and must go through storage ports.
- Store file references as file id or opaque storage key only.
- Visit addresses and verification notes can contain sensitive data. Do not include their raw values in domain events or audit logs.
- Log participation attempts, duplicate attempts, field session lifecycle changes, and evidence registration without secrets.

Audit events should include:

- commission id
- vote id
- field voting session id
- participation id when available
- actor member id when available
- action result
- timestamp

Audit events should not include:

- selected candidate id for secret votes
- raw identity payloads
- signature file contents
- visit address raw text
- verification note raw text

## Testing Strategy

Use TDD for implementation.

### Domain Tests

- creates an active election commission with a valid name
- rejects an empty commission name
- registers an active commission member
- rejects field session scheduling without an active manager
- rejects field session scheduling for `ONLINE`
- rejects field session scheduling when the parent vote does not allow the requested channel
- opens, closes, and cancels field voting sessions through valid state transitions
- rejects changing session place, schedule, or managers after opening
- creates votes only with a commission id and at least one voting channel
- rejects onsite or visit participation without a field session
- rejects online participation with a field session
- rejects onsite or visit participation unless the field session is open
- keeps duplicate prevention independent of field session
- keeps secret participation candidate id absent for onsite and visit voting
- keeps public participation candidate id required for onsite and visit voting
- records field evidence only for field participation

### Application Tests

- `CreateElectionCommissionHandler` saves the commission and returns id/status
- `RegisterElectionCommissionMemberHandler` saves the member and returns id/status
- `CreateVoteHandler` requires `commissionId` and allowed voting channels
- `CreateFieldVotingSessionHandler` loads commission, vote, and managers from authoritative repositories
- field participation cast command enforces channel/session rules before save
- `RecordFieldParticipationEvidenceHandler` validates assigned manager and evidence target

### Presentation Tests

- controllers map request bodies and route params into commands
- controllers do not contain channel, session, duplicate, or secrecy branching
- response DTOs are created through `static of()`

### Infrastructure Tests

- database entity registry includes new entities
- enum/check constraints match the ERD
- mappers convert entities to domain aggregates without leaking ORM types
- evidence file references are file ids or storage keys, not raw files

### Security Tests

- secret onsite participation does not persist selected candidate id
- secret visit participation does not persist selected candidate id
- duplicate field participation is rejected across different field sessions
- evidence registration does not store raw identity values
- audit payloads omit visit address, verification note, signature content, and secret selected candidate data

## Implementation Order

1. Domain types, aggregates, and domain tests.
2. Application ports, commands, handlers, and handler tests.
3. Presentation DTOs, controllers, and controller tests.
4. Persistence entities, mappers, migrations, and infrastructure tests.
5. Participation cast integration with channel/session checks.
6. Evidence file workflow integration through storage ports.
7. Full verification on Node 24.

## Out Of Scope

- UI for field managers.
- Real identity provider integration.
- Real file upload endpoint design beyond storage-port references.
- Blockchain result finalization.
- Geolocation validation.
- Reopening closed field voting sessions.
- Changing voting channels after vote opening.
