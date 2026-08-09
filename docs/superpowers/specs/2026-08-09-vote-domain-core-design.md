# Vote Domain Core Design

## Scope

Build the first backend domain core under `server/src/domain` as pure TypeScript. This phase models electronic voting rules only. It does not add Nest modules, controllers, persistence entities, repositories, migrations, file storage, identity provider adapters, or blockchain adapters.

## Architecture

The domain layer has no NestJS, ORM, database, cache, file storage, blockchain SDK, or HTTP dependencies. Application and infrastructure layers will call into this domain later.

Directory shape:

```text
server/src/domain/
  shared/
    domain-error.ts
    domain-event.ts
    id.ts
  vote/
    vote.aggregate.ts
    vote-detail.aggregate.ts
    vote-policy.ts
    vote.events.ts
  elector/
    elector.aggregate.ts
  candidate/
    candidate.aggregate.ts
  participation/
    participation.aggregate.ts
    participation-policy.service.ts
```

## Domain Concepts

`VoteAggregate` represents the parent vote. It owns default policies, identity verification policy, schedule, and status transitions.

`VoteDetailAggregate` represents one ballot item under a vote. It owns title, type, status, sort order, and optional policy overrides. It exposes effective policy calculation by combining its overrides with the parent vote policy.

`ElectorAggregate` represents an eligible elector for one parent vote. It owns identifier, optional `groupKey`, `voteWeight`, eligibility status, and identity verification success state.

`CandidateAggregate` represents a candidate or choice under one vote detail. For yes/no votes, choices are still candidates such as approve/reject.

`ParticipationAggregate` represents one cast or canceled participation record. It stores cast-time snapshots for `groupKey` and `voteWeight`. In secret votes, it must not store a selected candidate id. In public votes, it must store the selected candidate id.

`ParticipationPolicyService` evaluates rules that combine multiple domain objects, including duplicate participation, group voting, effective vote weight, and candidate selection rules.

## Policies

Policy fields follow the ERD:

- `privacyMode`: `SECRET | PUBLIC`
- `participationUnit`: `INDIVIDUAL | GROUP`
- `resultStorageMode`: `DATABASE | BLOCKCHAIN`
- `voteWeightMode`: `EQUAL | SHARE`

Vote details inherit the parent policy unless an override is present.

Identity verification policy is owned by the parent vote:

- `required = false`: provider and method must be absent.
- `required = true`: provider and method must be present.
- Participation authorization uses successful elector verification only.

## Invariants

Vote weight must be positive.

An elector must be eligible to participate.

Group voting requires an elector `groupKey`.

For group voting, duplicate detection is based on `voteDetailId + groupKey`.

For individual voting, duplicate detection is based on `voteDetailId + electorId`.

For equal voting, applied vote weight is `1`.

For share voting, applied vote weight is the elector's `voteWeight`.

Secret participation stores no selected candidate id while still allowing result aggregation to be handled by the application transaction later.

Public participation stores the selected candidate id.

Status transitions are explicit. Draft votes can open, open votes can close or cancel, and draft votes can cancel. Closed or canceled votes cannot reopen in this phase.

## Domain Events

Emit plain domain events for meaningful state changes:

- `VoteOpened`
- `VoteClosed`
- `VoteCanceled`
- `VoteDetailOpened`
- `VoteDetailClosed`
- `ParticipationCast`
- `ParticipationCanceled`

Events are in-memory objects on aggregates for now. Persistence or dispatch is outside this phase.

## Testing Strategy

Use TDD for domain behavior. Tests live next to the domain files or under `server/src/domain/**/*.spec.ts` so the existing Jest `rootDir: "src"` config picks them up.

First tests:

1. Vote detail calculates effective policies from parent defaults and overrides.
2. Secret participation rejects persisted selected candidate id.
3. Public participation requires selected candidate id.
4. Individual duplicate participation is detected by elector id.
5. Group participation requires group key and detects duplicates by group key.
6. Equal voting applies weight `1`.
7. Share voting applies elector vote weight.
8. Identity verification policy validates required provider/method consistency.

## Out Of Scope

No database unique constraints, repository ports, transactions, migrations, controllers, request DTOs, file upload, identity provider calls, blockchain calls, or result storage records are implemented in this phase.
