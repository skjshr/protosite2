#!/usr/bin/env python3
import argparse
import json
import subprocess
from pathlib import Path


DIFF_LINE_THRESHOLD = 800
DIFF_FILE_THRESHOLD = 30


def parse_task(task_file: Path) -> dict:
    data = {}
    for raw_line in task_file.read_text(encoding="utf-8").splitlines():
        if ": " not in raw_line:
            continue
        key, value = raw_line.split(": ", 1)
        data[key.strip()] = value.strip()
    return data


def git_changed_files() -> list[str]:
    tracked = subprocess.run(
        ["git", "diff", "--name-only", "HEAD"],
        capture_output=True,
        text=True,
        check=False,
    ).stdout.splitlines()
    untracked = subprocess.run(
        ["git", "ls-files", "--others", "--exclude-standard"],
        capture_output=True,
        text=True,
        check=False,
    ).stdout.splitlines()
    merged = []
    for path in tracked + untracked:
        if path and path not in merged:
            merged.append(path)
    return merged


def git_diff_line_count() -> int:
    diff = subprocess.run(
        ["git", "diff", "--numstat", "HEAD"],
        capture_output=True,
        text=True,
        check=False,
    ).stdout.splitlines()
    total = 0
    for row in diff:
        parts = row.split("\t")
        if len(parts) < 2:
            continue
        added, removed = parts[0], parts[1]
        if added.isdigit():
            total += int(added)
        if removed.isdigit():
            total += int(removed)
    return total


def parse_csv_like(value: str) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def touched_forbidden_paths(changed_files: list[str], forbidden_paths: list[str]) -> list[str]:
    matched = []
    for changed in changed_files:
        normalized_changed = changed.replace("\\", "/")
        for forbidden in forbidden_paths:
            normalized_forbidden = forbidden.replace("\\", "/").rstrip("/")
            if (
                normalized_changed == normalized_forbidden
                or normalized_changed.startswith(normalized_forbidden + "/")
            ):
                matched.append(changed)
                break
    return matched


def test_passed(test_log_path: Path) -> bool:
    if not test_log_path.exists():
        return False
    for line in test_log_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        if line.strip() == "TEST_EXIT_CODE=0":
            return True
    return False


def has_high_risk(risk_flags: str) -> bool:
    normalized = risk_flags.lower()
    markers = ["high", "auth", "permission", "delete", "db", "schema"]
    return any(marker in normalized for marker in markers)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--task-file", required=True)
    parser.add_argument("--test-log", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--codex-exit-code", type=int, default=0)
    args = parser.parse_args()

    task_data = parse_task(Path(args.task_file))
    changed_files = git_changed_files()
    diff_lines = git_diff_line_count()
    forbidden_paths = parse_csv_like(task_data.get("Forbidden Paths", ""))
    forbidden_touched = touched_forbidden_paths(changed_files, forbidden_paths)
    tests_ok = test_passed(Path(args.test_log))
    risk_flags = task_data.get("Risk Flags", "")

    status = "PASS"
    reasons: list[str] = []
    score = 100

    if not tests_ok:
        status = "REJECT"
        reasons.append("Test command failed.")
        score = 0

    if forbidden_touched:
        status = "REJECT"
        reasons.append(f"Forbidden paths were modified: {forbidden_touched}")
        score = 0

    if status != "REJECT":
        if diff_lines > DIFF_LINE_THRESHOLD or len(changed_files) > DIFF_FILE_THRESHOLD:
            status = "NEED_GEMINI"
            reasons.append(
                f"Diff is large (files={len(changed_files)}, changed_lines={diff_lines})."
            )
            score -= 30

        if has_high_risk(risk_flags):
            status = "NEED_GEMINI"
            reasons.append(f"Risk flags indicate high risk: {risk_flags}")
            score -= 30

        if args.codex_exit_code != 0:
            status = "NEED_GEMINI"
            reasons.append(f"Codex exited non-zero: {args.codex_exit_code}")
            score -= 20

    result = {
        "status": status,
        "score": max(0, min(100, score)),
        "reasons": reasons or ["No blocking issues detected by router rules."],
        "changed_files": changed_files,
        "tests_passed": tests_ok,
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
