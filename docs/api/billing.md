# Billing API

Vote 서비스의 Billing은 투표 이용료의 상품·가격 정책과 주문 상태를 소유합니다.
카드 승인, PG 웹훅, 환불 실행, 대사와 원장은 추후 별도 Payment 서비스가
담당합니다.

모든 API는 검증된 Bearer JWT가 필요하며 `request.user`의
`UserPrincipal.id`를 사용합니다. 아직 주문이 없는 투표의 주문 생성은 투표를
생성한 사용자만 가능하며 선거관리위원회 소속 여부와는 무관합니다. 이미 생성된
주문의 멱등 재조회와 조회·취소는 주문에 기록된 `orderedByUserPrincipalId`와 현재
사용자가 일치할 때만 허용됩니다.

주문 생성과 투표 확정은 구분됩니다. `PENDING_PAYMENT` 주문을 생성하면 투표는
`DRAFT`를 유지하지만 결제 중복과 금액 스냅샷 변경을 막기 위해 즉시 편집
잠금을 겁니다. 결제가 `PAID`가 되는 같은 트랜잭션에서 투표가
`FINALIZED`(확정됨, 아직 개시 전)로 전이합니다. 두 상태 모두 투표 설정·선거인·
연결된 선거인명부 스냅샷을 변경할 수 없습니다.

## 투표 조회의 활성 결제 계약

`GET /votes`의 각 summary와 `GET /votes/{voteId}` 상세에는 현재 사용자가 주문자인
활성 결제 주문이 있을 때 다음 두 필드가 함께 포함됩니다.

```json
{
  "status": "DRAFT",
  "activeBillingOrderId": "billing-order-1",
  "billingOrderStatus": "PENDING_PAYMENT"
}
```

- `activeBillingOrderId`: 현재 투표를 잠근 활성 주문 ID
- `billingOrderStatus`: `PENDING_PAYMENT`, `PAID`, `REFUND_PENDING` 중 하나

두 필드는 주문의 `orderedByUserPrincipalId`와 현재 `UserPrincipal.id`가 일치할 때만
노출됩니다. 다른 사용자가 같은 투표를 조회하면 결제 주문 ID와 상태를 모두
생략합니다. `CANCELED`와 `REFUNDED` 주문은 이력이며 투표 잠금을 해제하므로 역시
생략합니다. 따라서 환불 완료 응답은 `status: DRAFT`이며 두 optional 필드가 없고,
새 주문이 생성되면 새 ID와 `PENDING_PAYMENT`가 다시 나타납니다.

목록 조회는 페이지의 주문 ID를 한 번에 조회하므로 투표 수에 비례하는 N+1 조회를
만들지 않습니다. UI는 목록 또는 상세 응답만으로 결제 중 잠금을 복원할 수 있고,
상태 전이는 해당 vote query를 다시 조회해 반영합니다.

## 투표 이용료 주문 생성

```http
POST /billing/vote-usage-orders
Content-Type: application/json

{
  "voteId": "vote-1"
}
```

클라이언트는 금액을 지정할 수 없습니다. 서버가 주문 생성 시점의 `ELIGIBLE`
선거인 수를 조회하고, 시작된 100명 구간마다 3,000원을 계산합니다. 예를 들어
1–100명은 3,000원, 101–200명은 6,000원입니다. 선거인 수와 계산 근거는 주문에
스냅샷으로 저장되므로 이후 선거인이 변경되어도 기존 주문 금액은 변하지
않습니다. 같은 투표의 주문자가 다시 요청하면 새로운 주문을 만들지 않고 기존
주문을 반환합니다. 이 멱등 경로는 투표 생성자 필드가 없는 레거시 투표도 주문에
기록된 주문자를 권한 기준으로 사용합니다. `CANCELED` 또는 `REFUNDED`로 종료된
주문은 이력으로 보존하며, 투표 생성자는 새 주문을 만들 수 있습니다.

```json
{
  "id": "billing-order-1",
  "voteId": "vote-1",
  "productCode": "VOTE_USAGE",
  "productName": "투표 개설 이용료",
  "electorCount": 120,
  "pricingUnitSize": 100,
  "pricingUnitCount": 2,
  "unitPrice": 3000,
  "amount": 6000,
  "currency": "KRW",
  "status": "PENDING_PAYMENT",
  "issuedAt": "2026-08-30T10:00:00.000Z",
  "cancellationWindowDays": 7,
  "cancelableUntil": "2026-09-06T10:00:00.000Z"
}
```

- `201`: 생성 또는 기존 주문 반환
- `403`: 현재 사용자가 투표 생성자가 아니거나 기존 투표의 생성자를 확인할 수 없음
- `404`: 투표가 없음
- `409`: `ELIGIBLE` 선거인이 0명이거나 가격 스냅샷이 유효하지 않음

## 투표 이용료 주문 조회

```http
GET /billing/vote-usage-orders/{billingOrderId}
```

응답에는 주문 당시의 상품·가격 스냅샷과 현재 상태가 포함됩니다.

## 투표 이용료 주문과 확정 투표 취소

```http
POST /billing/vote-usage-orders/{billingOrderId}/cancellation
Content-Type: application/json

{
  "reason": "투표 일정 변경"
}
```

다음 조건을 모두 만족할 때만 취소할 수 있습니다.

- 요청 사용자가 주문에 기록된 주문자임
- 투표가 결제 대기 중인 `DRAFT` 또는 결제 완료된 `FINALIZED` 상태이며 아직 시작되지 않음
- 주문 생성 시점에 스냅샷된 `cancelableUntil` 이내임(현재 표준 정책은 7일)

미결제 주문은 즉시 `CANCELED`가 되고 투표는 편집 가능한 `DRAFT`로 잠금 해제됩니다.
결제된 주문은 `REFUND_PENDING`이 되며 투표는 `FINALIZED`로 잠금을 유지합니다.
Payment 서비스가 환불을 완료해 주문이 `REFUNDED`로 전이하면 투표는
`DRAFT`로 돌아가고 다시 편집·결제할 수 있습니다.

```json
{
  "id": "billing-order-1",
  "voteId": "vote-1",
  "productCode": "VOTE_USAGE",
  "productName": "투표 개설 이용료",
  "electorCount": 120,
  "pricingUnitSize": 100,
  "pricingUnitCount": 2,
  "unitPrice": 3000,
  "amount": 6000,
  "currency": "KRW",
  "status": "REFUND_PENDING",
  "paymentId": "payment-1",
  "issuedAt": "2026-08-30T10:00:00.000Z",
  "cancellationWindowDays": 7,
  "cancelableUntil": "2026-09-06T10:00:00.000Z",
  "paidAt": "2026-08-30T10:05:00.000Z",
  "canceledAt": "2026-09-01T02:00:00.000Z",
  "cancellationReason": "투표 일정 변경",
  "refundRequestedAt": "2026-09-01T02:00:00.000Z"
}
```

- `200`: 취소 완료 또는 동일 사유의 멱등 재요청
- `400`: 취소 사유가 문자열이 아니거나 요청 형식이 잘못됨
- `403`: 현재 사용자가 주문에 기록된 주문자가 아님
- `404`: 주문 또는 연결된 투표가 없음
- `409`: 취소 기한 만료, 투표 시작, 다른 사유로 이미 취소됨, 취소 불가 상태

## 투표 시작 조건

투표는 `FINALIZED`에서만 `OPEN`으로 변경할 수 있으며, 연결된 주문 상태가
`PAID`여야 합니다.
`PENDING_PAYMENT`, `CANCELED`, `REFUND_PENDING`, `REFUNDED` 주문은 투표 이용
권한을 부여하지 않습니다. 확정된 투표의 취소는 일반 투표 상태 변경 API가
아니라 위 취소 API로만 수행합니다.

## 기존 투표의 생성자 호환 정책

`created_by_user_principal_id` 도입 이전에 생성된 투표는 생성자를 증명할 수 있는
데이터가 없으므로 이 값이 `NULL`로 유지됩니다. 마이그레이션은 선거관리위원회
위원이나 기존 주문자를 투표 생성자로 추정해 채우지 않습니다. 생성자가 `NULL`인
기존 투표는 결제 주문 생성을 fail-closed로 거부합니다.

운영자가 외부 감사 기록 등으로 실제 생성자를 확인한 경우에만 별도 운영 절차로
해당 투표의 `created_by_user_principal_id`를 명시적으로 지정해야 합니다. 재현 투표
`6f2e51eb-2eac-42c7-bd0e-957df6edcc70`도 실제 생성자 확인 전에는 자동으로 소유권을
부여하지 않습니다. 이미 존재하는 주문은 투표 생성자 정보와 관계없이 주문에
기록된 `orderedByUserPrincipalId`로 조회·취소 권한을 판정합니다.

## Payment 연동 지점

외부 Payment 서비스가 전달한 결제 성공 이벤트를 인증·중복 제거한 소비자가
`MarkBillingOrderPaidHandler`로 전달합니다. 공개 HTTP 요청만으로 주문을
`PAID`로 바꾸는 엔드포인트는 제공하지 않습니다. 주문 금액 및 통화가 Payment
결과와 정확히 일치할 때만 상태가 변경됩니다.

실제 Payment 서비스가 없는 개발 환경에서는 별도 worker 프로세스의 mock Payment
어댑터가 기본으로 활성화됩니다. API 주문 트랜잭션에서 직접 결제 처리하지 않고, 커밋된
`billing.order-issued.v1` outbox를 `@rvkang/batch-core/polling` 기반 background
worker가 전달하면 mock 어댑터가 동일한 내부 결제완료 핸들러를 호출합니다. worker는
대기 상태에서는 500ms 간격으로 확인하고, 처리할 메시지가 남아 있으면 다음 batch를
즉시 가져옵니다. mock 결제 시도는 90% 확률로 성공하며, 나머지 10%는 일시적
실패로 처리되어 기존 outbox backoff 정책에 따라 같은 메시지 ID로 재시도됩니다.
따라서 주문 생성 응답은
`PENDING_PAYMENT`일 수 있으며 이후 조회에서 `PAID`로 전이됩니다. 카드번호나 실제
결제수단 정보는 받거나 저장하지 않습니다.

결제된 주문의 `billing.refund-requested.v1`도 같은 방식으로 처리되어
`REFUND_PENDING`에서 `REFUNDED`로 전이됩니다. 재전달 시 주문별로 동일한 mock
payment ID를 사용하며 도메인의 멱등 전이를 그대로 적용합니다.

`BILLING_PAYMENT_MODE` 설정은 다음 두 값만 허용합니다.

- `mock`: 개발용 자동 승인·환불 어댑터와 outbox worker 활성화
- `disabled`: publisher와 worker를 비활성화하고 outbox를 `PENDING`으로 유지

설정이 없으면 development에서는 `mock`, test와 production에서는 `disabled`입니다.
테스트는 필요한 suite에서만 `mock`을 명시적으로 선택할 수 있습니다. production에서
`mock`을 지정하면 서버가 기동을 거부하므로 개발용 가짜 결제가 운영에서 승인으로
처리되지 않습니다. 실제 Payment transport가 구현되기 전에는 `real` 같은 별도 모드는
지원하지 않습니다.

HTTP API는 `main.ts`, outbox worker는 `worker.ts`를 각각 root entrypoint로 사용합니다.
API `AppModule`에는 polling lifecycle provider가 없으므로 API deployment를 HPA로
수평 확장해도 worker 수가 함께 증가하지 않습니다. worker는 별도 deployment에서
`start:worker:prod`로 실행하고 독립된 replica 정책을 적용합니다. 여러 worker replica를
사용하더라도 PostgreSQL lease와 `FOR UPDATE SKIP LOCKED`로 claim을 분산하지만 전달
보장은 exactly-once가 아니라 기존과 동일한 at-least-once입니다.

결제된 주문의 취소 요청은 `BillingOrderRefundRequested` 도메인 이벤트를
발행하며 주문을 `REFUND_PENDING`으로 유지합니다. 향후 Payment 서비스는 이
이벤트를 멱등하게 소비해 환불하고, 환불 완료 결과를 Billing에 전달해야 합니다.

Billing 상태 변경과 Payment용 integration event는 같은 PostgreSQL 트랜잭션에
저장됩니다. 전달 방식은 at-least-once이며 재시도 시에도 outbox의 `id`를 동일하게
사용하므로, Payment는 이 ID와 `billingOrderId`를 모두 멱등 키로 사용해야 합니다.
현재 발행 계약은 다음과 같습니다.

- `billing.order-issued.v1`
- `billing.order-paid.v1`
- `billing.order-canceled.v1`
- `billing.refund-requested.v1`
- `billing.order-refunded.v1`

envelope에는 `id`, `source`, `eventType`, `schemaVersion`, aggregate 식별자와 버전,
발생·생성 시각 및 최소 payload가 포함됩니다. 사용자 principal과 자유 입력 취소
사유는 Payment payload에 포함하지 않습니다. 실제 transport가 구성되기 전에도
개발 mock에서만 dispatcher를 실행하며, 기존 주문을 side-effect event로 backfill하지
않습니다.

## Migration20260905010000 식별자 충돌 호환

과거 billing finalization migration과 미병합 participation invitation migration이
동일한 `Migration20260905010000` 이름으로 만들어졌습니다. MikroORM은 이름만으로
실행 여부를 판단하므로 한쪽이 먼저 기록된 DB에서는 다른 쪽 SQL을 건너뜁니다.

기존 migration을 이름 변경하거나 history에서 삭제하지 않습니다. 대신
`Migration20260905020000`이 두 스키마를 멱등하게 확인·보강합니다. 이 migration은
`participation_invitations`, `FINALIZED` 상태 제약, 활성 주문 unique index 및 기존
결제 상태의 vote backfill을 모두 보장합니다. 이미 어느 한쪽 또는 양쪽이 적용된
DB에서도 동일하게 실행할 수 있으며, 모호한 과거 상태 때문에 down migration은
의도적으로 비파괴 no-op입니다.

향후 participation invitation 변경을 병합할 때는 stash의 충돌 파일
`Migration20260905010000.ts`를 그대로 추가하지 말고 제거하거나 새 고유 이름의
후속 migration으로 재작성해야 합니다. 테이블 생성 책임은 reconciliation migration이
이미 담당하므로 application/entity 변경만 병합해도 기존 스키마가 보존됩니다.
