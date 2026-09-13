'use strict';
const path=require('node:path');
require('../engine/scripts/build-website.cjs').buildWebsite(path.resolve(__dirname,'../website'));
