# Auth Group-based Organization Approval Onboarding Plan

> **For agentic workers:** Implement task-by-task without overwriting unrelated dirty changes. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user apply to create an organization, let a `vote-admin` approve or reject it, and provision the approved organization through the existing Auth group model.

**Architecture:** Auth remains the source of truth for identities, organizations, group membership, and effective roles. An organization is represented by an Auth `GroupOrmEntity`; Vote stores only the organization application, approval audit, provisioning state, and the resulting Auth group identifiers. `vote-admin` is the platform-wide electronic-voting administrator. `vote-manager` is effective only together with the user's organization group context, so Vote must never authorize an organization operation from the role string alone.

**Verified Auth capabilities:** Auth already has `group`, `user_group`, and `group_role` entities, hierarchical groups through `parent_id`, tenant-scoped group CRUD endpoints, and group-role assignment endpoints. The current admin HTTP surface does not expose user-group membership management, and Vote's introspection parser currently maps `roles` but not groups. Those are integration gaps, not a reason to duplicate groups in Vote.

**Tech Stack:** Auth NestJS/MikroORM/OIDC Provider, Vote NestJS 11/MikroORM 7/PostgreSQL, Next.js 16 App Router, React Query 5, React 19, Vitest, Jest.

## Decisions and invariants

- Auth is the authoritative source for organization identity and membership.
- One approved organization maps to one tenant-scoped Auth group.
- Each organization has a child manager group, for example `<organization-code>/vote-managers`, whose parent is the organization group.
- The Auth role code `vote-manager` is assigned to the child manager group, not to the entire organization group. Ordinary organization members must not inherit manager permissions.
- The approved applicant is added to both the organization group and its manager group.
- `vote-admin` is a platform-wide trusted role and is the only role allowed to review applications.
- A `vote-manager` may act only on a resource whose `authOrganizationGroupId` matches one of that principal's organization group memberships.
- Vote does not create local organization-membership or organization-role tables.
- Vote stores `authOrganizationGroupId` and `authManagerGroupId` after successful provisioning so domain records can be scoped and audited.
- An application has `PENDING`, `PROVISIONING`, `APPROVED`, `REJECTED`, or `PROVISIONING_FAILED` status.
- Approval/provisioning must be idempotent. A retry must reuse the same deterministic group codes and must not create duplicate groups, memberships, or role assignments.
- A user may have at most one pending/provisioning application. Rejection requires a reason and permits a new application.
- Duplicate normalized organization names/codes must be rejected before provisioning and guarded by Auth's tenant/code uniqueness constraint.
- Review and provisioning events retain applicant ID, reviewer ID, timestamps, Auth resource IDs, attempts, and sanitized failure information.
- Existing unrelated worktree changes must be preserved.

---

### Task 1: Complete the Auth organization primitives

**Auth repository:** `/Users/kangjuhyup/Documents/auth/service`

**Existing components to reuse:**

- `src/infrastructure/mikro-orm/entities/group.ts`
- `src/infrastructure/mikro-orm/entities/user-group.ts`
- `src/infrastructure/mikro-orm/entities/group-role.ts`
- `src/presentation/controllers/admin/group.controller.ts`

**Required changes:**

- Add application ports/handlers and tenant-admin endpoints for listing, adding, and removing user-group memberships.
- Expose group membership in the OIDC token/introspection contract using stable group IDs and codes; do not infer organization scope from display names.
- Ensure effective roles include group-derived roles while retaining the group context needed to determine where each role applies.
- Add an idempotent service-level provisioning operation if separate create-group/add-member/assign-role calls cannot be made safely and retryably by Vote.

**Suggested HTTP contracts:**

- `GET /t/:tenantCode/admin/users/:userId/groups`
- `POST /t/:tenantCode/admin/users/:userId/groups/:groupId`
- `DELETE /t/:tenantCode/admin/users/:userId/groups/:groupId`
- Introspection claim: `groups: [{ id, code, parentId? }]`

- [ ] Add repository and command/query tests for user-group membership, tenant isolation, duplicates, and missing resources.
- [ ] Add membership command/query ports and handlers using the existing `UserGroupOrmEntity` mapping.
- [ ] Add guarded admin controller routes and audit records for membership mutations.
- [ ] Add OIDC/introspection contract tests for direct and inherited group membership and group-derived roles.
- [ ] Emit stable group context in introspection without leaking unrelated tenants or groups.
- [ ] Document whether Vote calls atomic provisioning or composes idempotent Auth admin operations.
- [ ] Run focused Auth tests, lint, and production build with the repository-pinned runtime.

### Task 2: Store application and provisioning state in Vote

**Files:**

- Create an organization-onboarding module under `server/src/modules/organization`.
- Create application aggregate/status types and command/read persistence ports.
- Create MikroORM entities only for `organization_applications` and `organization_provisioning_attempts` (or an equivalent outbox/job model).
- Add a migration and register the entities/providers.

**Persisted application fields:**

- applicant principal ID and tenant ID/code
- requested organization name, normalized name, deterministic organization code, type, contact data
- status, reviewer principal ID, rejection reason, submitted/reviewed timestamps
- `authOrganizationGroupId`, `authManagerGroupId`, provisioning attempt/error metadata

- [ ] Add domain tests for state transitions, deterministic codes, rejection reason, immutable final decisions, and retryable provisioning failures.
- [ ] Add migration tests for status constraints, one-active-application constraint, normalized-name uniqueness, audit fields, and Auth group ID fields.
- [ ] Implement application persistence without local `organizations` or `organization_memberships` tables.
- [ ] Define an `AuthOrganizationProvisioningPort`; keep Auth HTTP payloads in its infrastructure adapter.
- [ ] Make approval persist the review decision and durable provisioning intent before calling Auth.
- [ ] Make provisioning idempotently create the organization group and manager child group, assign `vote-manager`, and add the applicant to both groups.
- [ ] Mark the application `APPROVED` only after all Auth resources are confirmed; otherwise record `PROVISIONING_FAILED` for retry.

### Task 3: Consume group context and enforce organization authorization in Vote

**Current gap:** `OidcIntrospectTokenResult` and `UserPrincipal` expose `roles` and scopes but no groups.

**Required model:**

- Add immutable group memberships to introspection parsing and `UserPrincipal`.
- Identify the active organization by stable Auth group ID, not by organization name.
- Treat `vote-manager` without a matching organization group as insufficient authorization.
- Scope every organization-owned vote, elector list, dispatch, result, and audit query by `authOrganizationGroupId`.

- [ ] Add authentication tests for valid group claims, absent claims, malformed claims, cross-tenant groups, and inactive tokens.
- [ ] Extend the OIDC adapter and `UserPrincipal` with structured group membership.
- [ ] Add a reusable organization-access policy: `vote-admin` bypasses organization management restrictions only where explicitly intended; `vote-manager` requires matching group scope.
- [ ] Add `authOrganizationGroupId` to newly created organization-owned records and repository queries.
- [ ] Add negative tests proving a manager of organization A cannot read or mutate organization B.
- [ ] Reject ambiguous requests when a user manages multiple organizations unless an explicit organization ID is supplied.

### Task 4: Application and review APIs

**Vote HTTP contracts:**

- `POST /organization-applications`
- `GET /organization-applications/me`
- `GET /admin/organization-applications?page&pageSize&status`
- `POST /admin/organization-applications/:applicationId/approve`
- `POST /admin/organization-applications/:applicationId/reject`
- `POST /admin/organization-applications/:applicationId/retry-provisioning`
- `GET /organizations/me` derives organizations from the authenticated Auth group context.

- [ ] Implement submit, approve, reject, and retry commands.
- [ ] Authorize review endpoints exclusively from the trusted `vote-admin` principal role.
- [ ] Return provisioning progress separately from approval review so the UI can explain a temporary setup delay.
- [ ] Map Auth conflicts and unavailable responses to stable Vote errors without exposing internal/server wording.
- [ ] Add controller tests for `403`, `404`, `409`, provisioning retry, and trusted principal propagation.

### Task 5: Applicant and platform-admin UI

**Routes:**

- `/organization` for application/status
- `/admin/organization-applications` for `vote-admin` review

- [ ] Implement application form fields: organization name, type, contact name, and optional contact phone.
- [ ] Show user-facing states: review waiting, organization setup in progress, approved, rejected, and setup retry requested.
- [ ] Never display implementation messages such as server errors, OIDC provisioning details, role IDs, or raw group IDs.
- [ ] After approval, derive accessible organizations from the session/group context and require an organization choice if more than one is manageable.
- [ ] Hide admin navigation from ordinary users while keeping backend authorization authoritative.
- [ ] Add React Query and container tests for application, approval, rejection, provisioning, retry, multi-organization selection, and forbidden states.

### Task 6: Verification and rollout

- [ ] Provision `vote-manager` once in the Auth tenant and record its stable role ID/configuration.
- [ ] Verify the full flow: apply -> approve -> Auth groups created -> role assigned -> applicant added -> refreshed token/introspection contains group context -> Vote access succeeds.
- [ ] Verify rejection and provisioning retry flows.
- [ ] Verify duplicate approval and replay do not create duplicate Auth records.
- [ ] Verify cross-organization access is denied across votes, recipients, dispatch history, and results.
- [ ] Verify removing a user from the manager group revokes organization management after token refresh/introspection.
- [ ] Run focused tests, full lint/type checks, production builds, and `git diff --check` in both repositories.
- [ ] Document deployment order: Auth membership/group-claim support first, then Vote consumption and organization onboarding.
