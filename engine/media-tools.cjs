'use strict';
const fs = require('node:fs'), path = require('node:path');

function nativeMacBinary(file, arch) {
  const fd = fs.openSync(file, 'r');
  try {
    const header = Buffer.alloc(4096), count = fs.readSync(fd, header, 0, header.length, 0);
    if (count < 8) return false;
    const cpu = arch === 'arm64' ? 0x0100000c : 0x01000007;
    if (header.readUInt32LE(0) === 0xfeedfacf) return header.readUInt32LE(4) === cpu;
    const magic = header.readUInt32BE(0);
    if (magic === 0xcafebabe || magic === 0xcafebabf) {
      const stride = magic === 0xcafebabf ? 32 : 20;
      const entries = header.readUInt32BE(4);
      for (let i = 0; i < entries && 8 + (i + 1) * stride <= count; i++) {
        if (header.readUInt32BE(8 + i * stride) === cpu) return true;
      }
    }
    return false;
  } finally { fs.closeSync(fd); }
}

function resolveMediaTool({name, bundled, packaged = false, platform = process.platform, arch = process.arch, fallbacks = []}) {
  for (const candidate of [bundled, ...(packaged ? [] : fallbacks)]) {
    try {
      if (!fs.statSync(candidate).isFile()) continue;
      if (platform === 'darwin' && !nativeMacBinary(candidate, arch)) continue;
      return candidate;
    } catch { /* Try the next explicit development tool path. */ }
  }
  throw Error(`${name} is missing or incompatible with ${platform === 'darwin' && arch === 'arm64' ? 'Apple Silicon' : arch}. Build native media tools with scripts/build-media.sh and scripts/install-built-media.cjs before packaging. Development can also use a native Homebrew FFmpeg installation.`);
}

function mediaTools({packaged = false, root = path.join(__dirname, '..')} = {}) {
  const unpack = file => packaged ? file.replace(/app\.asar([/\\])/, 'app.asar.unpacked$1') : file;
  return Object.fromEntries(['ffmpeg', 'ffprobe'].map(name => [name, resolveMediaTool({
    name, packaged, bundled: unpack(name === 'ffmpeg' ? require('ffmpeg-static') : require('ffprobe-static').path),
    fallbacks: [path.join(root, '.build', 'media', 'prefix', 'bin', name), `/opt/homebrew/bin/${name}`, `/usr/local/bin/${name}`],
  })]));
}
module.exports = {resolveMediaTool, mediaTools};
