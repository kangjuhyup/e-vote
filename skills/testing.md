# Skill: Backend Testing

## Trigger

- feature implementation
- bug fix
- refactor
- schema/policy change
- security-sensitive code

## Rules

### Test Order

1. Domain tests for invariants and events.
2. Command handler tests with mocked ports.
3. Projector/read model tests for idempotency.
4. Query handler tests for read model mapping.
5. Integration/e2e tests for HTTP and persistence boundaries.

### Required Voting Tests

- secret vote does not persist selected candidate in participation
- public vote persists selected candidate
- duplicate participation is rejected
- group voting allows one vote per group key
- share voting increments weighted count correctly
- identity verification policy is enforced
- result storage mode creates database/blockchain storage records as expected

### Isolation

- Unit tests should not require NestJS module bootstrapping.
- Mock external services: file storage, identity provider, blockchain, cache.
- Do not mock domain logic in domain tests.

## Do

- Write focused tests before risky changes.
- Cover policy combinations: secret/public, individual/group, equal/share.
- Test failure paths for identity verification and blockchain storage.

## Don't

- Skip security tests.
- Use e2e tests as the only coverage for domain rules.
- Test external provider payload internals beyond our contract.

## Checklist

- [ ] Domain invariant tests exist.
- [ ] Command/query handler tests exist.
- [ ] Security policy tests exist.
- [ ] Projection/storage idempotency is tested.
