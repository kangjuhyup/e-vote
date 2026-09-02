# Electoral Roll–Commission Decoupling Specification

## Policy

- An electoral roll is maintained independently from an election commission.
- A vote keeps its required `commissionId` and may reference one immutable electoral-roll snapshot.
- The resulting relationship is `ElectionCommission -> Vote <- ElectoralRollSnapshot <- ElectoralRoll`.
- Electoral-roll access is granted explicitly to authenticated user principals; it is not inferred from commission membership.
- Creating a roll grants its creator read/write access. Existing rolls grant access to every linked active commission member during migration.
- Snapshot contents and source revision remain immutable after creation.

## API contract

- Remove `commissionId` from electoral-roll create, list, detail, and response contracts.
- Remove the `commissionId` list filter.
- Every list, detail, and mutation query is scoped by the authenticated `UserPrincipal.id`.
- Attaching an electoral roll to a vote resolves or creates the current immutable snapshot automatically, requires source-roll access, and applies no commission-equality rule.
- A vote continues to require and retain `commissionId` independently.

## Persistence contract

- Remove `commission_id` and its constraints/indexes from `electoral_rolls` and `electoral_roll_snapshots`.
- Add `electoral_roll_access_grants(id, electoral_roll_id, user_principal_id, granted_at)` with a unique roll/principal constraint.
- Backfill grants for non-null active commission members before removing the legacy commission columns.
- Legacy rolls whose commission has no linked active principal remain inaccessible until an administrative data repair grants access.
