/* فِرزة — app/interactions.js
 * Presentation-only interaction layer: turns short <select> menus into tappable choice cards/chips,
 * adds quick-amount chips, animated figures and page-enter motion. It never touches the ledger:
 * every choice still writes to the original <select>, so forms, validation and tests are unchanged.
 * Classic script: shares the global scope with the other app/*.js files, loaded in the order listed in index.html. */
'use strict';

/* Icons for well-known option values (anything else falls back to a colour dot or plain chip). */
const CHOICE_ICONS={
 card:'card',cash:'cash',salary:'wallet','salary-only':'wallet',incentives:'trend',both:'income',split:'transfer',
 reserve:'clock',withheld:'check',pay:'check',spend:'wallet',saving:'saving',emergency:'shield',
 home:'home',personal:'user',kids:'kids',vegetables:'home',monthly:'calendar',none:'close',
 in:'income',out:'arrow',to:'arrow',from:'transfer'
};
const CHOICE_MAX_OPTIONS=8,CHOICE_MAX_LABEL=46;
const prefersReducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;

function choiceColor(value){
 const list=[...(typeof livingAllCategories==='function'?livingAllCategories():[]),...(state?.wallets||[])];
 const color=list.find(item=>item.id===value)?.color;
 return /^#[0-9a-f]{3,8}$/i.test(color||'')?color:'';
}
function choiceOptions(select){
 return [...select.options].filter(o=>!(o.value===''&&o.disabled)).map(o=>{
  const [label,...rest]=o.textContent.split(' · ');
  return {value:o.value,label:label.trim(),sub:rest.join(' · ').trim(),disabled:o.disabled};
 });
}
function choiceSignature(select){return [...select.options].map(o=>o.value+'\u0001'+o.textContent+'\u0001'+o.disabled).join('\u0002')}
function canEnhanceSelect(select){
 // Disabled menus only display a fixed value; a row of greyed-out chips would add noise.
 if(select.multiple||select.disabled||select.dataset.native!==undefined||!select.closest('.field'))return false;
 const options=choiceOptions(select);
 return options.length>=1&&options.length<=CHOICE_MAX_OPTIONS&&options.every(o=>o.label.length<=CHOICE_MAX_LABEL);
}
function choiceStyle(options){
 const iconic=options.every(o=>CHOICE_ICONS[o.value]),colored=options.every(o=>choiceColor(o.value));
 if(colored)return 'chips';
 if(iconic&&options.length<=3)return 'cards';
 return options.length<=3&&options.every(o=>o.label.length<=18)?'segment':'chips';
}
function choiceMarkup(select){
 const options=choiceOptions(select),style=choiceStyle(options);
 return {style,html:options.map(o=>{
  const color=choiceColor(o.value),glyph=CHOICE_ICONS[o.value];
  const mark=color?`<span class="fz-choice-dot" style="--dot:${color}" aria-hidden="true"></span>`:
   glyph&&style!=='segment'?`<span class="fz-choice-ic" aria-hidden="true">${icon(glyph)}</span>`:'';
  return `<button type="button" role="radio" class="fz-choice-opt" data-value="${safe(o.value)}" ${o.disabled?'disabled':''}>`+
   `${mark}<span class="fz-choice-text"><span class="fz-choice-label">${safe(o.label)}</span>`+
   `${o.sub?`<span class="fz-choice-sub">${safe(o.sub)}</span>`:''}</span></button>`;
 }).join('')};
}
function syncChoiceGroup(group){
 const select=group.fzSelect;
 if(!select?.isConnected){group.remove();return}
 const signature=choiceSignature(select);
 if(group.dataset.signature!==signature){
  if(!canEnhanceSelect(select)){unenhanceSelect(select);return}
  const {style,html}=choiceMarkup(select);
  group.dataset.style=style;group.innerHTML=html;group.dataset.signature=signature;
  // Chips and cards need the whole row; a half-width grid cell would stack them vertically.
  select.closest('.field')?.classList.toggle('fz-field-wide',style!=='segment');
 }
 if(select.disabled){unenhanceSelect(select);return}
 group.classList.toggle('is-disabled',select.disabled);
 let focusable=null;
 for(const button of group.querySelectorAll('.fz-choice-opt')){
  const on=button.dataset.value===select.value;
  button.setAttribute('aria-checked',String(on));
  button.disabled=select.disabled||[...select.options].find(o=>o.value===button.dataset.value)?.disabled===true;
  button.tabIndex=-1;
  if(on)focusable=button;
 }
 const target=focusable||group.querySelector('.fz-choice-opt:not(:disabled)');
 if(target)target.tabIndex=0;
}
function unenhanceSelect(select){
 select.fzChoice?.remove();
 delete select.fzChoice;
 select.closest('.field')?.classList.remove('fz-field-wide');
 select.classList.remove('fz-select-hidden');
 select.removeAttribute('tabindex');
 select.removeAttribute('aria-hidden');
}
function chooseValue(group,button){
 const select=group.fzSelect;
 if(!select||button.disabled||select.disabled)return;
 if(select.value!==button.dataset.value){
  select.value=button.dataset.value;
  select.dispatchEvent(new Event('input',{bubbles:true}));
  select.dispatchEvent(new Event('change',{bubbles:true}));
  try{navigator.vibrate?.(8)}catch{/* Haptics are optional. */}
 }
 syncChoiceGroup(group);
 group.querySelector('[aria-checked="true"]')?.focus({preventScroll:true});
}
function enhanceSelect(select){
 if(select.fzChoice||!canEnhanceSelect(select))return;
 const field=select.closest('.field'),label=field.querySelector(`label[for="${CSS.escape(select.id)}"]`)||field.querySelector('label');
 const group=document.createElement('div');
 group.className='fz-choice';
 group.setAttribute('role','radiogroup');
 if(label){label.id||=`${select.id||select.name}-label`;group.setAttribute('aria-labelledby',label.id)}
 group.fzSelect=select;select.fzChoice=group;
 select.classList.add('fz-select-hidden');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
 select.after(group);
 syncChoiceGroup(group);
}
function onChoiceKey(event){
 const group=event.target.closest('.fz-choice');
 if(!group)return;
 const keys={ArrowLeft:1,ArrowDown:1,ArrowRight:-1,ArrowUp:-1};// RTL: left moves forward.
 if(event.key===' '||event.key==='Enter'){event.preventDefault();chooseValue(group,event.target.closest('.fz-choice-opt'));return}
 if(!(event.key in keys))return;
 event.preventDefault();
 const buttons=[...group.querySelectorAll('.fz-choice-opt:not(:disabled)')];
 const index=buttons.indexOf(event.target.closest('.fz-choice-opt'));
 const next=buttons[(index+keys[event.key]+buttons.length)%buttons.length];
 if(next)chooseValue(group,next);
}

/* Quick-amount chips: add common amounts to an expense field with one tap. */
function quickAmountSteps(){return ccy().dec?[1,5,10,50]:[1000,5000,10000,25000]}
function enhanceAmountInput(input){
 if(input.fzAmountChips||!input.closest('.field'))return;
 const row=document.createElement('div');
 row.className='fz-amount-chips';
 row.setAttribute('aria-label','إضافة مبلغ سريع');
 row.innerHTML=quickAmountSteps().map(step=>`<button type="button" data-step="${step}">+${safe(fmt(step*10**ccy().dec))}</button>`).join('');
 input.fzAmountChips=row;
 input.closest('.field').append(row);
}
function addQuickAmount(button){
 const input=button.closest('.field')?.querySelector('input[data-money]');
 if(!input)return;
 let current=0;
 try{current=input.value.trim()?amount(input.value,true):0}catch{current=0}
 input.value=inputMoney(current+Number(button.dataset.step)*10**ccy().dec);
 formatMoneyInput(input);
 input.dispatchEvent(new Event('input',{bubbles:true}));
 input.dispatchEvent(new Event('change',{bubbles:true}));
 button.classList.remove('is-bumped');void button.offsetWidth;button.classList.add('is-bumped');
 try{navigator.vibrate?.(6)}catch{/* Haptics are optional. */}
}

/* Animated figures: large amounts count from their previous value to the new one. */
const COUNT_TARGETS=['.fz-lite-hero>strong .num','.fz-lite-hero-split .num','.fz-lite-income-card>strong .num','.fz-lite-fixed-overview>strong .num','.fz-lite-fixed-metrics .num'];
const countMemory=new Map();
function readFigure(text){
 const latin=text.replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/٫/g,'.').replace(/[,٬\s]/g,'');
 return /^\d+(\.\d+)?$/.test(latin)?{value:Number(latin),decimals:(latin.split('.')[1]||'').length}:null;
}
function animateFigures(root){
 const locale=state?.settings?.digits==='ar'?'ar-IQ':'en-US',reduce=prefersReducedMotion();
 COUNT_TARGETS.forEach(selector=>root.querySelectorAll(selector).forEach((node,index)=>{
  const key=`${page}|${selector}|${index}`,finalText=node.textContent,figure=readFigure(finalText);
  const from=countMemory.get(key);
  if(!figure){countMemory.delete(key);return}
  countMemory.set(key,figure.value);
  const start=from??0;
  if(reduce||start===figure.value)return;
  const format=new Intl.NumberFormat(locale,{minimumFractionDigits:figure.decimals,maximumFractionDigits:figure.decimals});
  const began=performance.now(),duration=from===undefined?900:600;
  node.classList.add('fz-counting');
  const step=now=>{
   if(!node.isConnected)return;
   const t=Math.min(1,(now-began)/duration),eased=1-Math.pow(1-t,3);
   node.textContent=t<1?format.format(start+(figure.value-start)*eased):finalText;
   if(t<1)requestAnimationFrame(step);else node.classList.remove('fz-counting');
  };
  requestAnimationFrame(step);
 }));
}

/* Wire everything up after each render or modal update. */
let lastEnhancedPage='';
function enhanceInterface(root=document){
 root.querySelectorAll('select').forEach(enhanceSelect);
 root.querySelectorAll('input[data-quick-amount]').forEach(enhanceAmountInput);
 document.querySelectorAll('.fz-choice').forEach(syncChoiceGroup);
}
function onMainRendered(){
 const main=$('main');
 enhanceInterface(main);
 animateFigures(main);
 if(page!==lastEnhancedPage){
  lastEnhancedPage=page;
  if(!prefersReducedMotion()){
   main.classList.remove('fz-enter');void main.offsetWidth;main.classList.add('fz-enter');
   clearTimeout(onMainRendered.timer);
   onMainRendered.timer=setTimeout(()=>main.classList.remove('fz-enter'),900);// Later re-renders on the same page stay still.
  }
 }
}
function installInteractions(){
 document.body.classList.add('fz-ui');
 let pending=false;
 const schedule=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;onMainRendered();enhanceInterface($('modalContent'))})};
 new MutationObserver(schedule).observe($('main'),{childList:true});
 new MutationObserver(schedule).observe($('modalContent'),{childList:true,subtree:true});
 document.addEventListener('click',event=>{
  const option=event.target.closest('.fz-choice-opt');
  if(option){chooseValue(option.closest('.fz-choice'),option);return}
  const chip=event.target.closest('.fz-amount-chips button');
  if(chip)addQuickAmount(chip);
 });
 document.addEventListener('keydown',onChoiceKey);
 // Code may change a <select> in response to another field: keep chips in step.
 const resync=()=>requestAnimationFrame(()=>document.querySelectorAll('.fz-choice').forEach(syncChoiceGroup));
 document.addEventListener('change',resync);
 document.addEventListener('input',resync);
}
installInteractions();
