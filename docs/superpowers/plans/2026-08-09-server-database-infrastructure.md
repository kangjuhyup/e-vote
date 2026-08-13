# Server Database Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PostgreSQL + MikroORM database configuration under the server infrastructure layer without adding persistence entities or migrations.

**Architecture:** `AppModule` imports `InfrastructureModule`, which imports `DatabaseModule`. `DatabaseModule` owns NestJS MikroORM wiring through an async dynamic module so MikroORM 7 ESM packages can be loaded with `import()` without converting the whole server to ESM.

**Tech Stack:** Node 24, NestJS 11, MikroORM 7, PostgreSQL, TypeScript, Jest, tsx, pnpm workspace.

## Global Constraints

- Domain files must not import NestJS, MikroORM, PostgreSQL, configuration modules, or infrastructure code.
- ORM entities remain out of scope for this phase.
- Migrations remain out of scope for this phase.
- Repository ports and adapters remain out of scope for this phase.
- Database tests must not require a live PostgreSQL connection.
- Do not convert the entire server package to ESM in this phase.
- Load MikroORM 7 runtime packages with `import()` from infrastructure code.
- Set `discovery.warnWhenNoEntities=false` until persistence entities are added in a later phase.
- Use `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, and `DATABASE_SSL` for database configuration.

---

### Task 1: Pure Database Config Mapping

**Files:**
- Create: `server/src/infrastructure/database/database.config.ts`
- Test: `server/test/infrastructure/database/database-config.spec.ts`

**Interfaces:**
- Produces: `createDatabaseConfig(env?: NodeJS.ProcessEnv): PostgreSqlOptions`
- Produces: local defaults for missing environment variables.

- [ ] **Step 1: Write the failing test**

```typescript
import { createDatabaseConfig } from '../../../src/infrastructure/database/database.config';

describe('database config', () => {
  it('maps environment variables to PostgreSQL MikroORM options', () => {
    const config = createDatabaseConfig({
      DATABASE_HOST: 'db.example.test',
      DATABASE_PORT: '15432',
      DATABASE_NAME: 'vote_test',
      DATABASE_USER: 'vote_user',
      DATABASE_PASSWORD: 'vote_password',
      DATABASE_SSL: 'false',
    });

    expect(config).toEqual({
      host: 'db.example.test',
      port: 15432,
      dbName: 'vote_test',
      user: 'vote_user',
      password: 'vote_password',
      entities: [],
      entitiesTs: [],
      discovery: {
        warnWhenNoEntities: false,
      },
    });
  });

  it('uses local development defaults when environment variables are missing', () => {
    const config = createDatabaseConfig({});

    expect(config).toMatchObject({
      host: 'localhost',
      port: 5432,
      dbName: 'vote',
      user: 'postgres',
      password: 'postgres',
    });
  });

  it('enables SSL only when DATABASE_SSL is true', () => {
    const config = createDatabaseConfig({
      DATABASE_SSL: 'true',
    });

    expect(config.driverOptions).toEqual({
      connection: {
        ssl: true,
      },
    });
  });

  it('allows empty entity lists while persistence entities are out of scope', () => {
    const config = createDatabaseConfig({});

    expect(config.discovery).toEqual({
      warnWhenNoEntities: false,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @vote/server test -- --runInBand infrastructure/database/database-config.spec.ts`

Expected: FAIL because `database.config` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `createDatabaseConfig()` with PostgreSQL connection options and local defaults. Do not import MikroORM runtime packages from this file.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @vote/server test -- --runInBand infrastructure/database/database-config.spec.ts`

Expected: PASS.

---

### Task 2: Nest Infrastructure Module Wiring

**Files:**
- Create: `server/src/infrastructure/database/database.module.ts`
- Create: `server/src/infrastructure/infrastructure.module.ts`
- Modify: `server/src/app.module.ts`
- Modify: `server/package.json`
- Test: `server/src/app.module.spec.ts`

**Interfaces:**
- Consumes: `createDatabaseConfig(env?: NodeJS.ProcessEnv): PostgreSqlOptions`
- Produces: `DatabaseModule`
- Produces: `InfrastructureModule`
- Updates: `AppModule` imports `InfrastructureModule`

- [ ] **Step 1: Write the failing test**

```typescript
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';

describe('AppModule', () => {
  it('imports the infrastructure module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(InfrastructureModule)
      .useModule(class InfrastructureModuleStub {})
      .compile();

    expect(moduleRef.get(AppModule)).toBeInstanceOf(AppModule);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @vote/server test -- --runInBand src/app.module.spec.ts`

Expected: FAIL because `InfrastructureModule` does not exist or `AppModule` does not import it.

- [ ] **Step 3: Add dependencies**

Run: `pnpm --filter @vote/server add @nestjs/config @mikro-orm/core@7.1.11 @mikro-orm/nestjs@7.0.2 @mikro-orm/postgresql@7.1.11`

- [ ] **Step 4: Write minimal implementation**

Create `DatabaseModule` with an async `register()` method that dynamically imports `@mikro-orm/nestjs` and `@mikro-orm/postgresql`, create `InfrastructureModule`, and import `InfrastructureModule` in `AppModule`.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @vote/server test -- --runInBand src/app.module.spec.ts`

Expected: PASS.

---

### Task 3: MikroORM CLI Config

**Files:**
- Create: `server/mikro-orm.config.ts`
- Modify: `server/package.json`
- Test: `server/test/infrastructure/database/mikro-orm-config.spec.ts`

**Interfaces:**
- Consumes: `createDatabaseConfig(env?: NodeJS.ProcessEnv): PostgreSqlOptions`
- Produces: default exported `Promise<PostgreSqlOptions>` for CLI use.
- Produces: package scripts `db:migration:create`, `db:migration:up`, and `db:migration:down`
- Adds: dev dependency `@mikro-orm/cli@7.1.11`
- Adds: dev dependency `tsx`

- [ ] **Step 1: Write the failing test**

```typescript
import mikroOrmConfig from '../../../mikro-orm.config';
import { createDatabaseConfig } from '../../../src/infrastructure/database/database.config';

describe('mikro orm cli config', () => {
  it('reuses the database config mapping and attaches the PostgreSQL driver', async () => {
    const [{ PostgreSqlDriver }, config] = await Promise.all([
      import('@mikro-orm/postgresql'),
      mikroOrmConfig,
    ]);

    expect(config).toMatchObject(createDatabaseConfig());
    expect(config.driver).toBe(PostgreSqlDriver);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @vote/server test -- --runInBand infrastructure/database/mikro-orm-config.spec.ts`

Expected: FAIL because `mikro-orm.config.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `server/mikro-orm.config.ts` that exports an async config built from `createDatabaseConfig()` plus the dynamically imported PostgreSQL driver. Add MikroORM CLI scripts and `tsx` CLI loader settings to `server/package.json`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @vote/server test -- --runInBand infrastructure/database/mikro-orm-config.spec.ts`

Expected: PASS.

---

### Final Verification

- [ ] Run `pnpm --filter @vote/server test -- --runInBand`
- [ ] Run `pnpm --filter @vote/server test:e2e`
- [ ] Run `pnpm --filter @vote/server build`
- [ ] Run `pnpm --filter @vote/server lint`
- [ ] Run `pnpm --filter @vote/server exec mikro-orm debug --config mikro-orm.config.ts`
