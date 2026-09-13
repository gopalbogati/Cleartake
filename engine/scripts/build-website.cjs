'use strict';
const fs=require('node:fs'),path=require('node:path');
function buildWebsite(output){
  const project=path.resolve(__dirname,'..'),source=path.join(project,'website');
  const destination=path.resolve(output||source),pkg=require('../package.json');
  for(const file of ['index.html','styles.css','downloads.js','release-data.js','icon.png']){
    const input=path.join(source,file);if(!fs.existsSync(input))throw Error('Missing website file: '+file);
    if(destination!==source){fs.mkdirSync(destination,{recursive:true});fs.copyFileSync(input,path.join(destination,file));}
  }
  fs.writeFileSync(path.join(destination,'version.json'),JSON.stringify({version:pkg.version})+'\n');
  console.log('ClearTake website built in '+destination);
  return destination;
}
if(require.main===module)buildWebsite();
module.exports={buildWebsite};
