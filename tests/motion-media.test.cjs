'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const {execFileSync} = require('node:child_process');
const {run, probe, exportVideo} = require('../engine/media.cjs');
const {cleanEdits} = require('../engine/edit-plan.cjs');
const {motionAt} = require('../engine/motion.cjs');
const tools = require('../engine/media-tools.cjs').mediaTools();
const ffmpeg = process.env.TEST_FFMPEG || tools.ffmpeg;
const ffprobe = process.env.TEST_FFPROBE || tools.ffprobe;

test('rendered subject zoom follows source time through a cut and speed change', {timeout: 120000}, async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cleartake-motion-'));
  try {
    const source = path.join(directory, 'screen.mp4');
    await run(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'color=red:s=320x180:r=30:d=6',
      '-vf', 'drawbox=x=160:y=0:w=160:h=180:color=blue:t=fill', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', source]);
    const output = path.join(directory, 'motion.mp4');
    const project = {directory, files: {screen: 'screen.mp4'}, duration: 6, screenInfo: await probe(ffprobe, source)};
    await exportVideo({project, ffmpeg, ffprobe, output, draft: true, edits: {
      padding: 0, speed: 2, ranges: [{start: 1, end: 2, action: 'cut'}],
      zoomRegions: [{start: 2, end: 5, x: .75, y: .5, zoom: 2, ease: .5}],
    }});
    const metadata = await probe(ffprobe, output);
    assert.ok(Math.abs(metadata.duration - 2.5) < .1);
    function pixel(time) {
      const frame = execFileSync(ffmpeg, ['-v', 'error', '-ss', String(time), '-i', output,
        '-frames:v', '1', '-vf', 'scale=32:18', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1']);
      const index = (9 * 32 + 8) * 3;
      return [...frame.subarray(index, index + 3)];
    }
    const before = pixel(.1), focused = pixel(1), after = pixel(2.4);
    assert.ok(before[0] > 200 && before[2] < 40, `Expected red before zoom: ${before}`);
    assert.ok(focused[2] > 200 && focused[0] < 40, `Expected blue subject at source 3s: ${focused}`);
    assert.ok(after[0] > 200 && after[2] < 40, `Expected red after zoom: ${after}`);
    // Check the moving red/blue boundary in actual encoded frames, rather than
    // checking only the camera formula or the fully zoomed endpoints.
    const cleaned = cleanEdits({speed: 2, zoomRegions: [{start: 2, end: 5, x: .75, y: .5, zoom: 2, ease: .5}]}, 6);
    for (const frameIndex of [17, 18, 19, 20, 21]) {
      const outputTime = frameIndex / 30, sourceTime = 2 + (frameIndex - 15) * 2 / 30;
      const frame = execFileSync(ffmpeg, ['-v', 'error', '-ss', String(outputTime), '-i', output,
        '-frames:v', '1', '-vf', 'scale=320:180', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1']);
      let boundary = 320;
      for (let x = 0; x < 320; x++) {
        const offset = (90 * 320 + x) * 3;
        if (frame[offset + 2] > frame[offset]) { boundary = x; break; }
      }
      const motion = motionAt(cleaned, sourceTime), expected = Math.max(0, (.5 - motion.left) * motion.zoom * 320);
      assert.ok(Math.abs(boundary - expected) < 3, `Encoded transition frame ${frameIndex}: boundary ${boundary}, expected ${expected}`);
    }
  } finally { await fs.rm(directory, {recursive: true, force: true}); }
});
