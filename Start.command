#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v npm >/dev/null; then echo 'Install Node first: brew install node@22'; exit 1; fi
if [[ ! -d node_modules ]]; then npm ci --ignore-scripts --no-audit --no-fund; fi
node node_modules/ffmpeg-static/install.js
node node_modules/electron/install.js
npm start
