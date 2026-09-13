'use strict';
// Launch the actual packaged app and exercise its renderer-to-main IPC bridge.
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),net=require('node:net');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function check(){
 const executable=path.resolve(process.argv[2]);
 if(!fs.existsSync(executable))throw Error('Packaged app executable is missing: '+executable);
 const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const port=server.address().port;await new Promise(resolve=>server.close(resolve));
 let output='',exited=false,launchError=null,ws;
 const child=spawn(executable,[`--remote-debugging-port=${port}`,'--enable-logging=stderr'],{stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',b=>output=(output+b).slice(-30000));child.stderr.on('data',b=>output=(output+b).slice(-30000));
 child.on('error',e=>{launchError=e;});child.on('exit',()=>{exited=true;});
 try{
  let page;const deadline=Date.now()+60000;
  while(Date.now()<deadline){
   if(launchError)throw launchError;if(exited)throw Error('App exited before opening its window.');
   try{const r=await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(1000)});page=(await r.json()).find(t=>t.type==='page'&&t.url.startsWith('file:'));}catch{}
   if(page)break;await delay(250);
  }
  if(!page)throw Error('App did not expose a loaded window within 60 seconds.');
  ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Debugger connection timed out')),5000);ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});ws.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Debugger connection failed'));},{once:true});});
  let serial=0;const pending=new Map();
  ws.addEventListener('message',event=>{const message=JSON.parse(event.data);const entry=pending.get(message.id);if(entry){pending.delete(message.id);clearTimeout(entry.timer);message.error?entry.reject(Error(JSON.stringify(message.error))):entry.resolve(message.result);}});
  function command(method,params={}){return new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'));},10000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});}
  let ready=false;
  while(Date.now()<deadline){
   const result=await command('Runtime.evaluate',{expression:`(async()=>{if(document.readyState!=='complete'||!window.cleartake?.invoke)return {ready:false};const projects=await window.cleartake.invoke('projects:list');return {ready:document.visibilityState==='visible'&&window.outerWidth>0&&window.outerHeight>0&&document.title==='ClearTake'&&!document.getElementById('home-view')?.hidden&&!!document.getElementById('record')&&Array.isArray(projects)};})()`,awaitPromise:true,returnByValue:true});
   if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));
   if(result.result?.value?.ready){ready=true;break;}await delay(250);
  }
  if(!ready)throw Error('The app window or preload IPC bridge did not become ready.');
  console.log('Packaged ClearTake launched: home window loaded and projects IPC succeeded.');
 }catch(error){console.error(output);throw error;}
 finally{ws?.close();if(!exited)child.kill();child.stdout.destroy();child.stderr.destroy();child.unref();}
}
check().catch(error=>{console.error(error);process.exitCode=1;});
