#!/bin/bash
# Installs project dependencies at the start of a Claude Code on the web session
# so lint, typecheck, tests and build work immediately. Runs synchronously so the
# session doesn't start before the install finishes.
set -euo pipefail

# Only needed in the remote (web) environment; local sessions manage their own.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# The repo pins pnpm via package.json "packageManager"; corepack activates that
# exact version. Ignore failures so a pre-provisioned pnpm still works.
corepack enable pnpm 2>/dev/null || true

# --frozen-lockfile keeps the install reproducible against the committed
# pnpm-lock.yaml (same as CI); the pnpm store cache still makes reruns fast.
pnpm install --frozen-lockfile
