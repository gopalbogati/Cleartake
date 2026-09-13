const test=require('node:test'),assert=require('node:assert/strict');
const {cleanEdits,keptSegments,mappedCaptions,parseSrt}=require('../engine/edit-plan.cjs');
test('overlapping cuts remove one union; disabled edits retain source',()=>{const e=cleanEdits({ranges:[{start:2,end:5,action:'cut'},{start:4,end:7,action:'cut'},{start:8,end:9,action:'cut',enabled:false}]},10);assert.deepEqual(keptSegments(e),[{start:0,end:2},{start:7,end:10}]);});
test('captions follow cuts and speed',()=>{const e=cleanEdits({speed:2,ranges:[{start:2,end:4,action:'cut'}],captions:[{start:1,end:5,text:'Hello'}]},6);assert.deepEqual(mappedCaptions(e,keptSegments(e)),[{start:.5,end:1,text:'Hello'},{start:1,end:1.5,text:'Hello'}]);});
test('all-cut and invalid settings are handled',()=>{const e=cleanEdits({background:'red;movie=bad',speed:42,ranges:[{start:0,end:99,action:'cut'}]},5);assert.equal(e.background,'#10272d');assert.equal(e.speed,1);assert.deepEqual(keptSegments(e),[]);});
test('SRT import supports multiline captions and strips tags',()=>assert.deepEqual(parseSrt('1\n00:00:01,500 --> 00:00:03,000\n<b>Hello</b>\nworld\n'),[{start:1.5,end:3,text:'Hello\nworld'}]));
