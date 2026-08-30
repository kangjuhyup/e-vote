# Electoral Roll Page API Implementation Plan

> **For agentic workers:** Execute inline under the repository `AGENTS.md` policy. Do not delegate unless the user explicitly requests delegation.

**Goal:** Add `GET /electoral-rolls` with commission, text-search, and paging filters while returning only rolls belonging to commissions where the authenticated user has an active membership.

**Architecture:** The presentation layer maps HTTP query strings and `UserPrincipal.id` into an application query. A dedicated query handler delegates to the electoral-roll read port, and the PostgreSQL adapter applies the active commission-membership predicate before paging so unauthorized rows never enter the read model. Commission membership stores the external `UserPrincipal.id` needed for that predicate.

**Tech Stack:** NestJS, TypeScript, MikroORM, PostgreSQL, Swagger, Jest

**Spec:** User-provided `GET /electoral-rolls?commissionId={id}&q={검색어}&page=1&pageSize=20` contract from 2026-08-30.

## Global Constraints

- Authorization is derived from the validated `UserPrincipal.id`, never from a client-provided user identifier.
- Only `ACTIVE` election-commission memberships grant list access.
- An inaccessible `commissionId` produces an empty page and does not reveal whether that commission exists.
- List items expose only roll metadata and `memberCount`; member identifiers are excluded.
- `page` defaults to 1, `pageSize` defaults to 20, and `pageSize` is capped at 100.
- Search is a trimmed, case-insensitive substring match on electoral-roll name.
- DTOs created inside the backend use private constructors and static `of()` factories.

---

### Task 1: Bind commission membership to UserPrincipal

**Files:**

- Modify: `server/src/modules/election-commission/domain/election-commission-member.aggregate.ts`
- Modify: `server/src/modules/election-commission/application/command/dto/request/register-election-commission-member.command.ts`
- Modify: `server/src/modules/election-commission/presentation/election-commission/dto/register-election-commission-member-request.dto.ts`
- Modify: mapper, entity, command adapter, controller, and their focused tests.
- Create: `server/src/platform/database/migration/Migration20260830010000.ts`

**Interfaces:**

- Consumes: `RegisterElectionCommissionMemberBody.userPrincipalId: string`
- Produces: `ElectionCommissionMemberAggregate.userPrincipalId: string`
- Produces: nullable legacy database column `user_principal_id` plus a unique `(commission_id, user_principal_id)` index.

- [x] Add tests proving registration carries the target principal ID through the command, aggregate, and repository mapping.
- [x] Add the principal binding to the domain/application/presentation contracts.
- [x] Persist the binding and add a forward/backward migration safe for existing rows.

### Task 2: Implement the authorized electoral-roll page query

**Files:**

- Create: `server/src/modules/electoral-roll/application/query/dto/request/get-electoral-roll-page.query.ts`
- Modify: `server/src/modules/electoral-roll/application/query/dto/response/electoral-roll.view.ts`
- Create: `server/src/modules/electoral-roll/application/query/handler/get-electoral-roll-page.handler.ts`
- Modify: `server/src/modules/electoral-roll/application/port/persistence/query/electoral-roll-read-repository.port.ts`
- Modify: `server/src/modules/electoral-roll/infrastructure/database/repository/query/electoral-roll-read-repository.adapter.ts`
- Modify: focused query-handler and repository-adapter tests.

**Interfaces:**

```ts
interface ElectoralRollPageRequest {
  readonly userPrincipalId: string;
  readonly commissionId?: string;
  readonly query?: string;
  readonly page: number;
  readonly pageSize: number;
}

findPage(request: ElectoralRollPageRequest): Promise<ElectoralRollPageView>;
```

- [x] Test normalization, handler delegation, metadata-only mapping, authorization predicates, search, ordering, and paging.
- [x] Implement immutable application query/page views with `of()` factories.
- [x] Apply active-membership authorization inside the database query before `findAndCount` paging.

### Task 3: Publish and document the HTTP interface

**Files:**

- Create: `server/src/modules/electoral-roll/presentation/electoral-roll/dto/get-electoral-roll-page-request.dto.ts`
- Create: `server/src/modules/electoral-roll/presentation/electoral-roll/dto/get-electoral-roll-page-response.dto.ts`
- Modify: `server/src/modules/electoral-roll/presentation/electoral-roll/electoral-roll-read.controller.ts`
- Modify: `server/src/app.module.ts`
- Modify: controller and module tests.
- Create: `docs/api/electoral-rolls.md`
- Modify: `README.md`

**Interfaces:**

```text
GET /electoral-rolls?commissionId={id}&q={text}&page=1&pageSize=20
200 { items: [{ id, name, commissionId, revision, memberCount, updatedAt }], page, pageSize, totalItems, totalPages }
401 when request.user is not a validated UserPrincipal
```

- [x] Test controller mapping from string query parameters and the authenticated principal.
- [x] Add Swagger request/response metadata without exposing member identifiers.
- [x] Document the endpoint, authentication boundary, access behavior, examples, and current missing authentication Guard.
- [x] Run focused and complete verification under Node 24.
