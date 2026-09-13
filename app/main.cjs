'use strict';
const {app,BrowserWindow,ipcMain,desktopCapturer,session,dialog,protocol,shell}=require('electron');
const fs=require('node:fs/promises');const syncFs=require('node:fs');const path=require('node:path');
const {Readable}=require('node:stream');const {spawn}=require('node:child_process');
const {Projects}=require('../engine/projects.cjs');
const {probe,run,exportVideo,waveform}=require('../engine/media.cjs');
const {cleanEdits,parseSrt}=require('../engine/edit-plan.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'ctmedia',privileges:{standard:true,secure:true,stream:true,supportFetchAPI:true}}]);
app.setName('ClearTake');
const settingsDirectory=path.join(app.getPath('appData'),'ClearTake Independent');
syncFs.mkdirSync(settingsDirectory,{recursive:true});
app.setPath('userData',settingsDirectory);
let window,projects,choice,job=null,recordingId=null;
const unpack=p=>app.isPackaged?p.replace(/app\.asar([/\\])/,'app.asar.unpacked$1'):p;
const ffmpeg=()=>unpack(require('ffmpeg-static'));
const ffprobe=()=>unpack(require('ffprobe-static').path);
const publicProject=p=>projects.summary(p);
const tell=(message,progress)=>{if(window&&!window.isDestroyed())window.webContents.send('job:update',{message,progress});};

function handler(name,fn){ipcMain.handle(name,async(event,...args)=>{
  if(event.sender!==window?.webContents)return {ok:false,error:'Untrusted application window.'};
  try{return {ok:true,value:await fn(...args)};}catch(error){console.error(name,error);return {ok:false,error:error.message||String(error)};}
});}

async function exclusive(label,task){
  if(job)throw new Error('Wait for the current task or cancel it first.');
  job=new AbortController();tell(label,0);
  try{return await task(job.signal);}finally{job=null;tell('',null);}
}

function toolsForSound(){
  return require('../engine/runtime.cjs').soundRuntime({packaged:app.isPackaged,platform:process.platform,root:app.getAppPath(),resources:process.resourcesPath});
}

async function analyze(id){
  const p=projects.get(id),tool=toolsForSound();
  if(!syncFs.existsSync(tool.binary)||!syncFs.existsSync(path.join(tool.model,'saved_model.pb')))throw new Error('Sound detection is not installed in this build. You can still select and mute or cut sounds manually.');
  if(!p.files.mic&&!p.screenInfo.hasAudio)throw new Error('This recording has no audio to analyze.');
  return exclusive('Finding possible sneezes and coughs…',signal=>new Promise((resolve,reject)=>{
    const child=spawn(tool.binary,[...tool.args,'scan','--model',tool.model,'--audio',path.join(p.directory,p.files.mic??p.files.screen),'--ffmpeg',ffmpeg()],
      {env:{...process.env,TF_CPP_MIN_LOG_LEVEL:'2'},stdio:['ignore','pipe','pipe']});
    let out='',errors='';const cancel=()=>child.kill('SIGTERM');signal.addEventListener('abort',cancel,{once:true});
    child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>errors=(errors+d).slice(-6000));child.once('error',reject);
    child.once('close',async code=>{
      signal.removeEventListener('abort',cancel);
      if(signal.aborted)return reject(new Error('Detection cancelled.'));
      if(code!==0)return reject(new Error(errors||'The local sound detector could not finish.'));
      try{const data=JSON.parse(out);p.scan=data.events;await projects.save(p);resolve(publicProject(p));}catch(e){reject(e);}
    });
  }));
}

app.whenReady().then(async()=>{
  projects=new Projects(path.join(app.getPath('videos'),'ClearTake Projects'));
  protocol.handle('ctmedia',async request=>{
    try{
      const url=new URL(request.url),[id,key]=url.pathname.split('/').filter(Boolean),p=projects.get(id),filename=p.files[key];
      if(url.hostname!=='asset'||!filename||path.basename(filename)!==filename)return new Response('Not found',{status:404});
      const file=path.join(p.directory,filename),stat=await fs.stat(file);let start=0,end=stat.size-1;
      const range=request.headers.get('range');if(range){const m=range.match(/^bytes=(\d+)-(\d*)$/);if(!m)return new Response(null,{status:416});
        start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),end):end;if(start>end)return new Response(null,{status:416});}
      const ext=path.extname(file).toLowerCase(),mime=ext==='.mp4'?'video/mp4':ext==='.mov'?'video/quicktime':ext==='.mkv'?'video/webm':ext==='.wav'?'audio/wav':'video/webm';
      const headers={'Content-Type':mime,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'};
      if(range)headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
      return new Response(Readable.toWeb(syncFs.createReadStream(file,{start,end})),{status:range?206:200,headers});
    }catch{return new Response('Not found',{status:404});}
  });
  window=new BrowserWindow({width:1360,height:920,minWidth:1060,minHeight:760,backgroundColor:'#f3f6f5',title:'ClearTake',icon:path.join(__dirname,'../assets/icons/app.png'),
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  window.setMenuBarVisibility(false);
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
  session.defaultSession.setPermissionRequestHandler((wc,permission,callback)=>callback(wc===window.webContents&&['media','display-capture'].includes(permission)));
  session.defaultSession.setPermissionCheckHandler((wc,permission)=>wc===window.webContents&&['media','display-capture'].includes(permission));
  session.defaultSession.setDisplayMediaRequestHandler(async(request,callback)=>{
    try{if(!choice)return callback({});const list=await desktopCapturer.getSources({types:['screen','window']});const source=list.find(s=>s.id===choice.id);
      callback(source?{video:source,...(choice.system?{audio:'loopback'}:{})}:{});
    }catch{callback({});}
  });
  handler('sources',async()=>{const list=await desktopCapturer.getSources({types:['screen','window'],thumbnailSize:{width:320,height:200}});return list.map(s=>({id:s.id,name:s.name,image:s.thumbnail.toDataURL()}));});
  handler('choose-source',async(id,system)=>{const list=await desktopCapturer.getSources({types:['screen','window']});if(!list.some(s=>s.id===id))throw new Error('Choose your screen again.');choice={id,system:system===true};return true;});
  handler('record:begin',async name=>{if(recordingId)throw new Error('A recording is already active.');const p=await projects.create(name);recordingId=p.id;return publicProject(p);});
  handler('record:chunk',async(id,track,data)=>{
    if(id!==recordingId||!['screen','mic','camera'].includes(track))throw new Error('Invalid recording destination.');
    const p=projects.get(id),buffer=Buffer.from(data);if(buffer.length>32*1024*1024)throw new Error('Recording chunk is too large.');
    const filename=`${track}-original.webm`;await fs.appendFile(path.join(p.directory,filename),buffer);const first=!p.files[track];p.files[track]=filename;if(first)await projects.save(p);return true;
  });
  handler('record:finish',async id=>{
    if(id!==recordingId)throw new Error('No active recording.');recordingId=null;const p=projects.get(id);
    return exclusive('Preparing your recording…',async signal=>{
      for(const track of ['screen','mic','camera']){if(!p.files[track])continue;
        const output=`${track}.webm`;await run(ffmpeg(),['-v','error','-nostdin','-y','-fflags','+genpts','-i',path.join(p.directory,p.files[track]),'-map','0','-c','copy',path.join(p.directory,output)],{signal});p.files[track]=output;
      }
      if(!p.files.screen)throw new Error('No screen video was captured.');
      p.screenInfo=await probe(ffprobe(),path.join(p.directory,p.files.screen));p.duration=p.screenInfo.duration;
      if(p.duration<=0)throw new Error('The recording has no readable duration.');
      p.state='ready';p.edits=cleanEdits({},p.duration);await projects.save(p);return publicProject(p);
    });
  });
  handler('record:abandon',async id=>{if(recordingId===id)recordingId=null;const p=projects.get(id);p.state='incomplete';await projects.save(p);return true;});
  handler('projects:list',()=>projects.list());
  handler('projects:get',id=>publicProject(projects.get(id)));
  handler('project:open',async()=>{const result=await dialog.showOpenDialog(window,{title:'Open a ClearTake project',filters:[{name:'ClearTake project',extensions:['json']}],properties:['openFile']});
    return result.canceled?null:publicProject(await projects.load(result.filePaths[0]));});
  handler('project:import',async()=>{
    const result=await dialog.showOpenDialog(window,{title:'Choose a video',filters:[{name:'Video',extensions:['mp4','mov','webm','mkv']}],properties:['openFile']});if(result.canceled)return null;
    return exclusive('Importing video…',async signal=>{const source=result.filePaths[0],info=await probe(ffprobe(),source);
      if(!info.hasVideo||info.duration<=0)throw new Error('This file does not contain a readable video.');
      const p=await projects.create(path.basename(source,path.extname(source)));p.files.screen='imported'+path.extname(source).toLowerCase();
      await fs.copyFile(source,path.join(p.directory,p.files.screen));await run(ffmpeg(),['-v','error','-nostdin','-y','-i',path.join(p.directory,p.files.screen),'-map','0:v:0','-map','0:a:0?','-vf','scale=trunc(iw/2)*2:trunc(ih/2)*2','-c:v','libx264','-preset','fast','-crf','18','-c:a','aac','-movflags','+faststart',path.join(p.directory,'screen.mp4')],{signal});p.files.screen='screen.mp4';p.screenInfo=await probe(ffprobe(),path.join(p.directory,p.files.screen));p.duration=p.screenInfo.duration;p.state='ready';p.edits=cleanEdits({},p.duration);await projects.save(p);return publicProject(p);});
  });
  handler('project:save',async(id,edits,name)=>{const p=projects.get(id);p.edits=cleanEdits(edits,p.duration);if(name)p.name=String(name).slice(0,100);await projects.save(p);return publicProject(p);});
  handler('project:reveal',async id=>{shell.showItemInFolder(path.join(projects.get(id).directory,'project.cleartake.json'));return true;});
  handler('captions:import',async()=>{const result=await dialog.showOpenDialog(window,{title:'Import captions timed to the original video',filters:[{name:'SubRip captions',extensions:['srt']}],properties:['openFile']});
    if(result.canceled)return null;const stat=await fs.stat(result.filePaths[0]);if(stat.size>2e6)throw new Error('Caption file is too large.');return parseSrt(await fs.readFile(result.filePaths[0],'utf8'));});
  handler('sound:scan',analyze);
  handler('waveform',id=>{const p=projects.get(id);if(!p.files.mic&&!p.screenInfo.hasAudio)return [];return waveform(ffmpeg(),path.join(p.directory,p.files.mic??p.files.screen),p.duration);});
  handler('export',async(id,raw,draft)=>{
    const p=projects.get(id);let output;
    if(draft===true)output=path.join(p.directory,'preview.mp4');
    else{const result=await dialog.showSaveDialog(window,{title:'Export MP4',defaultPath:path.join(app.getPath('videos'),`${p.name.replace(/[^\w .-]/g,'').slice(0,70)||'ClearTake'}.mp4`),filters:[{name:'MP4 video',extensions:['mp4']}]});if(result.canceled)return null;output=result.filePath;}
    if(!draft&&path.dirname(path.resolve(output))===path.resolve(p.directory))throw new Error('Export outside the project folder to protect your original files.');
    for(const [key,filename] of Object.entries(p.files)){if(key!=='preview'&&path.resolve(output)===path.resolve(p.directory,filename))throw new Error('Choose a different filename to preserve your source recording.');}
    p.edits=cleanEdits(raw,p.duration);await projects.save(p);
    const result=await exclusive(draft?'Rendering preview…':'Exporting your video…',signal=>exportVideo({project:p,edits:p.edits,ffmpeg:ffmpeg(),ffprobe:ffprobe(),output,draft:draft===true,signal,onProgress:value=>tell(draft?'Rendering preview…':'Exporting your video…',value)}));
    if(draft){p.files.preview='preview.mp4';await projects.save(p);return {url:`ctmedia://asset/${id}/preview?v=${Date.now()}`,...result};}
    shell.showItemInFolder(output);return result;
  });
  handler('job:cancel',()=>{job?.abort();return true;});
  window.on('close',event=>{if(recordingId||job){const answer=dialog.showMessageBoxSync(window,{type:'warning',message:'A recording or processing task is still running.',detail:'Stay in ClearTake to save your work, or quit and leave it incomplete.',buttons:['Stay','Quit'],defaultId:0,cancelId:0});
    if(answer===0)event.preventDefault();else job?.abort();}});
  await window.loadFile(path.join(__dirname,'ui','index.html'));
}).catch(error=>{
  console.error('ClearTake startup failed:',error);
  dialog.showErrorBox('ClearTake could not start',error.stack||String(error));
  app.quit();
});
app.on('window-all-closed',()=>app.quit());
