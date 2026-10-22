const manifest = {"name":"Moonshine Config"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api;
try {
    api = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
}
const callable = api.callable;
const toaster = api.toaster;
const definePlugin = (fn) => {
    return (...args) => {
        return fn(...args);
    };
};

var DefaultContext = {
  color: undefined,
  size: undefined,
  className: undefined,
  style: undefined,
  attr: undefined
};
var IconContext = SP_REACT.createContext && /*#__PURE__*/SP_REACT.createContext(DefaultContext);

var _excluded = ["attr", "size", "title"];
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), true).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function Tree2Element(tree) {
  return tree && tree.map((node, i) => /*#__PURE__*/SP_REACT.createElement(node.tag, _objectSpread({
    key: i
  }, node.attr), Tree2Element(node.child)));
}
function GenIcon(data) {
  return props => /*#__PURE__*/SP_REACT.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}
function IconBase(props) {
  var elem = conf => {
    var attr = props.attr,
      size = props.size,
      title = props.title,
      svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;
    return /*#__PURE__*/SP_REACT.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className: className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /*#__PURE__*/SP_REACT.createElement("title", null, title), props.children);
  };
  return IconContext !== undefined ? /*#__PURE__*/SP_REACT.createElement(IconContext.Consumer, null, conf => elem(conf)) : elem(DefaultContext);
}

// THIS FILE IS AUTO GENERATED
function FaMoon (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M283.211 512c78.962 0 151.079-35.925 198.857-94.792 7.068-8.708-.639-21.43-11.562-19.35-124.203 23.654-238.262-71.576-238.262-196.954 0-72.222 38.662-138.635 101.498-174.394 9.686-5.512 7.25-20.197-3.756-22.23A258.156 258.156 0 0 0 283.211 0c-141.309 0-256 114.511-256 256 0 141.309 114.511 256 256 256z"},"child":[]}]})(props);
}

const DEFAULT_PATH = "/usr/share/steam-session/moonshine/config.toml";
const getConfig = callable("get_config");
const applyConfig = callable("apply_config");
const restartMoonshine = callable("restart_moonshine");
const errorStyle = {
    color: "#ff8a80",
    fontSize: "13px",
    lineHeight: 1.4,
    whiteSpace: "pre-wrap",
};
const warningStyle = {
    color: "#ffb74d",
    fontSize: "13px",
    lineHeight: 1.4,
};
const detailStyle = {
    fontSize: "12px",
    opacity: 0.8,
    wordBreak: "break-all",
};
const noticeStyle = {
    color: "#9ccc65",
    fontSize: "13px",
    lineHeight: 1.4,
    whiteSpace: "pre-wrap",
};
function Content() {
    const [config, setConfig] = SP_REACT.useState(null);
    const [name, setName] = SP_REACT.useState("");
    const [hdr, setHdr] = SP_REACT.useState(false);
    const [steamMode, setSteamMode] = SP_REACT.useState(false);
    const [busy, setBusy] = SP_REACT.useState(false);
    const [error, setError] = SP_REACT.useState(null);
    const [notice, setNotice] = SP_REACT.useState(null);
    const acceptLoaded = (result) => {
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
        }
        catch (exc) {
            setError(`Could not read Moonshine's config: ${String(exc)}`);
        }
        finally {
            setBusy(false);
        }
    };
    SP_REACT.useEffect(() => {
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
                setNotice(result.changed && result.backup_path
                    ? `${message}\nBackup: ${result.backup_path}`
                    : message);
                toaster.toast({ title: "Moonshine Config", body: message });
            }
            else {
                setError(result.error ?? "Could not write the config.");
            }
        }
        catch (exc) {
            setError(`Could not write the config: ${String(exc)}`);
        }
        finally {
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
                setConfig((current) => current ? { ...current, service_state: result.service_state } : current);
                const message = result.message ?? "Moonshine restarted.";
                setNotice(`${message} Service is ${result.service_state ?? "unknown"}.`);
                toaster.toast({ title: "Moonshine Config", body: message });
            }
            else {
                setError(result.error ?? "Could not restart Moonshine.");
            }
        }
        catch (exc) {
            setError(`Could not restart Moonshine: ${String(exc)}`);
        }
        finally {
            setBusy(false);
        }
    };
    const loaded = config?.ok === true;
    const configPath = config?.config_path ?? DEFAULT_PATH;
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [!loaded && busy && SP_JSX.jsx(DFL.PanelSection, { title: "Moonshine", spinner: true }), error && (SP_JSX.jsxs(DFL.PanelSection, { title: "Error", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: errorStyle, children: error }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => void refresh(), disabled: busy, children: "Reload" }) })] })), loaded && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(DFL.PanelSection, { title: "Moonshine server", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.TextField, { label: "Server name", description: "The name Moonlight shows for this host.", value: name, onChange: (event) => {
                                        setName(event.target.value);
                                        setNotice(null);
                                    } }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "HDR", description: "Allow HDR10 streams when the client asks for them and the content is HDR.", checked: hdr, onChange: (value) => {
                                        setHdr(value);
                                        setNotice(null);
                                    } }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "Steam mode", description: "On: Steam controls focus and overlay behavior. " +
                                        "Off: external windows such as Unifideck's Edge auth browser can take focus.", checked: steamMode, onChange: (value) => {
                                        setSteamMode(value);
                                        setNotice(null);
                                    } }) })] }), SP_JSX.jsxs(DFL.PanelSection, { title: "Saved values", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: detailStyle, children: ["name = ", JSON.stringify(config?.name), "; hdr = ", String(config?.hdr), "; steam_mode =", " ", String(config?.steam_mode)] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: detailStyle, children: ["Config: ", configPath] }) }), config?.backup_dir && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: detailStyle, children: ["Backups: ", config.backup_dir] }) }))] }), SP_JSX.jsxs(DFL.PanelSection, { title: "Apply", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: detailStyle, children: "Apply writes the file only. Moonshine keeps using its current settings until you restart it." }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => void apply(), disabled: busy, children: "Apply" }) }), notice && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: noticeStyle, children: notice }) }))] })] })), loaded && (SP_JSX.jsxs(DFL.PanelSection, { title: "Restart Moonshine", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: warningStyle, children: "Restarting Moonshine disconnects the current Moonlight client. Only do this when nobody is streaming." }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => void restart(), disabled: busy, children: "Restart Moonshine" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: detailStyle, children: ["Service: moonshine@steam.service (", config?.service_state ?? "unknown", ")"] }) })] }))] }));
}
var index = definePlugin(() => ({
    name: "Moonshine Config",
    titleView: SP_JSX.jsx("div", { className: DFL.staticClasses.Title, children: "Moonshine Config" }),
    content: SP_JSX.jsx(Content, {}),
    icon: SP_JSX.jsx(FaMoon, {}),
    onDismount() { },
}));

export { index as default };
//# sourceMappingURL=index.js.map
