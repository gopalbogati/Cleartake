'use strict';
// Keep notices from the actual installed packages alongside the application.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const dest=path.resolve('.build/notices');fs.mkdirSync(dest,{recursive:true});
for(const name of ['electron','ffmpeg-static','ffprobe-static','@resvg/resvg-js']){const root=path.dirname(require.resolve(name+'/package.json')),target=path.join(dest,name);fs.mkdirSync(target,{recursive:true});for(const file of fs.readdirSync(root)){if(/license|copying|notice/i.test(file)&&fs.statSync(path.join(root,file)).isFile())fs.copyFileSync(path.join(root,file),path.join(target,file));}if(name==='electron')for(const file of ['LICENSE','LICENSES.chromium.html']){const source=path.join(root,'dist',file);if(fs.existsSync(source))fs.copyFileSync(source,path.join(target,file));}}
fs.writeFileSync(path.join(dest,'ffmpeg-build.txt'),cp.execFileSync(require('ffmpeg-static'),['-version']));
fs.writeFileSync(path.join(dest,'ffprobe-build.txt'),cp.execFileSync(require('ffprobe-static').path,['-version']));
const python=path.resolve('.build/venv',process.platform==='win32'?'Scripts/python.exe':'bin/python3');
cp.execFileSync(python,['-c',`import importlib.metadata as m, pathlib, shutil, json
out=pathlib.Path('.build/notices/python');out.mkdir(parents=True,exist_ok=True)
versions={}
for d in m.distributions():
 name=d.metadata.get('Name','unknown');versions[name]=d.version
 for f in d.files or []:
  if any(token in str(f).lower() for token in ('license','copying','notice')):
   source=d.locate_file(f)
   if source.is_file():
    target=out/name/str(f).replace('../','_');target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)
(out/'versions.json').write_text(json.dumps(versions,indent=2))`],{stdio:'inherit'});
fs.copyFileSync('assets/YAMNet-LICENSE.txt',path.join(dest,'YAMNet-LICENSE.txt'));
console.log('Collected dependency notices and exact media-tool build versions.');

if(fs.existsSync('.build/media/source'))fs.cpSync('.build/media/source',path.join(dest,'media-source'),{recursive:true,filter:source=>!source.endsWith('.tar.gz')});
