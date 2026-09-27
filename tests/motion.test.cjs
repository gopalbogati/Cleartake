'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {cleanEdits} = require('../engine/edit-plan.cjs');

test('zoom regions survive project cleaning with bounded focus and transition settings', () => {
  const edits = cleanEdits({zoomRegions: [
    {id: 'focus', start: 1, end: 5, x: .8, y: .2, zoom: 2.4, ease: .6},
    {id: 'bad', start: 7, end: 3},
    {id: 'edge', start: 8, end: 99, x: 9, y: -2, zoom: 99}
  ]}, 10);
  assert.equal(edits.zoomRegions?.length, 2);
  assert.equal(edits.zoomRegions[0].x, .8);
  assert.equal(edits.zoomRegions[0].zoom, 2.4);
  assert.equal(edits.zoomRegions[1].end, 10);
  assert.equal(edits.zoomRegions[1].x, 1);
  assert.equal(edits.zoomRegions[1].y, 0);
  assert.equal(edits.zoomRegions[1].zoom, 3);
});

test('motion eases in and out, targets the subject and never exposes outside the source', () => {
  const {motionAt} = require('../engine/motion.cjs');
  const edits = cleanEdits({zoomRegions: [{start: 1, end: 5, x: .8, y: .25, zoom: 2, ease: 1}]}, 6);
  assert.equal(motionAt(edits, 0).zoom, 1);
  assert.equal(motionAt(edits, 1).zoom, 1);
  assert.equal(motionAt(edits, 1.5).zoom, 1.5);
  const hold = motionAt(edits, 3);
  assert.equal(hold.zoom, 2);
  assert.equal(hold.left, .5);
  assert.equal(hold.top, 0);
  assert.equal(motionAt(edits, 5).zoom, 1);
  for (let t = 0; t <= 6; t += .01) {
    const frame = motionAt(edits, t);
    assert.ok(frame.left >= 0 && frame.left + 1 / frame.zoom <= 1 + 1e-9);
    assert.ok(frame.top >= 0 && frame.top + 1 / frame.zoom <= 1 + 1e-9);
    assert.ok(Math.abs(frame.zoom - motionAt(edits, t + .001).zoom) < .002);
  }
});

test('disabled zooms do nothing and a base zoom has no boundary jump', () => {
  const {motionAt} = require('../engine/motion.cjs');
  const edits = cleanEdits({zoom: 1.2, zoomRegions: [
    {start: 1, end: 3, x: 1, y: 1, zoom: 3, enabled: false},
    {start: 4, end: 6, x: 0, y: 0, zoom: 2, ease: .5}
  ]}, 8);
  assert.equal(motionAt(edits, 2).zoom, 1.2);
  assert.ok(Math.abs(motionAt(edits, 3.999).left - motionAt(edits, 4.001).left) < .0001);
});

test('cursor dwell suggests reviewable zooms; fast crossings and offscreen positions do not', () => {
  const {suggestZooms, cleanCursorSamples} = require('../engine/motion.cjs');
  const samples = [];
  for (let i = 0; i <= 40; i++) samples.push({t: i / 10, x: .75, y: .3});
  const suggestions = suggestZooms(samples, 5);
  assert.equal(suggestions.length, 1);
  assert.ok(Math.abs(suggestions[0].x - .75) < .01);
  assert.equal(suggestions[0].source, 'auto');
  assert.equal(suggestZooms([{t: 0, x: 0, y: 0}, {t: .1, x: 1, y: 1}], 5).length, 0);
  assert.equal(cleanCursorSamples([{t: NaN, x: .5, y: .5}, {t: 1, x: 2, y: .5}], 5).length, 0);
});

test('overlapping zooms are made nonoverlapping and tiny regions are dropped', () => {
  const edits = cleanEdits({zoomRegions: [
    {start: 1, end: 4, zoom: 2}, {start: 3, end: 6, zoom: 2.5}, {start: 8, end: 8.01}
  ]}, 10);
  assert.equal(edits.zoomRegions?.length, 2);
  assert.equal(edits.zoomRegions[1].start, 4);
});
