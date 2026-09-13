const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');const {cleanEdits}=require('../engine/edit-plan.cjs');
const tick=()=>new Promise(r=>setTimeout(r,25));
test('editor opens a project, adds edits, supports undo/redo and passes edits to export',async()=>{
 const calls=[],errors=[];const p={id:'00000000-0000-0000-0000-000000000000',name:'Demo',state:'ready',created:new Date().toISOString(),duration:6,files:['screen','mic'],urls:{screen:'ctmedia://asset/demo/screen',mic:'ctmedia://asset/demo/mic'},screenInfo:{width:320,height:180,hasAudio:true},edits:cleanEdits({},6)};
 const log=new VirtualConsole();log.on('jsdomError',e=>errors.push(e.message));
 const html=fs.readFileSync(path.join(__dirname,'../app/ui/index.html'),'utf8').replace('<script src="bundle.js"></script>','');
 const dom=new JSDOM(html,{url:'https://cleartake.local/',runScripts:'outside-only',virtualConsole:log});const w=dom.window;
 w.ResizeObserver=class{observe(){}};w.HTMLCanvasElement.prototype.getContext=()=>({clearRect(){},fillRect(){},strokeRect(){},fillText(){}});w.HTMLMediaElement.prototype.pause=function(){};w.HTMLMediaElement.prototype.play=function(){return Promise.resolve();};w.HTMLMediaElement.prototype.load=function(){};
 w.cleartake={onProgress(){},invoke:async(name,...args)=>{calls.push([name,...args]);if(name==='projects:list')return [];if(name==='project:import')return p;if(name==='waveform')return [.1,.4,.2];if(name==='project:save')return p;if(name==='export')return {path:'/tmp/demo.mp4',duration:4};throw Error(name);}};
 Object.defineProperty(w.navigator,'mediaDevices',{value:{enumerateDevices:async()=>[]}});
 const $=id=>w.document.getElementById(id),click=async id=>{$(id).click();await tick();};
 try{w.eval(fs.readFileSync(path.join(__dirname,'../app/ui/bundle.js'),'utf8'));await tick();await click('import-video');assert.equal($('editor-view').hidden,false);assert.equal($('project-name').value,'Demo');$('range-start').value=1;$('range-end').value=2;await click('mute-range');assert.equal($('edit-count').textContent,'1');await click('undo');assert.equal($('edit-count').textContent,'0');await click('redo');assert.equal($('edit-count').textContent,'1');$('range-start').value=3;$('range-end').value=5;await click('cut-range');assert.equal($('edit-count').textContent,'2');await click('export');const exported=calls.find(c=>c[0]==='export');assert.equal(exported[2].ranges[0].action,'mute');assert.equal(exported[2].ranges[1].action,'cut');assert.equal(exported[3],false);assert.deepEqual(errors,[]);}finally{dom.window.close();}
});
