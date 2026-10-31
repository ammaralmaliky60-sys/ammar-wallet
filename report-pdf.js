/* ذُخر: direct offline PDF generator. No print API, remote scripts, or network access.
   Arabic and RTL content is drawn with the application's own local fonts. */
(function(root){
'use strict';
const PAGE_W=1240,PAGE_H=1754,PDF_W=595.28,PDF_H=841.89;
const C={navy:'#181b23',navy2:'#282a34',gold:'#bc944e',goldLight:'#e9d5ae',ink:'#292b32',gray:'#69707b',line:'#dce0e5',soft:'#f6f7f8',white:'#ffffff'};
const fmt = v => String(v===undefined||v===null?'0':v);
function font(ctx,size=22,weight=400,heading=false){
  ctx.font=weight+' '+size+'px "'+(heading?'Alexandria':'IBM Plex Sans Arabic')+'",Tahoma,Arial,sans-serif';
}
function rtl(ctx,txt,x,y,size=22,color=C.ink,weight=400,maxWidth,heading=false){
  ctx.save();font(ctx,size,weight,heading);ctx.fillStyle=color;
  ctx.direction='rtl';ctx.textAlign='right';ctx.textBaseline='middle';
  ctx.fillText(fmt(txt),x,y,maxWidth);ctx.restore();
}
function ltr(ctx,txt,x,y,size=22,color=C.ink,weight=400,maxWidth){
  ctx.save();font(ctx,size,weight);ctx.fillStyle=color;ctx.direction='ltr';ctx.textAlign='left';
  ctx.textBaseline='middle';ctx.fillText(fmt(txt),x,y,maxWidth);ctx.restore();
}
function rect(ctx,x,y,w,h,fill,stroke){
  ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);
  if(stroke){ctx.lineWidth=1.5;ctx.strokeStyle=stroke;ctx.strokeRect(x+.75,y+.75,w-1.5,h-1.5);}
}
function line(ctx,x1,y1,x2,y2,color=C.line,width=2){
  ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
}
function wrap(ctx,value,maxWidth,maxLines=2){
  const words=fmt(value).replace(/\s+/g,' ').trim().split(' ');
  const result=[];let current='';
  for(let i=0;i<words.length;i++){
    const next=current?current+' '+words[i]:words[i];
    if(ctx.measureText(next).width<=maxWidth){current=next;continue;}
    if(current){result.push(current);current=words[i];}
    else{let s=words[i];while(s.length>1&&ctx.measureText(s).width>maxWidth){s=s.slice(0,-1);}result.push(s);current='';}
    if(result.length===maxLines){result[maxLines-1]+='…';return result;}
  }
  if(current)result.push(current);return result.slice(0,maxLines);
}
function drawHeading(ctx,title,y){
  rtl(ctx,title,1173,y,27,C.navy,650,1090,true);
  rect(ctx,69,y+24,1103,3,C.goldLight);
}
function pageHeader(ctx,data,isFirst){
  rect(ctx,0,0,PAGE_W,isFirst?213:146,C.navy);
  rect(ctx,0,isFirst?207:140,PAGE_W,6,C.gold);
  rtl(ctx,(data.brand||'ميزان')+'  |  التقرير المالي',1175,47,25,C.goldLight,600);
  if(isFirst){
    rtl(ctx,'الكشف المالي الشخصي',1175,110,44,C.white,700,1080,true);
    rtl(ctx,'من '+data.from+' إلى '+data.issuedAt,1175,167,20,C.goldLight,400,1080);
  }else{
    rtl(ctx,'سجل الحركات | متابعة الكشف',1175,99,30,C.white,600,1080,true);
  }
}
function footer(ctx,data,page,total){
  line(ctx,69,1660,1172,1660,C.line,2);
  rtl(ctx,'الحجز والتخصيص لا يعدّان مصروفاً نقدياً. هذا كشف شخصي وليس وثيقة مصرفية رسمية.',1172,1686,17,C.gray,400,1060);
  rtl(ctx,'صفحة '+page+' من '+total,1172,1724,18,C.navy,600);
  ltr(ctx,fmt(data.period),69,1724,17,C.gray);
}
function kpi(ctx,x,y,width,label,value,subtitle){
  rect(ctx,x,y,width,117,C.soft,C.line);
  rect(ctx,x+width-7,y+1,7,115,C.gold);
  rtl(ctx,label,x+width-22,y+29,20,C.gray,500,width-48);
  rtl(ctx,value,x+width-22,y+78,30,C.navy,700,width-45);
  if(subtitle)ltr(ctx,subtitle,x+15,y+97,11,C.gray,400,width-30);
}
function walletTable(ctx,data,top){
  drawHeading(ctx,'ملخص محافظ المعيشة',top);
  const x=69,w=1103,h=54,cols=[277,271,271,284],titles=['المحفظة','الميزانية الشهرية','المصروف المسجّل','الرصيد المتبقي'];
  let colX=1172;
  rect(ctx,x,top+43,w,h,C.navy2);
  for(let i=0;i<titles.length;i++){
    rtl(ctx,titles[i],colX-14,top+70,19,C.white,600,cols[i]-26);colX-=cols[i];
  }
  const rowY=top+97;
  for(let i=0;i<data.wallets.length;i++){
    const y=rowY+i*58,row=data.wallets[i];
    rect(ctx,x,y,w,58,i%2===0?C.white:C.soft,C.line);
    const values=[row.name,row.budget,row.spent,row.balance];colX=1172;
    for(let j=0;j<values.length;j++){
      rtl(ctx,values[j],colX-14,y+29,j===0?20:21,j===0?C.ink:j===3?C.gold:C.ink,j===0?600:500,cols[j]-24);
      colX-=cols[j];
    }
  }
  return rowY+data.wallets.length*58;
}
const CELL_W=[168,171,542,222], HEADINGS=['التاريخ','العملية','البيان والتفاصيل','المبلغ'];
function transactionsHeader(ctx,y,count,continued){
  drawHeading(ctx,continued?'سجل الحركات (تابع)':'سجل الحركات التفصيلي ('+count+')',y);
  const top=y+44;rect(ctx,69,top,1103,56,C.navy2);
  let x=1172;for(let i=0;i<HEADINGS.length;i++){rtl(ctx,HEADINGS[i],x-12,top+28,18,C.white,600,CELL_W[i]-23);x-=CELL_W[i];}
  return top+56;
}
function txRow(ctx,entry,y,idx){
  rect(ctx,69,y,1103,76,idx%2===0?C.white:C.soft,C.line);
  const date=fmt(entry.date),kind=fmt(entry.type),note=fmt(entry.note),cat=fmt(entry.category),value=fmt(entry.amount);
  let x=1172;
  rtl(ctx,date,x-12,y+38,19,C.ink,500,CELL_W[0]-22);x-=CELL_W[0];
  rtl(ctx,kind,x-12,y+38,19,C.ink,500,CELL_W[1]-22);x-=CELL_W[1];
  const info=note+(cat?' | '+cat:'');
  ctx.save();font(ctx,18,400);const lines=wrap(ctx,info,CELL_W[2]-32,2);ctx.restore();
  if(lines.length===1)rtl(ctx,lines[0],x-12,y+38,18,C.ink,400,CELL_W[2]-26);
  else{rtl(ctx,lines[0],x-12,y+25,18,C.ink,400,CELL_W[2]-26);
       rtl(ctx,lines[1],x-12,y+51,18,C.gray,400,CELL_W[2]-26);}
  x-=CELL_W[2];
  rtl(ctx,value,x-12,y+38,21,C.ink,650,CELL_W[3]-25);
}
function blankRows(ctx,y){
  rect(ctx,69,y,1103,100,C.soft,C.line);
  rtl(ctx,'لا توجد حركات مالية ضمن الفترة المحددة.',1150,y+51,24,C.gray);
}
function renderPage(data,rows,firstPage,pageNo,totalPages,walletRows=null){
  const canvas=document.createElement('canvas');canvas.width=PAGE_W;canvas.height=PAGE_H;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw Error('المتصفح لا يدعم إنشاء صفحات الكشف المالي.');
  rect(ctx,0,0,PAGE_W,PAGE_H,C.white);
  pageHeader(ctx,data,firstPage);
  let y;
  if(firstPage){
    const cards=[
      ['الدخل المستلم',data.stats.income],
      ['المصاريف الفعلية',data.stats.expenses],
      ['الالتزامات المدفوعة',data.stats.paid],
      ['الرصيد الحالي',data.stats.total],
      ['المتاح للتوزيع',data.stats.available],
      ['المبالغ المحجوزة',data.stats.reserved]
    ];
    const width=355,start=69,gap=19;
    cards.forEach((v,i)=>kpi(ctx,start+(i%3)*(width+gap),253+Math.floor(i/3)*133,width,v[0],v[1]));
    y=walletTable(ctx,{...data,wallets:data.wallets.slice(0,12)},560);
    y=transactionsHeader(ctx,y+40,data.entries.length,false);
  }else if(walletRows){
    walletTable(ctx,{...data,wallets:walletRows},190);
    y=-1;
  }else y=transactionsHeader(ctx,190,data.entries.length,true);
  if(y>=0){
    if(!rows.length)blankRows(ctx,y);
    else rows.forEach((entry,i)=>txRow(ctx,entry,y+i*76,firstPage?i:pageNo*1000+i));
  }
  footer(ctx,data,pageNo,totalPages);
  const url=canvas.toDataURL('image/jpeg',.88);
  canvas.width=1;canvas.height=1;
  const b64=url.slice(url.indexOf(',')+1),binary=atob(b64),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return bytes;
}
function buildPDF(jpegs){
  const encoder=new TextEncoder(),parts=[],offsets=[],numberOfObjects=2+jpegs.length*3;
  let size=0;
  function put(data){const bytes=typeof data==='string'?encoder.encode(data):data;parts.push(bytes);size+=bytes.length;}
  function object(id,content){offsets[id]=size;put(id+' 0 obj\n');put(content);put('\nendobj\n');}
  put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,'<< /Type /Pages /Kids ['+jpegs.map((_,i)=>(3+3*i)+' 0 R').join(' ')+'] /Count '+jpegs.length+' >>');
  jpegs.forEach((jpg,i)=>{
    const page=3+i*3,content=page+1,image=page+2;
    object(page,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PDF_W+' '+PDF_H+'] /Resources << /XObject << /Im0 '+image+' 0 R >> >> /Contents '+content+' 0 R >>');
    const stream='q\n'+PDF_W+' 0 0 '+PDF_H+' 0 0 cm\n/Im0 Do\nQ\n';
    object(content,'<< /Length '+encoder.encode(stream).length+' >>\nstream\n'+stream+'endstream');
    offsets[image]=size;put(image+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+PAGE_W+' /Height '+PAGE_H+
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpg.length+' >>\nstream\n');
    put(jpg);put('\nendstream\nendobj\n');
  });
  const xref=size;
  put('xref\n0 '+(numberOfObjects+1)+'\n0000000000 65535 f \n');
  for(let i=1;i<=numberOfObjects;i++)put(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
  put('trailer\n<< /Size '+(numberOfObjects+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
  return new Blob(parts,{type:'application/pdf'});
}
async function download(report){
  if(!report||!Array.isArray(report.entries)||!Array.isArray(report.wallets))throw Error('تعذر تحضير بيانات الكشف.');
  if(document.fonts&&document.fonts.load){
    await Promise.allSettled([
      document.fonts.load('600 26px "IBM Plex Sans Arabic"'),
      document.fonts.load('700 26px "IBM Plex Sans Arabic"'),
      document.fonts.load('600 28px "Alexandria"')
    ]);
  }
  const rows=report.entries;
  // Extra hidden wallets need their own A4 pages, not a clipped summary.
  const firstWalletCount=Math.min(12,report.wallets.length);
  const firstCount=Math.min(6,Math.max(0,Math.floor((1635-797-firstWalletCount*58)/76))),nextCount=17;
  const pages=[{rows:rows.slice(0,firstCount)}];
  for(let i=12;i<report.wallets.length;i+=12)
    pages.push({rows:[],walletRows:report.wallets.slice(i,i+12)});
  for(let i=firstCount;i<rows.length;i+=nextCount)
    pages.push({rows:rows.slice(i,i+nextCount)});
  if(pages.length>100)throw Error('الكشف كبير جداً؛ قسّم الفترة إلى أشهر أصغر.');
  const jpegs=[];
  for(let i=0;i<pages.length;i++)
    jpegs.push(renderPage(report,pages[i].rows,i===0,i+1,pages.length,pages[i].walletRows||null));
  const blob=buildPDF(jpegs);
  if(blob.size<3000)throw Error('لم يكتمل توليد ملف PDF.');
  const stamp=new Date().toISOString().replace(/[-:]/g,'').slice(0,13);
  const filename=(report.brand==='ميزان'?'Mizan':'Thukhr')+'_Statement_'+fmt(report.period).replace(/[^0-9-]/g,'')+'_'+stamp+'.pdf';
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;a.style.display='none';document.body.appendChild(a);
  try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  return {filename,bytes:blob.size,pages:pages.length};
}
root.ThukhrPDF={download,buildPDF};
})(window);
