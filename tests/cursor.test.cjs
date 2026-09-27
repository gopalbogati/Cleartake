'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
test('display cursor coordinates handle negative origins and omit paused/outside samples', () => {
  const {CursorCapture} = require('../engine/cursor-capture.cjs');
  let now = 1000, point = {x: -800, y: 450};
  const capture = new CursorCapture({bounds: {x: -1600, y: 0, width: 1600, height: 900}, now: () => now, point: () => point});
  capture.start(); now = 1500; capture.sample();
  assert.deepEqual(capture.samples, [{t: .5, x: .5, y: .5}]);
  capture.setPaused(true); now = 4500; capture.sample();
  assert.equal(capture.samples.length, 1);
  capture.setPaused(false); now = 5000; capture.sample();
  assert.equal(capture.samples[1].t, 1);
  point = {x: 100, y: 100}; now = 5200; capture.sample();
  assert.equal(capture.samples.length, 2);
  capture.stop(); now = 6000; capture.sample(); assert.equal(capture.samples.length, 2);
});
test('a stalled sampler or leaving the display breaks dwell inference', () => {
  const {suggestZooms} = require('../engine/motion.cjs');
  assert.deepEqual(suggestZooms([{t: 0, x: .5, y: .5}, {t: 10, x: .5, y: .5}], 12), []);
});
