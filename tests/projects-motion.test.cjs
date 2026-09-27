'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const {Projects} = require('../engine/projects.cjs');
const {cleanEdits} = require('../engine/edit-plan.cjs');
test('zoom edits and pointer samples survive saving and reopening a project', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cleartake-project-'));
  try {
    const projects = new Projects(root), p = await projects.create('Motion');
    p.duration = 8; p.state = 'ready';
    p.cursorSamples = [{t: 1, x: .8, y: .2}, {t: 100, x: .5, y: .5}];
    p.edits = cleanEdits({zoomRegions: [{id: 'z', start: 1, end: 4, x: .8, y: .2, zoom: 2.5}]}, 8);
    await projects.save(p);
    const reopened = await new Projects(root).load(path.join(p.directory, 'project.cleartake.json'));
    assert.equal(reopened.edits.zoomRegions[0].zoom, 2.5);
    assert.equal(reopened.edits.zoomRegions[0].x, .8);
    assert.deepEqual(reopened.cursorSamples, [{t: 1, x: .8, y: .2}]);
    assert.deepEqual(projects.summary(reopened).cursorSamples, reopened.cursorSamples);
  } finally { await fs.rm(root, {recursive: true, force: true}); }
});
