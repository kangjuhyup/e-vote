# Organization onboarding UI contract

The browser calls only the Vote API through the existing `/api/vote-server` session proxy. It never receives Auth tenant-admin credentials or an Auth client secret and never calls Auth Admin endpoints directly.

## Vote endpoints required by the UI

- `POST /organization-applications`
- `GET /organization-applications/me` (`404` means no application)
- `GET /admin/organization-applications?page&pageSize&status`
- `POST /admin/organization-applications/:applicationId/approve`
- `POST /admin/organization-applications/:applicationId/reject` with `{ "rejectionReason": string }`
- `POST /admin/organization-applications/:applicationId/retry-provisioning`

Responses use the existing Vote envelope. An application contains `id`, `organizationName`, `organizationManagementNumber`, `organizationType`, `contactName`, optional `contactPhone`, `status`, `submittedAt`, optional `reviewedAt`, and optional `rejectionReason`. `organizationManagementNumber` becomes the Auth organization group code.

Statuses are `PENDING`, `PROVISIONING`, `APPROVED`, `REJECTED`, and `PROVISIONING_FAILED`.

## Server-side Auth provisioning

Approval is an idempotent Vote-server workflow:

1. Create or resolve the tenant-scoped organization group with `code=<organizationManagementNumber>` using Auth group CRUD.
2. Create or resolve a child group with `code=<organizationManagementNumber>.vote-managers` and `parentId=<organization group id>`.
3. Resolve the existing `vote-manager` role and assign it to the child group using the existing group-role endpoint.
4. Add the applicant to the organization and manager groups with `POST /t/:tenantCode/admin/users/:userId/groups/:groupId`.

Vote persists the Auth group ID/code/parent relationship and provisioning state. Authorization must validate `tenant_id`, the organization group ID/code, `vote-managers.parentId`, and its nested `vote-manager` role. A plain `vote-manager` role string is insufficient.

The OIDC client requests the `groups` scope. Auth returns direct memberships only in access tokens and introspection:

```ts
groups: Array<{
  id: string;
  code: string;
  parentId: string | null;
  roles: Array<{ id: string; code: string }>;
}>;
```

Membership mutation revokes existing sessions and linked tokens when it changes state. After approval, the applicant UI asks for a fresh login. Idempotent no-op provisioning does not require revocation.
