import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  TextField,
  ToggleField,
  staticClasses,
} from "@decky/ui";
import { callable, definePlugin, toaster } from "@decky/api";
import { useEffect, useState } from "react";
import { FaMoon } from "react-icons/fa";

type ConfigResult = {
  ok: boolean;
  config_path: string;
  backup_dir?: string;
  name?: string;
  hdr?: boolean;
  steam_mode?: boolean;
  changed?: boolean;
  backup_path?: string | null;
  service_state?: string;
  message?: string;
  error?: string;
};

const DEFAULT_PATH = "/usr/share/steam-session/moonshine/config.toml";

const getConfig = callable<[], ConfigResult>("get_config");
const applyConfig = callable<[name: string, hdr: boolean, steam_mode: boolean], ConfigResult>(
  "apply_config",
);
const restartMoonshine = callable<[], ConfigResult>("restart_moonshine");

const errorStyle = {
  color: "#ff8a80",
  fontSize: "13px",
  lineHeight: 1.4,
  whiteSpace: "pre-wrap" as const,
};

const warningStyle = {
  color: "#ffb74d",
  fontSize: "13px",
  lineHeight: 1.4,
};

const detailStyle = {
  fontSize: "12px",
  opacity: 0.8,
  wordBreak: "break-all" as const,
};

const noticeStyle = {
  color: "#9ccc65",
  fontSize: "13px",
  lineHeight: 1.4,
  whiteSpace: "pre-wrap" as const,
};

function Content() {
  const [config, setConfig] = useState<ConfigResult | null>(null);
  const [name, setName] = useState("");
  const [hdr, setHdr] = useState(false);
  const [steamMode, setSteamMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const acceptLoaded = (result: ConfigResult) => {
    setConfig(result);
    if (result.ok) {
      setName(result.name ?? "");
      setHdr(result.hdr ?? false);
      setSteamMode(result.steam_mode ?? false);
    }
  };

  const refresh = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await getConfig();
      acceptLoaded(result);
      if (!result.ok) {
        setError(result.error ?? "Could not read Moonshine's config.");
      }
    } catch (exc) {
      setError(`Could not read Moonshine's config: ${String(exc)}`);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void refresh();
    // The config is loaded once when the Quick Access panel mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await applyConfig(name, hdr, steamMode);
      if (result.ok) {
        acceptLoaded(result);
        const message = result.changed
          ? "Saved. Restart Moonshine to use the new settings."
          : "No changes to save.";
        setNotice(
          result.changed && result.backup_path
            ? `${message}\nBackup: ${result.backup_path}`
            : message,
        );
        toaster.toast({ title: "Moonshine Config", body: message });
      } else {
        setError(result.error ?? "Could not write the config.");
      }
    } catch (exc) {
      setError(`Could not write the config: ${String(exc)}`);
    } finally {
      setBusy(false);
    }
  };

  const restart = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await restartMoonshine();
      if (result.ok) {
        setConfig((current) =>
          current ? { ...current, service_state: result.service_state } : current,
        );
        const message = result.message ?? "Moonshine restarted.";
        setNotice(`${message} Service is ${result.service_state ?? "unknown"}.`);
        toaster.toast({ title: "Moonshine Config", body: message });
      } else {
        setError(result.error ?? "Could not restart Moonshine.");
      }
    } catch (exc) {
      setError(`Could not restart Moonshine: ${String(exc)}`);
    } finally {
      setBusy(false);
    }
  };

  const loaded = config?.ok === true;
  const configPath = config?.config_path ?? DEFAULT_PATH;

  return (
    <>
      {!loaded && busy && <PanelSection title="Moonshine" spinner />}

      {error && (
        <PanelSection title="Error">
          <PanelSectionRow>
            <div style={errorStyle}>{error}</div>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={() => void refresh()} disabled={busy}>
              Reload
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      )}

      {loaded && (
        <>
          <PanelSection title="Moonshine server">
            <PanelSectionRow>
              <TextField
                label="Server name"
                description="The name Moonlight shows for this host."
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setNotice(null);
                }}
              />
            </PanelSectionRow>
            <PanelSectionRow>
              <ToggleField
                label="HDR"
                description="Allow HDR10 streams when the client asks for them and the content is HDR."
                checked={hdr}
                onChange={(value) => {
                  setHdr(value);
                  setNotice(null);
                }}
              />
            </PanelSectionRow>
            <PanelSectionRow>
              <ToggleField
                label="Steam mode"
                description={
                  "On: Steam controls focus and overlay behavior. " +
                  "Off: external windows such as Unifideck's Edge auth browser can take focus."
                }
                checked={steamMode}
                onChange={(value) => {
                  setSteamMode(value);
                  setNotice(null);
                }}
              />
            </PanelSectionRow>
          </PanelSection>

          <PanelSection title="Saved values">
            <PanelSectionRow>
              <div style={detailStyle}>
                name = {JSON.stringify(config?.name)}; hdr = {String(config?.hdr)}; steam_mode ={" "}
                {String(config?.steam_mode)}
              </div>
            </PanelSectionRow>
            <PanelSectionRow>
              <div style={detailStyle}>Config: {configPath}</div>
            </PanelSectionRow>
            {config?.backup_dir && (
              <PanelSectionRow>
                <div style={detailStyle}>Backups: {config.backup_dir}</div>
              </PanelSectionRow>
            )}
          </PanelSection>

          <PanelSection title="Apply">
            <PanelSectionRow>
              <div style={detailStyle}>
                Apply writes the file only. Moonshine keeps using its current settings until you
                restart it.
              </div>
            </PanelSectionRow>
            <PanelSectionRow>
              <ButtonItem layout="below" onClick={() => void apply()} disabled={busy}>
                Apply
              </ButtonItem>
            </PanelSectionRow>
            {notice && (
              <PanelSectionRow>
                <div style={noticeStyle}>{notice}</div>
              </PanelSectionRow>
            )}
          </PanelSection>
        </>
      )}

      {loaded && (
        <PanelSection title="Restart Moonshine">
          <PanelSectionRow>
            <div style={warningStyle}>
              Restarting Moonshine disconnects the current Moonlight client. Only do this when
              nobody is streaming.
            </div>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={() => void restart()} disabled={busy}>
              Restart Moonshine
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <div style={detailStyle}>
              Service: moonshine@steam.service ({config?.service_state ?? "unknown"})
            </div>
          </PanelSectionRow>
        </PanelSection>
      )}
    </>
  );
}

export default definePlugin(() => ({
  name: "Moonshine Config",
  titleView: <div className={staticClasses.Title}>Moonshine Config</div>,
  content: <Content />,
  icon: <FaMoon />,
  onDismount() {},
}));
