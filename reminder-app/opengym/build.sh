#!/usr/bin/env bash
# Builds the Open Gym section's web bundle into the app's assets.
#
# Fetches openGym (https://github.com/DuarteSantos8/openGym, AGPL-3.0-or-later) at the pinned
# commit below, applies opengym.patch, builds its phone flavour (VITE_MOBILE=1: no backend,
# everything stays on the device) and copies the result to app/src/main/assets/opengym/, where
# OpenGymActivity serves it to a WebView. Run by Gradle before every build (see
# app/build.gradle.kts, task buildOpenGym); needs git, Node 22+ and npm.
#
# The exercise stills and animations (catalogue/media) are licensed to openGym by Gym visual
# for use inside openGym only (see upstream NOTICE.md), so they are deliberately neither
# fetched nor bundled: the sparse checkout below never downloads them.
set -euo pipefail

OPENGYM_REPO="https://github.com/DuarteSantos8/openGym"
OPENGYM_COMMIT="4171d3cefa946cfa032b0b28f74cea85a2e28a7b"   # v1.4.4+, 2026-11-09

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HERE/../app/src/main/assets/opengym"
WORK="${OPENGYM_WORK:-$HERE/../app/build/opengym-src}"

for tool in git node npm; do
  command -v "$tool" >/dev/null || { echo "buildOpenGym: '$tool' is required to build the Open Gym section (see reminder-app/opengym/README.md)" >&2; exit 1; }
done

rm -rf "$WORK"
mkdir -p "$WORK"
cd "$WORK"
git init -q
git remote add origin "$OPENGYM_REPO"
git sparse-checkout set frontend api/coach
git fetch -q --depth 1 --filter=blob:none origin "$OPENGYM_COMMIT"
git checkout -q FETCH_HEAD
git apply "$HERE/opengym.patch"

cd frontend
npm ci --no-audit --no-fund
VITE_MOBILE=1 APP_BUILD=reminders npx vite build

rm -rf "$OUT"
mkdir -p "$OUT"
cp -R dist/. "$OUT/"
# No service worker in a WebView served from assets, and nothing to install.
rm -f "$OUT/sw.js" "$OUT/manifest.json"
cp "$HERE/host-bridge.js" "$OUT/host-bridge.js"
# The bridge has to run before the app boots: first script in <head>.
node -e '
  const fs = require("fs"), f = process.argv[1]
  const html = fs.readFileSync(f, "utf8")
  if (!html.includes("<head>")) throw new Error("index.html has no <head> to put the host bridge in")
  fs.writeFileSync(f, html.replace("<head>", "<head>\n    <script src=\"./host-bridge.js\"></script>"))
' "$OUT/index.html"
# AGPL: the licence and third-party notices travel with the bundle, with where its source is.
cp "$WORK/LICENSE" "$OUT/LICENSE.txt"
cp "$WORK/NOTICE.md" "$OUT/NOTICE.md"
cat > "$OUT/SOURCE.txt" <<EOF
openGym, Copyright (C) 2026 Duarte Santos, GNU AGPL v3.0 or later.
Built from $OPENGYM_REPO at commit $OPENGYM_COMMIT
with the changes in reminder-app/opengym/opengym.patch of
https://github.com/rohankhullar24-oss/product-with-rohan (the complete corresponding source).
The exercise media are not included.
EOF
echo "buildOpenGym: bundle written to $OUT"
