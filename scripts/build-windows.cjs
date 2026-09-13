'use strict';
const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
process.chdir(path.resolve(__dirname,'..'));
if(process.platform!=='win32'||process.arch!=='x64'||Number(process.versions.node.split('.')[0])<22)throw Error('Build on Windows x64 with Node 22 or later, or run the GitHub workflow.');
function run(program,args,options={}){const r=spawnSync(program,args,{stdio:'inherit',...options});if(r.error)throw r.error;if(r.status!==0)throw Error(`${program} failed with exit code ${r.status}`);}
const node=args=>run(process.execPath,args);
// Only fixed, developer-owned npm arguments are passed to Windows' .cmd shell.
const npm=args=>run('npm.cmd',args,{shell:true});
run('python',['-c','import sys; assert sys.version_info[:2] == (3,12), "Use Python 3.12"']);
npm(['ci','--ignore-scripts','--no-audit','--no-fund']);
if(fs.existsSync('.build/media/prefix/bin/ffmpeg.exe'))node(['scripts/install-built-media.cjs']);else node(['node_modules/ffmpeg-static/install.js']);node(['node_modules/electron/install.js']);npm(['run','build']);
run('python',['-m','venv','.build/venv']);const python=path.resolve('.build/venv/Scripts/python.exe');
run(python,['-m','pip','install','--upgrade','pip']);
run(python,['-m','pip','install','-r','engine/requirements.txt','pyinstaller==6.16.0']);
run(python,['engine/audio_scan.py','setup','--model','.build/yamnet']);
run(python,['-m','PyInstaller','--noconfirm','--clean','--onedir','--name','cleartake-sound',
 '--distpath','.build/sound-dist','--workpath','.build/sound-work','--specpath','.build',
 '--collect-all','tensorflow_hub','--collect-all','tf_keras','--collect-all','pkg_resources',
 '--copy-metadata','tensorflow','--copy-metadata','tensorflow-hub','--copy-metadata','tf-keras',
 '--copy-metadata','setuptools','--hidden-import','pkg_resources.extern','engine/audio_scan.py']);
node(['scripts/collect-notices.cjs']);process.env.TEST_FFMPEG=require('ffmpeg-static');process.env.TEST_FFPROBE=require('ffprobe-static').path;
npm(['test']);run(python,['tests/sound_test.py']);
node(['scripts/check-runtime.cjs','.build/sound-dist/cleartake-sound/cleartake-sound.exe','.build/yamnet']);
process.env.CSC_IDENTITY_AUTO_DISCOVERY='false';npm(['run','dist:win']);
node(['scripts/check-runtime.cjs','release/win-unpacked/resources/sound-runtime/cleartake-sound.exe','release/win-unpacked/resources/sound-model']);
const archives=fs.readdirSync('release').filter(f=>/^ClearTake-Windows-.*-x64\.zip$/.test(f));if(!archives.length)throw Error('No Windows ZIP was produced.');
(async()=>{for(const name of archives){const file=path.join('release',name),hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);fs.writeFileSync(file+'.sha256',hash.digest('hex')+'  '+name+'\n');console.log('Built: '+path.resolve(file));}console.log('Development ZIP: not code-signed. Test native recording before publication.');})().catch(e=>{console.error(e);process.exitCode=1;});
