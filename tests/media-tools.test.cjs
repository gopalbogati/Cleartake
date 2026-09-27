'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
test('an Intel binary in an arm64 directory is rejected and a native development fallback works', () => {
  const {resolveMediaTool} = require('../engine/media-tools.cjs');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cleartake-tools-'));
  try {
    const wrong = path.join(directory, 'arm64-ffprobe'), native = path.join(directory, 'native-ffprobe');
    const header = cpu => {const b = Buffer.alloc(32); b.writeUInt32LE(0xfeedfacf); b.writeUInt32LE(cpu, 4); return b;};
    fs.writeFileSync(wrong, header(0x01000007)); fs.writeFileSync(native, header(0x0100000c));
    const options = {name: 'ffprobe', bundled: wrong, platform: 'darwin', arch: 'arm64', fallbacks: [native]};
    assert.equal(resolveMediaTool({...options, packaged: false}), native);
    assert.throws(() => resolveMediaTool({...options, packaged: true}), /Apple Silicon/);
    assert.equal(resolveMediaTool({...options, bundled: native, packaged: true}), native);
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});
