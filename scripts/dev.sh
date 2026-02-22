#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

(cd "$ROOT_DIR/backend" && npm run dev) &
BACKEND_PID=$!

(cd "$ROOT_DIR/frontend" && npm run dev -- --host 0.0.0.0 --port 5173) &
FRONTEND_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID"
