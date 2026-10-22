#!/bin/sh
# Build the Decky-installable ZIP from the already-built frontend.
set -eu
cd "$(dirname "$0")"

[ -f dist/index.js ] || {
    echo "build.sh: dist/index.js is missing; run 'pnpm install && pnpm run build' first" >&2
    exit 1
}

version=$(python3 -c 'import json; print(json.load(open("package.json"))["version"])')
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT

mkdir -p "$stage/moonshine-decky"
cp -a plugin.json package.json main.py README.md LICENSE \
    dist py_modules "$stage/moonshine-decky/"
find "$stage" -name __pycache__ -type d -prune -exec rm -rf {} +
find "$stage" -name '*.pyc' -delete

mkdir -p build
out="$PWD/build/moonshine-decky-v${version}.zip"
rm -f "$out"
(cd "$stage" && zip -qr "$out" moonshine-decky)
echo "$out"
