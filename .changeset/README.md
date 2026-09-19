# Changesets

Vote 서버 또는 UI의 배포 가능한 변경을 담은 PR에는 변경 요약을 추가합니다.

```sh
pnpm changeset
```

서버와 UI는 하나의 컨테이너 릴리스 버전을 공유하므로 둘 중 변경된 패키지만
선택해도 두 패키지의 버전이 함께 올라갑니다. 문서·CI만 바뀐 PR에는 changeset이
필요하지 않습니다. Changesets는 npm 게시가 아닌 버전·CHANGELOG 및 GHCR 이미지
릴리스에 사용합니다.
