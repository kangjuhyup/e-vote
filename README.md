# Vote

pnpm workspace 기반 monorepo입니다.

## Structure

- `ui`: frontend workspace placeholder
- `server`: NestJS backend application

## Project Setup

```bash
pnpm install
```

## Server

```bash
# development
pnpm start

# watch mode
pnpm start:dev

# production mode
pnpm start:prod
```

## Run Tests

```bash
# unit tests
pnpm test

# e2e tests
pnpm test:e2e

# test coverage
pnpm test:cov
```
