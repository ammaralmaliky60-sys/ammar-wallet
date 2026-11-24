/* دبّرها — polished A4 personal financial report.
 * Offline canvas-to-PDF generator; no print dialogs, remote assets, or financial-data writes.
 * The greeting name comes only from state.settings.name; timestamps are captured locally at generation.
 */
(function(root){
'use strict';
const PAGE_W=1240, PAGE_H=1754, PDF_W=595.28, PDF_H=841.89;
const C={
  navy:'#0D0D0D', navy2:'#2D5BFF', mint:'#FFE600', mintSoft:'#FFF8A6',
  mintInk:'#1E3FCC', coral:'#FF2E93', rose:'#FFE6F1', paper:'#FFFFFF',
  ink:'#0D0D0D', gray:'#454545', line:'#0D0D0D', soft:'#FFF8A6', white:'#FFFFFF'
};
const fmt=v=>String(v===undefined||v===null?'':v);
function font(ctx,size=22,weight=400){
  ctx.font=weight+' '+size+'px "Rubik",Tahoma,Arial,sans-serif';
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
  const height=isFirst?180:117;
  rect(ctx,0,0,PAGE_W,height,C.navy2);
  rect(ctx,0,height-4,PAGE_W,4,C.mint);
  rtl(ctx,data.brand||'دبّرها',1172,42,29,C.white,700,660);
  if(isFirst){
    rtl(ctx,'ملخص الشهر المالي',1172,96,36,C.white,700,1030);
    rtl(ctx,'الفترة: '+data.from+'  —  '+(data.to||data.from),1172,146,19,'#D4E5F3',450);
    if(data.currency)rtl(ctx,'العملة: '+data.currency,347,146,19,'#D4E5F3',278);
  }else{
    rtl(ctx,'تفاصيل التقرير · متابعة',1172,82,22,C.white,600);
    rtl(ctx,'صاحب التقرير: '+data.ownerName,675,42,20,'#D4E5F3',500,530);
  }
}
function metaCard(ctx,data){
  rounded(ctx,69,196,1103,94,16,C.white,C.line);
  line(ctx,653,214,653,273,C.line,2);
  line(ctx,347,214,347,273,C.line,2);
  rtl(ctx,'الاسم المسجّل في التحية',1120,223,18,C.gray,500,450);
  rtl(ctx,data.ownerName,1120,258,26,C.ink,700,442);
  rtl(ctx,'تاريخ إنشاء التقرير',624,223,18,C.gray,500,263);
  rtl(ctx,data.generatedDate,624,258,22,C.ink,650,258);
  rtl(ctx,'وقت إنشاء التقرير',317,223,18,C.gray,500,242);
  rtl(ctx,data.generatedTime,317,258,22,C.ink,650,242);
}
function heading(ctx,title,y){
  rounded(ctx,1154,y-11,6,22,3,C.mint);
  rtl(ctx,title,1136,y,25,C.navy,700,1040);
  line(ctx,69,y+23,1172,y+23,C.line,2);
}
function kpi(ctx,x,y,width,label,value,tone='neutral'){
  const accent=tone==='income'?C.mint:tone==='expense'?C.coral:C.navy2;
  rounded(ctx,x,y,width,91,15,C.white,C.line);
  rounded(ctx,x+width-15,y+13,5,65,2,accent);
  rtl(ctx,label,x+width-32,y+28,18,C.gray,500,width-63);
  rtl(ctx,value,x+width-32,y+63,26,tone==='expense'?C.coral:C.ink,700,width-63);
}
const SECTION_GAP=29, HEADER_HEIGHT=42, HEADER_OFFSET=36, CONTENT_BOTTOM=1628;
const TABLES=[
  {key:'incomeSources',title:'الدخل حسب المصدر',headings:['المصدر','المبلغ'],widths:[757,346],rowHeight:42},
  {key:'wallets',title:'الميزانية حسب الفئات',headings:['الفئة','السقف الشهري','المصروف','المتبقي'],widths:[277,271,271,284],rowHeight:42},
  {key:'entries',title:'سجل الحركات',headings:['التاريخ','العملية','البيان والتفاصيل','المبلغ'],widths:[168,171,542,222],rowHeight:50}
];

function layoutPages(data){
  const pages=[[]];
  // The first page also contains the period, owner and balance summary.
  let y=data.entries.length?536:576;
  for(const table of TABLES){
    const rows=data[table.key]||[];
    let offset=0;
    while(offset<rows.length){
      let start=y+HEADER_OFFSET+HEADER_HEIGHT;
      let capacity=Math.floor((CONTENT_BOTTOM-start)/table.rowHeight);
      if(capacity<Math.min(2,rows.length-offset)){
        if(pages.length>=100)throw Error('التقرير كبير جداً؛ قسّم الفترة إلى أشهر أصغر.');
        pages.push([]);
        y=145;
        start=y+HEADER_OFFSET+HEADER_HEIGHT;
        capacity=Math.floor((CONTENT_BOTTOM-start)/table.rowHeight);
      }
      const group=rows.slice(offset,offset+capacity);
      pages.at(-1).push({table,y,start,rows:group,offset});
      y=start+group.length*table.rowHeight+SECTION_GAP;
      offset+=group.length;
    }
  }
  return pages;
}

function drawSection(ctx,section,data){
  const {table,y,start,rows,offset}=section;
  const title=table.title+(offset?' (تابع)':table.key==='entries'?' ('+data.entries.length+')':'');
  heading(ctx,title,y);
  const headY=y+HEADER_OFFSET;
  rounded(ctx,69,headY,1103,HEADER_HEIGHT,9,C.navy2);
  let right=1172;
  table.headings.forEach((label,i)=>{
    rtl(ctx,label,right-14,headY+HEADER_HEIGHT/2,18,C.white,600,table.widths[i]-26);
    right-=table.widths[i];
  });
  rows.forEach((row,i)=>{
    const rowY=start+i*table.rowHeight;
    rect(ctx,69,rowY,1103,table.rowHeight,(i+offset)%2===0?C.white:C.soft);
    line(ctx,69,rowY+table.rowHeight-1,1172,rowY+table.rowHeight-1,C.line,1.5);
    if(table.key==='entries'){
      txRow(ctx,row,rowY,table.widths);
      return;
    }
    const values=table.key==='wallets'?[row.name,row.budget,row.spent,row.balance]:[row.name,row.amount];
    right=1172;
    values.forEach((value,j)=>{
      rtl(ctx,value,right-14,rowY+table.rowHeight/2,19,j===3?C.mintInk:C.ink,j===0?650:550,table.widths[j]-26);
      right-=table.widths[j];
    });
  });
}

function txRow(ctx,entry,y,widths){
  const kind=fmt(entry.type);
  const detail=[entry.note,entry.category].filter(Boolean).join(' · ');
  const tone=kind==='مصروف'?C.coral:kind==='دخل'?C.mintInk:C.ink;
  let right=1172;
  rtl(ctx,entry.date,right-12,y+25,18,C.gray,500,widths[0]-23);right-=widths[0];
  rtl(ctx,kind,right-12,y+25,18,tone,600,widths[1]-23);right-=widths[1];
  ctx.save();font(ctx,17);
  const lines=wrap(ctx,detail,widths[2]-29,2);
  ctx.restore();
  lines.forEach((value,i)=>rtl(ctx,value,right-12,y+(lines.length===1?25:15+i*20),17,i?C.gray:C.ink,i?400:500,widths[2]-26));
  right-=widths[2];
  rtl(ctx,entry.amount,right-12,y+25,19,tone,650,widths[3]-25);
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
function renderPage(data,sections,pageNo,totalPages){
  const firstPage=pageNo===1;
  const canvas=document.createElement('canvas');canvas.width=PAGE_W;canvas.height=PAGE_H;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw Error('المتصفح لا يدعم إنشاء صفحات التقرير.');
  rect(ctx,0,0,PAGE_W,PAGE_H,C.paper);
  pageHeader(ctx,data,firstPage);
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
    cards.forEach((v,i)=>kpi(ctx,69+(2-i%3)*374,306+Math.floor(i/3)*103,355,v[0],v[1],v[2]));
    if(!data.entries.length)rtl(ctx,'لا توجد حركات مالية ضمن الفترة المحددة.',1172,534,20,C.gray,500,1103);
  }
  sections.forEach(section=>drawSection(ctx,section,data));
  footer(ctx,data,pageNo,totalPages);
  const url=canvas.toDataURL('image/jpeg',.84);
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
      document.fonts.load('400 26px "Rubik"','دبّرها 0123'),
      document.fonts.load('600 26px "Rubik"','دبّرها 0123'),
      document.fonts.load('800 26px "Rubik"','دبّرها 0123')
    ]);
  }
  const pages=layoutPages(data);
  const jpegs=pages.map((sections,i)=>renderPage(data,sections,i+1,pages.length));
  const blob=buildPDF(jpegs,pages.map(sections=>sections.find(s=>s.table.key==='entries')?.rows||[]));
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
