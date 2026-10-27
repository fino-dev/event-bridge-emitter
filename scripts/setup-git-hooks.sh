#!/bin/sh

set -eu

ROOT_DIR=$(git rev-parse --show-toplevel)
HOOKS_DIR="$ROOT_DIR/.githooks"

if [ ! -x "$HOOKS_DIR/pre-push" ]; then
  echo "Cannot configure Git hooks: $HOOKS_DIR/pre-push is missing or not executable." >&2
  exit 1
fi

git -C "$ROOT_DIR" config --local core.hooksPath "$HOOKS_DIR"
echo "Git hooks enabled from $HOOKS_DIR"
