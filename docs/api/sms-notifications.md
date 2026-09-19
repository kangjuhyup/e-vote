# SMS Notification API

문자 발송 API는 투표 상태와 현장·방문 투표 채널을 서버의 쓰기 모델에서 확인한 뒤 `SmsSenderPort`를 호출합니다. 현재 `SMS_SENDER_PORT`에는 개발용 `RandomSmsSenderAdapter`가 연결되어 있습니다. 실제 문자 공급자나 전화번호 전송 없이 수신자마다 80% 확률로 성공, 20% 확률로 실패 결과를 생성합니다.

## 공통 요청과 응답

모든 엔드포인트는 인증된 관리자 요청을 요구합니다. 투표 예정 안내, 참여 독려, 결과 안내는 서버가 관리하는 고정 템플릿을 사용하므로 요청 본문을 받지 않습니다. 현장·방문 투표 세션 안내는 아래 본문을 사용합니다.

```json
{
  "message": "안내 문자 내용"
}
```

성공 시 `202 Accepted`와 함께 생성된 발송 이력 ID, 발송 시각, 수신자 수와 성공·실패 건수를 제공합니다. 전화번호와 문자 본문은 발송 이력, 조회 응답, 로그에 저장하거나 노출하지 않습니다.

```json
{
  "smsDispatchId": "dispatch-1",
  "purpose": "UPCOMING_VOTE_NOTICE",
  "voteId": "vote-1",
  "sentAt": "2026-08-30T01:00:00.000Z",
  "recipientCount": 120,
  "successCount": 118,
  "failureCount": 2
}
```

## 투표 참여 독려 문자

```text
GET /votes/:voteId/sms/participation-reminder/template
```

- UI가 실제 발송 예정 내용을 보여줄 수 있도록 서버 소유 템플릿의 코드, 본문, 버튼명을 반환합니다.
- 개인 참여 링크 자체는 응답하지 않으며, 실제 발송 시 수신자별 링크 변수로 치환합니다.

```text
POST /votes/:voteId/sms/participation-reminder
```

- 투표 상태가 `OPEN`일 때만 가능합니다.
- 본인인증 필수 여부와 관계없이 투표 생성자가 발송할 수 있습니다.
- 본인인증이 선택인 투표는 개인 링크로 참여 세션을 발급합니다. 본인인증 필수 투표는 링크를 검증한 뒤 로그인·본인인증 참여 화면으로 안내하며, 링크만으로 참여 세션이나 투표 권한을 발급하지 않습니다.
- 필수 인증 투표의 `POST /participation-access/exchange` 응답은 `{ "authenticationRequired": true, "voteId": "...", "electorId": "..." }`입니다. 식별자는 인증 대상을 지정하며, 투표 제출은 기존 계정·선거인 인증 검증을 통과해야 합니다. 교체되거나 폐기된 링크는 사용할 수 없습니다.
- 요청 본문을 받지 않으며, 클라이언트가 발송 문구를 변경할 수 없습니다.
- 발송 포트에는 서버가 지정한 `VOTE_PARTICIPATION_REMINDER` 템플릿 코드만 전달됩니다. 실제 알림톡/SMS Adapter는 이 코드를 공급자 템플릿과 링크 변수에 매핑합니다.
- `SmsSenderPort.sendParticipationReminderToNonParticipants()`를 호출합니다.
- 개발용 Adapter는 해당 투표의 활성 선거인 중 참여 기록이 없는 선거인만 수신자로 선택합니다.

## 투표 결과 안내 문자

```text
GET /votes/:voteId/sms/result-notice/template
```

- 본문: `[전자투표]\n투표가 종료되었습니다. 투표 결과를 확인해 주세요.`
- 발송 요청의 자유 문구는 무시하고 서버 템플릿만 사용합니다.

```text
POST /votes/:voteId/sms/result-notice
```

- 투표 상태가 `CLOSED`일 때만 가능합니다.
- `SmsSenderPort.sendResultNotice()`를 호출합니다.

## 투표 예정 안내 문자

```text
GET /votes/:voteId/sms/upcoming-notice/template
```

- 본문: `[전자투표]\n곧 투표가 시작됩니다. 투표 일정과 참여 방법을 확인해 주세요.`
- 발송 요청의 자유 문구는 무시하고 서버 템플릿만 사용합니다.

```text
POST /votes/:voteId/sms/upcoming-notice
```

- 투표 시작 전 상태인 `DRAFT`일 때만 가능합니다.
- `SmsSenderPort.sendUpcomingVoteNotice()`를 호출합니다.

## 현장·방문 투표 세션 안내 문자

```text
POST /field-voting-sessions/:fieldVotingSessionId/sms
```

- 연결된 투표 상태가 `OPEN`이어야 합니다.
- 세션 채널은 `ONSITE` 또는 `VISIT`이어야 합니다.
- 해당 세션 채널이 부모 투표의 `votingChannels`에 활성화되어 있어야 합니다.
- `SmsSenderPort.sendFieldVotingSessionNotice()`에 투표 ID와 세션 ID를 함께 전달합니다.

응답에는 세션 ID가 추가됩니다.

```json
{
  "purpose": "FIELD_VOTING_SESSION_NOTICE",
  "smsDispatchId": "dispatch-2",
  "fieldVotingSessionId": "session-1",
  "voteId": "vote-1",
  "sentAt": "2026-08-30T01:00:00.000Z",
  "recipientCount": 80,
  "successCount": 80,
  "failureCount": 0
}
```

## 문자 발송 요약 목록 조회

```text
GET /votes/:voteId/sms/dispatches?page=1&pageSize=20
```

- 최신 발송 시각 순으로 해당 투표의 발송 이력을 조회합니다.
- 각 항목은 `id`, `purpose`, `sentAt`, `recipientCount`, `successCount`, `failureCount`를 포함합니다.
- 현장·방문 세션 문자에는 `fieldVotingSessionId`가 추가됩니다.
- 기본 페이지 크기는 20이고 최대 100입니다.

```json
{
  "items": [
    {
      "id": "dispatch-1",
      "voteId": "vote-1",
      "purpose": "UPCOMING_VOTE_NOTICE",
      "sentAt": "2026-08-30T01:00:00.000Z",
      "recipientCount": 120,
      "successCount": 118,
      "failureCount": 2
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalItems": 1,
  "totalPages": 1
}
```

## 문자 발송 상세 조회

```text
GET /votes/:voteId/sms/dispatches/:smsDispatchId?page=1&pageSize=50
```

- 요약 정보와 수신자별 결과를 페이지 단위로 조회합니다.
- 기본 페이지 크기는 20이고 최대 100입니다. 관리 화면은 페이지당 50명을 요청합니다.
- 수신자 결과는 `electorId`, 마스킹되는 `recipientName`, `recipientIdentifier`, `status`를 포함합니다.
- `FAILURE` 결과에만 `failureReason`이 포함됩니다.
- 전화번호는 저장하거나 반환하지 않습니다.
- 발송 이력이 요청 경로의 `voteId`에 속하지 않으면 존재 여부를 노출하지 않고 `404 Not Found`를 반환합니다.

```json
{
  "id": "dispatch-1",
  "voteId": "vote-1",
  "purpose": "UPCOMING_VOTE_NOTICE",
  "sentAt": "2026-08-30T01:00:00.000Z",
  "recipientCount": 2,
  "successCount": 1,
  "failureCount": 1,
  "page": 1,
  "pageSize": 50,
  "totalItems": 2,
  "totalPages": 1,
  "deliveries": [
    {
      "electorId": "elector-1",
      "recipientName": "홍*동",
      "recipientIdentifier": "member-1",
      "status": "SUCCESS"
    },
    {
      "electorId": "elector-2",
      "recipientName": "김*수",
      "recipientIdentifier": "member-2",
      "status": "FAILURE",
      "failureReason": "provider rejected the request"
    }
  ]
}
```

## 오류

- `404 Not Found`: 투표 또는 현장·방문 투표 세션이 존재하지 않음
- `409 Conflict`: 문자 종류에 맞지 않는 투표 상태, 세션 소속 또는 채널 설정
- `503 Service Unavailable`: 배포 구성에서 `SMS_SENDER_PORT` 등록이 제거되거나 누락됨

## 개발용 랜덤 Adapter

`server/src/shared/infrastructure/sms/random-sms-sender.adapter.ts`의 `RandomSmsSenderAdapter`가 `SmsSenderPort`를 구현하고 `AppModule`에서 `SMS_SENDER_PORT`로 등록됩니다. 선거인 모듈과는 shared 수신자 조회 포트를 통해 연결됩니다.

- 투표의 선거인을 페이지당 100명씩 모두 조회합니다.
- 차단된 선거인은 제외합니다.
- 투표 독려 문자는 이미 참여한 선거인을 추가로 제외합니다.
- 성공 확률은 80%입니다.
- 실패 확률은 20%이고 실패 사유는 `SIMULATED_RANDOM_FAILURE`입니다.
- 실제 문자 공급자 SDK, 자격 증명 또는 외부 네트워크 호출을 사용하지 않습니다.
- 전화번호를 읽거나 외부로 전달하지 않습니다.

실제 공급자 연동 시에는 `server/src/shared/application/port/gateway/sms-sender.port.ts`의 계약에 맞는 별도 Adapter로 교체해야 합니다. Adapter는 각 수신자의 `electorId`, 이름, 업무 식별자, `SUCCESS`/`FAILURE` 상태와 실패 사유를 반환해야 합니다. 성공 결과에는 실패 사유가 없어야 하고 실패 결과에는 사유가 필요합니다.
