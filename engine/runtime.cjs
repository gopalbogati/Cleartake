'use strict';
const path=require('node:path');
function soundRuntime({packaged,platform,root,resources}){
  const windows=platform==='win32';
  return packaged?{binary:path.join(resources,'sound-runtime',windows?'cleartake-sound.exe':'cleartake-sound'),args:[],model:path.join(resources,'sound-model')}:
    {binary:path.join(root,'.build','venv',...(windows?['Scripts','python.exe']:['bin','python3'])),args:[path.join(root,'engine','audio_scan.py')],model:path.join(root,'.build','yamnet')};
}
module.exports={soundRuntime};
