# ERD MikroORM Entities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create persistence-only MikroORM entities and an initial schema migration that match `ERD.md`.

**Architecture:** Entity classes live only in `server/src/infrastructure/database/entity` and are created from MikroORM `defineEntity` schemas through an async registry. Domain aggregates remain framework-free and do not import ORM entities. The initial migration lives in `server/src/infrastructure/database/migration`.

**Tech Stack:** Node 24, NestJS 11, MikroORM 7, PostgreSQL, TypeScript, Jest, pnpm workspace.

## Global Constraints

- ORM entities are infrastructure-only.
- Domain files must not import MikroORM or infrastructure entities.
- Entity classes must not contain business methods, state transition methods, policy calculation, or validation behavior.
- Use MikroORM `defineEntity` and `p` property builders for entity definitions.
- Do not statically import MikroORM runtime packages from CommonJS-loaded server files; use dynamic `import()` in the entity registry/config path.
- ERD enum-like values stay as string columns in PostgreSQL.
- Database tests must not require a live PostgreSQL connection.
- Initial migration must create all 13 ERD tables.

---

### Task 1: Entity Registry Contract

**Files:**
- Create: `server/test/infrastructure/database/entity/database-entities.spec.ts`
- Create: `server/src/infrastructure/database/entity/type/database-enum.type.ts`
- Create: `server/src/infrastructure/database/entity/index.ts`
- Modify: `server/src/infrastructure/database/database.config.ts`

**Interfaces:**
- Produces: `createDatabaseEntityRegistry(): Promise<DatabaseEntityRegistry>`
- Produces: `DatabaseEntityRegistry` with `databaseEntities: EntityClass<AnyEntity>[]`
- Produces: `DatabaseEnum` string union type exports.
- Updates: `createDatabaseConfig()` returns `Promise<PostgreSqlOptions>` with `entities: databaseEntities` and `entitiesTs: databaseEntities`.

- [ ] **Step 1: Write the failing test**

```typescript
import { createDatabaseConfig } from '../../../../src/infrastructure/database/database.config';
import { createDatabaseEntityRegistry } from '../../../../src/infrastructure/database/entity';

describe('database entities registry', () => {
  it('registers all ERD entity classes', async () => {
    const { databaseEntities } = await createDatabaseEntityRegistry();

    expect(databaseEntities.map((entity) => entity.name).sort()).toEqual([
      'CandidateAttachmentEntity',
      'CandidateEntity',
      'ElectorAttachmentEntity',
      'ElectorEntity',
      'ElectorIdentityVerificationEntity',
      'FileEntity',
      'VoteAttachmentEntity',
      'VoteContentChangeHistoryEntity',
      'VoteDetailEntity',
      'VoteEntity',
      'VoteParticipationEntity',
      'VoteResultEntity',
      'VoteResultStorageRecordEntity',
    ]);
  });

  it('uses the entity registry in database config', async () => {
    const [{ databaseEntities }, config] = await Promise.all([
      createDatabaseEntityRegistry(),
      createDatabaseConfig({}),
    ]);

    expect(config.entities).toBe(databaseEntities);
    expect(config.entitiesTs).toBe(databaseEntities);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @vote/server test -- --runInBand infrastructure/database/entity/database-entities.spec.ts`

Expected: FAIL because `databaseEntities` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create placeholder entity exports only after Task 2 creates concrete entity classes. Keep this task red until concrete classes exist, then update `database.config.ts` to await `createDatabaseEntityRegistry()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @vote/server test -- --runInBand infrastructure/database/entity/database-entities.spec.ts`

Expected: PASS.

---

### Task 2: Persistence Entity Registry

**Files:**
- Modify: `server/src/infrastructure/database/entity/index.ts`
- Test: `server/test/infrastructure/database/entity/database-entities.spec.ts`

**Interfaces:**
- Consumes: `DatabaseEnum` type exports.
- Produces: 13 MikroORM entity classes named in Task 1 from `defineEntity` schemas.

- [ ] **Step 1: Write the failing test**

Use the Task 1 registry test as the failing test for concrete entity class presence.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @vote/server test -- --runInBand infrastructure/database/entity/database-entities.spec.ts`

Expected: FAIL because entity classes do not exist.

- [ ] **Step 3: Write minimal implementation**

Implement `createDatabaseEntityRegistry()` with dynamic `import('@mikro-orm/postgresql')`. Use `defineEntity`, `p.uuid().primary()`, scalar property builders, `p.manyToOne()`, `p.oneToMany()`, `uniques`, and empty `class EntityName extends Schema.class {}` definitions attached through `Schema.setClass(EntityName)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @vote/server test -- --runInBand infrastructure/database/entity/database-entities.spec.ts`

Expected: PASS.

---

### Task 3: Domain Isolation Guard

**Files:**
- Create: `server/test/infrastructure/database/entity/entity-domain-isolation.spec.ts`

**Interfaces:**
- Consumes: entity source files under `server/src/infrastructure/database/entity`.
- Produces: a guard test proving persistence entities do not import domain code.

- [ ] **Step 1: Write the failing test**

```typescript
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('database entity domain isolation', () => {
  it('does not import domain code from persistence entities', () => {
    const entityDir = join(process.cwd(), 'src/infrastructure/database/entity');
    const entityFiles = readdirSync(entityDir).filter((file) => file.endsWith('.ts'));

    expect(entityFiles).toContain('index.ts');

    for (const file of entityFiles) {
      const source = readFileSync(join(entityDir, file), 'utf8');
      expect(source).not.toContain("from '../../../domain");
      expect(source).not.toContain("from '../../domain");
      expect(source).not.toContain("from '../domain");
      expect(source).not.toContain("src/domain");
    }
  });
});
```

- [ ] **Step 2: Run test to verify it passes after Task 2**

Run: `pnpm --filter @vote/server test -- --runInBand infrastructure/database/entity/entity-domain-isolation.spec.ts`

Expected: PASS because entities are infrastructure-only.

---

### Task 4: Initial Schema Migration

**Files:**
- Create: `server/src/infrastructure/database/migration/Migration20260809000000.ts`
- Modify: `server/src/infrastructure/database/database.config.ts`
- Modify: `server/package.json`
- Test: `server/test/infrastructure/database/migration/initial-schema-migration.spec.ts`

**Interfaces:**
- Produces: `Migration20260809000000 extends Migration`
- Updates: `createDatabaseConfig()` includes `migrations.path` and `migrations.pathTs`.
- Adds: dependency `@mikro-orm/migrations@7.1.11`

- [ ] **Step 1: Write the failing test**

```typescript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDatabaseConfig } from '../../../../src/infrastructure/database/database.config';

describe('initial schema migration', () => {
  const migrationSource = readFileSync(
    join(
      process.cwd(),
      'src/infrastructure/database/migration/Migration20260809000000.ts',
    ),
    'utf8',
  );

  it('creates every ERD table', () => {
    for (const tableName of [
      'votes',
      'vote_details',
      'electors',
      'candidates',
      'vote_participations',
      'vote_results',
      'files',
      'vote_attachments',
      'elector_attachments',
      'candidate_attachments',
      'elector_identity_verifications',
      'vote_content_change_histories',
      'vote_result_storage_records',
    ]) {
      expect(migrationSource).toContain(`create table "${tableName}"`);
    }
  });

  it('contains required ERD constraints that need SQL-level declarations', () => {
    expect(migrationSource).toContain('electors_vote_weight_positive_check');
    expect(migrationSource).toContain('vote_participations_vote_detail_id_group_key_unique');
    expect(migrationSource).toContain('where "group_key" is not null');
    expect(migrationSource).toContain('vote_result_storage_records_blockchain_tx_hash_unique');
    expect(migrationSource).toContain('where "blockchain_tx_hash" is not null');
    expect(migrationSource).toContain('elector_attachments_elector_id_signature_unique');
    expect(migrationSource).toContain("where \"type\" = 'SIGNATURE'");
    expect(migrationSource).toContain('elector_identity_verifications_provider_transaction_unique');
    expect(migrationSource).toContain('where "provider_transaction_id" is not null');
  });

  it('configures MikroORM migration paths inside infrastructure', async () => {
    await expect(createDatabaseConfig({})).resolves.toMatchObject({
      extensions: expect.arrayContaining([expect.any(Function)]),
      migrations: {
        path: './dist/infrastructure/database/migration',
        pathTs: './src/infrastructure/database/migration',
      },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @vote/server test -- --runInBand infrastructure/database/migration/initial-schema-migration.spec.ts`

Expected: FAIL because the migration file and config paths do not exist.

- [ ] **Step 3: Add dependency**

Run: `pnpm --filter @vote/server add @mikro-orm/migrations@7.1.11`

- [ ] **Step 4: Write minimal implementation**

Create a MikroORM migration with SQL for all 13 tables, foreign keys, unique constraints, partial unique indexes, and enum-like check constraints. Update database config migration paths and dynamically load `Migrator`.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @vote/server test -- --runInBand infrastructure/database/migration/initial-schema-migration.spec.ts`

Expected: PASS.

---

### Task 5: Existing Config Tests Async Update

**Files:**
- Modify: `server/test/infrastructure/database/database-config.spec.ts`
- Modify: `server/test/infrastructure/database/mikro-orm-config.spec.ts`
- Modify: `server/src/infrastructure/database/database.module.ts`
- Modify: `server/mikro-orm.config.ts`

**Interfaces:**
- Consumes: `createDatabaseConfig(env?: NodeJS.ProcessEnv): Promise<PostgreSqlOptions>`
- Updates: existing config tests and callers to await async config.

- [ ] **Step 1: Update tests first**

Change existing tests to `await createDatabaseConfig({})` and `await mikroOrmConfig`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @vote/server test -- --runInBand infrastructure/database/database-config.spec.ts infrastructure/database/mikro-orm-config.spec.ts`

Expected: FAIL until `createDatabaseConfig()` returns the async entity/migration-aware config.

- [ ] **Step 3: Update implementation**

Update `DatabaseModule` and `mikro-orm.config.ts` to await `createDatabaseConfig()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @vote/server test -- --runInBand infrastructure/database/database-config.spec.ts infrastructure/database/mikro-orm-config.spec.ts`

Expected: PASS.

---

### Final Verification

- [ ] Run `pnpm --filter @vote/server test -- --runInBand`
- [ ] Run `pnpm --filter @vote/server test:e2e`
- [ ] Run `pnpm --filter @vote/server build`
- [ ] Run `pnpm --filter @vote/server lint`
- [ ] Run `pnpm --filter @vote/server exec mikro-orm debug --config mikro-orm.config.ts`
