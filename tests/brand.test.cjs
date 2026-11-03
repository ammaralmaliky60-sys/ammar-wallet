'use strict';
// Visual identity "وين راحت؟": name, palette, contrast, font and icons.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html'),css=read('styles.css'),fonts=read('fonts.css'),manifest=JSON.parse(read('manifest.webmanifest'));
const walk=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
const shipped=['index.html','manifest.webmanifest','report-pdf.js','sw.js','styles.css','fonts.css',...walk('src')];

// ---- helpers -------------------------------------------------------------
const block=selector=>{
 const at=css.indexOf(selector+'{');
 assert.ok(at>=0,`styles.css block not found: ${selector}`);
 const body=css.slice(at+selector.length+1,css.indexOf('}',at));
 return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)].map(m=>[m[1],m[2].toUpperCase()]));
};
const light=block(':root,\nbody[data-theme="light"]');
const dark=block('body[data-theme="dark"]');
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lum=c=>c.map(v=>v/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
const tint=(color,base,p)=>rgb(color).map((v,i)=>v*p+rgb(base)[i]*(1-p));

// ---- name ----------------------------------------------------------------
test('older names and the old tagline do not appear in the shipped app',()=>{
 for(const file of shipped){
  const text=read(file);
  assert.doesNotMatch(text,/فِرزة|فرزة|ذُخر/,`${file} still uses an old name`);
  assert.doesNotMatch(text,/كل مبلغ بمكانه/,`${file} still has the old tagline`);
 }
});

test('title, description and manifest carry the name with its question mark',()=>{
 assert.match(html,/<title>وين راحت؟ \| اعرف فلوسك وين تروح<\/title>/);
 assert.match(html,/<meta name="description" content="وين راحت؟/);
 assert.equal(manifest.short_name,'وين راحت؟');
 assert.match(manifest.name,/^وين راحت؟/);
});

test('the header question mark is wrapped so it can be coloured coral',()=>{
 assert.equal((html.match(/وين راحت<span class="brand-q">؟<\/span>/g)||[]).length,2,'sidebar and mobile header');
 assert.match(css,/\.brand-q\{color:var\(--brand-coral\)\}/);
});

// ---- palette -------------------------------------------------------------
test('light tokens are exactly the specified palette',()=>{
 assert.deepEqual(
  {g:light['brand-green'],c:light['brand-coral'],gold:light['brand-gold'],bg:light.bg,s:light.surface,t:light.text,m:light['text-muted'],b:light.border},
  {g:'#0F5E56',c:'#E0674B',gold:'#D9A441',bg:'#F6F2EA',s:'#FFFFFF',t:'#14201F',m:'#4A5655',b:'#E2DCCF'});
});

test('dark tokens are exactly the specified palette, also when the device prefers dark',()=>{
 const want={'brand-green':'#3FA394','bg':'#14201F','surface':'#1C2B2A','text':'#F6F2EA','text-muted':'#A9B5B3','border':'#2A3B39'};
 for(const [k,v] of Object.entries(want))assert.equal(dark[k],v,`--${k}`);
 const media=css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
 const firstBlock=media.slice(0,media.indexOf('}\n}'));
 for(const [k,v] of Object.entries(want))assert.match(firstBlock,new RegExp(`--${k}:${v}`,'i'),`prefers-color-scheme block: --${k}`);
});

test('theme-color follows light and dark',()=>{
 assert.match(html,/<meta name="theme-color" content="#F6F2EA" media="\(prefers-color-scheme: light\)">/);
 assert.match(html,/<meta name="theme-color" content="#14201F" media="\(prefers-color-scheme: dark\)">/);
 assert.match(read('src/app/main.js'),/dark \? '#14201F' : '#F6F2EA'/);
});

// ---- contrast ------------------------------------------------------------
for(const [mode,t] of [['light',light],['dark',dark]]){
 test(`text contrast is at least 4.5:1 in ${mode} mode`,()=>{
  const pairs=[
   ['text','bg'],['text','surface'],['text','surface-2'],['text-muted','bg'],['text-muted','surface'],['text-muted','surface-2'],
   ['green-text','bg'],['green-text','surface'],['gold-text','bg'],['gold-text','surface'],['coral-text','bg'],['coral-text','surface'],
   ['on-green','brand-green'],['on-coral','brand-coral'],['hero-text','hero-1'],['hero-text','hero-2']
  ];
  for(const [fg,bg] of pairs){
   const r=ratio(rgb(t[fg]),rgb(t[bg]));
   assert.ok(r>=4.5,`${mode}: --${fg} on --${bg} is ${r.toFixed(2)}:1`);
  }
  // Status pills put coloured text on a 10% tint of the same hue.
  for(const [fg,hue] of [['gold-text','brand-gold'],['coral-text','brand-coral'],['green-text','brand-green']])
   for(const base of ['bg','surface']){
    const r=ratio(rgb(t[fg]),tint(t[hue],t[base],0.10));
    assert.ok(r>=4.5,`${mode}: --${fg} on a 10% ${hue} tint over --${base} is ${r.toFixed(2)}:1`);
   }
 });
}

test('white text never sits on coral: the spend buttons use dark text',()=>{
 assert.ok(ratio(rgb('#FFFFFF'),rgb(light['brand-coral']))<4.5,'sanity: white on coral fails');
 assert.equal(light['on-coral'],'#14201F');
 assert.match(css,/\.btn\.spend\{background:var\(--brand-coral\);color:var\(--on-coral\)/);
 assert.match(css,/\.tab-add\{[^}]*background:var\(--brand-coral\);color:var\(--on-coral\)/);
});

test('cards use 16px corners and buttons 12px; touch targets are 44px on phones',()=>{
 assert.match(css,/--r-card:16px;--r-btn:12px/);
 assert.match(css,/\.btn\{[^}]*min-height:44px/);
 assert.match(css,/@media \(max-width:899px\)\{\n button,\.btn,[^{]*\{min-height:44px\}/);
});

// ---- typography and icons ------------------------------------------------
test('Readex Pro is self-hosted and used everywhere, with tabular figures',()=>{
 assert.match(fonts,/font-family:"Readex Pro"/);
 for(const subset of ['arabic','latin','latin-ext'])assert.ok(fs.existsSync(path.join(root,'fonts/readex-pro/ReadexPro-'+subset+'.woff2')),subset);
 assert.ok(fs.existsSync(path.join(root,'fonts/readex-pro/OFL.txt')),'licence');
 assert.match(css,/body\{[^}]*font:400 15px\/1\.65 "Readex Pro"/);
 assert.match(css,/body\{[^}]*font-variant-numeric:tabular-nums/);
});

test('icon.svg is the supplied app icon and the PNG sizes exist',()=>{
 const icon=read('icon.svg');
 assert.match(icon,/<rect width="120" height="120" rx="28" fill="#0F5E56"\/>/);
 assert.match(icon,/<circle cx="52" cy="68" r="30" fill="#D9A441"\/>/);
 const png=(f,size)=>{const b=fs.readFileSync(path.join(root,f));assert.equal(b.readUInt32BE(16),size,f);assert.equal(b.readUInt32BE(20),size,f)};
 png('icon-192.png',192);png('icon-512.png',512);png('icon-maskable-512.png',512);png('apple-touch-icon.png',180);
 assert.ok(manifest.icons.some(i=>i.purpose==='maskable'&&i.src==='./icon-maskable-512.png'));
});
