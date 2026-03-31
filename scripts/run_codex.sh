#!/usr/bin/env bash
set -euo pipefail

# Windows host + WSL usage:
# Run this script from WSL in the repository root (bash environment).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AI_RULES_FILE="$ROOT_DIR/ai/project_rules.md"
TASK_FILE="$ROOT_DIR/ai/current_task.md"
ARTIFACTS_DIR="$ROOT_DIR/artifacts"
CODEX_RESULT_FILE="$ARTIFACTS_DIR/codex_result.txt"
TEST_LOG_FILE="$ARTIFACTS_DIR/test.log"
ROUTER_RESULT_FILE="$ARTIFACTS_DIR/router_result.json"

mkdir -p "$ARTIFACTS_DIR"

if [[ ! -f "$AI_RULES_FILE" || ! -f "$TASK_FILE" ]]; then
  echo "Missing required files: $AI_RULES_FILE or $TASK_FILE" >&2
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "codex command not found in PATH" >&2
  exit 1
fi

PROMPT="$(
  cat <<'EOF'
You are implementing a task in this repository.
Read the following rules and task definition carefully.
Then make minimal required code changes and run the requested test command if possible.
Return a concise summary of what you changed.

===== AI PROJECT RULES =====
EOF
)"

PROMPT="$PROMPT"$'\n'"$(cat "$AI_RULES_FILE")"$'\n\n'"===== CURRENT TASK ====="$'\n'"$(cat "$TASK_FILE")"

set +e
codex exec "$PROMPT" >"$CODEX_RESULT_FILE" 2>&1
CODEX_EXIT_CODE=$?
set -e

TEST_COMMAND="$(awk -F': ' '/^Test Command:/{print $2; exit}' "$TASK_FILE")"
if [[ -z "${TEST_COMMAND:-}" ]]; then
  TEST_COMMAND="npm run lint"
fi

{
  echo "Test Command: $TEST_COMMAND"
  set +e
  (cd "$ROOT_DIR" && bash -lc "$TEST_COMMAND")
  TEST_EXIT_CODE=$?
  set -e
  echo "TEST_EXIT_CODE=$TEST_EXIT_CODE"
} >"$TEST_LOG_FILE" 2>&1

python3 "$ROOT_DIR/scripts/router.py" \
  --task-file "$TASK_FILE" \
  --test-log "$TEST_LOG_FILE" \
  --output "$ROUTER_RESULT_FILE" \
  --codex-exit-code "$CODEX_EXIT_CODE"

echo "Codex result: $CODEX_RESULT_FILE"
echo "Test log: $TEST_LOG_FILE"
echo "Router result: $ROUTER_RESULT_FILE"
