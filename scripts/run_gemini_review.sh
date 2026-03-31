#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACTS_DIR="$ROOT_DIR/artifacts"
OUTPUT_FILE="$ARTIFACTS_DIR/gemini_review.json"
TMP_PROMPT_FILE="$ARTIFACTS_DIR/gemini_prompt.txt"

mkdir -p "$ARTIFACTS_DIR"

PROJECT_RULES="$(cat "$ROOT_DIR/ai/project_rules.md" 2>/dev/null || true)"
CURRENT_TASK="$(cat "$ROOT_DIR/ai/current_task.md" 2>/dev/null || true)"
GIT_DIFF="$(git -C "$ROOT_DIR" diff --no-color)"
TEST_LOG="$(cat "$ROOT_DIR/artifacts/test.log" 2>/dev/null || true)"

cat >"$TMP_PROMPT_FILE" <<EOF
Review this implementation strictly with these output sections only:
- requirement mismatches
- architecture concerns
- risks
- final verdict

Return valid JSON with these keys:
{
  "requirement mismatches": [],
  "architecture concerns": [],
  "risks": [],
  "final verdict": "PASS|CONCERN|REJECT"
}

No praise, no extra sections.

=== ai/project_rules.md ===
$PROJECT_RULES

=== ai/current_task.md ===
$CURRENT_TASK

=== git diff ===
$GIT_DIFF

=== artifacts/test.log ===
$TEST_LOG
EOF

if command -v gemini >/dev/null 2>&1; then
  set +e
  gemini -p "$(cat "$TMP_PROMPT_FILE")" >"$OUTPUT_FILE" 2>&1
  GEMINI_EXIT_CODE=$?
  set -e
  if [[ $GEMINI_EXIT_CODE -ne 0 ]]; then
    cat >"$OUTPUT_FILE" <<EOF
{"requirement mismatches":[],"architecture concerns":["Gemini command failed."],"risks":["gemini CLI exited with code $GEMINI_EXIT_CODE"],"final verdict":"CONCERN"}
EOF
  fi
else
  cat >"$OUTPUT_FILE" <<EOF
{"requirement mismatches":[],"architecture concerns":["Gemini CLI is not installed in PATH."],"risks":["Manual review required."],"final verdict":"CONCERN"}
EOF
fi

echo "Gemini review result: $OUTPUT_FILE"
