# Server Database Infrastructure Design

## Scope

Add the first backend infrastructure layer for database configuration under `server/src/infrastructure`. This phase configures PostgreSQL access through MikroORM and wires the infrastructure module into the NestJS app.

This phase does not add domain ORM entities, migrations, repository ports, repository adapters, seed scripts, cache, file storage, identity provider adapters, blockchain adapters, or HTTP endpoints.

## Architecture

`AppModule` imports a single `InfrastructureModule`. `InfrastructureModule` imports `DatabaseModule`. `DatabaseModule` owns all MikroORM and PostgreSQL connection configuration.

Directory shape:

```text
server/
  mikro-orm.config.ts
  src/
    infrastructure/
      infrastructure.module.ts
      database/
        database.module.ts
        database.config.ts
```

The domain layer remains pure TypeScript. It must not import NestJS, MikroORM, PostgreSQL, configuration modules, or infrastructure code.

## Database Configuration

The database uses PostgreSQL through MikroORM.

Connection values come from environment variables:

- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_SSL`

Defaults are limited to local development:

- `DATABASE_HOST=localhost`
- `DATABASE_PORT=5432`
- `DATABASE_NAME=vote`
- `DATABASE_USER=postgres`
- `DATABASE_PASSWORD=postgres`
- `DATABASE_SSL=false`

`DATABASE_SSL` accepts `true` to enable SSL and any other value as disabled.

`database.config.ts` exposes a pure `createDatabaseConfig()` function so configuration mapping can be unit tested without bootstrapping NestJS or connecting to PostgreSQL.

Because persistence entities are out of scope for this phase, the MikroORM config sets `discovery.warnWhenNoEntities=false`. This keeps app bootstrap, e2e tests, and CLI config loading working until infrastructure entities are added.

## NestJS Wiring

The project targets Node 24. MikroORM 7 packages are ESM-only, while the current Nest/Jest project still runs TypeScript as CommonJS. To avoid a broad server-wide ESM migration in this database setup phase, `DatabaseModule` loads MikroORM integration packages through `import()` inside an async dynamic module factory.

`DatabaseModule` uses `MikroOrmModule.forRootAsync()` and `ConfigModule` so runtime configuration is resolved through Nest dependency injection.

`server/mikro-orm.config.ts` exports an async config for CLI usage. It must not duplicate environment parsing logic; it reuses `createDatabaseConfig()` and attaches the PostgreSQL driver through dynamic `import()`. The MikroORM CLI uses `tsx` to load the TypeScript config.

## Testing Strategy

Use TDD for the configuration boundary.

Tests cover:

1. Environment variables map to PostgreSQL MikroORM options without importing ESM-only MikroORM packages at test load time.
2. Missing environment variables fall back to local development defaults.
3. `DATABASE_SSL=true` enables SSL.
4. Empty entity lists are allowed while persistence entities are out of scope.
5. `AppModule` imports `InfrastructureModule`.
6. The MikroORM CLI config reuses the same config mapping and attaches the PostgreSQL driver.

These tests do not open a real database connection.

## Out Of Scope

No database tables, schema migrations, domain persistence entities, repositories, transactions, caches, file storage adapters, identity verification adapters, blockchain adapters, or Docker Compose configuration are implemented in this phase.
