/* hormat-studio · app.js — موتور ویزارد داشبورد اصلی */
(function(){
'use strict';
const {$,$$,esc,uid,store,idb,toast,copyText,download,pickFile,readText,readImage,slug,extractJSON}=HS;
const S=HSCHEMA,P=HSP,steps=S.steps;
const KEY='hs_project';
let D=store.get(KEY,null)||{};
let cur=Math.min(+store.get('hs_cur',0)||0,steps.length-1);
const chats={},modes={},notes={};let busy=false,fsRoot=null;
const host=$('#stepHost');
const deb=(fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};
const persist=deb(()=>{store.set(KEY,D);store.set('hs_cur',cur);$('#saved').textContent='✓ ذخیره شد'},350);
const touch=()=>{$('#saved').textContent='…';persist();paintSide()};
const fieldVal=f=>f.id==='bmc'?D.bmc:D[f.id];

/* ---------- پیشرفت ---------- */
function stepPct(s){
  if(s.id==='export')return null;
  if(s.id==='bmc')return Math.round(HS.BMC.filter(b=>String((D.bmc||{})[b.id]||'').trim()).length/9*100);
  const fs=s.fields.filter(f=>f.type!=='tree');if(!fs.length)return null;
  const req=fs.filter(f=>f.req);const L=req.length?req:fs;
  return Math.round(L.filter(f=>P.filled(f,fieldVal(f))).length/L.length*100)}
function overall(){const a=steps.map(stepPct).filter(x=>x!=null);return a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):0}
function missing(){const m=[];steps.forEach((s,i)=>s.fields.forEach(f=>{if(f.req&&!P.filled(f,fieldVal(f)))m.push({i,s,f})}));return m}
function paintSide(){
  const o=overall();
  $('#side').innerHTML=`<div class="sh-top"><div class="bar"><i style="width:${o}%"></i></div><div class="sh-txt"><span>پیشرفت کل</span><b>${HS.en2fa(o)}٪</b></div></div>`+
  steps.map((s,i)=>{const p=stepPct(s);return `<button class="sitem ${i===cur?'on':''} ${p===100?'done':''} ${s.id==='bmc'?'bmc':''}" data-go="${i}"><span class="n">${p===100?'✓':HS.en2fa(i+1)}</span><span class="t">${s.title}</span><span class="pc">${p==null?'':HS.en2fa(p)+'٪'}</span></button>`}).join('')}

/* ---------- ساخت HTML فیلدها ---------- */
const helpBtn=f=>(f.help||f.ex)?`<button type="button" class="hb" data-act="help" data-h="${f.id}">؟ راهنما</button>`:'';
const helpBox=f=>(f.help||f.ex)?`<div class="help" id="h_${f.id}">${f.help||''}${f.ex?`<span class="ex">${f.ex}</span>`:''}</div>`:'';
const badges=f=>(f.req?'<span class="req" title="الزامی">*</span>':f.opt?'<span class="opt">اختیاری</span>':'')+(f.priv?'<span class="priv">🔒 فقط محلی</span>':'');
const wrap=(f,inner)=>`<div class="f" data-fid="${f.id}"><label for="i_${f.id}">${esc(f.label)}${badges(f)}${helpBtn(f)}</label>${helpBox(f)}${inner}</div>`;
const ph=a=>a?` placeholder="${esc(a)}"`:'';
function months(f,r,i,c){const v=r[c.id]||[];return `<div class="opts">${[0,1,2,3,4,5].map(k=>`<button type="button" class="tg ${v[k]?'on':''}" data-act="month" data-l="${f.id}" data-i="${i}" data-c="${c.id}" data-k="${k}">ماه ${HS.en2fa(k+1)}</button>`).join('')}</div>`}
function cell(f,r,i,c){
  const at=`data-l="${f.id}" data-i="${i}" data-c="${c.id}"`;let inner='';
  if(c.t==='text'||c.t==='number')inner=`<input type="text" ${at} value="${esc(r[c.id])}"${ph(c.ph)}${c.ltr?' dir="ltr"':''}${c.t==='number'?' inputmode="decimal"':''}>`;
  else if(c.t==='area')inner=`<textarea ${at} rows="3"${ph(c.ph)}>${esc(r[c.id])}</textarea>`;
  else if(c.t==='select')inner=`<select ${at}><option value="">— انتخاب —</option>${c.o.map(o=>`<option ${r[c.id]===o?'selected':''}>${o}</option>`).join('')}</select>`;
  else if(c.t==='months')inner=months(f,r,i,c);
  else if(c.t==='file'){const v=r[c.id];inner=`<div class="imgrow"><img class="thumb" data-key="${r._id}:${c.id}" hidden alt=""><div style="flex:1"><div class="pathbox">${esc(v&&v.path||c.dir+'…')}</div><button type="button" class="xs" style="margin-top:5px" data-act="pickimg" data-l="${f.id}" data-i="${i}" data-c="${c.id}">🖼 انتخاب تصویر</button></div></div>`}
  return `<div class="cell ${c.w||''}"><label>${esc(c.l)}</label>${inner}</div>`}
const folderOf=(r,i)=>r.folder||slug(r.name)||('member-'+(i+1));
function docRow(r,i,d){
  const name=(r.docs&&r.docs[d.k])||d.f,p=`Assets/team/${folderOf(r,i)}/${name}`,ok=r.docs&&r.docs[d.k];
  return `<div class="doc ${ok?'ok':''}"><span>${d.l}${d.img?' 📷':''}</span><code>${esc(p)}</code><button type="button" class="xs" data-act="pickdoc" data-i="${i}" data-k="${d.k}">${fsRoot?'📥 انتخاب و کپی':'انتخاب فایل'}</button><button type="button" class="xs" data-act="copypath" data-p="${esc(p)}">کپی مسیر</button></div>`}
function docsHTML(f,r,i){
  return `<div class="docs"><h5>📎 مدارک این عضو — مسیر خودکار از روی نام</h5>
  <div class="cell"><label>نام پوشهٔ لاتین (قابل ویرایش)</label><input type="text" dir="ltr" data-l="${f.id}" data-i="${i}" data-c="folder" value="${esc(folderOf(r,i))}"></div>
  <div data-docs="${i}">${S.DOCS.filter(d=>!(d.mil&&/ندارد/.test(r.mil||''))).map(d=>docRow(r,i,d)).join('')}</div>
  <div style="display:flex;align-items:center;gap:8px;margin-top:6px"><img class="thumb" data-key="${r._id}:photo" hidden alt="عکس"><small style="color:var(--mut)">${fsRoot?'فایل انتخابی خودکار در همین مسیر ذخیره می‌شود.':'مرورگر نمی‌تواند فایل را خودش جابه‌جا کند؛ یا «اتصال به پوشهٔ پروژه» (بالای صفحه) را بزنید، یا فایل را دستی با همین نام در همین مسیر بگذارید.'}</small></div></div>`}
function rowHTML(f,r,i){
  const t=r[f.titleCol]||(f.item+' '+HS.en2fa(i+1));
  return `<div class="row" data-rid="${r._id}"><div class="row-h"><span class="rn">${HS.en2fa(i+1)}</span><span class="rt">${esc(t)}</span><button type="button" class="ib" title="حذف" data-act="del" data-l="${f.id}" data-i="${i}">🗑</button></div><div class="rg">${f.cols.map(c=>cell(f,r,i,c)).join('')}</div>${f.docs?docsHTML(f,r,i):''}</div>`}
function newRow(f){const o={_id:uid()};f.cols.forEach(c=>{o[c.id]=c.t==='months'?[false,false,false,false,false,false]:c.t==='file'?null:''});if(f.docs){o.docs={};o.folderAuto=true;o.folder=''}return o}
function listHTML(f){
  if(!D[f.id])D[f.id]=[];if(f.req&&!D[f.id].length)D[f.id].push(newRow(f));
  const q=f.quick?`<div class="opts" style="margin-top:8px">${f.quick.map((x,k)=>`<button type="button" class="xs" data-act="quick" data-l="${f.id}" data-k="${k}">＋ ${x}</button>`).join('')}</div>`:'';
  const ap=f.docs&&D.applicantName?`<button type="button" class="xs" data-act="addapplicant" data-l="${f.id}" style="margin-top:8px">＋ متقاضی (${esc(D.applicantName)})</button>`:'';
  return `<div class="f" data-fid="${f.id}"><div class="lab">${esc(f.label)}${badges(f)}${helpBtn(f)}</div>${helpBox(f)}<div class="rows" id="rows_${f.id}">${D[f.id].map((r,i)=>rowHTML(f,r,i)).join('')}</div>${q}${ap}<button type="button" class="addb" data-act="add" data-l="${f.id}">＋ افزودن ${f.item}</button></div>`}
function ensureMatrix(){const m=D.compMatrix=D.compMatrix||{names:['','',''],rows:[{f:'',v:[]},{f:'',v:[]},{f:'',v:[]},{f:'',v:[]}]};const n=m.names.length+1;m.rows.forEach(r=>{r.v=Array.from({length:n},(_,i)=>!!r.v[i])});return m}
function matrixHTML(f){
  const m=ensureMatrix();
  return `<div class="f" data-fid="${f.id}"><div class="lab">${esc(f.label)}${badges(f)}${helpBtn(f)}</div>${helpBox(f)}<div class="scroll-x"><table class="tbl"><tr><th style="min-width:150px">ویژگی</th>${m.names.map((n,k)=>`<th><input type="text" data-mx="name" data-k="${k}" value="${esc(n)}" placeholder="رقیب ${HS.en2fa(k+1)}"></th>`).join('')}<th style="background:var(--a);color:#3b2300">کسب‌وکار شما</th><th></th></tr>
  ${m.rows.map((r,i)=>`<tr><td><input type="text" data-mx="feat" data-i="${i}" value="${esc(r.f)}" placeholder="ویژگی ${HS.en2fa(i+1)}"></td>${r.v.map((b,k)=>`<td><button type="button" class="tg ${b?'on':''}" data-act="mxt" data-i="${i}" data-k="${k}">${b?'✓':'✗'}</button></td>`).join('')}<td><button type="button" class="ib" data-act="mxdel" data-i="${i}">🗑</button></td></tr>`).join('')}</table></div>
  <div class="btns"><button type="button" class="xs" data-act="mxrow">＋ ویژگی</button>${m.names.length<(f.max||4)?'<button type="button" class="xs" data-act="mxcol">＋ رقیب</button>':''}${m.names.length>1?'<button type="button" class="xs" data-act="mxcoldel">− حذف آخرین رقیب</button>':''}</div></div>`}
function multiHTML(f){
  const v=D[f.id]||[];const op=o=>`<label class="op"><input type="checkbox" data-m="${f.id}" value="${esc(o)}" ${v.includes(o)?'checked':''}><span>${esc(o)}</span></label>`;
  const body=f.groups?f.groups.map(g=>`<div class="grp"><h4>${g.g}</h4><div class="opts">${g.items.map(op).join('')}</div></div>`).join(''):`<div class="opts">${f.items.map(op).join('')}</div>`;
  return `<div class="f" data-fid="${f.id}"><div class="lab">${esc(f.label)}${badges(f)}${helpBtn(f)}</div>${helpBox(f)}${body}</div>`}
function fileHTML(f){const v=D[f.id];
  return wrap(f,`<div class="imgrow"><img class="thumb" data-key="${f.id}" hidden alt=""><div style="flex:1"><div class="pathbox">${esc(v&&v.path||f.dir+'…')}</div><button type="button" class="xs" style="margin-top:5px" data-act="pickfile" data-f="${f.id}">🖼 انتخاب تصویر</button></div></div>`)}
function bmcBoxHTML(){
  D.bmc=D.bmc||{};
  return `<div class="note ok" style="margin-bottom:12px">پیشنهاد: BMC را در صفحهٔ جداگانه پر کنید (راهنما + پرامپت اختصاصی) و فایل <b>bmc.json</b> را اینجا وارد کنید. یا همین‌جا پر کنید.</div>
  <div class="btns"><a class="btn amber" href="bmc.html" target="_blank" rel="noopener">🧩 باز کردن BMC جداگانه</a><button type="button" class="btn sec" data-act="bmcimport">📥 ورود bmc.json</button><button type="button" class="btn sec" data-act="bmcls">🔄 دریافت از حافظهٔ مرورگر</button><button type="button" class="btn ghost" data-act="bmcapply">⤵ اعمال بر مراحل بعد (فقط فیلدهای خالی)</button><button type="button" class="btn ghost" data-act="bmcpdf">🖨 PDF بوم</button></div>
  <details class="acc"><summary>⚡ اعمال JSON کلی از AI (پر کردن چند مرحله با هم)</summary><div class="in"><p>در bmc.html دکمهٔ «پرامپت پر کردن داشبورد اصلی» را بزنید، در AI بچسبانید و JSON را اینجا بیاورید.</p><textarea id="aiAll" rows="4" dir="ltr" placeholder='{ "customers": "...", "value": "..." }'></textarea><div class="btns"><button type="button" class="btn sm" data-act="aiall" data-r="0">اعمال روی خالی‌ها</button><button type="button" class="btn sm sec" data-act="aiall" data-r="1">اعمال و جایگزینی</button></div></div></details>
  <div class="g2">${HS.BMC.map(b=>`<div class="f"><label>${b.e} ${b.t}<button type="button" class="hb" data-act="help" data-h="bmc_${b.id}">؟ راهنما</button></label><div class="help" id="h_bmc_${b.id}"><b>${b.q}</b><span class="ex">${b.ex}</span></div><textarea data-bmc="${b.id}" rows="4">${esc(D.bmc[b.id])}</textarea></div>`).join('')}</div>`}
function treeText(){
  const mem=(D.members||[]).filter(m=>m.name).map((m,i)=>folderOf(m,i));const pn=slug(D.projectName)||'hormat-studio';
  const L=[pn+'/','├─ dashboard.html','├─ bmc.html','├─ data/                 ← project.json','├─ prompts/','└─ Assets/','   ├─ brand/             ← لوگو','   ├─ product/           ← تصاویر محصول و نمونهٔ اولیه','   ├─ docs/              ← رسید واریز، کاربرگ، bmc.pdf','   ├─ exports/           ← pptx و خروجی‌ها','   └─ team/'];
  mem.forEach((m,i)=>{const last=i===mem.length-1;L.push('      '+(last?'└─ ':'├─ ')+m+'/        ← photo, national-card, education, military-service, resume')});
  if(!mem.length)L.push('      └─ (پس از ثبت اعضا اینجا پوشهٔ هرکس ساخته می‌شود)');return L.join('\n')}
function dirList(){const d=['data','Assets/brand','Assets/product','Assets/docs','Assets/exports'];(D.members||[]).filter(m=>m.name).forEach((m,i)=>d.push('Assets/team/'+folderOf(m,i)));return d}
function treeHTML(){
  return `<div class="f"><div class="lab">ساختار پوشهٔ پروژه<button type="button" class="hb" data-act="help" data-h="_tree">؟ راهنما</button></div><div class="help" id="h_tree"><b>چرا پوشه؟</b> داشبورد فقط «مسیر» فایل‌ها را ثبت می‌کند. اگر تصاویر و مدارک از ابتدا در جای درست باشند، پاورپوینت، کاربرگ و اسکرولی‌تلینگ بدون خطا ساخته می‌شوند.<br>۱) کل پوشهٔ <b>hormat-studio</b> را روی رایانه نگه دارید. ۲) تصاویر محصول را در Assets/product/ بگذارید. ۳) مدارک هر عضو را در Assets/team/نام-او/. ۴) در Chrome/Edge دکمهٔ «اتصال به پوشهٔ پروژه» (بالای صفحه) فایل‌ها را خودش در مسیر درست کپی می‌کند.</div>
  <div class="tree">${esc(treeText())}</div><div class="btns"><button type="button" class="btn sec sm" data-act="mkdirwin">کپی دستور ساخت پوشه‌ها (Windows)</button><button type="button" class="btn sec sm" data-act="mkdirsh">کپی دستور (Mac/Linux)</button><button type="button" class="btn sm" data-act="fsconnect">📁 اتصال به پوشهٔ پروژه و ساخت پوشه‌ها</button></div></div>`}
function fieldHTML(f){
  switch(f.type){
    case 'text':return wrap(f,`<input id="i_${f.id}" type="${f.type2||'text'}" data-f="${f.id}" value="${esc(D[f.id])}"${ph(f.ph)}${f.ltr?' dir="ltr"':''}${f.num?' inputmode="numeric"':''}>`);
    case 'area':return wrap(f,`<textarea id="i_${f.id}" data-f="${f.id}" rows="${f.rows||3}"${ph(f.ph)}>${esc(D[f.id])}</textarea>`);
    case 'select':return wrap(f,`<select id="i_${f.id}" data-f="${f.id}"><option value="">— انتخاب —</option>${f.o.map(o=>`<option ${D[f.id]===o?'selected':''}>${o}</option>`).join('')}</select>`);
    case 'multi':return multiHTML(f);case 'list':return listHTML(f);case 'matrix':return matrixHTML(f);case 'file':return fileHTML(f);
    case 'bmcbox':return bmcBoxHTML();case 'tree':return treeHTML()}return ''}

/* ---------- پنل AI ---------- */
function aiHTML(s){
  const m=modes[s.id]||'interview',ch=chats[s.id]||[];const api=HS.hasKey();
  return `<section class="ai" id="ai"><h3>🤖 مشاور هوش مصنوعی برای «${s.title}»</h3>
  <p class="d">مسیر اصلی: <b>کپی برای AI</b> ← چسباندن در ChatGPT / Claude / Gemini / … ← گرفتن JSON نهایی ← چسباندن در کادر پایین. اگر API دارید، «ارسال با API» همین گفتگو را همین‌جا انجام می‌دهد.</p>
  <div class="seg"><button class="${m==='interview'?'on':''}" data-act="aimode" data-m="interview">🗣 مصاحبه‌ای (AI سؤال می‌پرسد)</button><button class="${m==='draft'?'on':''}" data-act="aimode" data-m="draft">⚡ بازنویسی فوری</button></div>
  <textarea id="aiNote" rows="2" placeholder="توضیح یا خواستهٔ اضافه برای مشاور (اختیاری)…">${esc(notes[s.id]||'')}</textarea>
  <div class="btns"><button class="btn" data-act="aicopy">📋 کپی برای AI</button><button class="btn ghost" data-act="aishow">👁 نمایش پرامپت</button><button class="btn amber" data-act="aisend" ${busy?'disabled':''}>${api?'⚡ ارسال با API':'⚙️ تنظیم API'}</button></div>
  <div class="pv" id="pv" hidden></div>
  <div class="chat" id="chat">${chatHTML(ch)}</div>
  <div id="replyBox" ${ch.length?'':'hidden'}><textarea id="aiReply" rows="2" placeholder="پاسخ شما به مشاور…"></textarea><div class="btns"><button class="btn sm" data-act="aireply" ${busy?'disabled':''}>ارسال پاسخ</button><button class="btn sm sec" data-act="aifinal" ${busy?'disabled':''}>نهایی — JSON بده</button></div></div>
  <div class="f" style="margin:12px 0 0"><label>📥 پاسخ AI را اینجا بچسبانید (متنی که شامل بلاک JSON است)</label><textarea id="aiPaste" rows="3" dir="ltr" placeholder='{ "problem": "..." }'></textarea>
  <div class="btns"><button class="btn sm" data-act="aiapply" data-r="0">اعمال روی فیلدهای خالی</button><button class="btn sm sec" data-act="aiapply" data-r="1">اعمال و جایگزینی همه</button></div></div></section>`}
function chatHTML(ch){return ch.map((m,i)=>{
  if(m.role==='user')return `<div class="msg u">${esc(i===0?'(پرامپت این مرحله ارسال شد — برای دیدن، «نمایش پرامپت»)':m.content)}</div>`;
  if(m.role==='error')return `<div class="msg"><div class="note err">${esc(m.content)}</div></div>`;
  const j=extractJSON(m.content);return `<div class="msg a">${esc(m.content)}${j?`<div class="mb"><button class="btn sm" data-act="chatapply" data-i="${i}" data-r="0">اعمال روی خالی‌ها</button><button class="btn sm sec" data-act="chatapply" data-i="${i}" data-r="1">اعمال و جایگزینی</button></div>`:''}</div>`}).join('')}
const curPrompt=()=>P.stepPrompt(D,steps[cur],modes[steps[cur].id]||'interview',($('#aiNote')||{}).value||'');
async function aiSend(text,isFirst){
  const s=steps[cur],ch=chats[s.id]=chats[s.id]||[];ch.push({role:'user',content:text});busy=true;refreshAI();
  try{const out=await HS.chatAPI([{role:'system',content:'همیشه به فارسی پاسخ بده.'},...ch.filter(m=>m.role==='user'||m.role==='assistant')]);ch.push({role:'assistant',content:out})}
  catch(e){ch.push({role:'error',content:e.message})}
  busy=false;refreshAI()}
function refreshAI(){const s=steps[cur];if(s.id==='export')return;const n=$('#ai');if(!n)return;const note=($('#aiNote')||{}).value;if(note!=null)notes[s.id]=note;const paste=($('#aiPaste')||{}).value;const t=document.createElement('div');t.innerHTML=aiHTML(s);n.replaceWith(t.firstElementChild);if(paste)$('#aiPaste').value=paste;const c=$('#chat');if(c)c.scrollTop=c.scrollHeight}
function applyTo(obj,replace){
  const s=steps[cur];if(!obj){toast('JSON معتبری در متن پیدا نشد');return}
  const n=P.applyJSON(D,s,obj,replace);if(!n){toast(replace?'کلید مطابقی در JSON نبود':'فیلد خالی‌ای برای پر شدن نبود؛ «اعمال و جایگزینی» را امتحان کنید');return}
  store.set(KEY,D);toast(n+' فیلد به‌روز شد ✓');renderStep();paintSide()}

/* ---------- خروجی ---------- */
function exportHTML(){
  const ms=missing(),o=overall(),mem=(D.members||[]).filter(m=>m.name),imgs=(D.images||[]).filter(r=>r.img&&r.img.path);
  const chk=D._chk||{};
  const items=[];mem.forEach((m,i)=>S.DOCS.filter(d=>!(d.mil&&/ندارد/.test(m.mil||''))&&d.k!=='cv').forEach(d=>items.push({k:`m${i}_${d.k}`,t:`${d.l} — ${m.name}`,p:`Assets/team/${folderOf(m,i)}/${(m.docs&&m.docs[d.k])||d.f}`})));
  S.GENERAL_DOCS.forEach(d=>items.push({k:d.k,t:d.l,p:d.p}));
  const th=D._theme||'dark';
  return `<div class="card"><div class="step-h"><div class="ic">🚀</div><div><h2>خروجی و تحویل</h2><p>همه چیز از همین داده‌ها ساخته می‌شود؛ هر زمان داده را تغییر دادید دوباره بسازید.</p></div></div>
  <div class="stat"><div class="s"><b>${HS.en2fa(o)}٪</b><span>تکمیل کل</span></div><div class="s"><b>${HS.en2fa(ms.length)}</b><span>فیلد الزامی خالی</span></div><div class="s"><b>${HS.en2fa(mem.length)}</b><span>عضو تیم</span></div><div class="s"><b>${HS.en2fa(imgs.length)}</b><span>تصویر محصول</span></div></div>
  ${ms.length?`<h3 style="margin:16px 0 6px">فیلدهای الزامی خالی</h3><div class="opts">${ms.map(x=>`<button class="xs" data-go="${x.i}">${x.s.title} ← ${esc(x.f.label)}</button>`).join('')}</div>`:'<div class="note ok" style="margin-top:12px">همهٔ فیلدهای الزامی پر است 👏</div>'}</div>
  <div class="card"><h3 style="margin-top:0">۱) پاورپوینت ارائه (.pptx)</h3><p style="color:var(--mut);font-size:.88rem;margin-top:-4px">همهٔ اسلایدهای نمونهٔ پارک (۲۰ اسلاید) + بوم BMC + اسلاید رزومه هر عضو + گالری تصویر + اعتبارات.</p>
  <div class="seg"><button class="${th==='dark'?'on':''}" data-act="theme" data-t="dark">⬛ مشکی + زرد</button><button class="${th==='light'?'on':''}" data-act="theme" data-t="light">⬜ سفید + آبی رویال</button></div>
  <div class="g2"><div class="f"><label>فونت فارسی در پاورپوینت <button class="hb" data-act="help" data-h="_font">؟ راهنما</button></label><div class="help" id="h__font">نام فونتی که روی رایانهٔ ارائه نصب است. پیش‌فرض Tahoma روی هر رایانه هست. برای ظاهر بهتر Vazirmatn یا Estedad را نصب کنید و نامش را اینجا بنویسید. فونت داخل فایل نمی‌ماند.</div><input type="text" id="deckFont" value="${esc(D._font||'Tahoma')}" dir="ltr"></div>
  <div class="f"><label>گزینه‌ها</label><div class="opts"><label class="op"><input type="checkbox" id="oMem" ${D._oMem===false?'':'checked'}><span>اسلاید رزومهٔ اعضا</span></label><label class="op"><input type="checkbox" id="oGal" ${D._oGal===false?'':'checked'}><span>گالری تصاویر</span></label></div></div></div>
  <div class="btns"><button class="btn" data-act="deck" id="deckBtn">🎞 ساخت و دانلود PPTX</button></div><div id="deckOut"></div></div>
  <div class="card"><h3 style="margin-top:0">۲) کاربرگ و بوم</h3><div class="btns"><button class="btn sec" data-act="formdoc">📄 دانلود کاربرگ برای Word</button><button class="btn sec" data-act="bmcpdf">🖨 BMC به PDF</button><button class="btn sec" data-act="savejson">💾 JSON پروژه</button></div><p style="color:var(--mut);font-size:.82rem;margin:4px 0 0">کاربرگ Word پیش‌نویس مرتب‌شده با ترتیب فرم رسمی است؛ در قالب رسمی پارک (فایل docx اصلی) کپی کنید. BMC: در پنجرهٔ چاپ «ذخیره به‌عنوان PDF» را بزنید و در Assets/docs/bmc.pdf بگذارید.</p></div>
  <div class="card"><h3 style="margin-top:0">۳) پرامپت‌های آمادهٔ خروجی</h3>
  <div class="gh">
   <div class="gc"><h3>🌐 اسکرولی‌تلینگ GSAP</h3><p>پرامپت کامل با داده‌های پروژه (تم مشکی/زرد) برای دادن به AI دیگر تا صفحهٔ HTML بسازد.</p><div class="btns"><button class="btn sm" data-act="pcopy" data-p="gsap">کپی</button><button class="btn sm ghost" data-act="pdl" data-p="gsap">دانلود .md</button></div></div>
   <div class="gc"><h3>🎤 سناریوی ارائه و سؤال داوران</h3><p>متن گفتاری هر اسلاید + ۱۲ پرسش سخت احتمالی.</p><div class="btns"><button class="btn sm" data-act="pcopy" data-p="pitch">کپی</button><button class="btn sm ghost" data-act="pdl" data-p="pitch">دانلود .md</button></div></div>
   <div class="gc"><h3>🧑‍⚖️ بازبینی مثل داور</h3><p>امتیاز، ناسازگاری‌ها و ۱۰ اصلاح اولویت‌دار پیش از ارسال.</p><div class="btns"><button class="btn sm" data-act="pcopy" data-p="review">کپی</button><button class="btn sm ghost" data-act="pdl" data-p="review">دانلود .md</button></div></div></div></div>
  <div class="card"><h3 style="margin-top:0">۴) فهرست ارسال به مرکز رشد</h3><p style="color:var(--mut);font-size:.84rem;margin-top:-4px">طبق فرایند پارک: کاربرگ + مدارک به ایمیل مرکز رشد (آدرس در hmstp.ir) ارسال می‌شود و رسید واریز هزینهٔ بررسی هم ضمیمه می‌شود.</p>
  <div class="chk">${items.map(x=>`<label><input type="checkbox" data-chk="${x.k}" ${chk[x.k]?'checked':''}><span>${esc(x.t)}<br><code class="pathbox" style="display:inline-block;margin-top:2px">${esc(x.p)}</code></span></label>`).join('')}</div></div>
  <div class="card"><h3 style="margin-top:0">ابزارهای پروژه</h3><div class="btns"><button class="btn ghost sm" data-act="loadjson">📤 بارگذاری JSON</button><button class="btn ghost sm" data-act="sample">🧪 بارگذاری نمونهٔ آزمایشی</button><button class="btn ghost sm" data-act="reset" style="color:#e11d48">🗑 پاک‌کردن همه</button></div></div>`}
function projectName(){return slug(D.projectName||D.coreName)||'hormat-studio'}

/* ---------- رندر مرحله ---------- */
function renderStep(){
  const s=steps[cur];
  if(s.id==='export'){host.innerHTML=exportHTML()+`<div class="foot"><button class="btn ghost" data-go="${cur-1}">→ قبلی</button><span></span></div>`}
  else host.innerHTML=`<div class="card"><div class="step-h"><div class="ic">${s.icon}</div><div><h2>${s.title}</h2><p>${s.desc}</p><div class="chips"><span class="chip">📄 ${s.form}</span><span class="chip slide">🖥 ${s.slides}</span></div></div></div>${s.fields.map(fieldHTML).join('')}</div>${aiHTML(s)}<div class="foot"><button class="btn ghost" ${cur?`data-go="${cur-1}"`:'disabled'}>→ قبلی</button><button class="btn" data-go="${cur+1}">${cur===steps.length-2?'رفتن به خروجی ←':'بعدی ←'}</button></div>`;
  paintSide();thumbs();const c=$('#chat');if(c)c.scrollTop=c.scrollHeight}
async function thumbs(){for(const im of $$('img.thumb[data-key]',host)){const v=await idb.get(im.dataset.key);if(v){im.src=v.data||v;im.hidden=false}}}
function go(i){if(i<0||i>=steps.length)return;cur=i;store.set('hs_cur',cur);setView('wizard');renderStep();window.scrollTo({top:0,behavior:'smooth'})}

/* ---------- ذخیره‌سازی در پوشهٔ پروژه (File System Access) ---------- */
async function fsInit(){try{const h=await idb.get('fsroot');if(h&&h.queryPermission&&await h.queryPermission({mode:'readwrite'})==='granted')fsRoot=h}catch(e){}fsPaint()}
function fsPaint(){const b=$('#fsBtn');if(!b)return;b.textContent=fsRoot?'📁 متصل: '+fsRoot.name:'📁 اتصال به پوشهٔ پروژه';b.style.background=fsRoot?'rgba(255,255,255,.3)':''}
async function fsConnect(){
  if(!window.showDirectoryPicker){toast('این مرورگر دسترسی به پوشه را پشتیبانی نمی‌کند؛ از Chrome یا Edge استفاده کنید یا فایل‌ها را دستی در مسیرها بگذارید.',4200);return false}
  try{if(!fsRoot){const h=await showDirectoryPicker({mode:'readwrite'});fsRoot=h;await idb.put('fsroot',h)}else if(await fsRoot.requestPermission({mode:'readwrite'})!=='granted'){fsRoot=null;return false}
    for(const d of dirList())await fsDir(d);fsPaint();toast('به پوشه متصل شد و ساختار پوشه‌ها ساخته شد ✓');renderStep();return true}
  catch(e){if(e.name!=='AbortError')toast('اتصال ممکن نشد: '+e.message,4000);return false}}
async function fsDir(path){let d=fsRoot;for(const p of path.split('/').filter(Boolean))d=await d.getDirectoryHandle(p,{create:true});return d}
async function fsWrite(path,blob){if(!fsRoot)return false;try{const a=path.split('/'),name=a.pop(),d=await fsDir(a.join('/')),fh=await d.getFileHandle(name,{create:true}),w=await fh.createWritable();await w.write(blob);await w.close();return true}catch(e){toast('نوشتن در پوشه ناموفق: '+e.message,3500);return false}}
const safeName=n=>String(n).replace(/[\\/:*?"<>|\s]+/g,'-');
const extOf=n=>(String(n).match(/\.[A-Za-z0-9]+$/)||[''])[0].toLowerCase();

/* ---------- رویدادها ---------- */
host.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.f){D[t.dataset.f]=t.value;touch()}
  else if(t.dataset.bmc){D.bmc=D.bmc||{};D.bmc[t.dataset.bmc]=t.value;touch()}
  else if(t.dataset.l){const f=steps[cur].fields.find(x=>x.id===t.dataset.l),i=+t.dataset.i,r=D[t.dataset.l][i],c=t.dataset.c;r[c]=t.value;
    if(f.docs&&c==='name'&&r.folderAuto!==false){r.folder=slug(t.value)||('member-'+(i+1));const fi=t.closest('.row').querySelector('[data-c=folder]');if(fi)fi.value=r.folder;refreshDocs(t.closest('.row'),f,r,i)}
    if(f.docs&&c==='folder'){r.folderAuto=false;refreshDocs(t.closest('.row'),f,r,i)}
    if(f.docs&&c==='mil')refreshDocs(t.closest('.row'),f,r,i);
    if(c===f.titleCol){const rt=t.closest('.row').querySelector('.rt');rt.textContent=t.value||(f.item+' '+HS.en2fa(i+1))}touch()}
  else if(t.dataset.mx==='name'){D.compMatrix.names[+t.dataset.k]=t.value;touch()}
  else if(t.dataset.mx==='feat'){D.compMatrix.rows[+t.dataset.i].f=t.value;touch()}
  else if(t.id==='deckFont'){D._font=t.value;persist()}
});
host.addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset.m){const f=steps[cur].fields.find(x=>x.id===t.dataset.m),all=P.optsOf(f);D[f.id]=all.filter(o=>$$(`[data-m="${f.id}"]`,host).some(c=>c.checked&&c.value===o));touch()}
  else if(t.dataset.chk){D._chk=D._chk||{};D._chk[t.dataset.chk]=t.checked;persist()}
  else if(t.id==='oMem'){D._oMem=t.checked;persist()}else if(t.id==='oGal'){D._oGal=t.checked;persist()}
});
function refreshDocs(rowEl,f,r,i){const w=rowEl.querySelector('[data-docs]');if(w)w.innerHTML=S.DOCS.filter(d=>!(d.mil&&/ندارد/.test(r.mil||''))).map(d=>docRow(r,i,d)).join('')}
host.addEventListener('click',async e=>{
  const g=e.target.closest('[data-go]');if(g){go(+g.dataset.go);return}
  const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;const s=steps[cur];
  const lf=()=>s.fields.find(x=>x.id===b.dataset.l);
  switch(a){
   case 'help':{const h=$('#h_'+b.dataset.h);h&&h.classList.toggle('on');break}
   case 'add':{const f=lf();D[f.id]=D[f.id]||[];D[f.id].push(newRow(f));touch();renderStep();break}
   case 'quick':{const f=lf();D[f.id]=(D[f.id]||[]).filter(r=>f.cols.some(c=>c.t!=='months'&&c.t!=='file'&&String(r[c.id]||'').trim()));const r=newRow(f);r[f.cols[0].id]=f.quick[+b.dataset.k];D[f.id].push(r);touch();renderStep();break}
   case 'addapplicant':{const f=lf();const r=newRow(f);r.name=D.applicantName;r.folder=slug(r.name);D[f.id]=(D[f.id]||[]).filter(x=>x.name);D[f.id].unshift(r);touch();renderStep();break}
   case 'del':{const f=lf();const r=D[f.id][+b.dataset.i];if(r&&r._id)['photo',...f.cols.map(c=>c.id)].forEach(k=>idb.del(r._id+':'+k));D[f.id].splice(+b.dataset.i,1);touch();renderStep();break}
   case 'month':{const f=lf(),r=D[f.id][+b.dataset.i];r[b.dataset.c]=r[b.dataset.c]||[false,false,false,false,false,false];const k=+b.dataset.k;r[b.dataset.c][k]=!r[b.dataset.c][k];b.classList.toggle('on');touch();break}
   case 'mxt':{const r=D.compMatrix.rows[+b.dataset.i],k=+b.dataset.k;r.v[k]=!r.v[k];b.classList.toggle('on');b.textContent=r.v[k]?'✓':'✗';touch();break}
   case 'mxrow':D.compMatrix.rows.push({f:'',v:[]});ensureMatrix();touch();renderStep();break;
   case 'mxdel':D.compMatrix.rows.splice(+b.dataset.i,1);touch();renderStep();break;
   case 'mxcol':D.compMatrix.names.push('');D.compMatrix.rows.forEach(r=>r.v.splice(r.v.length-1,0,false));ensureMatrix();touch();renderStep();break;
   case 'mxcoldel':D.compMatrix.names.pop();D.compMatrix.rows.forEach(r=>r.v.splice(r.v.length-2,1));ensureMatrix();touch();renderStep();break;
   case 'pickimg':case 'pickfile':{
     const file=await pickFile('image/*');if(!file)break;const f=a==='pickfile'?s.fields.find(x=>x.id===b.dataset.f):lf();
     let col,row,key,dir;if(a==='pickfile'){key=f.id;dir=f.dir}else{row=D[f.id][+b.dataset.i];col=f.cols.find(c=>c.id===b.dataset.c);key=row._id+':'+col.id;dir=col.dir}
     const nm=safeName(file.name);const path=dir+nm;let img;try{img=await readImage(file)}catch(err){toast('خواندن تصویر ممکن نشد');break}
     await idb.put(key,img);if(fsRoot)await fsWrite(path,file);
     if(a==='pickfile')D[f.id]={path,name:nm};else row[col.id]={path,name:nm};touch();renderStep();
     toast(fsRoot?'تصویر در پوشهٔ پروژه ذخیره شد ✓':'مسیر ثبت شد. فایل را دستی در '+dir+' قرار دهید.',3500);break}
   case 'pickdoc':{
     const f=steps[cur].fields.find(x=>x.id==='members'),r=D.members[+b.dataset.i],d=S.DOCS.find(x=>x.k===b.dataset.k);
     const file=await pickFile(d.img?'image/*':'image/*,application/pdf,.doc,.docx');if(!file)break;
     const std=d.f.replace(/\.[^.]+$/,'')+(extOf(file.name)||d.f.match(/\.[^.]+$/)[0]);r.docs=r.docs||{};r.docs[d.k]=std;
     const path=`Assets/team/${folderOf(r,+b.dataset.i)}/${std}`;
     if(d.img){try{await idb.put(r._id+':photo',await readImage(file,900))}catch(err){}}
     let saved=false;if(fsRoot)saved=await fsWrite(path,file);touch();renderStep();
     toast(saved?'مدرک در مسیر «'+path+'» ذخیره شد ✓':'ثبت شد. فایل را با همین نام در «'+path+'» بگذارید.',4200);break}
   case 'copypath':copyText(b.dataset.p);break;
   case 'mkdirwin':copyText(dirList().map(d=>`mkdir "${d.replace(/\//g,'\\')}"`).join('\n'));break;
   case 'mkdirsh':copyText('mkdir -p '+dirList().map(d=>`"${d}"`).join(' '));break;
   case 'fsconnect':fsConnect();break;
   case 'bmcimport':{const file=await pickFile('.json,application/json');if(!file)break;try{const j=JSON.parse(await readText(file));const bm=j.bmc||j;D.bmc=D.bmc||{};let n=0;HS.BMC.forEach(x=>{if(bm[x.id]){D.bmc[x.id]=String(bm[x.id]);n++}});touch();renderStep();toast(n+' بلوک وارد شد ✓')}catch(err){toast('فایل معتبر نیست')}break}
   case 'bmcls':{const j=store.get('hs_bmc',null);if(!j){toast('BMC‌ای در این مرورگر پیدا نشد؛ فایل bmc.json را وارد کنید.');break}D.bmc=Object.assign(D.bmc||{},j.bmc||j);touch();renderStep();toast('BMC دریافت شد ✓');break}
   case 'bmcapply':{const n=P.bmcToMain(D);touch();toast(n?n+' فیلد از BMC در مراحل بعد پر شد ✓':'فیلد خالی‌ای برای پر شدن نبود');break}
   case 'bmcpdf':HS.bmcPrint(D.bmc,{name:D.projectName||D.coreName,sub:D.titleFa,by:'پوریا همایی'});break;
   /* AI */
   case 'aimode':modes[s.id]=b.dataset.m;refreshAI();break;
   case 'aicopy':notes[s.id]=$('#aiNote').value;copyText(curPrompt());break;
   case 'aishow':{const pv=$('#pv');pv.textContent=curPrompt();pv.hidden=!pv.hidden;break}
   case 'aisend':{if(!HS.hasKey()){openSettings();break}notes[s.id]=$('#aiNote').value;chats[s.id]=[];await aiSend(curPrompt(),true);break}
   case 'aireply':{const t=$('#aiReply').value.trim();if(t){$('#aiReply').value='';await aiSend(t)}break}
   case 'aifinal':await aiSend('نهایی. اکنون فقط بلاک JSON نهایی را طبق قالب بده.');break;
   case 'aiall':{const o=extractJSON($('#aiAll').value);if(!o){toast('JSON معتبری پیدا نشد');break}let n=0;steps.forEach(st=>{if(st.id!=='bmc'&&st.id!=='export')n+=P.applyJSON(D,st,o,b.dataset.r==='1')});store.set(KEY,D);renderStep();toast(n?n+' فیلد پر شد ✓':'فیلدی تغییر نکرد');break}
   case 'aiapply':applyTo(extractJSON($('#aiPaste').value),b.dataset.r==='1');break;
   case 'chatapply':applyTo(extractJSON(chats[s.id][+b.dataset.i].content),b.dataset.r==='1');break;
   /* export */
   case 'theme':D._theme=b.dataset.t;persist();renderStep();break;
   case 'deck':{
     const btn=b,out=$('#deckOut');btn.disabled=true;out.innerHTML='<div class="note">در حال ساخت اسلایدها…</div>';
     try{const blob=await HSDeck.build(D,{theme:D._theme||'dark',font:($('#deckFont').value||'Tahoma').trim(),members:$('#oMem').checked,gallery:$('#oGal').checked});
       const fn=projectName()+'-pitch.pptx';download(fn,blob);let w=false;if(fsRoot)w=await fsWrite('Assets/exports/'+fn,blob);
       out.innerHTML=`<div class="note ok">✓ فایل ساخته شد: ${fn}${w?' (در Assets/exports هم ذخیره شد)':''}. پس از باز کردن، اسلایدها را مرور و در صورت نیاز ویرایش کنید.</div>`}
     catch(err){console.error(err);out.innerHTML='<div class="note err">ساخت فایل ناموفق بود: '+esc(err.message)+'</div>'}
     btn.disabled=false;break}
   case 'formdoc':download(projectName()+'-application-form.doc',new Blob(['\ufeff'+P.formDoc(D)],{type:'application/msword'}));break;
   case 'savejson':download('project.json',JSON.stringify(clean(D),null,1),'application/json');if(fsRoot)fsWrite('data/project.json',JSON.stringify(clean(D),null,1));break;
   case 'pcopy':copyText(promptOf(b.dataset.p));break;
   case 'pdl':download({gsap:'gsap-scrollytelling-prompt',pitch:'pitch-coach-prompt',review:'judge-review-prompt'}[b.dataset.p]+'.md',promptOf(b.dataset.p));break;
   case 'loadjson':{const file=await pickFile('.json,application/json');if(!file)break;try{D=JSON.parse(await readText(file));store.set(KEY,D);renderStep();toast('پروژه بارگذاری شد ✓')}catch(err){toast('فایل JSON معتبر نیست')}break}
   case 'sample':if(confirm('داده‌های فعلی با نمونهٔ آزمایشی جایگزین شود؟ (پیشنهاد: ابتدا JSON پروژه را ذخیره کنید)')){D=JSON.parse(JSON.stringify(window.HSSAMPLE));store.set(KEY,D);renderStep();toast('نمونهٔ آزمایشی بارگذاری شد')}break;
   case 'reset':if(confirm('همهٔ اطلاعات این مرورگر پاک شود؟')&&confirm('مطمئن هستید؟ این کار برگشت‌پذیر نیست.')){D={};store.del(KEY);renderStep();toast('پاک شد')}break;
  }});
const promptOf=k=>({gsap:P.gsapPrompt,pitch:P.pitchPrompt,review:P.reviewPrompt}[k])(D);
const clean=d=>{const o=JSON.parse(JSON.stringify(d));delete o._chk;return o};
$('#side').addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g)go(+g.dataset.go)});
$('#side').addEventListener('click',()=>{});

/* ---------- تب‌ها و راهنما ---------- */
function setView(v){$$('.view').forEach(x=>x.classList.toggle('on',x.id==='v_'+v));$$('.tab[data-view]').forEach(t=>t.classList.toggle('on',t.dataset.view===v));store.set('hs_view',v)}
$$('.tab[data-view]').forEach(t=>t.onclick=()=>{if(t.dataset.view==='export'){go(steps.length-1)}else{setView(t.dataset.view);if(t.dataset.view==='wizard')renderStep()}window.scrollTo({top:0})});
$$('[data-start]').forEach(b=>b.onclick=()=>go(+b.dataset.start||0));
function guideInit(){
  $('#tl').innerHTML=S.PROCESS.map((p,i)=>`<div class="tli ${/شما/.test(p[1])?'you':''}"><div class="num">${HS.en2fa(i+1)}</div><div class="bd"><b>${p[0]}</b>${p[1]?`<small>${p[1]}</small>`:''}</div></div>`).join('');
  $('#chkList').innerHTML=['تیم: نام، مدرک و شغل هر عضو (حداقل یک نفر کارشناس)','کپی کارت ملی همهٔ همکاران تمام‌وقت و پاره‌وقت','کپی مدرک تحصیلی همکاران','کپی پایان خدمت مؤسسان (آقایان)','یک قطعه عکس ۴×۳ برای هر نفر','رسید واریز هزینهٔ بررسی کاربرگ (مبلغ و شمارهٔ حساب را از اعلام رسمی پارک بگیرید)','کاربرگ تایپ‌شده (نه دست‌نویس) — فایل خام در hmstp.ir است','پاورپوینت ارائه برای جلسهٔ پذیرش'].map(t=>`<label><input type="checkbox"><span>${t}</span></label>`).join('')}

/* ---------- شروع ---------- */
HS.initTheme($('#themeBtn'));HS.mountSettings(()=>{if(steps[cur].id!=='export')refreshAI()});
$('#apiBtn').onclick=()=>openSettings();$('#fsBtn').onclick=()=>fsConnect();
guideInit();fsInit();renderStep();
const first=!Object.keys(D).length;setView(first?'guide':(store.get('hs_view','wizard')==='guide'?'guide':'wizard'));
window.addEventListener('beforeunload',()=>store.set(KEY,D));
window.HSApp={get D(){return D},set D(v){D=v},go,renderStep};
})();
