# Billing API

Vote 서비스의 Billing은 투표 이용료의 상품·가격 정책과 주문 상태를 소유합니다.
카드 승인, PG 웹훅, 환불 실행, 대사와 원장은 추후 별도 Payment 서비스가
담당합니다.

모든 API는 검증된 Bearer JWT가 필요하며 `request.user`의
`UserPrincipal.id`를 사용합니다. 해당 투표가 속한 선거관리위원회의 활성
위원만 주문을 생성하거나 조회할 수 있습니다.

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
1~~100명은 3,000원, 101~~200명은 6,000원입니다. 선거인 수와 계산 근거는 주문에
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
  "issuedAt": "2026-08-30T10:00:00.000Z"
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

## Payment 연동 지점

외부 Payment 서비스가 전달한 결제 성공 이벤트를 인증·중복 제거한 소비자가
`MarkBillingOrderPaidHandler`로 전달합니다. 공개 HTTP 요청만으로 주문을
`PAID`로 바꾸는 엔드포인트는 제공하지 않습니다. 주문 금액 및 통화가 Payment
결과와 정확히 일치할 때만 상태가 변경됩니다.
