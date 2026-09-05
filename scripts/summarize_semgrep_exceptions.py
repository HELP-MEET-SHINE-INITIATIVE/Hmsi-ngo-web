#!/usr/bin/env python3
"""Summarize Semgrep exceptions and optionally send a privacy-safe Slack alert."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from validate_semgrep_exceptions import (
    ALLOWED_RULES,
    ISO_UTC_RE,
    REQUIRED_FIELDS,
    SOURCE_EXTENSIONS,
    SKIP_PARTS,
    SUPPRESSION_RE,
    parse_expiry,
    parse_fields,
)

DEFAULT_EXPIRING_DAYS = 7
SLACK_TIMEOUT_SECONDS = 5


def source_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix not in SOURCE_EXTENSIONS:
            continue
        if any(part in SKIP_PARTS for part in path.relative_to(root).parts):
            continue
        files.append(path)
    return sorted(files)


def scan_exception_states(root: Path, now: datetime, expiring_days: int) -> dict[str, Counter[str] | int]:
    counts: Counter[str] = Counter()
    rule_counts: Counter[str] = Counter()
    invalid_metadata = 0
    files_scanned = 0

    for path in source_files(root):
        files_scanned += 1
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except (OSError, UnicodeDecodeError):
            invalid_metadata += 1
            continue

        for index, line in enumerate(lines):
            match = SUPPRESSION_RE.search(line)
            if not match:
                continue
            rule = match.group(1)
            start = index
            while start > 0:
                previous = lines[start - 1].strip()
                if not previous or not (previous.startswith("//") or previous.startswith("#") or previous.startswith("*")):
                    break
                start -= 1
            fields = parse_fields(lines[start:index])
            expiry_value = fields.get("expires", "")
            expiry = parse_expiry(expiry_value) if expiry_value else None
            if rule not in ALLOWED_RULES or any(field not in fields for field in REQUIRED_FIELDS) or expiry is None:
                invalid_metadata += 1
                continue

            rule_key = rule if rule in ALLOWED_RULES else "unapproved"
            if expiry <= now:
                counts["expired"] += 1
                rule_counts[f"expired:{rule_key}"] += 1
            elif expiry <= now + timedelta(days=expiring_days):
                counts["expiring"] += 1
                rule_counts[f"expiring:{rule_key}"] += 1
            else:
                counts["active"] += 1

    return {"counts": counts, "rule_counts": rule_counts, "invalid_metadata": invalid_metadata, "files_scanned": files_scanned}


def safe_summary(result: dict[str, Counter[str] | int], now: datetime, expiring_days: int, environment: str) -> dict[str, object]:
    counts = result["counts"]
    assert isinstance(counts, Counter)
    rule_counts = result["rule_counts"]
    assert isinstance(rule_counts, Counter)
    return {
        "environment": environment,
        "as_of_utc": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "expiring_window_days": expiring_days,
        "files_scanned": result["files_scanned"],
        "expired": counts["expired"],
        "expiring": counts["expiring"],
        "active": counts["active"],
        "invalid_metadata": result["invalid_metadata"],
        "by_rule": dict(sorted(rule_counts.items())),
    }


def prometheus_text(summary: dict[str, object]) -> str:
    environment = summary["environment"]
    lines = [
        "# HELP hmsi_semgrep_exception_total Semgrep suppressions by lifecycle state.",
        "# TYPE hmsi_semgrep_exception_total gauge",
    ]
    for state in ("expired", "expiring", "active"):
        lines.append(f'hmsi_semgrep_exception_total{{environment="{environment}",state="{state}"}} {summary[state]}')
    lines.extend([
        "# HELP hmsi_semgrep_exception_invalid_metadata_total Suppressions with invalid metadata.",
        "# TYPE hmsi_semgrep_exception_invalid_metadata_total gauge",
        f'hmsi_semgrep_exception_invalid_metadata_total{{environment="{environment}"}} {summary["invalid_metadata"]}',
        "# HELP hmsi_semgrep_exception_files_scanned_total Source files scanned for exception metadata.",
        "# TYPE hmsi_semgrep_exception_files_scanned_total gauge",
        f'hmsi_semgrep_exception_files_scanned_total{{environment="{environment}"}} {summary["files_scanned"]}',
        "",
    ])
    return "\n".join(lines)


def alert_fingerprint(summary: dict[str, object]) -> str:
    material = json.dumps({
        "environment": summary["environment"],
        "expired": summary["expired"],
        "expiring": summary["expiring"],
        "invalid_metadata": summary["invalid_metadata"],
        "by_rule": summary["by_rule"],
    }, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(material.encode("utf-8")).hexdigest()[:16]


def read_state(path: Path) -> dict[str, str]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        raise SystemExit("STATE:unreadable")
    if not isinstance(value, dict):
        raise SystemExit("STATE:invalid")
    return {str(key): str(item) for key, item in value.items()}


def write_state(path: Path, state: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(state, sort_keys=True) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def slack_payload(summary: dict[str, object]) -> dict[str, object]:
    severity = "expired" if summary["expired"] else "expiring"
    return {
        "text": f"HMSI Semgrep exceptions: {severity} security exceptions require review.",
        "blocks": [
            {"type": "header", "text": {"type": "plain_text", "text": "HMSI Semgrep exception review"}},
            {"type": "section", "fields": [
                {"type": "mrkdwn", "text": f"*Environment*\n`{summary['environment']}`"},
                {"type": "mrkdwn", "text": f"*As of UTC*\n`{summary['as_of_utc']}`"},
                {"type": "mrkdwn", "text": f"*Expired*\n`{summary['expired']}`"},
                {"type": "mrkdwn", "text": f"*Expiring ≤ {summary['expiring_window_days']}d*\n`{summary['expiring']}`"},
                {"type": "mrkdwn", "text": f"*Invalid metadata*\n`{summary['invalid_metadata']}`"},
            ]},
            {"type": "context", "elements": [
                {"type": "mrkdwn", "text": "Review the approved exception register; this alert contains aggregate counts only."}
            ]},
        ],
    }


def send_slack(summary: dict[str, object], state_path: Path) -> bool:
    webhook = os.environ.get("SLACK_SECURITY_EVENTS_WEBHOOK_URL")
    if not webhook:
        raise SystemExit("CONFIG:SLACK_SECURITY_EVENTS_WEBHOOK_URL:missing")
    if not webhook.startswith("https://hooks.slack.com/"):
        raise SystemExit("CONFIG:SLACK_SECURITY_EVENTS_WEBHOOK_URL:invalid-host")

    fingerprint = alert_fingerprint(summary)
    state = read_state(state_path)
    if state.get("fingerprint") == fingerprint:
        print("SLACK_EXCEPTION_ALERT_SKIPPED_DUPLICATE")
        return False

    body = json.dumps(slack_payload(summary), separators=(",", ":")).encode("utf-8")
    request = urllib.request.Request(webhook, data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=SLACK_TIMEOUT_SECONDS) as response:
            if response.status < 200 or response.status >= 300:
                raise SystemExit(f"SLACK:HTTP_STATUS:{response.status}")
    except urllib.error.HTTPError as error:
        raise SystemExit(f"SLACK:HTTP_STATUS:{error.code}")
    except (urllib.error.URLError, TimeoutError):
        raise SystemExit("SLACK:request-timeout-or-unavailable")

    write_state(state_path, {"fingerprint": fingerprint, "sent_at_utc": summary["as_of_utc"]})
    print("SLACK_EXCEPTION_ALERT_SENT")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path.cwd())
    parser.add_argument("--environment", default="staging")
    parser.add_argument("--expiring-days", type=int, default=DEFAULT_EXPIRING_DAYS)
    parser.add_argument("--now", help="Testing-only UTC instant YYYY-MM-DDTHH:MM:SSZ")
    parser.add_argument("--metrics-output", type=Path)
    parser.add_argument("--summary-output", type=Path)
    parser.add_argument("--send-slack", action="store_true")
    parser.add_argument("--state-file", type=Path)
    args = parser.parse_args()

    if args.expiring_days < 1 or args.expiring_days > 30:
        print("CONFIG:expiring-days:invalid-range", file=sys.stderr)
        return 2
    now = parse_expiry(args.now) if args.now else datetime.now(timezone.utc)
    if now is None:
        print("CONFIG:now:not-utc", file=sys.stderr)
        return 2

    root = args.repo_root.resolve()
    result = scan_exception_states(root, now, args.expiring_days)
    summary = safe_summary(result, now, args.expiring_days, args.environment)
    if args.metrics_output:
        args.metrics_output.parent.mkdir(parents=True, exist_ok=True)
        args.metrics_output.write_text(prometheus_text(summary), encoding="utf-8")
    if args.summary_output:
        args.summary_output.parent.mkdir(parents=True, exist_ok=True)
        args.summary_output.write_text(json.dumps(summary, sort_keys=True, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(summary, sort_keys=True, separators=(",", ":")))
    if args.send_slack:
        if not args.state_file:
            print("CONFIG:state-file:required-for-slack", file=sys.stderr)
            return 2
        if summary["expired"] or summary["expiring"] or summary["invalid_metadata"]:
            send_slack(summary, args.state_file)
        else:
            print("SLACK_EXCEPTION_ALERT_NOT_REQUIRED")
    return 1 if summary["expired"] or summary["invalid_metadata"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
