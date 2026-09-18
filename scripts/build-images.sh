#!/bin/sh
set -eu

: "${IMAGE_PREFIX:?Set IMAGE_PREFIX to the approved registry and repository prefix}"

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
cd "$repo_root"

revision=$(git rev-parse HEAD)
revision_tag=$(git rev-parse --short=12 HEAD)
if [ -n "$(git status --porcelain)" ]; then
  if [ "${PUSH_IMAGES:-false}" = true ]; then
    printf 'Refusing to publish images from a dirty worktree\n' >&2
    exit 1
  fi
  revision_tag="${revision_tag}-dirty"
fi

image_prefix=${IMAGE_PREFIX%/}
ui_image="${image_prefix}/ui:${revision_tag}"
server_image="${image_prefix}/server:${revision_tag}"

docker build --platform linux/arm64 --file Dockerfile.ui \
  --build-arg "VCS_REF=$revision" \
  --build-arg NEXT_PUBLIC_VOTE_API_MODE=live \
  --build-arg NEXT_PUBLIC_VOTE_API_BASE_URL=/api/vote-server \
  --build-arg NEXT_PUBLIC_PARTICIPATION_API_BASE_URL=https://vote-api.rvkang.app \
  --tag "$ui_image" .
docker build --platform linux/arm64 --file Dockerfile.server \
  --build-arg "VCS_REF=$revision" \
  --tag "$server_image" .

if [ "${PUSH_IMAGES:-false}" = true ]; then
  docker push "$ui_image"
  docker push "$server_image"
fi

printf 'Built %s and %s from %s\n' "$ui_image" "$server_image" "$revision"
