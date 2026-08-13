# Vote

pnpm workspace 기반 monorepo입니다.

## Structure

- `ui`: Next.js frontend workspace
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

## UI

```bash
# use Node 24
nvm use

# development
pnpm dev:ui

# production build
pnpm build:ui

# lint
pnpm lint:ui
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
