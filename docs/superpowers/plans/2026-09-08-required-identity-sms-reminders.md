# 본인인증 필수 투표의 참여 독려 문자 수정 계획

**Goal:** 진행 중인 투표는 본인인증 필수 여부와 관계없이 참여 독려 문자를 발송한다.

**Architecture:** 기존 수신자별 서명 링크와 발송 이력을 유지한다. 필수 인증 투표의 링크 교환은 익명 참여 세션을 만들지 않고, 검증한 링크의 투표·선거인 식별자를 반환하여 기존 로그인·본인인증 참여 경로로 연결한다. 투표 제출 시 계정과 선거인 인증 연결 검증은 그대로 적용한다.

**Toolchain:** `.nvmrc`의 Node 24 (확인: 24.20.0), 루트 `package.json`의 pnpm 9.15.9.

**Scope:** 사용자의 “문자 발송은 되어야지” 요청. 기존 미커밋 변경을 보존하고, 실제 외부 문자 전송이나 투표 정책 데이터 변경은 수행하지 않는다. 현재 SMS와 본인확인 공급자는 개발용 Mock이다.

- [x] 발송 핸들러의 본인인증 필수 차단을 제거하고 성공·권한·투표 상태 테스트를 확인한다.
  - `server/src/modules/vote/application/command/handler/send-vote-sms.handler.ts`
  - `server/test/application/command/handler/send-sms.handlers.spec.ts`
- [x] 링크 토큰과 선거인/투표 상태 확인 후 인증 필요 응답을 반환한다. 필수 투표에는 세션·쿠키·CSRF 권한을 발급하지 않는다. 폐기/교체 토큰과 차단 선거인 거부를 검증한다.
  - `server/src/modules/participation/application/command/dto/response/exchange-participation-access-result.dto.ts`
  - `server/src/modules/participation/application/command/handler/exchange-participation-access.handler.ts`
  - `server/src/modules/participation/presentation/participation-access/{participation-access.controller.ts,dto/participation-access.dto.ts}`
  - 관련 exchange/controller/resolve-session 테스트
- [x] UI API가 인증 필요 응답을 보존하고, 컨테이너가 토큰 제거 후 `/participate?voteId=...&electorId=...`로 이동하게 한다. 해당 경로는 로그인 게이트 후 기존 `ParticipationContainer`를 표시한다. 로그인 복귀 주소를 유지한다.
  - `ui/src/features/participation/{api/participation-access-api.ts,model/participation-access.types.ts,container/participation-access-container.tsx}`
  - `ui/src/app/participate/page.tsx`
  - `ui/src/features/auth/container/sign-in-container.tsx`
  - 관련 API/컨테이너/페이지 테스트
- [x] SMS API 문서에 인증별 링크 동작을 기록하고 관련 서버/UI 테스트, 타입 검사, UI lint/build를 실행한다. 본인인증 우회가 없는지 변경분을 검토한다.

## 검증 결과

- 서버: 문자·링크 교환·본인확인·투표 제출·도메인 정책 관련 12개 suite, 101개 테스트 통과.
- UI: 참여 페이지·참여 API/화면·문자 API/모델 관련 10개 파일, 70개 테스트 통과.
- UI `tsc --noEmit`, 서버 `tsc --noEmit -p tsconfig.build.json`, UI 전체 lint, 변경 서버 파일 ESLint, Next 프로덕션 빌드 통과.
- `git diff --check` 통과. 기존 익명 세션 검증과 인증 계정·선거인 연결 검증은 유지.
- 실행 중인 API가 이전 임시 빌드임을 확인하여 동일 런타임 설정으로 새 임시 빌드에 교체했다. 로컬 `docs-json`에서 인증 필요 응답 분기가 활성화된 것을 확인했다. DB 투표 설정이나 문자 발송 데이터는 검증 중 변경하지 않았다.
