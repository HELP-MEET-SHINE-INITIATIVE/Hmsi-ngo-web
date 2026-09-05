#!/usr/bin/env python3
"""Validate HMSI Semgrep suppression metadata without printing source data."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

ALLOWED_RULES = {
    "hmsi-sensitive-header-direct-log",
    "hmsi-sensitive-header-object-log",
    "hmsi-sensitive-header-metric-label",
    "hmsi-sensitive-header-event-payload",
    "hmsi-sensitive-header-template-log",
}
REQUIRED_FIELDS = ("ticket", "owner", "reviewer", "expires", "reason", "compensating-test")
SOURCE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}
SKIP_PARTS = {".git", "node_modules", "dist", "build", ".next", "coverage"}
SUPPRESSION_RE = re.compile(r"nosemgrep\s*:\s*([A-Za-z0-9_.-]+)")
FIELD_RE = re.compile(r"(?:^|\s)(ticket|owner|reviewer|expires|reason|compensating-test)=([^\s]+(?:\s+(?!\w+=)[^\s]+)*)")
ISO_UTC_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
FORBIDDEN_RAW_RE = re.compile(
    r"headers\s*\.\s*get\s*\(\s*['\"](?:authorization|cookie)['\"]\s*\)",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class Finding:
    path: Path
    line: int
    rule: str
    category: str


def source_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix not in SOURCE_EXTENSIONS:
            continue
        if any(part in SKIP_PARTS for part in path.relative_to(root).parts):
            continue
        files.append(path)
    return sorted(files)


def parse_fields(lines: list[str]) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in lines:
        text = re.sub(r"^\s*(?://|#|/\*|\*)\s?", "", line).strip()
        for match in FIELD_RE.finditer(text):
            fields[match.group(1)] = match.group(2).strip()
    return fields


def parse_expiry(value: str) -> datetime | None:
    if not ISO_UTC_RE.fullmatch(value):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def validate_file(path: Path, root: Path, now: datetime, max_days: int) -> list[Finding]:
    findings: list[Finding] = []
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError):
        return [Finding(path, 1, "unknown", "unreadable-source")]

    for index, line in enumerate(lines):
        suppression = SUPPRESSION_RE.search(line)
        if not suppression:
            continue

        rule = suppression.group(1)
        line_number = index + 1
        if rule not in ALLOWED_RULES:
            findings.append(Finding(path, line_number, rule, "unapproved-rule-id"))

        start = index
        while start > 0:
            previous = lines[start - 1].strip()
            if not previous or not (previous.startswith("//") or previous.startswith("#") or previous.startswith("*")):
                break
            start -= 1
        metadata = parse_fields(lines[start:index])

        for field in REQUIRED_FIELDS:
            if field not in metadata or not metadata[field]:
                findings.append(Finding(path, line_number, rule, f"missing-{field}"))

        expiry_value = metadata.get("expires")
        expiry = parse_expiry(expiry_value) if expiry_value else None
        if expiry_value and expiry is None:
            findings.append(Finding(path, line_number, rule, "expires-not-utc"))
        elif expiry is not None:
            if expiry <= now:
                findings.append(Finding(path, line_number, rule, "expired"))
            elif expiry > now + timedelta(days=max_days):
                findings.append(Finding(path, line_number, rule, "expiry-too-far"))

        test_value = metadata.get("compensating-test")
        if test_value:
            test_path = (root / test_value).resolve()
            try:
                test_path.relative_to(root.resolve())
            except ValueError:
                findings.append(Finding(path, line_number, rule, "test-path-outside-repository"))
            else:
                if not test_path.is_file():
                    findings.append(Finding(path, line_number, rule, "compensating-test-not-found"))

        context = "\n".join(lines[index : min(len(lines), index + 6)])
        if FORBIDDEN_RAW_RE.search(context):
            findings.append(Finding(path, line_number, rule, "raw-credential-source"))

    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("roots", nargs="*", type=Path, help="Repository directories or files to scan")
    parser.add_argument("--repo-root", type=Path, default=Path.cwd())
    parser.add_argument("--now", help="Testing-only UTC instant, formatted YYYY-MM-DDTHH:MM:SSZ")
    parser.add_argument("--max-expiry-days", type=int, default=30)
    args = parser.parse_args()

    if args.max_expiry_days < 1 or args.max_expiry_days > 90:
        print("CONFIG:max-expiry-days:invalid-range", file=sys.stderr)
        return 2

    root = args.repo_root.resolve()
    if args.now:
        now = parse_expiry(args.now)
        if now is None:
            print("CONFIG:now:not-utc", file=sys.stderr)
            return 2
    else:
        now = datetime.now(timezone.utc)

    requested = args.roots or [Path("app"), Path("lib"), Path("components"), Path("scripts")]
    files: list[Path] = []
    for requested_path in requested:
        absolute = (root / requested_path).resolve()
        if absolute.is_file() and absolute.suffix in SOURCE_EXTENSIONS:
            files.append(absolute)
        elif absolute.is_dir():
            files.extend(source_files(absolute))

    findings: list[Finding] = []
    for path in sorted(set(files)):
        findings.extend(validate_file(path, root, now, args.max_expiry_days))

    for finding in findings:
        relative = finding.path.relative_to(root)
        print(f"{relative}:{finding.line}:{finding.rule}:{finding.category}")
    if findings:
        print(f"SEMGREP_EXCEPTION_VALIDATION_FAILED:{len(findings)} finding(s)", file=sys.stderr)
        return 1

    print(f"SEMGREP_EXCEPTION_VALIDATION_OK:{len(files)} file(s) scanned")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
