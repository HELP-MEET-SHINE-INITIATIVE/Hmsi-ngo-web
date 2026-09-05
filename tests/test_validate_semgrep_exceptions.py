from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "validate_semgrep_exceptions.py"


def run_validator(tmp_path: Path, source: str, *, now: str = "2026-08-26T12:00:00Z") -> subprocess.CompletedProcess[str]:
    source_path = tmp_path / "legacy.ts"
    source_path.write_text(source, encoding="utf-8")
    test_path = tmp_path / "tests" / "legacy-adapter.test.ts"
    test_path.parent.mkdir()
    test_path.write_text("test('canary', () => {});\n", encoding="utf-8")
    return subprocess.run(
        [sys.executable, str(SCRIPT), str(source_path), "--repo-root", str(tmp_path), "--now", now],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )


def valid_source(expires: str = "2026-09-20T12:00:00Z") -> str:
    return f"""// SECURITY-EXCEPTION: HMSC-1842
// ticket=HMSC-1842 owner=platform-security reviewer=security-lead
// expires={expires}
// reason=legacy adapter pending removal; restricted sink only
// compensating-test=tests/legacy-adapter.test.ts
// nosemgrep: hmsi-sensitive-header-template-log
legacyAdapter.writeRestrictedAudit(originClass);
"""


class SemgrepExceptionValidatorTests(unittest.TestCase):
    def test_valid_exception_passes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            result = run_validator(Path(directory), valid_source())
            self.assertEqual(result.returncode, 0)
            self.assertIn("SEMGREP_EXCEPTION_VALIDATION_OK", result.stdout)
            self.assertEqual(result.stderr, "")

    def test_required_fields_are_enforced(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = valid_source().replace(" reviewer=security-lead", "")
            result = run_validator(Path(directory), source)
            self.assertEqual(result.returncode, 1)
            self.assertIn("missing-reviewer", result.stdout)
            self.assertNotIn("legacy adapter pending removal", result.stdout)

    def test_expiry_must_be_utc_and_not_expired(self) -> None:
        cases = [
            ("2026-08-26T11:59:59Z", "expired"),
            ("2026-09-20T12:00:00+00:00", "expires-not-utc"),
            ("2026-10-01T12:00:00Z", "expiry-too-far"),
        ]
        for expiry, category in cases:
            with self.subTest(expiry=expiry):
                with tempfile.TemporaryDirectory() as directory:
                    result = run_validator(Path(directory), valid_source(expiry))
                    self.assertEqual(result.returncode, 1)
                    self.assertIn(category, result.stdout)

    def test_compensating_test_must_exist_inside_repository(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = valid_source().replace("tests/legacy-adapter.test.ts", "../outside.test.ts")
            result = run_validator(Path(directory), source)
            self.assertEqual(result.returncode, 1)
            self.assertIn("test-path-outside-repository", result.stdout)

        with tempfile.TemporaryDirectory() as directory:
            source = valid_source().replace("tests/legacy-adapter.test.ts", "tests/not-found.test.ts")
            result = run_validator(Path(directory), source)
            self.assertEqual(result.returncode, 1)
            self.assertIn("compensating-test-not-found", result.stdout)

    def test_only_approved_rule_ids_are_allowed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = valid_source().replace("hmsi-sensitive-header-template-log", "unknown-rule")
            result = run_validator(Path(directory), source)
            self.assertEqual(result.returncode, 1)
            self.assertIn("unapproved-rule-id", result.stdout)

    def test_raw_authorization_and_cookie_sources_are_never_exception_eligible(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = valid_source() + "console.warn(request.headers.get('Authorization'));\n"
            result = run_validator(Path(directory), source)
            self.assertEqual(result.returncode, 1)
            self.assertIn("raw-credential-source", result.stdout)
            self.assertNotIn("Authorization", result.stdout)

    def test_invalid_validator_configuration_fails_without_scanning_source(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--repo-root", directory, "--now", "not-utc"],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(result.returncode, 2)
            self.assertIn("CONFIG:now:not-utc", result.stderr)


if __name__ == "__main__":
    unittest.main()
