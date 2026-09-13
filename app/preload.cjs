'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const allowed=new Set(['waveform','sources','choose-source','record:begin','record:chunk','record:finish','record:abandon','projects:list','projects:get','project:open','project:import','project:save','project:reveal','captions:import','sound:scan','export','job:cancel']);
contextBridge.exposeInMainWorld('cleartake',{
  invoke:async(name,...args)=>{if(!allowed.has(name))throw new Error('Unknown action.');const response=await ipcRenderer.invoke(name,...args);if(!response.ok)throw new Error(response.error);return response.value;},
  onProgress:callback=>{const listener=(_,value)=>callback(value);ipcRenderer.on('job:update',listener);return()=>ipcRenderer.removeListener('job:update',listener);}
});
