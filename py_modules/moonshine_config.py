"""Safe, narrow editing of Moonshine's config.toml.

Only three values are ever changed:

    name
    [compositor] hdr
    [compositor] steam_mode

The file is parsed with tomlkit, so comments and unrelated keys survive. A
timestamped copy of the original file is written to the games share before
the replacement, and the replacement itself is an atomic rename.
"""

from __future__ import annotations

import os
import stat
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import tomlkit

MAX_NAME_LENGTH = 128
KEEP_BACKUPS = 20


class ConfigError(Exception):
    """A user-visible configuration error."""


def _validate_name(value: Any) -> str:
    if not isinstance(value, str):
        raise ConfigError("Server name must be a string.")
    name = value.strip()
    if not name:
        raise ConfigError("Server name cannot be empty.")
    if len(name) > MAX_NAME_LENGTH:
        raise ConfigError(f"Server name must be at most {MAX_NAME_LENGTH} characters.")
    if any(ord(char) < 32 or ord(char) == 127 for char in name):
        raise ConfigError("Server name cannot contain control characters or newlines.")
    return name


def _validate_bool(value: Any, label: str) -> bool:
    if type(value) is not bool:
        raise ConfigError(f"{label} must be true or false.")
    return value


def _validate_values(name: Any, hdr: Any, steam_mode: Any) -> tuple[str, bool, bool]:
    return (
        _validate_name(name),
        _validate_bool(hdr, "HDR"),
        _validate_bool(steam_mode, "Steam mode"),
    )


class ConfigManager:
    def __init__(self, config_path: str, backup_dir: str) -> None:
        self.config_path = Path(config_path)
        self.backup_dir = Path(backup_dir)

    def read(self) -> dict[str, Any]:
        """Return the three exposed values, or raise ConfigError."""
        doc = self._parse(self._read_text())
        return self._values(doc)

    def apply(self, name: Any, hdr: Any, steam_mode: Any) -> dict[str, Any]:
        """Write only the exposed values. Return the resulting values."""
        name, hdr, steam_mode = _validate_values(name, hdr, steam_mode)
        text = self._read_text()
        doc = self._parse(text)
        self._values(doc)

        changed = (
            doc.get("name") != name
            or doc["compositor"].get("hdr") != hdr
            or doc["compositor"].get("steam_mode") != steam_mode
        )
        if not changed:
            return {
                "name": name,
                "hdr": hdr,
                "steam_mode": steam_mode,
                "changed": False,
                "backup_path": None,
            }

        original_stat = self._stat_config()
        doc["name"] = name
        doc["compositor"]["hdr"] = hdr
        doc["compositor"]["steam_mode"] = steam_mode
        new_text = tomlkit.dumps(doc)

        check = self._values(self._parse(new_text))
        if check != {"name": name, "hdr": hdr, "steam_mode": steam_mode}:
            raise ConfigError("Refusing to write: the edited TOML did not validate.")

        backup_path = self._backup(text)
        self._atomic_write(new_text, original_stat)
        return {
            "name": name,
            "hdr": hdr,
            "steam_mode": steam_mode,
            "changed": True,
            "backup_path": str(backup_path),
        }

    def _read_text(self) -> str:
        try:
            return self.config_path.read_text(encoding="utf-8")
        except FileNotFoundError:
            raise ConfigError(f"Config not found: {self.config_path}") from None
        except PermissionError:
            raise ConfigError(
                f"Permission denied reading {self.config_path}. "
                "The plugin backend must run as root."
            ) from None
        except UnicodeDecodeError:
            raise ConfigError(f"{self.config_path} is not valid UTF-8.") from None
        except OSError as exc:
            raise ConfigError(f"Could not read {self.config_path}: {exc}") from None

    def _parse(self, text: str) -> Any:
        try:
            return tomlkit.parse(text)
        except Exception as exc:
            raise ConfigError(f"Invalid TOML in {self.config_path}: {exc}") from None

    def _values(self, doc: Any) -> dict[str, Any]:
        name = doc.get("name")
        if not isinstance(name, str):
            raise ConfigError("The top-level 'name' key is missing or is not a string.")

        compositor = doc.get("compositor")
        if compositor is None or not hasattr(compositor, "get"):
            raise ConfigError("The [compositor] table is missing.")

        hdr = compositor.get("hdr")
        steam_mode = compositor.get("steam_mode")
        if type(hdr) is not bool:
            raise ConfigError("[compositor] hdr is missing or is not true/false.")
        if type(steam_mode) is not bool:
            raise ConfigError("[compositor] steam_mode is missing or is not true/false.")

        return {"name": name, "hdr": hdr, "steam_mode": steam_mode}

    def _stat_config(self) -> os.stat_result:
        try:
            return self.config_path.stat()
        except FileNotFoundError:
            raise ConfigError(f"Config not found: {self.config_path}") from None
        except PermissionError:
            raise ConfigError(
                f"Permission denied reading {self.config_path}. "
                "The plugin backend must run as root."
            ) from None
        except OSError as exc:
            raise ConfigError(f"Could not stat {self.config_path}: {exc}") from None

    def _backup(self, text: str) -> Path:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
        backup_path = self.backup_dir / f"{self.config_path.name}.{stamp}.bak"
        try:
            self.backup_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
            fd = os.open(
                backup_path,
                os.O_WRONLY | os.O_CREAT | os.O_EXCL,
                0o600,
            )
            with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
                handle.write(text)
                handle.flush()
                try:
                    os.fsync(handle.fileno())
                except OSError:
                    # The backup lives on the virtiofs games share; durability
                    # there is best-effort. The config write itself is fsynced.
                    pass
        except PermissionError:
            raise ConfigError(
                f"Permission denied writing a backup to {self.backup_dir}. "
                "The plugin backend must run as root."
            ) from None
        except OSError as exc:
            raise ConfigError(f"Could not write a backup to {self.backup_dir}: {exc}") from None

        self._prune_backups()
        return backup_path

    def _prune_backups(self) -> None:
        try:
            backups = sorted(self.backup_dir.glob(f"{self.config_path.name}.*.bak"))
            for old in backups[:-KEEP_BACKUPS]:
                old.unlink(missing_ok=True)
        except OSError:
            pass

    def _atomic_write(self, text: str, original_stat: os.stat_result) -> None:
        directory = self.config_path.parent
        tmp_path: str | None = None
        fd = -1
        try:
            fd, tmp_path = tempfile.mkstemp(
                prefix=f".{self.config_path.name}.",
                suffix=".tmp",
                dir=directory,
            )
            with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
                fd = -1
                handle.write(text)
                handle.flush()
                os.fsync(handle.fileno())

            os.chmod(tmp_path, stat.S_IMODE(original_stat.st_mode))
            try:
                os.chown(tmp_path, original_stat.st_uid, original_stat.st_gid)
            except PermissionError:
                pass

            os.replace(tmp_path, self.config_path)
            tmp_path = None

            try:
                dir_fd = os.open(directory, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
                try:
                    os.fsync(dir_fd)
                finally:
                    os.close(dir_fd)
            except OSError:
                pass
        except PermissionError:
            raise ConfigError(
                f"Permission denied writing {self.config_path}. "
                "The plugin backend must run as root."
            ) from None
        except OSError as exc:
            raise ConfigError(f"Could not write {self.config_path}: {exc}") from None
        finally:
            if fd != -1:
                os.close(fd)
            if tmp_path is not None:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass
