'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),site=path.join(root,'website'),pkg=require('../package.json');
fs.copyFileSync(path.join(root,'assets/icons/app.png'),path.join(site,'icon.png'));
fs.writeFileSync(path.join(site,'version.json'),JSON.stringify({version:pkg.version})+'\n');
for(const file of ['index.html','styles.css','downloads.js','release-data.js'])if(!fs.existsSync(path.join(site,file)))throw Error('Missing website file: '+file);
console.log('ClearTake download website is ready in website/. Desktop dependencies are not needed.');
