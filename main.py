import asyncio
import os
from typing import Any

import decky

from moonshine_config import ConfigError, ConfigManager

CONFIG_PATH = os.environ.get(
    "MOONSHINE_CONFIG_PATH",
    "/usr/share/steam-session/moonshine/config.toml",
)
BACKUP_DIR = os.environ.get(
    "MOONSHINE_BACKUP_DIR",
    "/var/mnt/games/.moonshine/config-backups",
)
UNIT = os.environ.get("MOONSHINE_UNIT", "moonshine@steam.service")


def _base_result() -> dict[str, Any]:
    return {"config_path": CONFIG_PATH, "backup_dir": BACKUP_DIR}


def _error(exc: Exception) -> dict[str, Any]:
    result = _base_result()
    result.update(ok=False, error=str(exc))
    return result


async def _service_state() -> str:
    try:
        proc = await asyncio.create_subprocess_exec(
            "systemctl",
            "is-active",
            UNIT,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=5)
        return stdout.decode("utf-8", "replace").strip() or "unknown"
    except Exception:
        return "unknown"


class Plugin:
    async def get_config(self) -> dict[str, Any]:
        try:
            values = ConfigManager(CONFIG_PATH, BACKUP_DIR).read()
            result = _base_result()
            result.update(ok=True, service_state=await _service_state(), **values)
            return result
        except ConfigError as exc:
            result = _error(exc)
            result["service_state"] = await _service_state()
            return result
        except Exception as exc:
            decky.logger.exception("Unexpected error reading Moonshine config")
            return _error(exc)

    async def apply_config(
        self,
        name: str,
        hdr: bool,
        steam_mode: bool,
    ) -> dict[str, Any]:
        try:
            values = ConfigManager(CONFIG_PATH, BACKUP_DIR).apply(name, hdr, steam_mode)
            result = _base_result()
            result.update(ok=True, service_state=await _service_state(), **values)
            return result
        except ConfigError as exc:
            return _error(exc)
        except Exception as exc:
            decky.logger.exception("Unexpected error writing Moonshine config")
            return _error(exc)

    async def restart_moonshine(self) -> dict[str, Any]:
        proc: asyncio.subprocess.Process | None = None
        try:
            proc = await asyncio.create_subprocess_exec(
                "systemctl",
                "restart",
                UNIT,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
        except FileNotFoundError:
            return _error(ConfigError("systemctl was not found in the guest image."))
        except asyncio.TimeoutError:
            if proc is not None and proc.returncode is None:
                proc.kill()
                await proc.wait()
            return _error(ConfigError("Restarting Moonshine timed out after 30 seconds."))
        except Exception as exc:
            decky.logger.exception("Unexpected error restarting Moonshine")
            return _error(exc)

        if proc.returncode != 0:
            detail = stderr.decode("utf-8", "replace").strip()
            if not detail:
                detail = stdout.decode("utf-8", "replace").strip()
            message = f"Restart failed (exit {proc.returncode})"
            if detail:
                message = f"{message}: {detail}"
            return _error(ConfigError(message))

        result = _base_result()
        result.update(
            ok=True,
            service_state=await _service_state(),
            message="Moonshine restarted.",
        )
        return result

    async def _main(self) -> None:
        decky.logger.info(
            "Moonshine Config loaded: config=%s backups=%s unit=%s",
            CONFIG_PATH,
            BACKUP_DIR,
            UNIT,
        )

    async def _unload(self) -> None:
        pass
