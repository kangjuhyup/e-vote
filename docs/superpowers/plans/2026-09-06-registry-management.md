# Registry management implementation plan

Goal: Supply four missing deletion/update APIs while preserving existing elector member APIs.
Architecture: Dedicated command handlers and management controllers; repository ports; serializable transactions. Soft deletion preserves vote and evidence references.
Toolchain: Node 24.20.0 (.nvmrc: 24), pnpm 9.15.9 (packageManager), installed TypeScript 5.9.3.
Repository policy: implement inline without additional Superpowers workflows or commits.

- [x] Add deleted_at to electoral_rolls and election_commissions with reversible migration; exclude deleted rows from lookup/list and membership access.
- [x] Add roll deletion using existing access grants. Add commission deletion and member update/deactivation restricted to active administrators; protect the final active administrator.
- [x] Expose DELETE /electoral-rolls/:electoralRollId, DELETE /election-commissions/:commissionId, PATCH and DELETE /election-commissions/:commissionId/members/:memberId with validated UUIDs and name/role fields.
- [x] Verify domain restrictions, handler authorization, routing/validation, persistence filters, focused regression tests and build.

Validation:
- `pnpm --filter @vote/server run test --runInBand`: 127 suites, 733 tests passed.
- `pnpm --filter @vote/server run build`: passed.
- ESLint on changed files: zero errors; 49 unsafe-argument warnings.
- `git diff --check`: passed.
- Whole-project `tsc --noEmit` still reports existing test typing errors; new implementation and test typing errors were resolved.
- Migration20260906010000 is supplied but has not been applied to a live database. It adds nullable deleted_at columns and retains existing referenced rows.

API contracts:
- Existing: PATCH/DELETE /electoral-rolls/:electoralRollId/members/:memberId.
- Added: DELETE /electoral-rolls/:electoralRollId; requires an existing access grant.
- Added: DELETE /election-commissions/:commissionId.
- Added: PATCH/DELETE /election-commissions/:commissionId/members/:memberId.
- New endpoints return 204. Committee management requires an active committee and an active ADMIN member matching the authenticated principal. PATCH accepts name and/or role (ADMIN, FIELD_MANAGER), rejecting identity reassignment and unsupported fields. Removal/demotion of the last active administrator returns 409.
