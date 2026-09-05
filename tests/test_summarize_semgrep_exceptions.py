from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "summarize_semgrep_exceptions.py"
SPEC = importlib.util.spec_from_file_location("summarize_semgrep_exceptions", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class SummaryTests(unittest.TestCase):
    def write_exception(self, root: Path, name: str, expires: str, rule: str = "hmsi-sensitive-header-template-log") -> None:
        test_file = root / "tests" / f"{name}.test.ts"
        test_file.parent.mkdir(parents=True, exist_ok=True)
        test_file.write_text("test('fixture', () => {});\n", encoding="utf-8")
        (root / f"{name}.ts").write_text(
            "// ticket=HMSC-1842 owner=platform-security reviewer=security-lead\n"
            f"// expires={expires}\n"
            "// reason=legacy adapter pending removal; restricted sink only\n"
            f"// compensating-test=tests/{name}.test.ts\n"
            f"// nosemgrep: {rule}\n"
            "legacyAdapter.writeRestrictedAudit(originClass);\n",
            encoding="utf-8",
        )

    def test_summary_counts_expired_expiring_active(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_exception(root, "expired", "2026-08-25T12:00:00Z")
            self.write_exception(root, "expiring", "2026-08-30T12:00:00Z")
            self.write_exception(root, "active", "2026-09-20T12:00:00Z")
            result = MODULE.scan_exception_states(root, MODULE.parse_expiry("2026-08-26T12:00:00Z"), 7)
            summary = MODULE.safe_summary(result, MODULE.parse_expiry("2026-08-26T12:00:00Z"), 7, "staging")
            self.assertEqual(summary["expired"], 1)
            self.assertEqual(summary["expiring"], 1)
            self.assertEqual(summary["active"], 1)
            self.assertEqual(summary["invalid_metadata"], 0)

    def test_slack_payload_has_aggregate_fields_only(self) -> None:
        summary = {
            "environment": "staging",
            "as_of_utc": "2026-08-26T12:00:00Z",
            "expiring_window_days": 7,
            "expired": 2,
            "expiring": 3,
            "active": 4,
            "invalid_metadata": 1,
            "files_scanned": 10,
            "by_rule": {"expired:hmsi-sensitive-header-template-log": 2},
        }
        payload = json.dumps(MODULE.slack_payload(summary), sort_keys=True)
        self.assertIn("Expired", payload)
        self.assertNotIn("by_rule", payload)
        for secret in ("Authorization", "Cookie", "Origin", "request_id", "@"):
            self.assertNotIn(secret, payload)

    def test_duplicate_fingerprint_skips_without_webhook_call(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / "state.json"
            state.write_text(json.dumps({"fingerprint": MODULE.alert_fingerprint({"environment": "staging", "expired": 1, "expiring": 0, "invalid_metadata": 0, "by_rule": {}})}), encoding="utf-8")
            summary = {"environment": "staging", "expired": 1, "expiring": 0, "invalid_metadata": 0, "by_rule": {}, "as_of_utc": "2026-08-26T12:00:00Z", "expiring_window_days": 7}
            with patch.dict("os.environ", {"SLACK_SECURITY_EVENTS_WEBHOOK_URL": "https://hooks.slack.com/services/test"}), patch.object(MODULE.urllib.request, "urlopen") as urlopen:
                self.assertFalse(MODULE.send_slack(summary, state))
                urlopen.assert_not_called()

    def test_slack_timeout_is_safe_and_does_not_write_state(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / "state.json"
            summary = {"environment": "staging", "expired": 1, "expiring": 0, "invalid_metadata": 0, "by_rule": {}, "as_of_utc": "2026-08-26T12:00:00Z", "expiring_window_days": 7}
            with patch.dict("os.environ", {"SLACK_SECURITY_EVENTS_WEBHOOK_URL": "https://hooks.slack.com/services/test"}), patch.object(MODULE.urllib.request, "urlopen", side_effect=TimeoutError):
                with self.assertRaises(SystemExit) as raised:
                    MODULE.send_slack(summary, state)
                self.assertEqual(str(raised.exception), "SLACK:request-timeout-or-unavailable")
            self.assertFalse(state.exists())


if __name__ == "__main__":
    unittest.main()
