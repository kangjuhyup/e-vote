# Billing API

Vote 서비스의 Billing은 투표 이용료의 상품·가격 정책과 주문 상태를 소유합니다.
카드 승인, PG 웹훅, 환불 실행, 대사와 원장은 추후 별도 Payment 서비스가
담당합니다.

모든 API는 검증된 Bearer JWT가 필요하며 `request.user`의
`UserPrincipal.id`를 사용합니다. 해당 투표가 속한 선거관리위원회의 활성
위원만 주문을 생성하거나 조회할 수 있습니다.

주문 생성은 곧 투표 확정입니다. 주문과 투표 확정은 같은 트랜잭션으로
처리되며, 확정 이후에는 투표 설정·선거인·연결된 선거인명부 스냅샷을 변경할
수 없습니다. 변경이 필요하면 취소 후 새 투표를 생성해야 합니다.

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
않습니다. 같은 투표로 다시 요청하면 새로운 주문을 만들지 않고 기존 주문을
반환합니다.

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
- `403`: 선거관리위원회 활성 위원이 아님
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

- 요청 사용자가 주문 선거관리위원회의 활성 위원임
- 투표가 확정된 `DRAFT` 상태이며 아직 시작되지 않음
- 주문 생성 시점에 스냅샷된 `cancelableUntil` 이내임(현재 표준 정책은 7일)

미결제 주문은 즉시 `CANCELED`가 됩니다. 결제된 주문은
`REFUND_PENDING`이 되며, 추후 Payment 서비스가 실제 환불을 완료한 뒤
`REFUNDED`로 전이합니다. 취소된 투표는 다시 열거나 수정하지 않습니다.

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
- `403`: 선거관리위원회 활성 위원이 아님
- `404`: 주문 또는 연결된 투표가 없음
- `409`: 취소 기한 만료, 투표 시작, 다른 사유로 이미 취소됨, 취소 불가 상태

## 투표 시작 조건

확정된 투표를 `OPEN`으로 변경하려면 주문 상태가 `PAID`여야 합니다.
`PENDING_PAYMENT`, `CANCELED`, `REFUND_PENDING`, `REFUNDED` 주문은 투표 이용
권한을 부여하지 않습니다. 확정된 투표의 취소는 일반 투표 상태 변경 API가
아니라 위 취소 API로만 수행합니다.

## Payment 연동 지점

외부 Payment 서비스가 전달한 결제 성공 이벤트를 인증·중복 제거한 소비자가
`MarkBillingOrderPaidHandler`로 전달합니다. 공개 HTTP 요청만으로 주문을
`PAID`로 바꾸는 엔드포인트는 제공하지 않습니다. 주문 금액 및 통화가 Payment
결과와 정확히 일치할 때만 상태가 변경됩니다.

결제된 주문의 취소 요청은 `BillingOrderRefundRequested` 도메인 이벤트를
발행하며 주문을 `REFUND_PENDING`으로 유지합니다. 향후 Payment 서비스는 이
이벤트를 멱등하게 소비해 환불하고, 환불 완료 결과를 Billing에 전달해야 합니다.
