'use strict';
// Actual Electron window + preload + project persistence + rendered motion preview.
// Only generated fixtures are loaded; existing recordings and preferences are isolated.
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const net = require('node:net'), assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {Projects} = require('../engine/projects.cjs');
const {cleanEdits} = require('../engine/edit-plan.cjs');
const {mediaTools} = require('../engine/media-tools.cjs');
const {run, probe} = require('../engine/media.cjs');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function check() {
  const root = path.resolve(__dirname, '..'), fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'cleartake-window-'));
  let child, ws, exited = false, output = '', serial = 0;
  const pending = new Map(), exceptions = [];
  try {
    const projects = new Projects(path.join(fixture, 'projects')), project = await projects.create('Subject zoom — verification');
    const {ffmpeg, ffprobe} = mediaTools();
    await run(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=640x360:r=30:d=6',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(project.directory, 'screen.mp4')]);
    project.files.screen = 'screen.mp4'; project.duration = 6; project.state = 'ready';
    project.screenInfo = await probe(ffprobe, path.join(project.directory, 'screen.mp4'));
    project.cursorSamples = Array.from({length: 31}, (_, i) => ({t: 1 + i / 10, x: .75, y: .3}));
    project.edits = cleanEdits({zoomRegions: [{id: 'subject', start: 1, end: 5, x: .75, y: .3, zoom: 2, ease: .65}]}, 6);
    await projects.save(project);
    const server = net.createServer();
    await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
    const port = server.address().port; await new Promise(resolve => server.close(resolve));
    const env = {...process.env, CLEARTAKE_SMOKE_ROOT: fixture}; delete env.ELECTRON_RUN_AS_NODE;
    child = spawn(require('electron'), [root, `--remote-debugging-port=${port}`], {env, stdio: ['ignore', 'pipe', 'pipe']});
    child.stdout.on('data', b => { output = (output + b).slice(-20000); });
    child.stderr.on('data', b => { output = (output + b).slice(-20000); });
    child.on('error', error => { output += error.message; exited = true; });
    child.on('exit', () => { exited = true; });
    let page;
    for (let i = 0; i < 160 && !exited; i++) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/json/list`, {signal: AbortSignal.timeout(500)});
        page = (await response.json()).find(t => t.type === 'page' && t.url.startsWith('file:'));
      } catch {}
      if (page) break; await delay(200);
    }
    assert.ok(page, `No application window appeared. ${output}`);
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error('Debugger timed out')), 5000);
      ws.addEventListener('open', () => {clearTimeout(timeout); resolve();}, {once: true});
      ws.addEventListener('error', () => {clearTimeout(timeout); reject(Error('Debugger failed'));}, {once: true});
    });
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
      const entry = pending.get(message.id);
      if (entry) {pending.delete(message.id); clearTimeout(entry.timer); message.error ? entry.reject(Error(JSON.stringify(message.error))) : entry.resolve(message.result);}
    });
    function command(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++serial, timer = setTimeout(() => {pending.delete(id); reject(Error(`${method} timed out`));}, 30000);
        pending.set(id, {resolve, reject, timer}); ws.send(JSON.stringify({id, method, params}));
      });
    }
    async function evaluate(expression) {
      const result = await command('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }
    await command('Runtime.enable');
    let ready = false;
    for (let i = 0; i < 100; i++) {
      ready = await evaluate(`document.visibilityState === 'visible' && document.title === 'ClearTake' && !!document.querySelector('.project-tile')`);
      if (ready) break; await delay(100);
    }
    assert.ok(ready, 'Visible home window and generated project should be ready');
    await evaluate(`document.querySelector('.project-tile').click()`);
    for (let i = 0; i < 100; i++) {
      ready = await evaluate(`!document.getElementById('editor-view').hidden && document.getElementById('screen-video').readyState >= 2`);
      if (ready) break; await delay(100);
    }
    assert.ok(ready, 'Editor should load playable fixture media');
    async function at(t) {
      return evaluate(`(async()=>{const v=document.getElementById('screen-video');v.currentTime=${t};await new Promise(r=>v.addEventListener('seeked',r,{once:true}));document.getElementById('scrub').value=${t};document.getElementById('scrub').dispatchEvent(new Event('input'));return v.style.transform;})()`);
    }
    assert.match(await at(.2), /scale\(1\)/);
    assert.match(await at(2), /scale\(2\)/);
    const edited = await evaluate(`(async()=>{
      const p=await window.cleartake.invoke('projects:get',${JSON.stringify(project.id)});
      p.edits.zoomRegions[0].x=.8; await window.cleartake.invoke('project:save',p.id,p.edits,p.name);
      const reopened=await window.cleartake.invoke('projects:get',p.id);
      return reopened.edits.zoomRegions[0].x;
    })()`);
    assert.equal(edited, .8);
    const rendered = await evaluate(`(async()=>{const p=await window.cleartake.invoke('projects:get',${JSON.stringify(project.id)});return window.cleartake.invoke('export',p.id,p.edits,true);})()`);
    assert.ok(rendered.duration > 5.8 && rendered.url.startsWith('ctmedia://'));
    await evaluate(`document.querySelector('.motion-panel').scrollIntoView({block:'end'})`);
    const screenshot = await command('Page.captureScreenshot', {format: 'png'});
    const evidence = path.join(root, '.build', 'motion-window.png');
    await fs.mkdir(path.dirname(evidence), {recursive: true});
    await fs.writeFile(evidence, Buffer.from(screenshot.data, 'base64'));
    assert.deepEqual(exceptions, [], 'Renderer should have no unhandled exceptions');
    console.log('PASS: visible Electron window, source playback, subject zoom, persisted focus and real preview export.');
    console.log(`Screenshot: ${evidence}`);
  } finally {
    ws?.close(); for (const entry of pending.values()) clearTimeout(entry.timer);
    if (child && !exited) {
      const closed = new Promise(resolve => child.once('exit', resolve)); child.kill();
      await Promise.race([closed, delay(3000)]);
    }
    // The only recursive removal is this script's mkdtemp fixture directory.
    await fs.rm(fixture, {recursive: true, force: true});
  }
}
check().catch(error => {console.error(error); process.exitCode = 1;});
