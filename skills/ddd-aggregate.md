# Skill: DDD / Aggregate

## Trigger

- aggregate design
- domain invariants
- voting policies
- domain events
- multi-aggregate workflow

## Rules

### Candidate Aggregates

- `VoteAggregate`: parent vote, default policies, status, schedule, identity verification policy
- `VoteDetailAggregate`: ballot item, privacy override, participation unit, result storage mode, vote weight mode
- `ElectorAggregate`: elector eligibility, group key, vote weight, identity verification state
- `CandidateAggregate`: candidate/choice lifecycle and attachments
- `ParticipationAggregate`: cast/cancel participation and duplicate prevention boundary

### Aggregate Design

- One command should change one aggregate root when feasible.
- Aggregates enforce invariants internally.
- Domain events use past-tense names, e.g. `VoteOpened`, `ParticipationCast`, `ResultStorageRequested`.

### Multi-Aggregate Workflow

Use a process manager when a workflow spans multiple aggregates or external systems:

- result finalization plus blockchain storage
- identity verification plus participation authorization
- file upload plus attachment registration

Process managers must persist state, be idempotent, and tolerate at-least-once delivery.

## Do

- Keep vote secrecy and duplicate participation rules explicit.
- Snapshot mutable elector values used at cast time, such as `group_key` and `vote_weight`.
- Model external side effects as ports/events.

## Don't

- Store raw secrets or private identity values in domain.
- Make cross-aggregate changes as if they were one large aggregate.
- Let public vote behavior leak into secret vote storage.

## Checklist

- [ ] Invariants live in domain/application, not controllers.
- [ ] Events are emitted for meaningful state changes.
- [ ] Multi-aggregate workflow uses process manager.
- [ ] Secret/public and share/equal policies are represented explicitly.
