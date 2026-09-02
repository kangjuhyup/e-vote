# 선거인명부 API 인터페이스

선거인명부는 선거관리위원회와 별도로 생성·수정합니다. 투표만
`commissionId`를 가지며, 투표에는 선택한 명부의 불변 스냅샷을 연결합니다.

```text
ElectionCommission -> Vote <- ElectoralRollSnapshot <- ElectoralRoll
```

## 공통 계약

- 모든 API는 `Authorization: Bearer {accessToken}`이 필요합니다.
- 서버는 JWT 검증 또는 opaque token introspection 결과로 `request.user`를 만들며,
  요청이 전달한 사용자 식별값은 신뢰하지 않습니다.
- 명부를 생성한 `UserPrincipal.id`에 명부 접근 권한이 직접 부여됩니다.
- 목록·상세·구성원 수정·스냅샷 생성은 모두 이 권한으로 제한됩니다.
- 접근 권한이 없는 명부와 스냅샷은 존재 여부를 노출하지 않고 `404`로 처리합니다.
- 목록 응답에는 구성원의 `identifier`, `groupKey`, `voteWeight`가 포함되지 않습니다.

성공 응답은 공통 envelope의 `data`에 아래 응답이 포함됩니다.

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-09-02T10:00:00.000Z",
  "requestId": "request-id"
}
```

## 명부 생성

```http
POST /electoral-rolls
Authorization: Bearer {accessToken}
Content-Type: application/json
```

```json
{
  "name": "2026 상반기 선거인명부"
}
```

응답 `data`:

```json
{
  "id": "electoral-roll-1",
  "name": "2026 상반기 선거인명부",
  "revision": 1
}
```

`commissionId`는 요청·응답에 사용하지 않습니다.
명부 생성과 동시에 revision 1의 불변 스냅샷도 자동 생성됩니다.

## 명부 목록 조회

```http
GET /electoral-rolls?q={검색어}&page=1&pageSize=20
Authorization: Bearer {accessToken}
```

| 이름       | 필수   | 기본값 | 설명                                                         |
| ---------- | ------ | ------ | ------------------------------------------------------------ |
| `q`        | 아니요 | 없음   | 이름에 대한 공백 제거 후 대소문자 무시 부분 검색입니다.      |
| `page`     | 아니요 | `1`    | 1 이상의 페이지 번호이며 잘못된 값은 1로 정규화됩니다.       |
| `pageSize` | 아니요 | `20`   | 1~100 사이이며 100을 넘으면 100으로 제한됩니다.              |

정렬은 `updatedAt DESC, id DESC`입니다. 응답 `data`:

```json
{
  "items": [
    {
      "id": "electoral-roll-1",
      "name": "2026 상반기 선거인명부",
      "revision": 2,
      "memberCount": 120,
      "updatedAt": "2026-09-02T10:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalItems": 1,
  "totalPages": 1
}
```

## 명부 상세 조회

```http
GET /electoral-rolls/{electoralRollId}
Authorization: Bearer {accessToken}
```

상세 응답은 `id`, `name`, `revision`, `createdAt`, `updatedAt`과 구성원 배열을
포함합니다. 각 구성원에는 `id`, `electoralRollId`, `identifier`, 선택적인
`groupKey`, `voteWeight`, `createdAt`, `updatedAt`이 포함됩니다. 민감한 구성원
식별정보가 있으므로 목록 화면에서는 상세 API를 미리 호출하거나 장기 캐시하지
않습니다.

## 선거인 다건 등록

```http
PUT /electoral-rolls/{electoralRollId}/members
Authorization: Bearer {accessToken}
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

- 한 요청은 1~50,000명입니다.
- `voteWeight` 기본값은 `1`입니다.
- 전체 요청은 serializable 트랜잭션으로 처리되며 한 건이 실패하면 모두 롤백합니다.
- 정상 처리 시 revision은 한 번 증가하고 해당 revision의 불변 스냅샷이 자동 생성됩니다.
- 요청 본문 최대 크기는 32 MB입니다.

응답 `data`:

```json
{
  "electoralRollId": "electoral-roll-1",
  "revision": 2,
  "addedMemberCount": 2
}
```

구성원 수정은 `PATCH /electoral-rolls/{electoralRollId}/members/{memberId}`,
삭제는 `DELETE /electoral-rolls/{electoralRollId}/members/{memberId}`를 사용하며,
각 변경도 새 revision과 불변 스냅샷을 만듭니다.

## 투표에 명부 스냅샷 연결

투표 생성 시 `commissionId`는 계속 필수입니다. 사용자가 명부 ID를 선택해 연결하면
서버가 그 명부의 현재 revision 스냅샷을 자동 조회하거나 생성합니다.

```http
PUT /votes/{voteId}/electoral-roll-snapshot
Authorization: Bearer {accessToken}
Content-Type: application/json
```

```json
{
  "electoralRollId": "electoral-roll-1"
}
```

서버는 요청 사용자가 원본 명부에 접근할 수 있는지 확인합니다. 현재 revision에
이미 자동 생성된 스냅샷이 있으면 재사용하고, 아직 없으면 같은 트랜잭션에서 한 번
생성합니다. 명부와 위원회의 동일성 비교는 하지 않습니다. 연결 후 스냅샷 구성원이
투표 선거인으로 구체화되며, 원본 명부를 나중에 수정해도 연결된 스냅샷은 바뀌지
않습니다. 투표가 확정되거나 시작된 뒤에는 교체할 수 없습니다.

## 주요 상태 코드

| 상태  | 조건                                                               |
| ----- | ------------------------------------------------------------------ |
| `200` | 목록·상세·수정·삭제 또는 투표 연결 성공입니다.                    |
| `201` | 명부·구성원·스냅샷 생성 성공입니다.                               |
| `400` | 요청 형식이나 다건 등록 범위가 올바르지 않습니다.                  |
| `401` | Bearer 토큰이 없거나 검증에 실패했습니다.                          |
| `404` | 리소스가 없거나 요청 사용자에게 명부 접근 권한이 없습니다.         |
| `409` | 중복 식별자, 도메인 정책 또는 투표 상태가 변경을 허용하지 않습니다. |
| `413` | 요청 본문이 32 MB를 초과했습니다.                                  |
| `500` | 예상하지 못한 서버 오류입니다.                                     |

## 기존 데이터 마이그레이션

기존 `commission_id` 기반 명부는 마이그레이션 시 해당 위원회의 `ACTIVE` 위원 중
`user_principal_id`가 연결된 모든 사용자에게 직접 접근 권한을 부여합니다. 그 후
명부와 스냅샷의 `commission_id` 컬럼을 제거합니다. 연결된 활성 사용자가 없는 기존
명부는 자동 권한을 만들 수 없으므로 관리 데이터 보정 전까지 조회되지 않습니다.
