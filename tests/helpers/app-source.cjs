'use strict';
// The application is split into ordered classic scripts under app/ (see index.html).
// Tests that inspect or evaluate application source use this concatenation, which is
// exactly what the browser executes in the shared global scope.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..','..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const files=[...html.matchAll(/<script src="\.\/(app\/[^"?]+\.js)(?:\?[^"]*)?"><\/script>/g)].map(m=>m[1]);
if(!files.length)throw new Error('No app/*.js scripts found in index.html');
const source=files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
module.exports={files,source};
