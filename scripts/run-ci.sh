#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

npm run ci:frontend

if [ -f Magefile.go ]; then
  if ! command -v golangci-lint >/dev/null 2>&1; then
    echo "CI cannot continue: golangci-lint is required for backend checks." >&2
    exit 1
  fi

  if ! command -v mage >/dev/null 2>&1; then
    echo "CI cannot continue: mage is required for backend checks." >&2
    exit 1
  fi

  golangci-lint run ./...
  mage buildAll
  mage test
fi
