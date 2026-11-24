'use strict';
// Brand updates must remain visual: storage keys, schema and core behavior are unchanged.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html'),theme=read('dabburha-theme.css'),tokens=read('dabburha-tokens.css'),manifest=JSON.parse(read('manifest.webmanifest'));
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lum=c=>c.map(v=>v/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
function declarations(source,selector){
 const at=source.indexOf(selector+'{');
 assert.ok(at>=0,`theme block missing ${selector}`);
 return source.slice(at+selector.length+1,source.indexOf('}',at));
}
function palette(mode){
 const tokenSelector=mode==='dark'?':root[data-theme="dark"] ':':root ';
 const themeSelector=tokenSelector.trimEnd()+',\nbody[data-theme="'+mode+'"] ';
 const colors={};
 for(const source of [declarations(tokens,tokenSelector),declarations(theme,themeSelector)]){
  for(const [,key,hex,alias] of source.matchAll(/--([a-z0-9-]+):\s*(?:(#[0-9a-f]{6})|var\(--([a-z0-9-]+)\))/gi)){
   colors[key]=hex?hex.toUpperCase():colors[alias];
  }
 }
 return colors;
}
const light=palette('light'),dark=palette('dark');

test('Dabburha name, Arabic copy, PWA metadata and supplied icon are active',()=>{
 assert.match(html,/<title>دبّرها<\/title>/);
 assert.match(html,/الشهر طويل والراتب قصير؟ دبّرها\./);
 assert.equal(manifest.name,'دبّرها');assert.equal(manifest.short_name,'دبّرها');
 assert.equal(manifest.dir,'rtl');assert.equal(manifest.theme_color,'#F4F1FF');
 assert.match(read('icon.svg'),/<title>دبّرها<\/title>/);
});

test('light and dark brand colors keep readable text contrast',()=>{
 for(const [mode,t] of [['light',light],['dark',dark]]){
  for(const [fg,bg] of [['text','bg'],['text','surface'],['text-muted','bg'],['text-muted','surface'],['green-text','surface'],['coral-text','surface'],['hero-text','hero-1']]){
   assert.ok(ratio(rgb(t[fg]),rgb(t[bg]))>=4.5,`${mode}: --${fg} on --${bg} has insufficient contrast`);
  }
 }
});

test('night summary surfaces are subdued and small labels stay readable',()=>{
 for(const key of ['hero-1','selected','chip-on-bg']){
  assert.ok(lum(rgb(dark[key]))<0.06,`--${key} is too bright for a night card`);
 }
 for(const [fg,bg] of [['hero-muted','hero-1'],['green-text','selected'],['chip-on-fg','chip-on-bg']]){
  assert.ok(ratio(rgb(dark[fg]),rgb(dark[bg]))>=4.5,`${fg} on ${bg}`);
 }
});

test('light and night spending badges pair each status ink with a readable background',()=>{
 const pairs=[['pace-ok','pace-ok-bg'],['pace-warning','pace-warning-bg'],['pace-over','pace-over-bg']];
 for(const [ink,background] of pairs){
  assert.ok(ratio(rgb(light[ink]),rgb(light[background]))>=4.5,`light ${ink}`);
  assert.ok(ratio(rgb(dark[ink]),rgb(dark[background]))>=4.5,`dark ${ink}`);
 }
});

test('local font files are referenced by the token stylesheet',()=>{
 for(const font of ['marhey-400-arabic','marhey-400-latin','rubik-400-arabic','rubik-400-latin','rubik-600-arabic','rubik-600-latin','rubik-800-arabic','rubik-800-latin']){
  assert.ok(tokens.includes(`./fonts/dabburha/${font}.woff2`),font);
  assert.ok(fs.existsSync(path.join(root,'fonts/dabburha',font+'.woff2')),font);
 }
 assert.ok(fs.existsSync(path.join(root,'fonts/dabburha/MARHEY-OFL.txt')));
 assert.ok(fs.existsSync(path.join(root,'fonts/dabburha/RUBIK-OFL.txt')));
 assert.doesNotMatch(tokens,/https?:\/\//,'fonts must not require network access');
});

test('icon PNGs match expected dimensions and maskable PWA entries exist',()=>{
 const png=(f,size)=>{const b=fs.readFileSync(path.join(root,f));assert.equal(b.readUInt32BE(16),size,f);assert.equal(b.readUInt32BE(20),size,f)};
 png('icon-16.png',16);png('icon-32.png',32);png('apple-touch-icon.png',180);
 png('icon-192.png',192);png('icon-512.png',512);png('icon-maskable-192.png',192);png('icon-maskable-512.png',512);
 for(const size of ['192x192','512x512'])assert.ok(manifest.icons.some(i=>i.purpose==='maskable'&&i.sizes===size));
});

test('keyboard focus remains visible after the visual reskin',()=>{
 assert.match(theme,/:focus-visible/);
});

test('the existing financial storage keys are unchanged',()=>{
 const store=read('src/app/store.js');
 assert.match(store,/KEY\s*=\s*'weenrahat-v3'/);
 assert.match(store,/SNAPSHOT_KEY\s*=\s*'weenrahat-v3-snapshot'/);
 assert.match(store,/THEME_KEY\s*=\s*'thukhr-appearance-v1'/);
});
