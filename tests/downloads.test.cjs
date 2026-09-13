const test=require('node:test'),assert=require('node:assert/strict');
const {selectRelease}=require('../website/release-data.js');
const asset=(name,url)=>({name,state:'uploaded',size:1024,browser_download_url:url||'https://github.com/gopalbogati/Cleartake/releases/download/v0.1.0/'+name});
const release=(assets,extra={})=>({tag_name:'v0.1.0',draft:false,prerelease:true,published_at:'2026-09-13T00:00:00Z',assets,...extra});
test('no release or source-only release never enables app downloads',()=>{assert.equal(selectRelease([]),null);assert.equal(selectRelease([release([asset('source.zip')])]),null);});
test('one platform may be available without inventing the other',()=>{const r=selectRelease([release([asset('ClearTake-Mac-0.1.0-arm64.zip')])]);assert.ok(r.assets.mac);assert.equal(r.assets.windows,undefined);assert.equal(r.preview,true);});
test('drafts, external URLs and mismatched versions are rejected',()=>{assert.equal(selectRelease([release([asset('ClearTake-Mac-0.1.0-arm64.zip')],{draft:true})]),null);assert.equal(selectRelease([release([asset('ClearTake-Mac-0.1.0-arm64.zip','https://example.com/app.zip')])]),null);assert.equal(selectRelease([release([asset('ClearTake-Mac-9.0.0-arm64.zip')])]),null);});
test('valid Windows and Mac assets are presented together from one version',()=>{const r=selectRelease([release([asset('ClearTake-Mac-0.1.0-arm64.zip'),asset('ClearTake-Windows-0.1.0-x64.zip')])]);assert.equal(r.version,'0.1.0');assert.ok(r.assets.mac&&r.assets.windows);});
