# 선거인명부 API 인터페이스

이 문서는 투표 생성 화면에서 기존 선거인명부를 검색하기 위한 목록 API 계약을 설명합니다.

## 공통 응답 형식

성공 응답은 실제 HTTP 계층에서 다음 envelope로 감싸집니다.

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-08-30T10:00:00.000Z",
  "requestId": "request-id"
}
```

오류 응답은 다음 형식입니다.

```json
{
  "success": false,
  "error": {
    "statusCode": 401,
    "message": "authenticated user principal is not available",
    "path": "/electoral-rolls"
  },
  "timestamp": "2026-08-30T10:00:00.000Z",
  "requestId": "request-id"
}
```

## 인증 및 권한 계약

- 모든 선거인명부 API는 `Authorization: Bearer {accessToken}` 헤더가 필요합니다.
- 서버는 OIDC JWKS로 JWT 서명과 `issuer`, `audience`, 만료를 검증한 뒤 `UserPrincipal.of(...)`로 `request.user`를 생성합니다.
- 목록 권한은 `UserPrincipal.id`와 선거관리위원의 `userPrincipalId`가 같고, 위원 상태가 `ACTIVE`일 때 부여됩니다.
- 클라이언트가 사용자 ID나 권한 위원회 ID 목록을 전달할 수 없습니다.
- 요청한 `commissionId`에 접근할 수 없으면 존재 여부를 노출하지 않고 빈 페이지를 반환합니다.
- 목록 응답은 명부 메타데이터와 구성원 수만 포함하며 구성원의 `identifier`, `groupKey`, `voteWeight`는 포함하지 않습니다.

`request.user.id`는 검증된 JWT의 `sub` 클레임입니다. `x-user-id` 같은 임의 헤더나 요청 본문의 사용자 ID, 검증되지 않은 일반 객체는 인증 정보로 사용하지 않습니다.

```http
GET /electoral-rolls?page=1&pageSize=20
Authorization: Bearer {OIDC access token}
```

## 선거관리위원과 사용자 연결

명부 조회 권한을 부여하려면 위원 등록 시 인증 시스템의 불변 사용자 식별자, 즉 이후 `UserPrincipal.id`가 될 값을 함께 저장해야 합니다.

```http
POST /election-commissions/{commissionId}/members
Content-Type: application/json
```

```json
{
  "userPrincipalId": "oidc-subject-1",
  "name": "김관리",
  "role": "ADMIN"
}
```

기존 위원 데이터는 마이그레이션 호환성을 위해 `userPrincipalId`가 비어 있을 수 있습니다. 이 데이터는 사용자와 연결되기 전까지 목록 조회 권한을 부여하지 않습니다.

## 선거인명부 목록 조회

```http
GET /electoral-rolls?commissionId={id}&q={검색어}&page=1&pageSize=20
```

### Query parameters

| 이름           | 필수   | 기본값                | 설명                                                             |
| -------------- | ------ | --------------------- | ---------------------------------------------------------------- |
| `commissionId` | 아니요 | 전체 접근 가능 위원회 | 지정한 위원회의 명부만 조회합니다.                               |
| `q`            | 아니요 | 없음                  | 명부 이름에 대한 공백 제거 후 대소문자 무시 부분 검색입니다.     |
| `page`         | 아니요 | `1`                   | 1 이상의 페이지 번호입니다. 잘못된 값은 1로 정규화됩니다.        |
| `pageSize`     | 아니요 | `20`                  | 1~100 사이의 페이지 크기입니다. 100을 넘으면 100으로 제한됩니다. |

정렬은 `updatedAt DESC, id DESC`로 고정되어 같은 수정 시각에도 안정적입니다.

### 성공 응답

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "electoral-roll-1",
        "name": "2026 상반기 선거인명부",
        "commissionId": "commission-1",
        "revision": 2,
        "memberCount": 120,
        "updatedAt": "2026-08-30T10:00:00.000Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  },
  "timestamp": "2026-08-30T10:00:00.000Z",
  "requestId": "request-id"
}
```

### 상태 코드

| 상태  | 조건                                                                 |
| ----- | -------------------------------------------------------------------- |
| `200` | 조회 성공입니다. 결과가 없거나 접근 권한이 없으면 `items: []`입니다. |
| `401` | Bearer 토큰이 없거나 JWT 검증에 실패했습니다.                        |
| `500` | 예상하지 못한 서버 오류입니다.                                       |

## 선거인 다건 등록

선거인은 한 명씩 등록하지 않고 한 요청의 `members` 배열로 등록합니다.

```http
PUT /electoral-rolls/{electoralRollId}/members
Authorization: Bearer {OIDC access token}
Content-Type: application/json
```

```json
{
  "members": [
    {
      "identifier": "member-1",
      "groupKey": "group-1",
      "voteWeight": 2
    },
    {
      "identifier": "member-2"
    }
  ]
}
```

- 한 요청에는 1명 이상 50,000명 이하를 전달할 수 있습니다.
- `groupKey`는 선택값이며, `voteWeight`를 생략하면 `1`이 적용됩니다.
- 요청 전체를 하나의 serializable 트랜잭션으로 처리합니다. 한 건이라도 유효하지 않거나 식별자가 중복되면 전체 등록을 롤백합니다.
- 정상 등록 시 명부 revision은 구성원 수와 관계없이 한 번만 증가합니다.
- 변경된 revision에 대한 불변 스냅샷은 별도 API 호출 없이 한 번 자동 생성됩니다.
- 대량 요청을 받을 수 있도록 서버의 HTTP 요청 본문 크기는 최대 32 MB로 제한합니다.

### 성공 응답

대량 응답을 피하기 위해 등록된 구성원 전체를 반환하지 않고 처리 요약만 반환합니다. 구성원 ID가 필요하면 상세 조회 API를 사용합니다.

```json
{
  "success": true,
  "data": {
    "electoralRollId": "electoral-roll-1",
    "revision": 2,
    "addedMemberCount": 2
  },
  "timestamp": "2026-08-30T10:00:00.000Z",
  "requestId": "request-id"
}
```

### 상태 코드

| 상태  | 조건                                                                                 |
| ----- | ------------------------------------------------------------------------------------ |
| `201` | 모든 선거인 등록과 자동 스냅샷 생성이 완료됐습니다.                                 |
| `400` | `members`가 배열이 아니거나 1~50,000건 범위를 벗어났습니다.                          |
| `401` | Bearer 토큰이 없거나 JWT 검증에 실패했습니다.                                        |
| `404` | 선거인명부가 없습니다.                                                               |
| `409` | 요청 내부 또는 기존 명부에 같은 `identifier`가 있거나 구성원 값이 유효하지 않습니다. |
| `413` | 요청 본문이 32 MB를 초과했습니다.                                                    |
| `500` | 예상하지 못한 서버 오류입니다.                                                       |

## 목록 선택 후 상세 조회

목록에서 선택한 `id`는 기존 상세 조회 경로에 사용합니다.

```http
GET /electoral-rolls/{electoralRollId}
```

상세 응답에는 명부 구성원의 `identifier`, `groupKey`, `voteWeight`가 포함되므로 목록 화면에서 불필요하게 호출하거나 캐시하지 않습니다. 이 문서의 권한 필터 보장은 목록 API에 한정되며, 상세·수정·스냅샷 API의 위원회 권한 적용은 별도 보안 작업이 필요합니다.
