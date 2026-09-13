'use strict';
const {spawn,execFile}=require('node:child_process');
const {promisify}=require('node:util');
const fs=require('node:fs/promises');
const path=require('node:path');
const {cleanEdits,keptSegments,mappedCaptions}=require('./edit-plan.cjs');
const execute=promisify(execFile);

async function probe(binary,file){
  const {stdout}=await execute(binary,['-v','error','-show_streams','-show_format','-of','json',file],{maxBuffer:2e6,timeout:30000});
  const raw=JSON.parse(stdout),v=raw.streams.find(s=>s.codec_type==='video');
  return {duration:Number(raw.format.duration)||Number(v?.duration)||0,width:v?.width||0,height:v?.height||0,
    hasAudio:raw.streams.some(s=>s.codec_type==='audio'),hasVideo:!!v};
}

function run(binary,args,{signal,onProgress,duration=1}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(binary,args,{stdio:['ignore','pipe','pipe']});let errors='',progress='';
    const cancel=()=>child.kill('SIGTERM');
    if(signal?.aborted)cancel(); else signal?.addEventListener('abort',cancel,{once:true});
    child.stdout.on('data',chunk=>{progress+=chunk.toString();const lines=progress.split('\n');progress=lines.pop();
      for(const line of lines){const m=line.match(/^out_time_us=(\d+)/);if(m)onProgress?.(Math.min(.99,Number(m[1])/1e6/duration));}
    });
    child.stderr.on('data',data=>{errors=(errors+data.toString()).slice(-14000);});
    child.once('error',reject);
    child.once('close',code=>{signal?.removeEventListener('abort',cancel);if(signal?.aborted)return reject(new Error('Cancelled. Your source recording is unchanged.'));
      if(code!==0)return reject(new Error(errors||`Media processing exited with code ${code}`));onProgress?.(1);resolve();});
  });
}

const xml=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function wrapText(text,columns){
  const result=[];
  for(const line of String(text).split('\n')){let row='';for(const word of line.split(/\s+/)){if(row.length+word.length+1>columns){if(row)result.push(row);row='';}for(let i=0;i<word.length;i+=columns){const part=word.slice(i,i+columns);if(i){result.push(row);row='';}row+=(row?' ':'')+part;}}if(row)result.push(row);}
  return result.slice(0,8);
}
async function textOverlay(work,texts,W,H,duration,signal){
  const {Resvg}=require('@resvg/resvg-js');
  const bounds=[...new Set([0,duration,...texts.flatMap(t=>[t.start,t.end])])].filter(t=>t>=0&&t<=duration).sort((a,b)=>a-b);
  const files=[];
  for(let i=0;i<bounds.length-1;i++){
    if(signal?.aborted)throw new Error('Cancelled. Your source recording is unchanged.');
    const time=(bounds[i]+bounds[i+1])/2,active=texts.filter(t=>t.start<=time&&t.end>time);let shapes='';
    for(const isTitle of [true,false]){
      const group=active.filter(t=>!!t.title===isTitle);if(!group.length)continue;
      const size=Math.round(Math.min(W,H)*(isTitle?.045:.032)),lineHeight=size*1.4;
      const lines=wrapText(group.map(t=>t.text).join('\n'),Math.floor(W*.82/(size*.7)));
      const height=lines.length*lineHeight+24,y=isTitle?H*.08:H-H*.07-height;
      shapes+=`<rect x="${W*.06}" y="${y}" width="${W*.88}" height="${height}" rx="5" fill="black" fill-opacity="0.62"/>`;
      shapes+=lines.map((line,n)=>`<text x="${W/2}" y="${y+12+size+n*lineHeight}" text-anchor="middle" font-family="Arial, DejaVu Sans, sans-serif" font-size="${size}" fill="white">${xml(line)}</text>`).join('');
    }
    const filename=`overlay-${i}.png`;
    await fs.writeFile(path.join(work,filename),new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${shapes}</svg>`,{font:{loadSystemFonts:true}}).render().asPng());
    files.push(`file '${filename}'\nduration ${bounds[i+1]-bounds[i]}`);
  }
  // Repeat the last image to let the concat demuxer honor its final duration.
  files.push(`file 'overlay-${bounds.length-2}.png'`);
  const manifest=path.join(work,'overlays.ffconcat');await fs.writeFile(manifest,'ffconcat version 1.0\n'+files.join('\n')+'\n');return manifest;
}

async function exportVideo({project,edits:raw,ffmpeg,ffprobe,output,signal,onProgress,draft=false}){
  const edits=cleanEdits(raw,project.duration),segments=keptSegments(edits);
  if(!segments.length)throw new Error('Every part of the video is cut. Restore a section before exporting.');
  const duration=segments.reduce((n,s)=>n+(s.end-s.start)/edits.speed,0);
  const full=edits.aspect==='vertical'?[1080,1920]:edits.aspect==='square'?[1080,1080]:[1920,1080];
  const [W,H]=full.map(n=>draft?Math.round(n/3)*2:n);
  const boxW=Math.floor(W*(1-edits.padding*2)/2)*2,boxH=Math.floor(H*(1-edits.padding*2)/2)*2;
  const input=['-i',path.join(project.directory,project.files.screen)];let index=1;
  const mic=project.files.mic?index++:null;if(mic!==null)input.push('-i',path.join(project.directory,project.files.mic));
  const camera=project.files.camera&&edits.camera?index++:null;if(camera!==null)input.push('-i',path.join(project.directory,project.files.camera));
  const work=await fs.mkdtemp(path.join(project.directory,'render-'));const graph=[];
  try{
    for(let i=0;i<segments.length;i++){
      const {start,end}=segments[i],length=(end-start)/edits.speed;
      let video=`v${i}`;
      graph.push(`[0:v]trim=start=${start}:end=${end},setpts=(PTS-STARTPTS)/${edits.speed},crop=w=trunc(iw/${edits.zoom}/2)*2:h=trunc(ih/${edits.zoom}/2)*2:x=(iw-ow)/2:y=(ih-oh)/2,scale=${boxW}:${boxH}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=${edits.background},setsar=1,fps=30,format=yuv420p[v${i}]`);
      if(camera!==null){
        const size=Math.floor(Math.min(W,H)*edits.cameraSize/2)*2,margin=Math.max(16,Math.round(Math.min(W,H)*.03));
        const x=edits.cameraCorner.endsWith('r')?`W-w-${margin}`:margin,y=edits.cameraCorner.startsWith('b')?`H-h-${margin}`:margin;
        graph.push(`[${camera}:v]trim=start=${start}:end=${end},setpts=(PTS-STARTPTS)/${edits.speed},crop='min(iw,ih)':'min(iw,ih)',scale=${size}:${size},setsar=1,fps=30[cam${i}]`);
        graph.push(`[v${i}][cam${i}]overlay=x=${x}:y=${y}:eof_action=pass:shortest=0[cv${i}]`);video=`cv${i}`;
      }
      const audioLabels=[];
      for(const [stream,volume,voice] of [[project.screenInfo.hasAudio?0:null,edits.systemVolume,false],[mic,edits.voiceVolume,true]]){
        if(stream===null)continue;
        const label=`a${i}_${stream}`;
        const filters=[`atrim=start=${start}:end=${end}`,'asetpts=PTS-STARTPTS','aresample=48000','aformat=channel_layouts=stereo'];
        if(voice&&edits.noise)filters.push('highpass=f=70','afftdn=nr=8:nf=-45:tn=1');
        for(const r of edits.ranges.filter(r=>r.enabled&&r.action==='mute'&&(r.scope==='all'||voice||mic===null)&&r.end>start&&r.start<end)){
          filters.push(`volume=0:enable='between(t,${Math.max(0,r.start-start)},${Math.min(end,r.end)-start})'`);
        }
        filters.push(`volume=${volume}`,`atempo=${edits.speed}`,`apad=whole_dur=${length}`,`atrim=duration=${length}`);
        graph.push(`[${stream}:a]${filters.join(',')}[${label}]`);audioLabels.push(`[${label}]`);
      }
      if(audioLabels.length){graph.push(`${audioLabels.join('')}${audioLabels.length>1?`amix=inputs=${audioLabels.length}:duration=longest:normalize=0,`:''}alimiter=limit=0.95:level=0:latency=1,atrim=duration=${length}[a${i}]`);}
      else graph.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${length}[a${i}]`);
      segments[i].video=video;
    }
    graph.push(`${segments.map((s,i)=>`[${s.video}][a${i}]`).join('')}concat=n=${segments.length}:v=1:a=1[joined][audio]`);
    let final='joined';const texts=mappedCaptions(edits,segments);
    if(edits.title)texts.unshift({start:0,end:Math.min(4,duration),text:edits.title,title:true});
    if(texts.length){
      const manifest=await textOverlay(work,texts,W,H,duration,signal),textIndex=index++;
      input.push('-f','concat','-safe','0','-i',manifest);
      graph.push(`[joined][${textIndex}:v]overlay=x=0:y=0:eof_action=repeat:shortest=0[texted]`);final='texted';
    }
    const filterfile=path.join(work,'graph.txt');await fs.writeFile(filterfile,graph.join(';\n'));
    const temporary=path.join(work,'finished.mp4');
    await run(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-y',...input,'-filter_complex_script',filterfile,
      '-map',`[${final}]`,'-map','[audio]','-c:v','libx264','-preset',draft?'ultrafast':'fast','-crf',draft?'25':'20',
      '-t',String(duration),'-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart','-progress','pipe:1',temporary],{signal,onProgress,duration});
    const metadata=await probe(ffprobe,temporary);if(!metadata.hasVideo||metadata.duration<.03)throw new Error('Export produced no usable video.');
    await fs.copyFile(temporary,output);return {path:output,duration:metadata.duration};
  }finally{await fs.rm(work,{recursive:true,force:true});}
}

async function waveform(binary,file,duration){
  const n=Math.max(80,Math.ceil(duration*8000/1200));
  const {stdout}=await execute(binary,['-v','error','-nostdin','-i',file,'-vn','-af',`aformat=channel_layouts=mono,aresample=8000,asetnsamples=n=${n}:p=1,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.Peak_level:file=-`,'-f','null','-'],{maxBuffer:4e6,timeout:300000});
  return [...stdout.matchAll(/lavfi.astats.Overall.Peak_level=([^\s]+)/g)].map(m=>Math.min(1,10**(Number(m[1])/20)));
}
module.exports={probe,run,exportVideo,waveform};
