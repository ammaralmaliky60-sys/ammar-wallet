'use strict';
// app/*.js are classic scripts sharing one global scope, loaded in index.html order.
// These checks keep that split safe:
//  - no name is declared twice across files (would be a SyntaxError in the browser);
//  - no top-level name overrides a browser global (e.g. window.event, window.print);
//  - code that runs while a file loads only uses names from that file or earlier files;
//  - every top-level declaration is used somewhere (no dead code).
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const espree=require('espree'),globals=require('globals');
const {files}=require('./helpers/app-source.cjs');
const root=path.join(__dirname,'..');

const parsed=files.map(file=>{
 const source=fs.readFileSync(path.join(root,file),'utf8');
 return {file,source,ast:espree.parse(source,{ecmaVersion:2023,range:true,loc:true})};
});
const FUNCTIONS=new Set(['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression']);
const declarations=new Map(); // name -> {file index, statement, isFunction}
const duplicates=[];
parsed.forEach(({file,ast},index)=>{
 for(const statement of ast.body){
  const names=statement.type==='FunctionDeclaration'?[statement.id.name]:
   statement.type==='VariableDeclaration'?statement.declarations.map(d=>d.id.name):[];
  for(const name of names){
   if(declarations.has(name))duplicates.push(`${name} (${parsed[declarations.get(name).index].file} and ${file})`);
   const init=statement.type==='VariableDeclaration'?statement.declarations.find(d=>d.id.name===name).init:null;
   declarations.set(name,{index,statement,callable:statement.type==='FunctionDeclaration'||Boolean(init&&FUNCTIONS.has(init.type))});
  }
 }
});

// Identifiers that refer to top-level app names. When `deep` is false, nested function
// bodies are skipped: they only run later, when called.
function references(node,deep,found=new Set(),parent=null,isRoot=true){
 if(!node||typeof node.type!=='string')return found;
 if(!isRoot&&!deep&&FUNCTIONS.has(node.type))return found;
 if(node.type==='Identifier'){
  const isPropertyName=parent&&((parent.type==='MemberExpression'&&parent.property===node&&!parent.computed)||
   (parent.type==='Property'&&parent.key===node&&!parent.computed&&!parent.shorthand));
  if(!isPropertyName&&declarations.has(node.name))found.add(node.name);
  return found;
 }
 for(const value of Object.values(node)){
  if(Array.isArray(value))value.forEach(child=>references(child,deep,found,node,false));
  else if(value&&typeof value.type==='string')references(value,deep,found,node,false);
 }
 return found;
}

test('index.html loads the application files',()=>{
 assert.ok(files.length>1);
 assert.equal(files[files.length-1],'app/main.js','main.js must load last because it starts the app');
 for(const file of fs.readdirSync(path.join(root,'app')).filter(f=>f.endsWith('.js')))
  assert.ok(files.includes('app/'+file),`app/${file} exists but is not loaded by index.html`);
});

test('each file is strict and no top-level name is declared twice',()=>{
 for(const {file,source} of parsed)assert.match(source,/^\/\*[\s\S]*?\*\/\n'use strict';/,`${file} must start with a header and 'use strict'`);
 assert.deepEqual(duplicates,[]);
});

test('top-level names do not override browser globals',()=>{
 const clashes=[...declarations.keys()].filter(name=>Object.hasOwn(globals.browser,name));
 assert.deepEqual(clashes,[]);
});

test('load-time code only depends on files loaded earlier',()=>{
 const problems=[];
 parsed.forEach(({file},index)=>{
  for(const statement of parsed[index].ast.body){
   const declaresOnlyFunctions=statement.type==='FunctionDeclaration'||
    (statement.type==='VariableDeclaration'&&statement.declarations.every(d=>d.init&&FUNCTIONS.has(d.init.type)));
   const pending=declaresOnlyFunctions?[]:[...references(statement,false)],seen=new Set();
   while(pending.length){
    const name=pending.pop();
    if(seen.has(name))continue;
    seen.add(name);
    const target=declarations.get(name);
    if(target.index>index)problems.push(`${file}:${statement.loc.start.line} runs code that needs ${name} from ${parsed[target.index].file}`);
    if(target.callable)pending.push(...references(target.statement,true));
   }
  }
 });
 assert.deepEqual(problems,[]);
});

test('every top-level declaration is used',()=>{
 const used=new Set();
 for(const {ast} of parsed)for(const statement of ast.body){
  const own=statement.type==='FunctionDeclaration'?statement.id.name:null;
  for(const name of references(statement,true))if(name!==own)used.add(name);
 }
 // Self-referencing declarations (recursion) still count as used only if referenced elsewhere.
 const unused=[...declarations.keys()].filter(name=>!used.has(name));
 assert.deepEqual(unused,[]);
});
