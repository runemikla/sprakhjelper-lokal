#!/usr/bin/env bash
# Idempotent Cloud Agent bootstrap for Språkhjelperen (Next.js 16 + pnpm).
# Runs after the repository is checked out. Safe to re-run.
set -euo pipefail

cd "$(dirname "$0")/.."

# The base image ships Node; ensure pnpm is available (corepack fallback).
if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@10.33.3 --activate
fi

# Install dependencies exactly as pinned in the committed lockfile.
pnpm install --frozen-lockfile

# Provide a local .env.local so the app can boot for development and testing
# even before real credentials are configured. Real values supplied via Cursor
# Secrets are injected as environment variables and TAKE PRECEDENCE over these
# placeholders (Next.js @next/env does not override already-set process.env),
# so this file only fills the gaps needed for the app to start.
if [ ! -f .env.local ]; then
  cat > .env.local <<'ENV'
# Placeholder development environment written by .cursor/install.sh.
# Override any of these by adding the matching Cursor Secret.
#
# Required for the app to boot (the proxy reads Supabase env on every request):
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_placeholder_key_for_local_boot
# Access-code gate (visit /tilgang and enter this to use the app locally):
ACCESS_CODE=demo1234
#
# Optional — add real values via Cursor Secrets to enable AI features:
#   AZURE_OPENAI_ENDPOINT=...
#   AZURE_OPENAI_API_KEY=...
#   AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
#   AZURE_OPENAI_API_VERSION=2024-08-01-preview
# Optional — text-to-speech for listening exercises:
#   ELEVENLABS_API_KEY=...
ENV
  echo ".cursor/install.sh: wrote placeholder .env.local"
else
  echo ".cursor/install.sh: .env.local already present, leaving as-is"
fi

echo ".cursor/install.sh: done"
