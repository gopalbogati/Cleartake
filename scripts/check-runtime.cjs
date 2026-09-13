'use strict';
const {execFileSync}=require('node:child_process');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'cleartake-runtime-')),file=path.join(directory,'tone.wav');
try{const ffmpeg=require('ffmpeg-static');execFileSync(ffmpeg,['-v','error','-y','-f','lavfi','-i','sine=frequency=440:duration=2',file]);
const raw=execFileSync(path.resolve(process.argv[2]),['scan','--model',path.resolve(process.argv[3]),'--audio',file,'--ffmpeg',ffmpeg],{encoding:'utf8',timeout:180000,maxBuffer:10e6});const data=JSON.parse(raw);if(!Array.isArray(data.events)||data.analyzedSeconds<1.9)throw new Error('Sound detector runtime check failed.');console.log('Bundled sound detector loaded the local model and analyzed test audio.');}finally{fs.rmSync(directory,{recursive:true,force:true});}
