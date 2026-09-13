const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {soundRuntime}=require('../engine/runtime.cjs');
test('Windows packaged and development helpers use executable paths',()=>{assert.equal(soundRuntime({packaged:true,platform:'win32',resources:'/app'}).binary,path.join('/app','sound-runtime','cleartake-sound.exe'));assert.equal(soundRuntime({packaged:false,platform:'win32',root:'/src'}).binary,path.join('/src','.build','venv','Scripts','python.exe'));});
test('Mac packaged helper has no Windows extension',()=>assert.equal(soundRuntime({packaged:true,platform:'darwin',resources:'/app'}).binary,path.join('/app','sound-runtime','cleartake-sound')));
