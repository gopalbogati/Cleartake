#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/opt/python@3.12/libexec/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
if [[ "$(uname -s)" != Darwin || "$(uname -m)" != arm64 ]]; then
  echo 'This build is for an Apple Silicon Mac (M1 or newer). Run it on your Mac or use the included GitHub Actions workflow.'; exit 1
fi
for program in node npm python3.12; do
  if ! command -v "$program" >/dev/null; then
    echo "Missing $program. Install the build tools with: brew install node@22 python@3.12"; exit 1
  fi
done
node -e 'if(Number(process.versions.node.split(".")[0])<22)throw Error("Node 22 or later is required")'
mkdir -p .build
npm ci --ignore-scripts --no-audit --no-fund
if [[ -f .build/media/prefix/bin/ffmpeg ]]; then
  node scripts/install-built-media.cjs
else
  node node_modules/ffmpeg-static/install.js
fi
node node_modules/electron/install.js
npm run build
python3.12 -m venv .build/venv
.build/venv/bin/python3 -m pip install --upgrade pip
.build/venv/bin/python3 -m pip install -r engine/requirements.txt 'pyinstaller==6.16.0'
.build/venv/bin/python3 engine/audio_scan.py setup --model .build/yamnet
.build/venv/bin/python3 -m PyInstaller --noconfirm --clean --onedir --name cleartake-sound \
  --distpath .build/sound-dist --workpath .build/sound-work --specpath .build \
  --collect-all tensorflow_hub --collect-all tf_keras --collect-all pkg_resources \
  --copy-metadata tensorflow --copy-metadata tensorflow-hub --copy-metadata tf-keras \
  --copy-metadata setuptools --hidden-import pkg_resources.extern \
  engine/audio_scan.py
node scripts/collect-notices.cjs
TEST_FFMPEG="$(node -p 'require("ffmpeg-static")')" TEST_FFPROBE="$(node -p 'require("ffprobe-static").path')" npm test
.build/venv/bin/python3 tests/sound_test.py
node scripts/check-runtime.cjs .build/sound-dist/cleartake-sound/cleartake-sound .build/yamnet
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac
node scripts/check-runtime.cjs release/mac-arm64/ClearTake.app/Contents/Resources/sound-runtime/cleartake-sound release/mac-arm64/ClearTake.app/Contents/Resources/sound-model
for dmg in release/ClearTake-Mac-*-arm64.dmg; do
  hdiutil verify "$dmg"
  shasum -a 256 "$dmg" > "$dmg.sha256"
  echo "Built: $PWD/$dmg"
done
for archive in release/ClearTake-Mac-*-arm64.zip; do
  unzip -tq "$archive"
  shasum -a 256 "$archive" > "$archive.sha256"
done
echo 'This development build is ad-hoc signed, not Apple-notarized. Test microphone, screen capture, webcam, playback and export on your Mac before distributing it.'
