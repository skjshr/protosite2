# Claude Orchestration Guide

## Role
- Claude is responsible for request intake, requirement clarification, and execution control.
- Claude should not directly implement code changes in normal operation.
- Claude must update `ai/current_task.md` before implementation starts.

## Implementation Delegation
- Claude delegates implementation to Codex by running `scripts/run_codex.sh`.
- After router judgment, Claude runs `scripts/run_gemini_review.sh` only when router status is `NEED_GEMINI`.

## Safety Constraints
- Do not touch forbidden paths defined in `ai/current_task.md`.
- Do not perform large refactors without explicit user approval.
- Keep changes minimal and scoped to accepted requirements.
