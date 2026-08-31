# Electoral Roll Excel Import Implementation Plan

> **For agentic workers:** Implement inline in the current workspace. Do not change the server or its API contract.

**Goal:** Let an administrator download an `.xlsx` template, fill it in, validate it in the browser, and add all valid rows to the selected electoral roll.

**Architecture:** Excel generation and parsing live in a focused UI utility and are loaded only when the feature is used. The UI sends validated rows to the bulk member endpoint introduced in master commit `88726f9`, so one transaction creates one revision and one immutable snapshot. The management container refreshes the roll once after the import finishes.

**Tech Stack:** Next.js 16, React 19, TanStack Query, ExcelJS, Vitest, Testing Library

**Spec:** User feedback in the 2026-08-30 `/electoral-rolls` design-review conversation.

## Global Constraints

- Do not modify `server/`.
- Accept `.xlsx` files only, up to 5 MiB and 5,000 data rows.
- Require the template columns `구성원 식별자`, `그룹 키`, `투표 가중치` in that order.
- Skip empty rows, reject formulas, require a non-empty identifier, and require a positive numeric vote weight (blank means `1`).
- Do not delete or replace existing members; append uploaded members.
- Send all validated rows in one `{ members: [...] }` request to `PUT /electoral-rolls/:electoralRollId/members`.
- Treat the bulk operation as atomic; do not present partial per-row server success.

---

### Task 1: Workbook template and parser

**Files:**
- Create: `ui/src/features/votes/lib/electoral-roll-workbook.ts`
- Create: `ui/test/features/votes/lib/electoral-roll-workbook.test.ts`
- Modify: `ui/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `downloadElectoralRollTemplate(): Promise<void>`
- Produces: `parseElectoralRollWorkbook(file: File): Promise<ElectoralRollWorkbookParseResult>`

- [x] Add ExcelJS to the UI package.
- [x] Test template headers, valid-row parsing, duplicate detection, formula rejection, wrong headers, row limit, file type, and file size.
- [x] Implement a styled workbook with an instruction sheet and an empty data sheet.
- [x] Implement browser-side validation and normalized row output with source row numbers.
- [x] Run the workbook utility tests.

### Task 2: Master bulk API application

**Files:**
- Modify: `ui/src/features/votes/model/electoral-roll.types.ts`
- Modify: `ui/src/features/votes/api/electoral-roll-api.ts`
- Modify: `ui/test/features/votes/api/electoral-roll-api.test.ts`

**Interfaces:**
- Produces: `addMembers(input: AddElectoralRollMembersInput): Promise<AddElectoralRollMembersResult>`

- [x] Define normalized import-row and per-row failure result types.
- [x] Test that all rows are mapped into one master-compatible bulk request without client-only row numbers.
- [x] Implement manual one-member registration as a one-item bulk request and Excel registration as one atomic bulk request.
- [x] Run the electoral-roll API tests.

### Task 3: Import UI and management wiring

**Files:**
- Create: `ui/src/features/votes/ui/electoral-roll-import-card.tsx`
- Modify: `ui/src/features/votes/ui/electoral-roll-member-section.tsx`
- Modify: `ui/src/features/votes/ui/electoral-roll-management.tsx`
- Modify: `ui/src/features/votes/container/electoral-roll-management-container.tsx`
- Modify: `ui/test/features/votes/ui/electoral-roll-member-section.test.tsx`

**Interfaces:**
- Consumes: workbook parser/downloader and `addMembers` result types.
- Produces: template download, file selection, validation preview, apply action, and accessible result/error summaries.

- [x] Test template download, invalid-file feedback, valid-file preview, import submission, and partial-failure rendering.
- [x] Build the Excel import card and place it before the manual-add card.
- [x] Wire a TanStack mutation that refreshes the selected roll only once after completion.
- [x] Run the UI component and container tests.

### Task 4: Verification

**Files:**
- Verify only; no server changes.

- [x] Run focused workbook, API, and component tests.
- [x] Run all UI tests and lint.
- [x] Run the UI build and report any unrelated pre-existing failure separately.
- [x] Confirm `git diff -- server` contains no new change from this feature.
