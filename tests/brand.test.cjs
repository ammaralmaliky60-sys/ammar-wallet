'use strict';
// Brand updates must remain visual: storage keys, schema and core behavior are unchanged.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html'),theme=read('dabburha-theme.css'),tokens=read('dabburha-tokens.css'),manifest=JSON.parse(read('manifest.webmanifest'));
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lum=c=>c.map(v=>v/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
const block=(selector)=>{
 const at=theme.indexOf(selector+'{');assert.ok(at>=0,`theme block missing ${selector}`);
 return Object.fromEntries([...theme.slice(at+selector.length+1,theme.indexOf('}',at)).matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)].map(m=>[m[1],m[2].toUpperCase()]));
};
const light=block(':root,\nbody[data-theme="light"] '),dark=block(':root[data-theme="dark"],\nbody[data-theme="dark"] ');

test('Dabburha name, Arabic copy, PWA metadata and supplied icon are active',()=>{
 assert.match(html,/<title>دبّرها<\/title>/);
 assert.match(html,/الشهر طويل والراتب قصير؟ دبّرها\./);
 assert.equal(manifest.name,'دبّرها');assert.equal(manifest.short_name,'دبّرها');
 assert.equal(manifest.dir,'rtl');assert.equal(manifest.theme_color,'#FFE600');
 assert.match(read('icon.svg'),/<title>دبّرها<\/title>/);
});

test('light and dark brand colors keep readable text contrast',()=>{
 for(const [mode,t] of [['light',light],['dark',dark]]){
  for(const [fg,bg] of [['text','bg'],['text','surface'],['text-muted','bg'],['text-muted','surface'],['green-text','surface'],['coral-text','surface'],['hero-text','hero-1']]){
   assert.ok(ratio(rgb(t[fg]),rgb(t[bg]))>=4.5,`${mode}: --${fg} on --${bg} has insufficient contrast`);
  }
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
