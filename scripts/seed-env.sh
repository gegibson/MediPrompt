#!/usr/bin/env bash
set -euo pipefail

# Seed or update .env.local from .env.example without overwriting existing values.
# - If .env.local is missing, copy .env.example.
# - Ensure all keys from .env.example exist in .env.local (append missing as empty).

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

if [[ ! -f .env.example ]]; then
  echo "[seed-env] .env.example not found. Run from the repository root containing .env.example." >&2
  exit 1
fi

if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  echo "[seed-env] Created .env.local from .env.example"
else
  echo "[seed-env] Updating existing .env.local with any missing keys from .env.example"
fi

# Build a list of keys from .env.example (skip comments/empty) and ensure presence in .env.local
while IFS= read -r line; do
  # Skip comments and blank lines
  if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
    continue
  fi

  # Extract key up to '='
  key="${line%%=*}"
  key_trimmed="${key%%[[:space:]]*}"
  if [[ -z "$key_trimmed" ]]; then
    continue
  fi

  if ! grep -qE "^${key_trimmed}=" .env.local; then
    echo "${key_trimmed}=" >> .env.local
    echo "[seed-env] Added missing key: ${key_trimmed}="
  fi
done < .env.example

echo "[seed-env] Done. Open .env.local and fill in any blanks."

