import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "py_modules"))

from moonshine_config import ConfigError, ConfigManager  # noqa: E402

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "config.toml"


class ConfigManagerTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.config_path = root / "config.toml"
        self.backup_dir = root / "backups"
        shutil.copyfile(FIXTURE, self.config_path)
        self.manager = ConfigManager(str(self.config_path), str(self.backup_dir))

    def original_text(self) -> str:
        return FIXTURE.read_text(encoding="utf-8")

    def backups(self) -> list[Path]:
        return sorted(self.backup_dir.glob("config.toml.*.bak"))

    def test_reads_exposed_values(self) -> None:
        self.assertEqual(
            self.manager.read(),
            {"name": "Steam", "hdr": True, "steam_mode": True},
        )

    def test_apply_changes_only_exposed_values(self) -> None:
        result = self.manager.apply("Living Room", False, False)

        self.assertTrue(result["changed"])
        self.assertEqual(
            self.manager.read(),
            {"name": "Living Room", "hdr": False, "steam_mode": False},
        )

        text = self.config_path.read_text(encoding="utf-8")
        self.assertIn('name = "Living Room"', text)
        self.assertIn("hdr = false", text)
        self.assertIn("steam_mode = false", text)
        self.assertIn("port = 47989", text)
        self.assertIn("port_https = 47984", text)
        self.assertIn('certificate = "/var/mnt/games/.moonshine/cert.pem"', text)
        self.assertIn("launch_timeout_secs = 30", text)
        self.assertIn('directories = ["/usr/share/steam-session/apps"]', text)

    def test_apply_preserves_comments(self) -> None:
        before = [line for line in self.original_text().splitlines() if line.lstrip().startswith("#")]
        self.manager.apply("Basement", True, False)
        after = [
            line
            for line in self.config_path.read_text(encoding="utf-8").splitlines()
            if line.lstrip().startswith("#")
        ]
        self.assertEqual(before, after)

    def test_apply_is_idempotent_and_does_not_backup_unchanged_file(self) -> None:
        first = self.manager.apply("Steam", True, True)
        self.assertFalse(first["changed"])
        self.assertIsNone(first["backup_path"])
        self.assertEqual(self.backups(), [])

    def test_invalid_input_leaves_file_untouched(self) -> None:
        original = self.config_path.read_text(encoding="utf-8")
        cases = [
            ("", True, True),
            ("   ", True, True),
            ("line\nbreak", True, True),
            ("x" * 129, True, True),
            (None, True, True),
            (1, True, True),
            ("Steam", "yes", True),
            ("Steam", 1, True),
            ("Steam", None, True),
            ("Steam", True, 0),
            ("Steam", True, None),
        ]
        for case in cases:
            with self.subTest(case=case):
                with self.assertRaises(ConfigError):
                    self.manager.apply(*case)
                self.assertEqual(self.config_path.read_text(encoding="utf-8"), original)
        self.assertEqual(self.backups(), [])

    def test_invalid_toml_is_rejected(self) -> None:
        self.config_path.write_text('[compositor\nhdr = true\n', encoding="utf-8")
        original = self.config_path.read_text(encoding="utf-8")
        with self.assertRaises(ConfigError):
            self.manager.read()
        with self.assertRaises(ConfigError):
            self.manager.apply("Steam", True, True)
        self.assertEqual(self.config_path.read_text(encoding="utf-8"), original)
        self.assertEqual(self.backups(), [])

    def test_missing_config_is_reported(self) -> None:
        self.config_path.unlink()
        with self.assertRaises(ConfigError):
            self.manager.read()
        with self.assertRaises(ConfigError):
            self.manager.apply("Steam", True, True)
        self.assertFalse(self.config_path.exists())

    def test_backup_is_written_before_replacement(self) -> None:
        original = self.config_path.read_text(encoding="utf-8")
        result = self.manager.apply("Backup Test", False, True)

        self.assertTrue(result["changed"])
        self.assertIsNotNone(result["backup_path"])
        backups = self.backups()
        self.assertEqual(len(backups), 1)
        backup_text = backups[0].read_text(encoding="utf-8")
        self.assertEqual(backup_text, original)
        self.assertIn("name = \"Backup Test\"", self.config_path.read_text(encoding="utf-8"))

        first_edit = self.config_path.read_text(encoding="utf-8")
        self.manager.apply("Second Edit", True, False)
        backups = self.backups()
        self.assertEqual(len(backups), 2)
        backup_texts = {backup.read_text(encoding="utf-8") for backup in backups}
        self.assertEqual(backup_texts, {original, first_edit})

    def test_apply_leaves_no_temporary_file(self) -> None:
        self.manager.apply("Clean", False, False)
        leftovers = list(self.config_path.parent.glob("*.tmp"))
        self.assertEqual(leftovers, [])

    def test_missing_compositor_keys_are_reported(self) -> None:
        self.config_path.write_text('name = "Steam"\n[compositor]\nhdr = true\n', encoding="utf-8")
        with self.assertRaises(ConfigError):
            self.manager.read()
        with self.assertRaises(ConfigError):
            self.manager.apply("Steam", True, True)


if __name__ == "__main__":
    unittest.main()
