/* hormat-studio · core.js — ابزارهای مشترک بین dashboard.html و bmc.html */
(function(g){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const fa2en=s=>String(s==null?'':s).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const en2fa=s=>String(s).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);

/* ---------- storage ---------- */
const store={
  get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},
  del(k){try{localStorage.removeItem(k)}catch(e){}}
};
/* ---------- IndexedDB برای تصاویر انتخاب‌شده ---------- */
const idb={
  _db:null,
  open(){return new Promise((res,rej)=>{if(this._db)return res(this._db);let r;try{r=indexedDB.open('hs_images',1)}catch(e){return rej(e)}
    r.onupgradeneeded=()=>r.result.createObjectStore('img');r.onsuccess=()=>{this._db=r.result;res(r.result)};r.onerror=()=>rej(r.error)})},
  async put(k,v){try{const db=await this.open();return new Promise(res=>{const t=db.transaction('img','readwrite');t.objectStore('img').put(v,k);t.oncomplete=()=>res(true);t.onerror=()=>res(false)})}catch(e){return false}},
  async get(k){try{const db=await this.open();return new Promise(res=>{const q=db.transaction('img').objectStore('img').get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null)})}catch(e){return null}},
  async del(k){try{const db=await this.open();return new Promise(res=>{const t=db.transaction('img','readwrite');t.objectStore('img').delete(k);t.oncomplete=()=>res(true)})}catch(e){return false}}
};
function readImage(file,max=1280,q=.82){return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=rej;fr.onload=()=>{const im=new Image();im.onerror=rej;im.onload=()=>{
  const k=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
  const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);res({data:c.toDataURL('image/jpeg',q),w:c.width,h:c.height})};im.src=fr.result};fr.readAsDataURL(file)})}

/* ---------- UI helpers ---------- */
let tt;function toast(m,ms=2200){let t=$('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),ms)}
async function copyText(txt){try{await navigator.clipboard.writeText(txt);toast('کپی شد ✓');return true}catch(e){const ta=document.createElement('textarea');ta.value=txt;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy')}catch(_){}ta.remove();toast(ok?'کپی شد ✓':'کپی خودکار ممکن نشد؛ متن را دستی انتخاب کنید');return ok}}
function download(name,data,mime){const b=data instanceof Blob?data:new Blob([data],{type:mime||'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function pickFile(accept){return new Promise(res=>{const i=document.createElement('input');i.type='file';if(accept)i.accept=accept;i.onchange=()=>res(i.files[0]||null);i.click()})}
function readText(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsText(f)})}

/* ---------- نام لاتین پوشه از نام فارسی ---------- */
const TR={'ا':'a','آ':'a','ب':'b','پ':'p','ت':'t','ث':'s','ج':'j','چ':'ch','ح':'h','خ':'kh','د':'d','ذ':'z','ر':'r','ز':'z','ژ':'zh','س':'s','ش':'sh','ص':'s','ض':'z','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'gh','ک':'k','ك':'k','گ':'g','ل':'l','م':'m','ن':'n','و':'v','ه':'h','ی':'i','ي':'i','ئ':'i','ؤ':'o','ء':'','‌':'-','أ':'a','ة':'e'};
function slug(s){return String(s||'').trim().split('').map(c=>TR[c]!==undefined?TR[c]:c).join('').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}

/* ---------- استخراج JSON از پاسخ AI ---------- */
function extractJSON(t){
  if(!t)return null;t=String(t);
  const cands=[];const re=/```(?:json)?\s*([\s\S]*?)```/gi;let m;while((m=re.exec(t)))cands.push(m[1]);cands.push(t);
  for(const c of cands){const s=c.indexOf('{');if(s<0)continue;let d=0,ins=false,e=false;
    for(let i=s;i<c.length;i++){const ch=c[i];if(ins){if(e)e=false;else if(ch==='\\')e=true;else if(ch==='"')ins=false}else if(ch==='"')ins=true;else if(ch==='{')d++;else if(ch==='}'){d--;if(d===0){const raw=c.slice(s,i+1);
      for(const v of [raw,raw.replace(/,\s*([}\]])/g,'$1').replace(/[“”]/g,'"')]){try{const o=JSON.parse(v);if(o&&typeof o==='object')return o}catch(_){}}break}}}}
  return null}

/* ---------- تنظیمات API (پروتکل OpenAI) ---------- */
const PRESETS={openai:{base:'https://api.openai.com/v1',model:'gpt-4o-mini'},openrouter:{base:'https://openrouter.ai/api/v1',model:'openai/gpt-4o-mini'},ollama:{base:'http://localhost:11434/v1',model:'llama3.1'},custom:{base:'',model:''}};
function cfg(){const c=store.get('hs_api',{})||{};let key='';try{key=sessionStorage.getItem('hs_key')||''}catch(e){}if(!key)key=c.key||'';return Object.assign({base:'https://api.openai.com/v1',model:'gpt-4o-mini',temp:0.4,remember:false},c,{key})}
function saveCfg(c){const o={base:c.base,model:c.model,temp:c.temp,remember:c.remember};if(c.remember)o.key=c.key;store.set('hs_api',o);try{c.remember?sessionStorage.removeItem('hs_key'):sessionStorage.setItem('hs_key',c.key)}catch(e){}}
function hasKey(){return !!cfg().key||/localhost|127\.0\.0\.1/.test(cfg().base)}
async function chatAPI(messages,opt={}){
  const c=cfg();if(!hasKey())throw new Error('ابتدا آدرس و کلید API را در تنظیمات وارد کنید (دکمهٔ ⚙️).');
  const url=c.base.replace(/\/+$/,'')+'/chat/completions';let r;
  try{r=await fetch(url,{method:'POST',signal:opt.signal,headers:{'Content-Type':'application/json',...(c.key?{Authorization:'Bearer '+c.key}:{})},body:JSON.stringify({model:c.model,messages,temperature:+c.temp})})}
  catch(e){throw new Error('ارتباط با سرویس برقرار نشد (شبکه/CORS/فیلترشکن یا آدرس نادرست). جزئیات: '+e.message)}
  const txt=await r.text();let j;try{j=JSON.parse(txt)}catch(e){}
  if(!r.ok)throw new Error('خطای '+r.status+': '+((j&&(j.error&&j.error.message||j.message))||txt.slice(0,300)));
  const out=j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;if(!out)throw new Error('پاسخ نامعتبر از سرویس: '+txt.slice(0,200));return out}

function mountSettings(onChange){
  if($('#drawer'))return;
  const d=document.createElement('div');d.innerHTML=`<div class="dim" id="dim"></div><aside class="drawer" id="drawer" aria-label="تنظیمات API">
  <h2 style="margin:0 0 4px">⚙️ اتصال به هوش مصنوعی</h2>
  <p style="margin:0 0 14px;color:var(--mut);font-size:.85rem">اختیاری است. بدون API هم می‌توانید با دکمهٔ «کپی برای AI» پرامپت را در هر چت‌بات (ChatGPT، Claude، Gemini و …) بچسبانید و پاسخ را برگردانید.</p>
  <div class="f"><label>سرویس‌دهنده (پروتکل OpenAI)</label><select id="apPre"><option value="openai">OpenAI</option><option value="openrouter">OpenRouter</option><option value="ollama">Ollama (محلی)</option><option value="custom">سرویس سفارشی / پروکسی داخلی</option></select></div>
  <div class="f"><label>Base URL</label><input type="text" id="apBase" dir="ltr" placeholder="https://api.openai.com/v1"></div>
  <div class="f"><label>API Key</label><input type="password" id="apKey" dir="ltr" autocomplete="off" placeholder="sk-..."></div>
  <div class="g2"><div class="f"><label>مدل</label><input type="text" id="apModel" dir="ltr"></div><div class="f"><label>Temperature</label><input type="number" id="apTemp" step="0.1" min="0" max="2" dir="ltr"></div></div>
  <label class="op" style="display:block;margin-bottom:12px"><input type="checkbox" id="apRem"><span>ذخیرهٔ کلید در این مرورگر</span></label>
  <div class="note" style="margin-bottom:12px">🔒 کلید فقط از مرورگر شما به سرویس‌دهنده ارسال می‌شود و جای دیگری نمی‌رود. اگر ذخیره نکنید، با بستن تب پاک می‌شود. روی رایانهٔ عمومی کلید ذخیره نکنید. اطلاعات هویتی (کد ملی، مدارک) هرگز در پرامپت‌ها قرار نمی‌گیرند.</div>
  <div class="btns"><button class="btn" id="apSave">ذخیره</button><button class="btn sec" id="apTest">آزمایش اتصال</button><button class="btn ghost" id="apClose">بستن</button></div>
  <div id="apOut" style="margin-top:8px"></div></aside>`;
  while(d.firstChild)document.body.appendChild(d.firstChild);
  const open=()=>{const c=cfg();$('#apBase').value=c.base;$('#apKey').value=c.key;$('#apModel').value=c.model;$('#apTemp').value=c.temp;$('#apRem').checked=!!c.remember;
    const p=Object.keys(PRESETS).find(k=>PRESETS[k].base&&PRESETS[k].base===c.base)||'custom';$('#apPre').value=p;$('#drawer').classList.add('on');$('#dim').classList.add('on')};
  const close=()=>{$('#drawer').classList.remove('on');$('#dim').classList.remove('on')};
  g.openSettings=open;$('#dim').onclick=close;$('#apClose').onclick=close;
  $('#apPre').onchange=e=>{const p=PRESETS[e.target.value];if(p.base){$('#apBase').value=p.base;$('#apModel').value=p.model}};
  const read=()=>({base:$('#apBase').value.trim(),key:$('#apKey').value.trim(),model:$('#apModel').value.trim(),temp:+$('#apTemp').value||0.4,remember:$('#apRem').checked});
  $('#apSave').onclick=()=>{saveCfg(read());toast('تنظیمات ذخیره شد ✓');onChange&&onChange();close()};
  $('#apTest').onclick=async()=>{saveCfg(read());const o=$('#apOut');o.innerHTML='<div class="note">در حال آزمایش…</div>';try{const t=await chatAPI([{role:'user',content:'فقط بنویس: اتصال برقرار است'}]);o.innerHTML='<div class="note ok">✓ '+esc(t.slice(0,120))+'</div>';onChange&&onChange()}catch(e){o.innerHTML='<div class="note err">'+esc(e.message)+'</div>'}};
}

/* ---------- تم روشن/تاریک ---------- */
function initTheme(btn){const set=t=>{document.documentElement.dataset.theme=t;store.set('hs_theme',t);if(btn)btn.textContent=t==='dark'?'☀️':'🌙'};
  const cur=store.get('hs_theme',null)||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');set(cur);if(btn)btn.onclick=()=>set(document.documentElement.dataset.theme==='dark'?'light':'dark')}

/* ---------- BMC: تعریف بلوک‌ها (مشترک) ---------- */
const BMC=[
 {id:'partners',t:'شرکای کلیدی',e:'🤝',area:'partners',q:'چه افراد/شرکت‌هایی را برای اجرا نیاز دارید و هرکدام چه نقشی دارند؟ (تأمین‌کننده، پخش، دانشگاه، سرمایه‌گذار…)',ex:'مثال: پارک علم و فناوری (فضا و مشاوره)، آموزشگاه‌های رانندگی (کانال فروش)، یک تأمین‌کنندهٔ سرور ابری.'},
 {id:'activities',t:'فعالیت‌های کلیدی',e:'⚙️',area:'activities',q:'مهم‌ترین کارهایی که باید انجام دهید تا ارزش پیشنهادی ساخته و تحویل شود چیست؟ (توسعه، تولید، بازاریابی، پشتیبانی…)',ex:'مثال: توسعهٔ نمونهٔ اولیه، تست با ۲۰ کاربر، ساخت محتوا، پشتیبانی.'},
 {id:'resources',t:'منابع کلیدی',e:'🧱',area:'resources',q:'چه دارایی‌هایی لازم است؟ انسانی، فیزیکی، فکری (کد، برند، پتنت) و مالی.',ex:'مثال: ۲ توسعه‌دهنده، سرور، کد اختصاصی، ۲۰۰ میلیون تومان سرمایهٔ اولیه.'},
 {id:'value',t:'ارزش پیشنهادی',e:'💎',area:'value',q:'چه مشکلی را برای مشتری حل می‌کنید یا چه سودی می‌دهید؟ چرا شما و نه جایگزین‌ها؟',ex:'مثال: کاهش ۵۰٪ زمان ثبت‌نام؛ همه‌چیز در یک اپ؛ ارزان‌تر از روش سنتی.'},
 {id:'relations',t:'ارتباط با مشتری',e:'💬',area:'relations',q:'چگونه مشتری را جذب، حفظ و رشد می‌دهید؟ (پشتیبانی شخصی، خودخدمت، جامعه، اشتراک…)',ex:'مثال: پشتیبانی در تلگرام/بله، باشگاه مشتریان، آموزش رایگان.'},
 {id:'channels',t:'کانال‌ها',e:'📣',area:'channels',q:'مشتری چگونه از شما باخبر می‌شود، خرید می‌کند و محصول را دریافت می‌کند؟',ex:'مثال: اینستاگرام و بله، وب‌سایت، نمایندگان محلی.'},
 {id:'segments',t:'بخش‌های مشتری',e:'🎯',area:'segments',q:'برای چه کسانی ارزش می‌سازید؟ مهم‌ترین گروه‌ها و ویژگی‌های هرکدام (+ پذیرندگان اولیه).',ex:'مثال: صاحبان کسب‌وکار کوچک بندرعباس (۶۰٪)، فریلنسرها (۲۵٪)، سازمان‌ها (۱۵٪).'},
 {id:'costs',t:'ساختار هزینه‌ها',e:'🧾',area:'costs',q:'مهم‌ترین هزینه‌های ثابت و متغیر چیست؟ کدام منبع/فعالیت گران‌ترین است؟',ex:'مثال: حقوق تیم (ثابت)، سرور و تبلیغات (متغیر).'},
 {id:'revenue',t:'جریان‌های درآمد',e:'💰',area:'revenue',q:'مشتری برای چه چیزی و چگونه پول می‌دهد؟ (فروش، اشتراک، کارمزد، تبلیغ…) قیمت‌گذاری چگونه است؟',ex:'مثال: اشتراک ماهانه ۹۹ هزار تومان + کارمزد ۵٪.'}
];
/* نگاشت بلوک‌های BMC به فیلدهای داشبورد اصلی (برای پرامپت و ورود خودکار) */
const BMC_TO_MAIN={
 customers:'از «بخش‌های مشتری»: مشتریان ایده چه کسانی هستند (متن)',earlyAdopters:'پذیرندگان آغازین',segments:'آرایه‌ای از {name,percent(عدد),note}',
 value:'ارزش ایجادشده برای مشتری',mission:'رسالت/دستاورد اصلی در ۱ تا ۲ جمله',channels:'کانال‌های ارتباط با مشتری (آگاهی، سفارش، تحویل)',
 revenue:'جریان درآمد',pricing:'قیمت و استراتژی قیمت‌گذاری',res_human:'منابع انسانی',res_physical:'منابع فیزیکی',res_ip:'منابع فکری',res_fin:'منابع مالی',
 partners:'شرکای کلیدی و نحوهٔ مشارکت',opexText:'هزینه‌های جاری',capexText:'هزینه‌های سرمایه‌ای'};

function bmcHTML(b,meta){
  b=b||{};meta=meta||{};const cell=(id,cls)=>{const d=BMC.find(x=>x.id===id);return `<div class="c ${cls}"><h4>${d.e} ${d.t}</h4><div class="v">${esc(b[id]||'').replace(/\n/g,'<br>')||'<i>—</i>'}</div></div>`};
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>BMC ${esc(meta.name||'')}</title><base href="${esc(location.href)}"><style>
@font-face{font-family:'Estedad';font-weight:400;src:url(Assets/fonts/estedad-400.woff2)}@font-face{font-family:'Estedad';font-weight:700;src:url(Assets/fonts/estedad-700.woff2)}
@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{margin:0;font-family:'Estedad',Tahoma,sans-serif;color:#0b1f1e;font-size:10.5px;line-height:1.75}
.h{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0d9488;padding:0 0 4px;margin-bottom:6px}.h b{font-size:15px;color:#065f46}.h span{color:#555;font-size:10px}
.g{display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:1fr 1fr .62fr;gap:5px;height:172mm}
.c{border:1.4px solid #0d9488;border-radius:7px;padding:5px 8px;overflow:hidden;background:#fff}.c h4{margin:0 0 3px;font-size:11px;color:#065f46}.v{white-space:normal}.v i{color:#aaa}
.partners{grid-column:1;grid-row:1/3}.activities{grid-column:2;grid-row:1}.resources{grid-column:2;grid-row:2}.value{grid-column:3;grid-row:1/3;background:#f0fdfa}
.relations{grid-column:4;grid-row:1}.channels{grid-column:4;grid-row:2}.segments{grid-column:5;grid-row:1/3}.costs{grid-column:1/4;grid-row:3}.revenue{grid-column:4/6;grid-row:3}
.f{margin-top:4px;font-size:9px;color:#777;display:flex;justify-content:space-between}</style></head><body>
<div class="h"><b>بوم مدل کسب‌وکار (BMC) — ${esc(meta.name||'')}</b><span>${esc(meta.sub||'')}</span></div>
<div class="g">${['partners','activities','resources','value','relations','channels','segments','costs','revenue'].map(i=>cell(i,i)).join('')}</div>
<div class="f"><span>تنظیم‌شده توسط پوریا همایی · @pouriabh1997</span><span>${new Date().toLocaleDateString('fa-IR')}</span></div>
<script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))<\/script></body></html>`}
function bmcPrint(b,meta){const w=window.open('','_blank');if(!w){toast('مرورگر پنجرهٔ چاپ را مسدود کرد؛ اجازهٔ pop-up بدهید');return}w.document.open();w.document.write(bmcHTML(b,meta));w.document.close()}

g.HS={$,$$,esc,uid,fa2en,en2fa,store,idb,readImage,toast,copyText,download,pickFile,readText,slug,extractJSON,cfg,saveCfg,hasKey,chatAPI,mountSettings,initTheme,BMC,BMC_TO_MAIN,bmcPrint,bmcHTML};
})(window);
