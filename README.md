# Moonshine Decky

A Decky Loader plugin for `steam-bootc` that exposes three safe Moonshine
settings in the Steam Game Mode Quick Access menu:

- `name` (top-level server name)
- `[compositor] hdr`
- `[compositor] steam_mode`

The plugin reads and writes
`/usr/share/steam-session/moonshine/config.toml`. It never exposes arbitrary
TOML editing or shell execution.

## Privilege

Decky's `plugin_loader` service runs as root, but plugin backends are dropped
to the unprivileged user unless `plugin.json` declares the `root` flag. This
plugin declares it, because `/usr/share` and
`systemctl restart moonshine@steam.service` require root.

## Install

Build the frontend and the installable ZIP:

```sh
pnpm install
pnpm run build
./build.sh
```

The ZIP is `build/moonshine-decky-v0.1.0.zip`; tagged releases publish it as
`moonshine-decky-<version>.zip`.

Install it with Decky's plugin installer (Developer mode), or copy its
`moonshine-decky/` directory into the guest's Decky plugin home:

```sh
# in the guest, as steam
cp -r moonshine-decky ~/homebrew/plugins/
sudo systemctl restart plugin_loader
```

`~/homebrew` is on the games share, so the plugin survives image updates.

## Usage

Open the Quick Access menu, then Decky, then **Moonshine Config**.

- **Server name** is the name Moonlight shows for this host.
- **HDR** allows HDR10 streams when the client requests them and the content
  is HDR.
- **Steam mode**:
  - **On** keeps Steam-controlled focus and overlay behavior.
  - **Off** allows external windows, such as Unifideck's Edge auth
    browser, to take focus.

**Apply** writes the config and does not restart Moonshine. The panel shows
the saved values and the config path. Press **Restart Moonshine** to make a
saved change take effect.

> **Restarting Moonshine disconnects the current Moonlight client.** Only do
> it when nobody is streaming.

Apply and restart failures (missing config, permission denied, invalid TOML,
systemd errors) are shown in the panel.

## Safety

- Only `name`, `[compositor] hdr` and `[compositor] steam_mode` are changed.
- `tomlkit` is vendored, so comments and unrelated keys are preserved.
- The edited TOML is parsed and type-checked before anything is written.
- The original file is copied to
  `/var/mnt/games/.moonshine/config-backups/` before each write, keeping the
  last 20 backups. Backups are root-owned on the host.
- The replacement is written to a temporary file in the same directory and
  installed with an atomic rename, preserving the original mode and owner.
- Apply is idempotent: an unchanged file is not rewritten and no backup is
  created.
- Restart uses a fixed `systemctl restart moonshine@steam.service` command,
  never shell interpolation.

## Image updates

The guest boots a flat ext4 rootfs built from the container image. `/usr` is
writable at runtime, but an image rebuild replaces the whole rootfs, including
`/usr/share/steam-session/moonshine/config.toml`. **Plugin changes are
therefore lost on an image update.** The plugin itself and its backups remain,
because they live on the games share.

After booting a new image, open the plugin and press **Apply** again to restore
your values. To restore a backup instead, from an SSH session as `steam`
(passwordless sudo is enabled):

```sh
sudo cp /var/mnt/games/.moonshine/config-backups/config.toml.<stamp>.bak \
  /usr/share/steam-session/moonshine/config.toml
sudo systemctl restart moonshine@steam.service
```

## Tests

```sh
python3 -m unittest discover -s tests -v
```

The tests cover reading, writing only the exposed keys, comment preservation,
invalid input and TOML, missing files, idempotent apply, and backup
creation/content.

## License

MIT. The vendored `tomlkit` is MIT; its license is at
`py_modules/tomlkit/LICENSE`.
