/* وين راحت؟ — polished A4 personal financial report.
 * Offline canvas-to-PDF generator; no print dialogs, remote assets, or financial-data writes.
 * The greeting name comes only from state.settings.name; timestamps are captured locally at generation.
 */
(function(root){
'use strict';
const PAGE_W=1240, PAGE_H=1754, PDF_W=595.28, PDF_H=841.89;
const C={
  navy:'#10263B', navy2:'#163858', mint:'#35E3D0', mintSoft:'#D9F7F2',
  mintInk:'#09665B', coral:'#BF3754', rose:'#FBE9ED', paper:'#F4F8FF',
  ink:'#162A43', gray:'#53657E', line:'#DCE7F1', soft:'#F3F7FC', white:'#FFFFFF'
};
const fmt=v=>String(v===undefined||v===null?'':v);
function font(ctx,size=22,weight=400){
  ctx.font=weight+' '+size+'px "Readex Pro",Tahoma,Arial,sans-serif';
}
function rtl(ctx,value,x,y,size=22,color=C.ink,weight=400,maxWidth){
  ctx.save();font(ctx,size,weight);ctx.fillStyle=color;
  ctx.direction='rtl';ctx.textAlign='right';ctx.textBaseline='middle';
  ctx.fillText(fmt(value),x,y,maxWidth);ctx.restore();
}
function ltr(ctx,value,x,y,size=22,color=C.ink,weight=400,maxWidth){
  ctx.save();font(ctx,size,weight);ctx.fillStyle=color;
  ctx.direction='ltr';ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillText(fmt(value),x,y,maxWidth);ctx.restore();
}
function rect(ctx,x,y,w,h,fill,stroke){
  ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.strokeRect(x+.75,y+.75,w-1.5,h-1.5);}
}
function rounded(ctx,x,y,w,h,r,fill,stroke){
  const radius=Math.min(r,w/2,h/2);
  ctx.save();ctx.beginPath();
  ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);
  ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);
  ctx.arcTo(x,y,x+w,y,radius);ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}
  ctx.restore();
}
function line(ctx,x1,y1,x2,y2,color=C.line,width=2){
  ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;
  ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
}
function wrap(ctx,value,maxWidth,maxLines=2){
  const words=fmt(value).replace(/\s+/g,' ').trim().split(' ');
  const lines=[];let current='';
  for(const word of words){
    const next=current?current+' '+word:word;
    if(ctx.measureText(next).width<=maxWidth){current=next;continue;}
    if(current){lines.push(current);current=word;}else current=word;
    if(lines.length>=maxLines){lines[maxLines-1]+='…';return lines;}
  }
  if(current)lines.push(current);
  return lines.slice(0,maxLines);
}
function prepareReport(report,when=new Date()){
  if(!report||!Array.isArray(report.entries)||!Array.isArray(report.wallets))
    throw Error('تعذر تحضير بيانات الكشف.');
  const now=new Date(when);
  if(!Number.isFinite(now.getTime()))throw Error('تعذر تحديد تاريخ إنشاء التقرير.');
  const name=typeof report.ownerName==='string'?report.ownerName.trim().slice(0,40):'';
  return {
    ...report, ownerName:name||'غير مسجّل',
    generatedDate:new Intl.DateTimeFormat('ar-IQ',{day:'numeric',month:'long',year:'numeric'}).format(now),
    generatedTime:new Intl.DateTimeFormat('ar-IQ',{hour:'2-digit',minute:'2-digit',hour12:true}).format(now),
    generatedAt:now
  };
}
function pageHeader(ctx,data,isFirst){
  rect(ctx,0,0,PAGE_W,isFirst?230:166,C.navy);
  rect(ctx,0,isFirst?225:161,PAGE_W,5,C.mint);
  rounded(ctx,1080,34,92,8,4,C.mint);
  rtl(ctx,data.brand||'وين راحت؟',1172,72,31,C.white,700,660);
  rtl(ctx,'تقرير مالي شخصي',1172,116,20,C.mint,550);
  if(isFirst){
    rtl(ctx,'ملخص الشهر المالي',1172,171,42,C.white,700,1030);
    rtl(ctx,'الفترة: '+data.from+'  —  '+(data.to||data.from),1172,211,19,'#D4E5F3',450);
    ltr(ctx,'NEO FINANCE  /  PERSONAL STATEMENT',69,181,17,'#8DA9C1',600);
  }else{
    rtl(ctx,'تفاصيل التقرير  •  متابعة',1172,146,22,C.white,600);
    rtl(ctx,'صاحب التقرير: '+data.ownerName,675,72,20,'#D4E5F3',500,530);
    ltr(ctx,'WEEN RAHAT  /  REPORT',69,145,15,'#8DA9C1',600);
  }
}
function metaCard(ctx,data){
  rounded(ctx,69,246,1103,122,20,C.white,C.line);
  rect(ctx,1138,266,6,81,C.mint);
  line(ctx,653,269,653,344,C.line,2);
  line(ctx,347,269,347,344,C.line,2);
  rtl(ctx,'الاسم المسجّل في التحية',1120,282,18,C.gray,500,450);
  rtl(ctx,data.ownerName,1120,325,29,C.ink,700,442);
  rtl(ctx,'تاريخ إنشاء التقرير',624,282,18,C.gray,500,263);
  rtl(ctx,data.generatedDate,624,325,23,C.ink,650,258);
  rtl(ctx,'وقت إنشاء التقرير',317,282,18,C.gray,500,242);
  rtl(ctx,data.generatedTime,317,325,23,C.ink,650,242);
}
function heading(ctx,title,y,note=''){
  rounded(ctx,1154,y-13,7,27,3,C.mint);
  rtl(ctx,title,1136,y,28,C.navy,700,925);
  if(note)ltr(ctx,note,69,y,15,C.gray,500,200);
  line(ctx,69,y+26,1172,y+26,C.line,2);
}
function kpi(ctx,x,y,width,label,value,tone='neutral'){
  const accent=tone==='income'?C.mint:tone==='expense'?C.coral:C.navy2;
  rounded(ctx,x,y,width,119,17,C.white,C.line);
  rounded(ctx,x+width-15,y+17,5,85,2,accent);
  rtl(ctx,label,x+width-32,y+38,19,C.gray,500,width-63);
  rtl(ctx,value,x+width-32,y+84,30,tone==='expense'?C.coral:C.ink,700,width-63);
}
function walletTable(ctx,data,top){
  heading(ctx,'الميزانية حسب الفئات',top,'BUDGET');
  const x=69,w=1103,cols=[277,271,271,284],titles=['الفئة','السقف الشهري','المصروف','المتبقي'];
  const headY=top+43;
  rounded(ctx,x,headY,w,52,12,C.navy2);
  let right=1172;
  for(let i=0;i<titles.length;i++){rtl(ctx,titles[i],right-17,headY+27,19,C.white,600,cols[i]-29);right-=cols[i];}
  const rowY=headY+52;
  for(let i=0;i<data.wallets.length;i++){
    const y=rowY+i*58,row=data.wallets[i];
    rect(ctx,x,y,w,58,i%2===0?C.white:C.soft);
    line(ctx,x,y+57,x+w,y+57,C.line,1.5);
    const vals=[row.name,row.budget,row.spent,row.balance];right=1172;
    for(let j=0;j<vals.length;j++){
      rtl(ctx,vals[j],right-17,y+29,j===0?20:21,
        j===3?C.mintInk:C.ink,j===0?650:550,cols[j]-28);
      right-=cols[j];
    }
  }
  return rowY+data.wallets.length*58;
}
const CELL_W=[168,171,542,222],HEADINGS=['التاريخ','العملية','البيان والتفاصيل','المبلغ'];
function transactionsHeader(ctx,y,count,continued){
  heading(ctx,continued?'سجل الحركات (تابع)':'سجل الحركات التفصيلي ('+count+')',y,'TRANSACTIONS');
  const top=y+43;
  rounded(ctx,69,top,1103,56,12,C.navy2);
  let right=1172;
  for(let i=0;i<HEADINGS.length;i++){rtl(ctx,HEADINGS[i],right-12,top+28,18,C.white,600,CELL_W[i]-23);right-=CELL_W[i];}
  return top+56;
}
function txRow(ctx,entry,y,idx){
  rect(ctx,69,y,1103,76,idx%2===0?C.white:C.soft);
  line(ctx,69,y+75,1172,y+75,C.line,1.5);
  const date=fmt(entry.date),kind=fmt(entry.type),note=fmt(entry.note),cat=fmt(entry.category),value=fmt(entry.amount);
  const tone=kind==='مصروف'?C.coral:kind==='دخل'?C.mintInk:C.ink;
  let right=1172;
  rtl(ctx,date,right-12,y+38,19,C.gray,500,CELL_W[0]-23);right-=CELL_W[0];
  rtl(ctx,kind,right-12,y+38,19,tone,600,CELL_W[1]-23);right-=CELL_W[1];
  ctx.save();font(ctx,18);const lines=wrap(ctx,note+(cat?' | '+cat:''),CELL_W[2]-32,2);ctx.restore();
  if(lines.length===1)rtl(ctx,lines[0],right-12,y+38,18,C.ink,500,CELL_W[2]-26);
  else{
    rtl(ctx,lines[0],right-12,y+25,18,C.ink,500,CELL_W[2]-26);
    rtl(ctx,lines[1],right-12,y+51,18,C.gray,400,CELL_W[2]-26);
  }
  right-=CELL_W[2];
  rtl(ctx,value,right-12,y+38,21,tone,650,CELL_W[3]-25);
}
function blankRows(ctx,y){
  rounded(ctx,69,y,1103,98,12,C.soft,C.line);
  rtl(ctx,'لا توجد حركات مالية ضمن الفترة المحددة.',1140,y+49,22,C.gray,500,1020);
}
function footer(ctx,data,page,total){
  line(ctx,69,1648,1172,1648,C.line,2);
  rtl(ctx,'أُعدّ باسم: '+data.ownerName+'   |   '+data.generatedDate+'   |   '+data.generatedTime,
    1172,1678,17,C.navy,600,1100);
  rtl(ctx,'التحويل بين الحسابات لا يُعدّ مصروفاً. هذا تقرير شخصي، وليس وثيقة مصرفية رسمية.',
    1172,1706,16,C.gray,400,1100);
  rtl(ctx,'صفحة '+page+' من '+total,1172,1734,18,C.navy,650);
  ltr(ctx,fmt(data.period),69,1734,17,C.gray);
}
function renderPage(data,rows,firstPage,pageNo,totalPages,walletRows=null){
  const canvas=document.createElement('canvas');canvas.width=PAGE_W;canvas.height=PAGE_H;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw Error('المتصفح لا يدعم إنشاء صفحات التقرير.');
  rect(ctx,0,0,PAGE_W,PAGE_H,C.paper);
  pageHeader(ctx,data,firstPage);
  let y=-1;
  if(firstPage){
    metaCard(ctx,data);
    const cards=[
      ['رصيد بداية الشهر',data.stats.opening||'0','neutral'],
      ['الدخل',data.stats.income,'income'],
      ['المصروف',data.stats.expenses,'expense'],
      ['صافي الدخل والمصروف',data.stats.net||'0','neutral'],
      ['رصيد نهاية الشهر',data.stats.total,'income'],
      ['عدد الحركات',data.stats.count||'0','neutral']
    ];
    cards.forEach((v,i)=>kpi(ctx,69+(i%3)*374,397+Math.floor(i/3)*138,355,v[0],v[1],v[2]));
    y=walletTable(ctx,{...data,wallets:data.wallets.slice(0,8)},686);
    y=transactionsHeader(ctx,y+38,data.entries.length,false);
  }else if(walletRows){
    walletTable(ctx,{...data,wallets:walletRows},191);
  }else y=transactionsHeader(ctx,191,data.entries.length,true);
  if(y>=0){
    if(!rows.length)blankRows(ctx,y);
    else rows.forEach((entry,i)=>txRow(ctx,entry,y+i*76,firstPage?i:pageNo*1000+i));
  }
  footer(ctx,data,pageNo,totalPages);
  const url=canvas.toDataURL('image/jpeg',.91);
  canvas.width=1;canvas.height=1;
  const b64=url.slice(url.indexOf(',')+1),binary=atob(b64),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return bytes;
}
function searchableAscii(value){return String(value??'').replace(/[^\x20-\x7e]/g,' ').replace(/[()\\]/g,' ').slice(0,180);}
function buildPDF(jpegs,searchRows=[]){
 const searchable=jpegs.map((_,i)=>(searchRows[i]||[]).map(t=>
  [t.id||'',t.date||'',t.amount||'',t.method||'',t.type||''].map(searchableAscii).join(' ')).slice(0,30));
 const fontId=3+jpegs.length*3;
  const encoder=new TextEncoder(),parts=[],offsets=[],numberOfObjects=fontId;
  let size=0;
  function put(data){const bytes=typeof data==='string'?encoder.encode(data):data;parts.push(bytes);size+=bytes.length;}
  function object(id,content){offsets[id]=size;put(id+' 0 obj\n');put(content);put('\nendobj\n');}
  put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,'<< /Type /Pages /Kids ['+jpegs.map((_,i)=>(3+3*i)+' 0 R').join(' ')+'] /Count '+jpegs.length+' >>');
  jpegs.forEach((jpg,i)=>{
    const page=3+i*3,content=page+1,image=page+2;
    object(page,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PDF_W+' '+PDF_H+'] /Resources << /XObject << /Im0 '+image+' 0 R >> /Font << /F1 '+fontId+' 0 R >> >> /Contents '+content+' 0 R >>');
    const layer=(searchable[i]||[]).map((s,j)=>'BT /F1 5 Tf 3 Tr 10 '+(25+j*7)+' Td ('+s+') Tj ET\n').join('');
    const stream='q\n'+PDF_W+' 0 0 '+PDF_H+' 0 0 cm\n/Im0 Do\nQ\n'+layer;
    object(content,'<< /Length '+encoder.encode(stream).length+' >>\nstream\n'+stream+'endstream');
    offsets[image]=size;put(image+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+PAGE_W+' /Height '+PAGE_H+
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpg.length+' >>\nstream\n');
    put(jpg);put('\nendstream\nendobj\n');
  });
  object(fontId,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const xref=size;
  put('xref\n0 '+(numberOfObjects+1)+'\n0000000000 65535 f \n');
  for(let i=1;i<=numberOfObjects;i++)put(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
  put('trailer\n<< /Size '+(numberOfObjects+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
  return new Blob(parts,{type:'application/pdf'});
}
async function download(report){
  const data=prepareReport(report,new Date());
  if(document.fonts&&document.fonts.load){
    await Promise.allSettled([
      document.fonts.load('400 26px "Readex Pro"','وين راحت؟ 0123'),
      document.fonts.load('600 26px "Readex Pro"','وين راحت؟ 0123'),
      document.fonts.load('700 26px "Readex Pro"','وين راحت؟ 0123')
    ]);
  }
  const rows=data.entries;
  // Summary and all categories are preserved; overflow has dedicated A4 pages.
  const firstWalletCount=Math.min(8,data.wallets.length);
  const firstTxY=686+95+firstWalletCount*58+38+99;
  const firstCount=Math.min(rows.length,Math.max(0,Math.floor((1630-firstTxY)/76)));
  const nextCount=17;
  const pages=[{rows:rows.slice(0,firstCount)}];
  for(let i=8;i<data.wallets.length;i+=18)
    pages.push({rows:[],walletRows:data.wallets.slice(i,i+18)});
  for(let i=firstCount;i<rows.length;i+=nextCount)
    pages.push({rows:rows.slice(i,i+nextCount)});
  if(pages.length>100)throw Error('التقرير كبير جداً؛ قسّم الفترة إلى أشهر أصغر.');
  const jpegs=[];
  for(let i=0;i<pages.length;i++)
    jpegs.push(renderPage(data,pages[i].rows,i===0,i+1,pages.length,pages[i].walletRows||null));
  const blob=buildPDF(jpegs,pages.map(p=>p.rows));
  if(blob.size<3000)throw Error('لم يكتمل توليد ملف PDF.');
  const stamp=[
    data.generatedAt.getFullYear(),
    String(data.generatedAt.getMonth()+1).padStart(2,'0'),
    String(data.generatedAt.getDate()).padStart(2,'0'),
    '-',
    String(data.generatedAt.getHours()).padStart(2,'0'),
    String(data.generatedAt.getMinutes()).padStart(2,'0')
  ].join('');
  const filename='Ween-Rahat_Statement_'+fmt(data.period).replace(/[^0-9-]/g,'')+'_'+stamp+'.pdf';
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;a.style.display='none';document.body.appendChild(a);
  try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  return {filename,bytes:blob.size,pages:pages.length,generatedDate:data.generatedDate,generatedTime:data.generatedTime};
}
root.ThukhrPDF={download,buildPDF,prepareReport};
})(window);
