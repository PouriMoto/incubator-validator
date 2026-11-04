/* hormat-studio · deck.js — ساخت پاورپوینت از داده‌های ویزارد (PptxGenJS)
   همهٔ ۲۰ اسلاید نمونهٔ پارک + BMC + رزومهٔ اعضا + گالری + اعتبارات */
(function(g){
'use strict';
const {fa2en,en2fa,idb}=HS;
const THEMES={
 dark:{bg:'0B0B0C',card:'17171A',card2:'202024',line:'2E2E33',acc:'FFC107',text:'FFFFFF',mut:'A1A1AA',onacc:'0B0B0C',ok:'34D399',bad:'F87171'},
 light:{bg:'FFFFFF',card:'F3F6FE',card2:'E6ECFB',line:'D3DDF4',acc:'1D4ED8',text:'0F172A',mut:'64748B',onacc:'FFFFFF',ok:'059669',bad:'DC2626'}
};
const clean=s=>String(s==null?'':s).trim();
const lines=s=>clean(s).split(/\n+/).map(x=>x.replace(/^[\s\-–•▪●○\d۰-۹]+[\.\)\-]\s*/,'').replace(/^[\-–•▪●○]\s*/,'').trim()).filter(Boolean);
const has=s=>clean(s).length>0;
const num=s=>{const t=fa2en(clean(s)).replace(/[,٬،\s]/g,'');if(t&&/^-?\d+(\.\d+)?$/.test(t))return (+t).toLocaleString('fa-IR');return clean(s)};
const sumNums=a=>a.reduce((x,y)=>{const t=+fa2en(clean(y)).replace(/[,٬،\s]/g,'');return x+(isFinite(t)?t:0)},0);

function fitSize(text,w,h,base=16,min=9,lh=1.38){
  const paras=String(text).split('\n');
  for(let fs=base;fs>=min;fs-=.5){
    const cpl=Math.max(4,Math.floor((w-.2)*72/(fs*.56)));let n=0;paras.forEach(p=>{n+=Math.max(1,Math.ceil(p.length/cpl))});
    if((n*fs*lh+(paras.length-1)*fs*.35)/72+.12<=h)return fs}
  return min}
function squareCrop(dataUrl,size=500){return new Promise(res=>{const im=new Image();im.onload=()=>{const s=Math.min(im.width,im.height),c=document.createElement('canvas');c.width=c.height=size;c.getContext('2d').drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,size,size);res(c.toDataURL('image/jpeg',.85))};im.onerror=()=>res(null);im.src=dataUrl})}
function fitBox(iw,ih,x,y,w,h){const k=Math.min(w/iw,h/ih);const dw=iw*k,dh=ih*k;return {x:x+(w-dw)/2,y:y+(h-dh)/2,w:dw,h:dh}}

async function build(D,opts){
  opts=opts||{};const C=THEMES[opts.theme]||THEMES.dark,FONT=opts.font||'Tahoma';
  const pptx=new PptxGenJS();pptx.layout='LAYOUT_16x9';pptx.rtlMode=true;pptx.title=clean(D.projectName||D.coreName)+' — ارائه پذیرش مرکز رشد';pptx.author=clean(D.applicantName)||'hormat-studio';pptx.lang='fa-IR';
  const W=10,H=5.625,MX=.5,CW=W-2*MX;let n=0;
  const name=clean(D.projectName||D.coreName)||'hormat-studio';
  const imgOf=async k=>{const v=await idb.get(k);return v?(v.data?v:{data:v}):null};

  /* ---------- کمک‌ها ---------- */
  const txt=(s,text,x,y,w,h,o={})=>s.addText(text,Object.assign({x,y,w,h,fontFace:FONT,color:C.text,align:'right',valign:'top',rtlMode:true,lang:'fa-IR',margin:0,fit:'none'},o));
  function para(s,text,x,y,w,h,o={}){
    const L=o.bullet?lines(text):clean(text).split(/\n+/).filter(Boolean);
    if(!L.length){txt(s,'— تکمیل نشده —',x,y,w,h,{fontSize:11,color:C.mut,italic:true});return}
    const fs=o.fs||fitSize(L.join('\n'),w-(o.bullet?.25:0),h,o.base||15,o.min||9);
    const runs=L.map(l=>({text:l,options:{breakLine:true,paraSpaceAfter:o.bullet?5:3,bullet:o.bullet?{code:'25AA',indent:14}:false}}));
    txt(s,runs,x,y,w,h,{fontSize:fs,color:o.color||C.text,valign:o.valign||'top',bold:!!o.bold,align:o.align||'right'})}
  function card(s,x,y,w,h,title,body,o={}){
    s.addShape('roundRect',{x,y,w,h,fill:{color:o.fill||C.card},line:{color:C.line,width:.75},rectRadius:.08});
    s.addShape('rect',{x:x+w-.07,y:y+.18,w:.07,h:.3,fill:{color:C.acc},line:{color:C.acc,width:0}});
    let by=y+.14;
    if(title){txt(s,title,x+.15,y+.14,w-.4,.3,{fontSize:11.5,bold:true,color:C.acc,valign:'middle'});by=y+.5}
    para(s,body,x+.18,by,w-.4,h-(by-y)-.12,Object.assign({base:13.5},o))}
  function chip(s,text,x,y,w,o={}){s.addShape('roundRect',{x,y,w,h:.3,fill:{color:o.fill||C.card2},line:{color:o.line||C.line,width:.5},rectRadius:.15});txt(s,text,x,y,w,.3,{fontSize:o.fs||9.5,align:'center',valign:'middle',color:o.color||C.text})}
  function chips(s,arr,x,y,w,o={}){let cx=x+w,cy=y;const gap=.08;arr.forEach(t=>{const cw=Math.min(w,Math.max(.8,clean(t).length*.085+.35));if(cx-cw<x){cx=x+w;cy+=.38}chip(s,t,cx-cw,cy,cw,o);cx-=cw+gap});return cy+.38}
  function base(title,kicker,note){
    const s=pptx.addSlide();n++;s.background={color:C.bg};
    s.addShape('rect',{x:W-.18,y:.45,w:.18,h:.75,fill:{color:C.acc},line:{color:C.acc,width:0}});
    if(kicker)txt(s,kicker,MX,.32,CW-.1,.25,{fontSize:10,color:C.acc,bold:true});
    txt(s,title,MX,.58,CW-.1,.65,{fontSize:title.length>40?20:25,bold:true,valign:'middle'});
    s.addShape('line',{x:MX,y:5.28,w:CW,h:0,line:{color:C.line,width:.75}});
    txt(s,name,MX+CW-3,5.32,3,.22,{fontSize:8.5,color:C.mut});txt(s,en2fa(n),MX,5.32,.6,.22,{fontSize:8.5,color:C.mut,align:'left'});
    txt(s,'ارائه به مرکز رشد پارک علم و فناوری هرمزگان',3.2,5.32,3.6,.22,{fontSize:8.5,color:C.mut,align:'center'});
    if(note)s.addNotes(note);return s}
  const hdr=(t,o={})=>({text:t,options:Object.assign({bold:true,color:C.onacc,fill:{color:C.acc},align:'center',valign:'middle',fontFace:FONT,rtlMode:true},o)});
  const cell=(t,o={})=>({text:String(t==null?'':t),options:Object.assign({color:C.text,fill:{color:C.card},align:'right',valign:'middle',fontFace:FONT,rtlMode:true,border:[{type:'solid',pt:.5,color:C.line},{type:'solid',pt:.5,color:C.line},{type:'solid',pt:.5,color:C.line},{type:'solid',pt:.5,color:C.line}]},o)});
  const R=a=>a.slice().reverse();
  function table(s,head,rows,x,y,w,colW,o={}){
    const fs=o.fs||9.5;const tot=colW.reduce((a,b)=>a+b,0);const cw=colW.map(c=>c/tot*w);
    const data=[R(head.map(h=>hdr(h,{fontSize:fs})))].concat(rows.map(r=>R(r.map(c=>typeof c==='object'&&c&&c.text!=null?c:cell(c,{fontSize:fs})))));
    s.addTable(data,{x,y,w,colW:R(cw),rowH:o.rowH||.32,margin:[.03,.07,.03,.07],fontFace:FONT,autoPage:false})}
  const secLabel=(s,t,x,y,w)=>txt(s,t,x,y,w,.3,{fontSize:12,bold:true,color:C.acc});

  /* ---------- ۱ جلد ---------- */
  {const s=pptx.addSlide();n++;s.background={color:C.bg};
   s.addShape('ellipse',{x:-1.8,y:-1.5,w:5.2,h:5.2,fill:{color:C.acc,transparency:88},line:{color:C.acc,width:0}});
   s.addShape('ellipse',{x:-.9,y:-.6,w:3.4,h:3.4,fill:{color:C.acc,transparency:90},line:{color:C.acc,width:1.2,transparency:40}});
   s.addShape('rect',{x:W-.22,y:1.2,w:.22,h:2.2,fill:{color:C.acc},line:{color:C.acc,width:0}});
   const lg=await imgOf('logo');if(lg){const b=fitBox(lg.w||1,lg.h||1,.5,.4,1.2,.9);s.addImage({data:lg.data,x:b.x,y:b.y,w:b.w,h:b.h})}
   txt(s,'ارائه برای پذیرش در دورهٔ رشد مقدماتی',MX,1.15,CW-.2,.3,{fontSize:13,color:C.acc,bold:true});
   txt(s,name,MX,1.55,CW-.2,1,{fontSize:46,bold:true,align:'right',rtlMode:false,fontFace:/[A-Za-z]/.test(name)?'Segoe UI':FONT});
   txt(s,clean(D.titleFa)||clean(D.activity),MX,2.6,CW-.2,.5,{fontSize:22,bold:true});
   if(has(D.titleEn))txt(s,D.titleEn,MX,3.1,CW-.2,.3,{fontSize:13,color:C.mut,rtlMode:false});
   if(has(D.tagline)||has(D.concept))para(s,clean(D.tagline)||clean(D.concept),MX,3.5,CW-.6,.7,{fs:15,color:C.text});
   s.addShape('line',{x:MX,y:4.5,w:CW-.2,h:0,line:{color:C.line,width:1}});
   txt(s,[clean(D.applicantName),'مرکز رشد پارک علم و فناوری هرمزگان'+(has(D.fillDate)?' · '+clean(D.fillDate):'')].filter(Boolean).join('  ·  '),MX,4.65,CW-.2,.3,{fontSize:11,color:C.mut});
   s.addNotes('جلد — عنوان ایده، نام هسته و متقاضی.')}

  /* ---------- ۲ معرفی هسته ---------- */
  {const s=base('معرفی هسته فناوری','اسلاید ۲ · اطلاعات عمومی هسته','کاربرگ: اطلاعات عمومی هسته فناوری');
   card(s,5.2,1.45,4.3,.95,'نام هسته',clean(D.coreName),{base:18,min:12});
   card(s,.5,1.45,4.55,.95,'زمینهٔ فعالیت',clean(D.activity),{base:15});
   card(s,5.2,2.55,4.3,.8,'مسئول هسته',clean(D.applicantName),{base:15});
   card(s,.5,2.55,4.55,.8,'زمینه‌های فنی',[...(D.domains||[]),clean(D.otherDomain)].filter(Boolean).join('، ')||'',{base:11,min:8});
   card(s,.5,3.5,9,1.65,'چکیدهٔ ایده',clean(D.summary),{base:14})}

  /* ---------- ۳ اعضا ---------- */
  const mem=(D.members||[]).filter(m=>clean(m.name));
  {const s=base('اعضای اصلی (مؤسسان) هسته','اسلاید ۳ · معرفی مؤسسان','کاربرگ: اعضای اصلی (مؤسسان) هسته فناوری');
   if(!mem.length)card(s,.5,1.5,9,1.2,'','');else
   table(s,['نام و نام خانوادگی','سمت در واحد فناوری','زمینهٔ تخصصی','مدرک تحصیلی','نوع همکاری'],mem.slice(0,8).map(m=>[clean(m.name),clean(m.role),clean(m.expertise),clean(m.degree),clean(m.work).replace(/\(.\)/,'')]),.5,1.5,9,[2.1,1.9,2,2.6,1.2],{fs:mem.length>5?9:10.5,rowH:.4});
   txt(s,'برای هر عضو یک اسلاید رزومه در ادامه آمده است.',MX,4.8,CW-.2,.3,{fontSize:10,color:C.mut})}
  /* ---------- ۳ب رزومهٔ اعضا ---------- */
  if(opts.members!==false)for(const m of mem){
   const s=base(clean(m.name),'رزومهٔ عضو'+(has(m.role)?' · '+clean(m.role):''),'اسلاید رزومهٔ عضو (اختیاری)');
   const ph=await imgOf(m._id+':photo');
   if(ph){const sq=await squareCrop(ph.data);if(sq){s.addShape('ellipse',{x:.55,y:1.5,w:2.2,h:2.2,fill:{color:C.acc},line:{color:C.acc,width:0}});s.addImage({data:sq,x:.62,y:1.57,w:2.06,h:2.06,rounding:true})}}
   else{s.addShape('ellipse',{x:.55,y:1.5,w:2.2,h:2.2,fill:{color:C.card2},line:{color:C.acc,width:2}});txt(s,clean(m.name).split(/\s+/).map(w=>w[0]).slice(0,2).join(''),.55,1.5,2.2,2.2,{fontSize:40,bold:true,color:C.acc,align:'center',valign:'middle'})}
   chips(s,[m.work,m.expertise].map(clean).filter(Boolean),3.1,1.45,6.4);
   card(s,3.1,2.0,6.4,2.7,'رزومهٔ کوتاه',[clean(m.degree),clean(m.bio)].filter(Boolean).join('\n')||clean(m.job),{base:14});
   if(has(m.job))txt(s,'شغل کنونی: '+clean(m.job),.5,3.95,2.5,.5,{fontSize:10,color:C.mut,align:'center'})}

  /* ---------- ۴ تیم و سوابق ---------- */
  {const s=base('تیم کاری، همکاران و سوابق','اسلاید ۴ · تیم کاری و سهامداران','کاربرگ: همکاران پیش‌بینی‌شده، سوابق تحقیقات گروهی');
   const col=(D.collab||[]).filter(c=>clean(c.name)),past=(D.past||[]).filter(c=>clean(c.title));
   secLabel(s,'همکاران پیش‌بینی‌شده',5.2,1.4,4.3);
   if(col.length)table(s,['نام','تخصص','همکاری'],col.slice(0,5).map(c=>[clean(c.name),clean(c.degree)||clean(c.job),clean(c.work).replace(/\(.\)/,'')]),5.2,1.72,4.3,[1.6,1.8,.9],{fs:9.5});else txt(s,'— ثبت نشده —',5.2,1.75,4.3,.3,{fontSize:10,color:C.mut});
   secLabel(s,'سوابق طرح‌ها و فعالیت‌های گروهی',.5,1.4,4.5);
   if(past.length)table(s,['عنوان','کارفرما','زمان','وضعیت'],past.slice(0,5).map(c=>[clean(c.title),clean(c.employer),clean(c.time),clean(c.status).replace(/\(.\)/,'')]),.5,1.72,4.5,[1.8,1.2,.9,.9],{fs:9});else txt(s,'— ثبت نشده —',.5,1.75,4.5,.3,{fontSize:10,color:C.mut});
   if(has(D.shareholders))card(s,.5,3.9,9,1.25,'سهامداران و ارزش‌های تیم',clean(D.shareholders),{base:12.5})}

  /* ---------- ۵ ایده ---------- */
  {const s=base('عنوان و خلاصهٔ ایدهٔ محوری','اسلاید ۵ · ایده','کاربرگ: عنوان ایده فارسی/انگلیسی، حوزهٔ فنی، خلاصه');
   txt(s,clean(D.titleFa)||'—',MX,1.4,CW-.2,.6,{fontSize:26,bold:true,color:C.acc});
   if(has(D.titleEn))txt(s,D.titleEn,MX,2.0,CW-.2,.3,{fontSize:13,color:C.mut,rtlMode:false});
   if(has(D.concept)){s.addShape('rect',{x:W-.2,y:2.4,w:.06,h:.6,fill:{color:C.acc},line:{color:C.acc,width:0}});para(s,D.concept,MX,2.4,CW-.5,.6,{fs:15,color:C.text,valign:'middle'})}
   card(s,.5,3.1,5.4,2.0,'خلاصهٔ ایده',clean(D.summary),{base:13.5});
   card(s,6.05,3.1,3.45,2.0,'حوزهٔ فنی',[...(D.domains||[]),clean(D.otherDomain)].filter(Boolean).join('\n'),{bullet:1,base:12})}

  /* ---------- ۶ مشکل/ارزش ---------- */
  {const s=base('رسالت، مشکل و ارزش پیشنهادی','اسلاید ۶','کاربرگ: مشکل، جایگزین‌های موجود، ارزش برای مشتری');
   s.addShape('roundRect',{x:.5,y:1.4,w:9,h:.95,fill:{color:C.acc},line:{color:C.acc,width:0},rectRadius:.1});
   para(s,clean(D.mission)||'رسالت طرح…',.7,1.4,8.6,.95,{fs:clean(D.mission).length>110?14:17,color:C.onacc,bold:true,valign:'middle'});
   card(s,6.45,2.55,3.05,2.6,'مشکل',clean(D.problem),{base:12.5,min:8});
   card(s,3.4,2.55,2.9,2.6,'جایگزین‌های موجود',clean(D.alternatives),{base:12.5,min:8});
   card(s,.5,2.55,2.75,2.6,'ارزش برای مشتری',clean(D.value),{base:12.5,min:8})}

  /* ---------- ۷ مشتریان ---------- */
  {const s=base('بخش‌بندی مشتریان','اسلاید ۷','کاربرگ: مشتریان، پذیرندگان آغازین');
   const seg=(D.segments||[]).filter(x=>clean(x.name));
   secLabel(s,'سهم گروه‌های مشتری',5.2,1.4,4.3);
   if(seg.length){const tot=sumNums(seg.map(x=>x.percent))||100;seg.slice(0,6).forEach((x,i)=>{const y=1.8+i*.52,p=Math.max(0,Math.min(100,+fa2en(clean(x.percent))||0));
     txt(s,clean(x.name),5.2,y,2.0,.28,{fontSize:11});txt(s,en2fa(p)+'٪',.6,y,.6,.28,{fontSize:11,bold:true,color:C.acc,align:'left'});
     s.addShape('roundRect',{x:1.3,y:y+.04,w:3.9-.0,h:.2,fill:{color:C.card2},line:{color:C.line,width:.5},rectRadius:.1});
     if(p>0)s.addShape('roundRect',{x:1.3+3.9*(1-p/100),y:y+.04,w:Math.max(.12,3.9*p/100),h:.2,fill:{color:C.acc},line:{color:C.acc,width:0},rectRadius:.1});
     if(has(x.note))txt(s,clean(x.note),1.3,y+.25,5.9,.2,{fontSize:8,color:C.mut})})}
   else card(s,5.2,1.8,4.3,1.2,'','');
   card(s,.5,4.05,4.5,1.1,'پذیرندگان آغازین',clean(D.earlyAdopters),{base:11.5,min:8});
   card(s,5.2,4.05,4.3,1.1,'مشتریان ایده',clean(D.customers),{base:11.5,min:8})}

  /* ---------- ۸ راه‌حل ---------- */
  {const s=base('راه‌حل فناورانه / نوآورانه','اسلاید ۸','کاربرگ: راه‌حل پیشنهادی و نوآوری');
   const im0=(D.images||[])[0];const pi=im0&&await imgOf(im0._id+':img');
   const wcard=pi?5.6:9;
   card(s,pi?3.9:.5,1.4,wcard,1.95,'راه‌حل پیشنهادی',clean(D.solution),{base:14});
   card(s,pi?3.9:.5,3.5,wcard,1.65,'نوآوری و تفاوت',clean(D.innovation),{base:13});
   if(pi){s.addShape('roundRect',{x:.5,y:1.4,w:3.25,h:3.75,fill:{color:C.card},line:{color:C.line,width:.75},rectRadius:.08});const b=fitBox(pi.w||4,pi.h||3,.58,1.48,3.09,3.59);s.addImage({data:pi.data,x:b.x,y:b.y,w:b.w,h:b.h})}}

  /* ---------- ۸ب BMC ---------- */
  {const b=D.bmc||{};if(Object.values(b).some(v=>clean(v))){
   const s=base('بوم مدل کسب‌وکار (BMC)','ضمیمه · بوم مدل کسب‌وکار','بوم ۹ بخشی؛ فایل PDF آن هم ضمیمه می‌شود');
   const gx=.5,gy=1.35,gw=9,gh=3.8,cw=gw/5,rh=(gh-.9)/2;
   const pos={partners:[4,0,1,2],activities:[3,0,1,1],resources:[3,1,1,1],value:[2,0,1,2],relations:[1,0,1,1],channels:[1,1,1,1],segments:[0,0,1,2],costs:[2,2,3,1],revenue:[0,2,2,1]};
   const rowY=r=>gy+(r<2?r*rh:2*rh), rowH=(r,sp)=>r+sp>2?(rh*(sp-1)+.9-0):(sp*rh);
   HS.BMC.forEach(d=>{const [c,r,spc,spr]=pos[d.id];const x=gx+c*cw+.03,y=gy+(r<2?r*rh:2*rh)+.03,w=spc*cw-.06,h=(r===2?.9:spr*rh)-.06;
     s.addShape('roundRect',{x,y,w,h,fill:{color:d.id==='value'?C.card2:C.card},line:{color:d.id==='value'?C.acc:C.line,width:d.id==='value'?1.25:.75},rectRadius:.06});
     txt(s,d.e+' '+d.t,x+.06,y+.05,w-.12,.22,{fontSize:9,bold:true,color:C.acc});
     para(s,clean(b[d.id]),x+.06,y+.3,w-.12,h-.34,{base:9.5,min:6.5,bullet:false})})}}

  /* ---------- ۹ کانال‌ها ---------- */
  {const s=base('کانال‌های ارتباطی کسب‌وکار','اسلاید ۹','کاربرگ: کانال‌های ارتباطی با مشتریان');
   const L=lines(D.channels);const cnt=Math.min(L.length,6);
   if(cnt<2)card(s,.5,1.45,9,3.6,'مشتری چگونه باخبر می‌شود، سفارش می‌دهد و دریافت می‌کند؟',clean(D.channels),{base:16});
   else{const per=Math.min(3,cnt);const cwd=(9-(per-1)*.2)/per;L.slice(0,6).forEach((t,i)=>{const r=Math.floor(i/per),c=i%per;const x=W-.5-cwd-c*(cwd+.2),y=1.45+r*1.85;
     s.addShape('roundRect',{x,y,w:cwd,h:1.7,fill:{color:C.card},line:{color:C.line,width:.75},rectRadius:.08});
     s.addShape('ellipse',{x:x+cwd-.5,y:y+.12,w:.36,h:.36,fill:{color:C.acc},line:{color:C.acc,width:0}});txt(s,en2fa(i+1),x+cwd-.5,y+.12,.36,.36,{fontSize:12,bold:true,color:C.onacc,align:'center',valign:'middle'});
     para(s,t,x+.12,y+.6,cwd-.24,1.0,{base:12.5,min:8})})}}

  /* ---------- ۱۰ فنی ---------- */
  {const s=base('توجیه فنی طرح','اسلاید ۱۰','کاربرگ: ویژگی‌های محصول و فعالیت‌های تحقیقاتی فنی');
   if(has(D.stage))chip(s,'وضعیت: '+clean(D.stage),.5,1.35,2.4,{fill:C.acc,line:C.acc,color:C.onacc,fs:10.5});
   card(s,5.0,1.8,4.5,3.35,'ویژگی‌های محصول / خدمت',clean(D.features),{bullet:1,base:13});
   card(s,.5,1.8,4.35,3.35,'فعالیت‌های تحقیقاتی (فنی) انجام‌شده',clean(D.techResearch),{base:12.5})}
  /* ۱۰ب گالری */
  if(opts.gallery!==false){const imgs=[];for(const r of (D.images||[])){const v=await imgOf(r._id+':img');if(v)imgs.push({v,cap:clean(r.caption)})}
   for(let p=0;p<imgs.length;p+=4){const grp=imgs.slice(p,p+4);const s=base('تصاویر محصول و نمونهٔ اولیه','گالری','تصاویر نمونهٔ اولیه / محصول');
    const per=grp.length<=2?grp.length:2,rows=Math.ceil(grp.length/2),bw=(9-(per-1)*.2)/per,bh=(3.75-(rows-1)*.2)/rows;
    grp.forEach((g,i)=>{const r=Math.floor(i/2),c=i%2;const x=W-.5-bw-c*(bw+.2),y=1.4+r*(bh+.2);
      s.addShape('roundRect',{x,y,w:bw,h:bh,fill:{color:C.card},line:{color:C.line,width:.75},rectRadius:.06});
      const b=fitBox(g.v.w||4,g.v.h||3,x+.06,y+.06,bw-.12,bh-(g.cap?.4:.12));s.addImage({data:g.v.data,x:b.x,y:b.y,w:b.w,h:b.h});
      if(g.cap)txt(s,g.cap,x+.1,y+bh-.32,bw-.2,.26,{fontSize:10,color:C.mut,align:'center',valign:'middle'})})}}

  /* ---------- ۱۱ بازار ---------- */
  {const s=base('بررسی بازار طرح (اندازهٔ بازار)','اسلاید ۱۱','کاربرگ: تحقیقات بازار؛ اندازهٔ بازار');
   const T=[['TAM','کل بازار',D.tam],['SAM','بازار در دسترس',D.sam],['SOM','سهم قابل‌دستیابی',D.som]];
   T.forEach((t,i)=>{const x=W-.5-3-i*3.0-0,w=2.85;const hh=1.1;s.addShape('roundRect',{x:W-.5-(i+1)*3+.15,y:1.4,w,h:hh,fill:{color:i===2?C.acc:C.card},line:{color:i===2?C.acc:C.line,width:.75},rectRadius:.08});
     const cx=W-.5-(i+1)*3+.15;txt(s,t[0],cx+.12,1.45,w-.24,.4,{fontSize:20,bold:true,color:i===2?C.onacc:C.acc,rtlMode:false,align:'right'});
     txt(s,t[1],cx+.12,1.45,w-.24,.3,{fontSize:9.5,color:i===2?C.onacc:C.mut,align:'left'});para(s,clean(t[2])||'—',cx+.12,1.85,w-.24,.6,{base:11.5,min:8,color:i===2?C.onacc:C.text})});
   card(s,5.2,2.7,4.3,2.45,'تحقیقات بازار انجام‌شده',clean(D.marketResearch),{base:12.5});
   card(s,.5,2.7,4.55,2.45,'توضیح اندازهٔ بازار و منبع',clean(D.marketSize),{base:12.5})}

  /* ---------- ۱۲ بازار هدف ---------- */
  {const s=base('بازار هدف و روند رشد آن','اسلاید ۱۲','کاربرگ: بازار هدف و روند رشد');
   card(s,5.2,1.45,4.3,3.7,'بازار هدف و اولین خریداران',clean(D.targetMarket),{base:14});
   card(s,.5,1.45,4.5,3.7,'روند رشد بازار',clean(D.growth),{base:14})}

  /* ---------- ۱۳ رقبا ---------- */
  {const s=base('رقبا و مزیت رقابتی','اسلاید ۱۳','کاربرگ: رقبا و جدول مقایسهٔ ویژگی‌ها');
   const m=D.compMatrix,rows=((m&&m.rows)||[]).filter(r=>clean(r.f)),names=((m&&m.names)||[]).map((x,i)=>clean(x)||('رقیب '+(i+1)));
   card(s,rows.length?5.75:.5,1.4,rows.length?3.75:9,3.75,'رقبا، نقاط قوت/ضعف و وجه تمایز',clean(D.competitors),{base:12});
   if(rows.length){const head=['ویژگی',...names,name];
    const body=rows.slice(0,8).map(r=>[cell(clean(r.f),{fontSize:9.5}),...head.slice(1).map((_,k)=>{const ok=!!(r.v&&r.v[k]);return cell(ok?'✓':'✗',{align:'center',fontSize:12,bold:true,color:ok?C.ok:C.bad,fill:{color:k===head.length-2?C.card2:C.card}})})]);
    const colW=[2.0,...head.slice(1).map(()=>1)];const tot=colW.reduce((a,b)=>a+b,0);const w=5.1;
    s.addTable([R(head.map((h,k)=>hdr(h,{fontSize:9,fill:{color:k===head.length-1?C.acc:C.card2},color:k===head.length-1?C.onacc:C.text})))].concat(body.map(R)),{x:.5,y:1.4,w,colW:R(colW.map(c=>c/tot*w)),rowH:.38,margin:[.03,.06,.03,.06],fontFace:FONT,autoPage:false})}}

  /* ---------- ۱۴ مالی ---------- */
  {const s=base('توجیه مالی طرح','اسلاید ۱۴','کاربرگ: تجزیه و تحلیل مالی');
   const tiles=[['هزینهٔ سرمایه‌ای',num(D.capexTotal),'ریال'],['هزینهٔ جاری ('+(clean(D.opexPeriod)||'—')+')',num(D.opexTotal),'ریال'],['فروش ('+(clean(D.salesPeriod)||'—')+')',num(D.salesCount),'مورد'],['کل فروش ('+(clean(D.salesPeriod)||'—')+')',num(D.salesTotal),'ریال']];
   tiles.forEach((t,i)=>{const w=2.1,x=W-.5-w-i*(w+.2)*1.0;const xx=W-.5-(i+1)*2.25+.15;s.addShape('roundRect',{x:xx,y:1.4,w,h:.95,fill:{color:i===3?C.acc:C.card},line:{color:i===3?C.acc:C.line,width:.75},rectRadius:.08});
     txt(s,t[0],xx+.1,1.46,w-.2,.25,{fontSize:9.5,color:i===3?C.onacc:C.mut});txt(s,t[1]||'—',xx+.1,1.7,w-.2,.4,{fontSize:t[1].length>13?13:17,bold:true,color:i===3?C.onacc:C.acc,valign:'middle'});txt(s,t[2],xx+.1,2.08,w-.2,.22,{fontSize:8.5,color:i===3?C.onacc:C.mut})});
   card(s,6.4,2.5,3.1,2.65,'جریان درآمد',clean(D.revenue),{base:12});card(s,3.3,2.5,3.0,2.65,'قیمت‌گذاری',clean(D.pricing),{base:12});card(s,.5,2.5,2.7,2.65,'توجیه مالی',clean(D.justification),{base:11.5,min:8})}
  /* ۱۴ب اعتبارات */
  {const cr=(D.credits||[]).filter(r=>clean(r.desc));if(cr.length||has(D.capexText)||has(D.opexText)){
   const s=base('برآورد اعتبارات و هزینه‌ها','اسلاید ۱۴ (ادامه)','کاربرگ: برآورد اعتبارات مورد نیاز و آورده متقاضی');
   if(cr.length){const rows=cr.slice(0,8).map((r,i)=>[en2fa(i+1),clean(r.desc),num(r.cost),num(r.need),num(r.own)]);
    rows.push([cell('',{fill:{color:C.card2}}),cell('جمع',{bold:true,fill:{color:C.card2}}),cell(num(sumNums(cr.map(r=>r.cost))||''),{bold:true,fill:{color:C.card2},fontSize:10}),cell(num(sumNums(cr.map(r=>r.need))||''),{bold:true,fill:{color:C.card2},fontSize:10}),cell(num(sumNums(cr.map(r=>r.own))||''),{bold:true,fill:{color:C.card2},fontSize:10})]);
    table(s,['ردیف','شرح هزینه','میزان هزینه (ریال)','مورد نیاز (ریال)','آورده متقاضی (ریال)'],rows,.5,1.4,9,[.6,3.2,1.8,1.8,1.8],{fs:10,rowH:.34})}
   else{card(s,5.2,1.45,4.3,3.7,'هزینه‌های سرمایه‌ای',clean(D.capexText),{base:13});card(s,.5,1.45,4.5,3.7,'هزینه‌های جاری',clean(D.opexText),{base:13})}}}

  /* ---------- ۱۵ ریسک ---------- */
  {const s=base('چالش‌ها و ریسک‌ها','اسلاید ۱۵','کاربرگ: چالش‌ها و ریسک‌های کسب‌وکار');
   const rk=(D.risks||[]).filter(r=>clean(r.risk));
   if(!rk.length)card(s,.5,1.45,9,2,'','');else{const per=rk.length;const fs=per>5?9:per>3?10:11;
    table(s,['#','مخاطره / تهدید / ریسک','راهکار پیشگیری یا مواجهه'],rk.slice(0,7).map((r,i)=>[en2fa(i+1),clean(r.risk),clean(r.plan)]),.5,1.4,9,[.5,3.8,4.6],{fs,rowH:.55})}}

  /* ---------- ۱۶ وضعیت و برنامه ---------- */
  {const s=base('وضعیت فعلی و برنامه‌های پیش‌رو','اسلاید ۱۶','کاربرگ: برنامهٔ کاری هسته؛ منابع کلیدی');
   card(s,5.2,1.4,4.3,1.75,'وضعیت فعلی',clean(D.currentStatus),{base:12});card(s,5.2,3.3,4.3,1.85,'اقدامات نزدیک بعدی',clean(D.nextSteps),{bullet:1,base:12});
   const R5=[['منابع انسانی',D.res_human],['منابع فیزیکی',D.res_physical],['منابع فکری',D.res_ip],['منابع مالی',D.res_fin],['سایر منابع',D.res_other]].filter(x=>has(x[1]));
   const h5=R5.length?(3.75-(R5.length-1)*.1)/R5.length:3.75;
   if(!R5.length)card(s,.5,1.4,4.5,3.75,'منابع کلیدی','');R5.forEach((r,i)=>card(s,.5,1.4+i*(h5+.1),4.5,h5,r[0],clean(r[1]),{base:11,min:7.5}))}

  /* ---------- ۱۷ مشارکت ---------- */
  {const s=base('مدل‌های مشارکت و انتظارات از مرکز رشد','اسلاید ۱۷','کاربرگ: شرکای کلیدی، مدل مشارکت، انتظارات');
   card(s,5.2,1.4,4.3,1.55,'شرکای کلیدی و نحوهٔ مشارکت',clean(D.partners),{base:11.5});
   secLabel(s,'مدل‌های مشارکت با سرمایه‌گذاران',5.2,3.05,4.3);const y2=chips(s,D.investorModels||[],5.2,3.38,4.3,{fs:8.5});if(has(D.investorNote))para(s,D.investorNote,5.2,y2,4.3,5.15-y2,{base:10.5,min:8,color:C.mut});
   card(s,.5,1.4,4.5,1.75,'انتظارات از مرکز رشد',clean(D.expectations),{base:12});
   secLabel(s,'خدمات مورد نیاز',.5,3.3,4.5);const sv=[...(D.servAdmin||[]),...(D.servTrain||[]),...(D.servCons||[]),clean(D.servOther)].filter(Boolean);chips(s,sv.slice(0,12),.5,3.63,4.5,{fs:8.5})}

  /* ---------- ۱۸ برنامه ۶ ماهه ---------- */
  {const s=base('برنامهٔ کاری هسته در دورهٔ رشد مقدماتی','اسلاید ۱۸','کاربرگ: مراحل برنامهٔ کاری ۶ ماهه + برآورد هزینه');
   const pr=(D.planRows||[]).filter(r=>clean(r.act));
   if(!pr.length)card(s,.5,1.45,9,2,'','');else{
    const head=['نوع فعالیت','ماه ۱','ماه ۲','ماه ۳','ماه ۴','ماه ۵','ماه ۶','برآورد هزینه (ریال)'];
    const rows=pr.slice(0,9).map(r=>[cell(clean(r.act),{fontSize:10}),...[0,1,2,3,4,5].map(k=>cell('',{fill:{color:(r.m||[])[k]?C.acc:C.card}})),cell(num(r.cost),{align:'center',fontSize:10})]);
    rows.push([cell('مجموع هزینه‌ها',{bold:true,fill:{color:C.card2}}),...[0,1,2,3,4,5].map(()=>cell('',{fill:{color:C.card2}})),cell(num(sumNums(pr.map(r=>r.cost))||''),{bold:true,align:'center',fill:{color:C.card2}})]);
    const colW=[3.0,.7,.7,.7,.7,.7,.7,1.8];const tot=colW.reduce((a,b)=>a+b,0);
    s.addTable([R(head.map(h=>hdr(h,{fontSize:9.5})))].concat(rows.map(R)),{x:.5,y:1.4,w:9,colW:R(colW.map(c=>c/tot*9)),rowH:.36,margin:[.03,.07,.03,.07],fontFace:FONT,autoPage:false})}}

  /* ---------- ۱۹ چشم‌انداز ---------- */
  {const s=base('چشم‌انداز و رویای ما','اسلاید ۱۹','کاربرگ: چشم‌انداز');
   s.addShape('rect',{x:W-.35,y:1.5,w:.08,h:2.2,fill:{color:C.acc},line:{color:C.acc,width:0}});
   para(s,clean(D.vision),MX,1.45,CW-.5,2.3,{base:19,min:11,valign:'middle'});
   if(has(D.ask)){s.addShape('roundRect',{x:.5,y:4.0,w:9,h:.9,fill:{color:C.acc},line:{color:C.acc,width:0},rectRadius:.1});txt(s,'خواستهٔ ما: '+clean(D.ask),.7,4.0,8.6,.9,{fontSize:15,bold:true,color:C.onacc,valign:'middle'})}}

  /* ---------- ۲۰ تشکر ---------- */
  {const s=pptx.addSlide();n++;s.background={color:C.bg};
   s.addShape('ellipse',{x:6.2,y:2.2,w:5.5,h:5.5,fill:{color:C.acc,transparency:88},line:{color:C.acc,width:0}});
   s.addShape('rect',{x:W-.22,y:1.5,w:.22,h:1.6,fill:{color:C.acc},line:{color:C.acc,width:0}});
   txt(s,clean(D.thanks)||'با تشکر از توجه شما',MX,1.5,CW-.2,1,{fontSize:38,bold:true,color:C.acc,valign:'middle'});
   txt(s,name,MX,2.55,CW-.2,.4,{fontSize:18,bold:true,rtlMode:false,fontFace:/[A-Za-z]/.test(name)?'Segoe UI':FONT});
   const ct=[clean(D.applicantName),clean(D.email),clean(D.phone)].filter(Boolean);
   txt(s,ct.join('   ·   '),MX,3.2,CW-.2,.35,{fontSize:12,color:C.mut,rtlMode:false});
   txt(s,'پارک علم و فناوری هرمزگان · www.hmstp.ir',MX,4.6,CW-.2,.3,{fontSize:10,color:C.mut,rtlMode:false});s.addNotes('اسلاید پایانی.')}

  return await pptx.write({outputType:'blob'})}
g.HSDeck={build,THEMES,fitSize};
})(window);
