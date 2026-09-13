'use strict';
const fs=require('node:fs/promises');const path=require('node:path');const {randomUUID}=require('node:crypto');
const {cleanEdits}=require('./edit-plan.cjs');

class Projects{
  constructor(root){this.root=root;this.opened=new Map();this.writes=new Map();}
  async create(name='Untitled recording'){
    const id=randomUUID(),directory=path.join(this.root,id);await fs.mkdir(directory,{recursive:true});
    const project={id,name:String(name).slice(0,100),directory,created:new Date().toISOString(),duration:0,files:{},edits:{},state:'recording'};
    this.opened.set(id,project);await this.save(project);return project;
  }
  get(id){const p=this.opened.get(id);if(!p)throw new Error('Open a recording first.');return p;}
  async save(project){
    const file=path.join(project.directory,'project.cleartake.json'),temporary=file+'.tmp';
    const {directory,...data}=project;
    const content=JSON.stringify({...data,format:'cleartake-independent',version:1},null,2);
    const pending=(this.writes.get(project.id)||Promise.resolve()).catch(()=>{}).then(async()=>{await fs.writeFile(temporary,content);await fs.rename(temporary,file);});
    this.writes.set(project.id,pending);await pending;
  }
  async load(file){
    const raw=JSON.parse(await fs.readFile(file,'utf8'));if(raw.format!=='cleartake-independent'||raw.version!==1)throw new Error('This is not an independent ClearTake project. Import its video instead.');
    const directory=path.dirname(file);
    for(const [key,name] of Object.entries(raw.files??{})){
      if(!['screen','mic','camera','preview'].includes(key)||typeof name!=='string'||path.basename(name)!==name)throw new Error('Invalid project media path.');
    }
    if(typeof raw.id!=='string'||!/^[a-f0-9-]{36}$/.test(raw.id))throw new Error('Invalid project ID.');
    const project={...raw,directory,edits:cleanEdits(raw.edits,raw.duration)};this.opened.set(project.id,project);return project;
  }
  async list(){
    await fs.mkdir(this.root,{recursive:true});const rows=[];
    for(const entry of await fs.readdir(this.root,{withFileTypes:true})){
      if(!entry.isDirectory())continue;
      try{const p=this.opened.get(entry.name)||await this.load(path.join(this.root,entry.name,'project.cleartake.json'));rows.push(this.summary(p));}catch{}
    }
    return rows.sort((a,b)=>b.created.localeCompare(a.created)).slice(0,100);
  }
  summary(p){return {id:p.id,name:p.name,created:p.created,duration:p.duration,state:p.state,files:Object.keys(p.files),edits:p.edits,screenInfo:p.screenInfo,scan:p.scan??[],
    urls:Object.fromEntries(Object.keys(p.files).map(key=>[key,`ctmedia://asset/${p.id}/${key}`]))};}
}
module.exports={Projects};
