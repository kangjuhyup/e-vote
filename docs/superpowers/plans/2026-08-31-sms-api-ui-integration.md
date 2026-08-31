# SMS API UI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 최신 master의 문자 발송 4개 API와 발송 이력 목록·상세 2개 API를 투표 상세 UI에서 사용할 수 있게 연결한다.

**Architecture:** 문자 계약과 mock 상태는 `votes` feature의 전용 API/model 파일에 둔다. React Query 조회·변이는 컨테이너가 담당하고, 발송 작성기·이력 표·수신자별 결과는 hookless feature UI가 props로만 렌더링한다. 현장 세션 문자 발송은 기존 세션 컨테이너의 mutation으로 연결하되 모든 발송 이력은 투표 단위 query를 무효화해 즉시 갱신한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack React Query, Vitest, Testing Library

**Spec:** `docs/api/sms-notifications.md`

## Global Constraints

- 서버 코드는 변경하지 않는다.
- `nvm use`로 `.nvmrc`의 Node.js 24를 사용한다.
- 전화번호와 문자 본문을 발송 이력, URL, 로그에 저장하거나 노출하지 않는다.
- 투표 상태별 목적은 `DRAFT -> UPCOMING_VOTE_NOTICE`, `OPEN -> VOTE_PARTICIPATION_REMINDER`, `CLOSED -> VOTE_RESULT_NOTICE`로 제한한다.
- 취소된 투표에서는 투표 문자를 발송하지 않는다.

---

### Task 1: 문자 API 계약과 query options

**Files:**
- Create: `ui/src/features/votes/model/vote-sms.types.ts`
- Create: `ui/src/features/votes/api/vote-sms-api.ts`
- Create: `ui/src/features/votes/api/vote-sms-query-options.ts`
- Test: `ui/test/features/votes/api/vote-sms-api.test.ts`

**Interfaces:**
- Produces: `voteSmsApi.sendVoteSms(input)`, `voteSmsApi.sendFieldSessionSms(input)`, `voteSmsApi.fetchDispatchPage(voteId, page, pageSize)`, `voteSmsApi.fetchDispatch(voteId, dispatchId)`.
- Produces: `voteSmsDispatchPageQueryOptions(voteId, page, pageSize)` and `voteSmsDispatchQueryOptions(voteId, dispatchId)`.

- [ ] **Step 1: Write API contract tests**

```ts
it("calls the state-specific vote SMS endpoint without retaining the message", async () => {
  await client.sendVoteSms({ voteId: "vote-1", purpose: "VOTE_PARTICIPATION_REMINDER", message: "참여해 주세요" });
  expect(fetcher).toHaveBeenCalledWith(
    "https://api.example.com/votes/vote-1/sms/participation-reminder",
    expect.objectContaining({ method: "POST", body: JSON.stringify({ message: "참여해 주세요" }) }),
  );
});
```

- [ ] **Step 2: Run the focused API test and confirm it fails**

Run: `pnpm --filter @vote/ui test -- test/features/votes/api/vote-sms-api.test.ts`
Expected: FAIL because `vote-sms-api` does not exist.

- [ ] **Step 3: Implement live and mock API clients**

```ts
export interface VoteSmsApiClient {
  sendVoteSms(input: SendVoteSmsInput): Promise<SmsDispatchSummary>;
  sendFieldSessionSms(input: SendFieldSessionSmsInput): Promise<SmsDispatchSummary>;
  fetchDispatchPage(voteId: string, page?: number, pageSize?: number): Promise<PageResult<SmsDispatchSummary>>;
  fetchDispatch(voteId: string, dispatchId: string): Promise<SmsDispatchDetail>;
}
```

Map each purpose to its documented path, unwrap the common API envelope, encode path segments, and keep mock history in memory without storing the submitted message.

- [ ] **Step 4: Run the focused API test**

Run: `pnpm --filter @vote/ui test -- test/features/votes/api/vote-sms-api.test.ts`
Expected: PASS.

### Task 2: 투표 문자 작성기와 발송 이력 UI

**Files:**
- Create: `ui/src/features/votes/container/vote-sms-container.tsx`
- Create: `ui/src/features/votes/ui/vote-sms-management.tsx`
- Modify: `ui/src/features/votes/container/vote-detail-container.tsx`
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`

**Interfaces:**
- Consumes: Task 1 API functions and query options.
- Produces: `VoteSmsContainer({ voteId, voteStatus })`.

- [ ] **Step 1: Add a vote-detail behavior test**

```ts
expect(await screen.findByRole("heading", { name: "문자 안내" })).toBeTruthy();
expect(screen.getByRole("button", { name: "참여 독려 문자 발송" })).toBeTruthy();
expect(screen.getByRole("table", { name: "문자 발송 이력" })).toBeTruthy();
```

- [ ] **Step 2: Run the focused container test and confirm it fails**

Run: `pnpm --filter @vote/ui test -- test/features/votes/container/vote-pages.test.tsx`
Expected: FAIL because the SMS section is absent.

- [ ] **Step 3: Implement container mutations and hookless UI**

```tsx
<VoteSmsManagement
  purpose={purposeForVoteStatus(voteStatus)}
  dispatches={page.items}
  selectedDispatch={detail}
  onSend={(message) => sendMutation.mutate({ voteId, purpose, message })}
  onSelectDispatch={setSelectedDispatchId}
/>
```

Render an empty-message-validated textarea, a status-specific single send action, paginated history table, and selected dispatch delivery table. Show masked names and business identifiers only; never render phone numbers or sent message text.

- [ ] **Step 4: Run the focused container test**

Run: `pnpm --filter @vote/ui test -- test/features/votes/container/vote-pages.test.tsx`
Expected: PASS.

### Task 3: 현장 세션 문자 발송 and full verification

**Files:**
- Modify: `ui/src/features/votes/container/field-session-container.tsx`
- Modify: `ui/src/features/votes/ui/field-session-management.tsx`
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`

**Interfaces:**
- Consumes: `voteSmsApi.sendFieldSessionSms(input)` from Task 1.
- Produces: an inline `세션 안내 문자 발송` form for each field/visit session.

- [ ] **Step 1: Add a field-session send behavior test**

```ts
fireEvent.change(screen.getByLabelText("본관 현장 투표소 안내 문자"), { target: { value: "장소와 시간을 확인해 주세요." } });
fireEvent.click(screen.getByRole("button", { name: "본관 현장 투표소 안내 문자 발송" }));
expect(await screen.findByText(/문자를 발송했습니다/)).toBeTruthy();
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm --filter @vote/ui test -- test/features/votes/container/vote-pages.test.tsx`
Expected: FAIL because session SMS controls are absent.

- [ ] **Step 3: Wire the session mutation and history invalidation**

```ts
const smsMutation = useMutation({
  mutationFn: voteSmsApi.sendFieldSessionSms,
  onSuccess: async (result) => {
    setMessage(`총 ${result.recipientCount}명에게 문자를 발송했습니다.`);
    await queryClient.invalidateQueries({ queryKey: ["vote-sms", voteSmsApi.mode, voteId, "dispatches"] });
  },
});
```

Pass a session-scoped callback into the feature UI and disable the selected session action while pending.

- [ ] **Step 4: Verify the complete UI workspace**

Run: `source "$NVM_DIR/nvm.sh" && nvm use && pnpm --filter @vote/ui test && pnpm --filter @vote/ui lint && pnpm --filter @vote/ui build`
Expected: all tests, lint, and production build pass.
