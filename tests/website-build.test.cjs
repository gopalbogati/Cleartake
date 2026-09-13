'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('engine builds in isolation with no parent source or dependencies',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cleartake-vercel-'));
  try{for(const dir of ['website','scripts'])fs.cpSync(path.join(root,'engine',dir),path.join(temp,dir),{recursive:true});for(const name of ['package.json','vercel.json'])fs.copyFileSync(path.join(root,'engine',name),path.join(temp,name));
    execFileSync(process.execPath,['scripts/build-website.cjs'],{cwd:temp});
    for(const name of ['index.html','icon.png','downloads.js','release-data.js','styles.css','version.json'])assert.ok(fs.statSync(path.join(temp,'website',name)).size>0);
    assert.equal(JSON.parse(fs.readFileSync(path.join(temp,'website/version.json'))).version,require('../package.json').version);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('root and isolated configurations produce the same website',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'cleartake-web-root-'));
  try{require('../engine/scripts/build-website.cjs').buildWebsite(temp);assert.deepEqual(fs.readFileSync(path.join(temp,'index.html')),fs.readFileSync(path.join(root,'engine/website/index.html')));assert.deepEqual(require('../vercel.json'),require('../engine/vercel.json'));}finally{fs.rmSync(temp,{recursive:true,force:true});}
});
