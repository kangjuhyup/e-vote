# ERD MikroORM Entities Design

## Scope

Create persistence-only MikroORM entities that match `ERD.md` and add the initial database schema migration.

This phase does not add repository ports, repository adapters, command/query handlers, controllers, seed scripts, domain mapping, or business behavior.

## Architecture

Entities live under `server/src/infrastructure/database/entity`. They are infrastructure-only classes created from MikroORM `defineEntity` schemas. Domain aggregates remain pure TypeScript and do not import ORM entities.

MikroORM 7 packages are ESM-only while the current server package still compiles TypeScript as CommonJS. Entity runtime definitions therefore must not statically import MikroORM packages. `server/src/infrastructure/database/entity/index.ts` exports `createDatabaseEntityRegistry()`, which dynamically imports `defineEntity` and `p`, creates all entity classes, caches them, and returns the complete `databaseEntities` list. `createDatabaseConfig()` awaits that registry for both runtime Nest wiring and MikroORM CLI config.

The initial migration lives under `server/src/infrastructure/database/migration` so database schema ownership stays inside the infrastructure database module.

## Entity Set

The ERD contains 13 tables:

- `votes`
- `vote_details`
- `electors`
- `candidates`
- `vote_participations`
- `vote_results`
- `files`
- `vote_attachments`
- `elector_attachments`
- `candidate_attachments`
- `elector_identity_verifications`
- `vote_content_change_histories`
- `vote_result_storage_records`

Each table gets one entity class backed by a `defineEntity` schema. Entity class names use the `Entity` suffix, for example `VoteEntity` and `VoteDetailEntity`.

## Persistence Rules

Entity classes contain no business methods. They exist only as empty classes attached to `defineEntity` schemas through `setClass()`.

Enum-like ERD values are represented as string literal TypeScript union types in `server/src/infrastructure/database/entity/type/database-enum.type.ts`. Database columns remain string columns with check constraints in the migration.

Relations mirror the ERD with `p.manyToOne()` and `p.oneToMany()` where useful. Nullable relation columns remain nullable in the entity.

Timestamps are ordinary persisted properties. They are not implemented as business logic or lifecycle hooks in this phase.

## Constraints

MikroORM metadata should declare regular unique constraints where practical:

- `electors`: unique `(vote_id, identifier)`
- `candidates`: unique `(vote_detail_id, candidate_no)`
- `vote_participations`: unique `(vote_detail_id, elector_id)`
- `vote_results`: unique `(vote_detail_id, candidate_id)`
- `files`: unique `(storage_key)`
- `vote_attachments`: unique `(vote_id, file_id)`
- `elector_attachments`: unique `(elector_id, file_id)`
- `candidate_attachments`: unique `(candidate_id, file_id)`

The initial migration also adds constraints that are easier or clearer in SQL:

- `electors.vote_weight > 0`
- partial unique `(vote_detail_id, group_key)` on `vote_participations` where `group_key is not null`
- partial unique `blockchain_tx_hash` on `vote_result_storage_records` where `blockchain_tx_hash is not null`
- partial unique `(elector_id, type)` on `elector_attachments` where `type = 'SIGNATURE'`
- partial unique `(provider, provider_transaction_id)` on `elector_identity_verifications` where `provider_transaction_id is not null`
- check constraints for ERD enum-like string columns

## Migration

The initial migration creates all 13 tables, foreign keys, indexes, unique constraints, partial unique indexes, check constraints, and timestamp columns required by the ERD.

Migration `down()` drops tables in reverse dependency order. It does not preserve data because this is the initial schema migration.

## Testing Strategy

Use focused infrastructure tests that do not require a live PostgreSQL database.

Tests cover:

1. `createDatabaseEntityRegistry()` exports all 13 ERD entity classes.
2. `createDatabaseConfig()` registers all entity classes for runtime and CLI use.
3. Entity source files do not import from `server/src/domain`.
4. The initial migration SQL contains all ERD tables and required partial unique/check constraints.

## Out Of Scope

No business validation, policy calculation, duplicate voting checks, secret/public vote handling, identity verification enforcement, result aggregation, repository adapters, transaction orchestration, or data seeding is implemented in this phase.
