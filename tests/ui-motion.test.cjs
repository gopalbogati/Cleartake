'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {JSDOM, VirtualConsole} = require('jsdom');
const {cleanEdits} = require('../engine/edit-plan.cjs');
const tick = () => new Promise(resolve => setTimeout(resolve, 25));

test('editor creates subject zooms, picks focus, undoes, suggests and exports persisted motion', async () => {
  const calls = [], errors = [];
  const cursorSamples = Array.from({length: 31}, (_, i) => ({t: i / 10, x: .8, y: .25}));
  const project = {id: '00000000-0000-0000-0000-000000000000', name: 'Motion fixture', state: 'ready',
    duration: 8, files: ['screen'], urls: {screen: 'ctmedia://asset/demo/screen'},
    screenInfo: {width: 320, height: 180}, edits: cleanEdits({}, 8), cursorSamples};
  const log = new VirtualConsole(); log.on('jsdomError', e => errors.push(e.message));
  const dom = new JSDOM(fs.readFileSync(path.join(__dirname, '../app/ui/index.html'), 'utf8')
    .replace('<script src="bundle.js"></script>', ''), {url: 'https://cleartake.local/', runScripts: 'outside-only', virtualConsole: log});
  const w = dom.window, $ = id => w.document.getElementById(id);
  w.ResizeObserver = class { observe() {} };
  w.HTMLCanvasElement.prototype.getContext = () => ({clearRect() {}, fillRect() {}, strokeRect() {}, fillText() {}});
  w.HTMLMediaElement.prototype.pause = function () {};
  w.HTMLMediaElement.prototype.play = () => Promise.resolve();
  w.HTMLMediaElement.prototype.load = function () {};
  w.cleartake = {onProgress() {}, invoke: async (name, ...args) => {
    calls.push([name, ...args]);
    if (name === 'projects:list' || name === 'waveform') return [];
    if (name === 'project:import' || name === 'project:save') return project;
    if (name === 'export') return {path: '/tmp/motion.mp4'};
    throw Error(name);
  }};
  Object.defineProperty(w.navigator, 'mediaDevices', {value: {enumerateDevices: async () => []}});
  const click = async id => { assert.ok($(id), `Missing UI control: ${id}`); $(id).click(); await tick(); };
  try {
    w.eval(fs.readFileSync(path.join(__dirname, '../app/ui/bundle.js'), 'utf8'));
    await tick(); await click('import-video');
    $('range-start').value = 4; $('range-end').value = 7;
    await click('zoom-add');
    assert.equal($('zoom-list').children.length, 1);
    await click('zoom-pick');
    $('screen-frame').getBoundingClientRect = () => ({left: 0, top: 0, width: 320, height: 180});
    $('screen-frame').dispatchEvent(new w.MouseEvent('click', {clientX: 256, clientY: 45, bubbles: true}));
    await click('export');
    let regions = calls.filter(c => c[0] === 'export').at(-1)[2].zoomRegions;
    assert.equal(regions[0].x, .8); assert.equal(regions[0].y, .25);
    await click('undo'); await click('export');
    assert.equal(calls.filter(c => c[0] === 'export').at(-1)[2].zoomRegions[0].x, .5);
    await click('redo'); await click('zoom-suggest'); await click('export');
    regions = calls.filter(c => c[0] === 'export').at(-1)[2].zoomRegions;
    assert.equal(regions.length, 2);
    assert.equal(regions[0].source, 'auto'); assert.equal(regions[1].source, 'manual');
    await click('zoom-suggest'); await click('export');
    assert.equal(calls.filter(c => c[0] === 'export').at(-1)[2].zoomRegions.length, 2, 'Suggestions must not accumulate on repeated clicks');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
