'use strict';
const fs=require('node:fs'),path=require('node:path');
const prefix=path.resolve('.build/media/prefix/bin'),ext=process.platform==='win32'?'.exe':'';
for(const [name,dest] of [['ffmpeg',require('ffmpeg-static')],['ffprobe',require('ffprobe-static').path]]){
 const source=path.join(prefix,name+ext);
 if(!fs.existsSync(source))throw Error('Missing source-built '+name+'. Run scripts/build-media.sh first.');
 fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);fs.chmodSync(dest,0o755);
}
console.log('Installed the source-built media tools.');
