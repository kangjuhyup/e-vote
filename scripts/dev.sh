#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/.." && pwd)

. "$script_dir/dev-env.sh"
cd "$repo_root"

docker compose up -d --wait
sh "$script_dir/dev-component.sh" migrate

if command -v orca >/dev/null 2>&1 && orca status --json >/dev/null 2>&1; then
  orca terminal create \
    --worktree "path:$repo_root" \
    --title "Vote API" \
    --command "nvm use && pnpm run dev:api"
  orca terminal create \
    --worktree "path:$repo_root" \
    --title "Payment Outbox Worker" \
    --command "nvm use && pnpm run dev:worker"
  orca terminal create \
    --worktree "path:$repo_root" \
    --title "Vote UI" \
    --command "nvm use && pnpm run dev:ui:local"
  orca terminal create \
    --worktree "path:$repo_root" \
    --title "Auth Service" \
    --command "pnpm run dev:auth-service"
  orca terminal create \
    --worktree "path:$repo_root" \
    --title "Auth UI" \
    --command "pnpm run dev:auth-ui"

  printf '\nDevelopment logs opened in five Orca terminals.\n'
  exit 0
fi

sh "$script_dir/dev-component.sh" api &
server_pid=$!

sh "$script_dir/dev-component.sh" worker &
worker_pid=$!

sh "$script_dir/dev-component.sh" ui &
ui_pid=$!

cleanup() {
  kill "$server_pid" "$worker_pid" "$ui_pid" 2>/dev/null || true
}

trap cleanup INT TERM EXIT
wait "$server_pid" "$worker_pid" "$ui_pid"
