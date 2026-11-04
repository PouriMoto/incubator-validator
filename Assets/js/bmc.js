/* hormat-studio · bmc.js — صفحهٔ مستقل بوم مدل کسب‌وکار */
(function(){
'use strict';
const {$,$$,esc,store,toast,copyText,download,pickFile,readText,extractJSON,BMC}=HS;
const KEY='hs_bmc';
let S=store.get(KEY,null)||{name:'',sub:'',bmc:{}};S.bmc=S.bmc||{};
let mode='interview',chat=[],busy=false;
const save=(()=>{let t;return()=>{$('#saved').textContent='…';clearTimeout(t);t=setTimeout(()=>{store.set(KEY,S);$('#saved').textContent='✓ ذخیره شد'},300)}})();

$('#canvas').innerHTML=BMC.map(b=>`<div class="bk ${b.id==='value'?'value':''}" data-b="${b.id}"><h3>${b.e} ${b.t}<button type="button" class="hb" data-h="${b.id}">؟ راهنما</button></h3><div class="help" id="h_${b.id}"><b>${b.q}</b><span class="ex">${b.ex}</span></div><textarea data-id="${b.id}" placeholder="چند خط کوتاه…"></textarea></div>`).join('');
function paint(){$('#bName').value=S.name||'';$('#bSub').value=S.sub||'';$$('#canvas textarea').forEach(t=>t.value=S.bmc[t.dataset.id]||'')}
paint();
$('#canvas').addEventListener('input',e=>{if(e.target.dataset.id){S.bmc[e.target.dataset.id]=e.target.value;save()}});
$('#canvas').addEventListener('click',e=>{const h=e.target.closest('[data-h]');if(h)$('#h_'+h.dataset.h).classList.toggle('on')});
$('#bName').oninput=e=>{S.name=e.target.value;save()};$('#bSub').oninput=e=>{S.sub=e.target.value;save()};
$$('.seg button').forEach(b=>b.onclick=()=>{mode=b.dataset.m;$$('.seg button').forEach(x=>x.classList.toggle('on',x===b))});

const cur=()=>BMC.map(b=>S.bmc[b.id]?`- ${b.t}: ${S.bmc[b.id].replace(/\n/g,' ⏎ ')}`:'').filter(Boolean).join('\n')||'(هنوز چیزی ننوشته‌ام)';
function bmcPrompt(){
  const spec={};BMC.forEach(b=>spec[b.id]='<چند خط کوتاه فارسی؛ هر مورد در یک خط>');
  return `تو «مشاور مدل کسب‌وکار» و داور باتجربهٔ مرکز رشد پارک علم و فناوری هرمزگان هستی و به Business Model Canvas (Osterwalder) مسلط.
## هدف
به من کمک کن بوم مدل کسب‌وکار ایده‌ام (${S.name||'نام پروژه'}${S.sub?' — '+S.sub:''}) را کامل و منسجم کنم؛ از آن در کاربرگ پذیرش مرکز رشد استفاده می‌شود.
## بوم فعلی من
${cur()}
${$('#aiNote').value?'## توضیح اضافه\n'+$('#aiNote').value+'\n':''}
## راهنمای هر کادر
${BMC.map(b=>`- ${b.id} | ${b.t}: ${b.q}`).join('\n')}
## قواعد
- فارسی، کوتاه، مشخص؛ هر کادر ۲ تا ۵ مورد. هیچ عدد/نام/ادعا از خودت نساز؛ جای اطلاعات ناقص بنویس «[نیاز به اطلاعات از من]».
- ناسازگاری‌ها را (مثلاً مشتری با کانال، ارزش با درآمد، هزینه با منابع) صادقانه و کوتاه (حداکثر ۴ خط) نقد کن.
## روش کار
${mode==='interview'?'ابتدا حداکثر ۶ پرسش کوتاه بپرس (یک‌جا) و منتظر پاسخ من بمان. بعد پیش‌نویس کادرها را بده. وقتی نوشتم «نهایی»، فقط یک بلاک ```json``` بده.':'بدون پرسش، ابتدا نقد کوتاه و سپس نسخهٔ بهتر را به‌صورت یک بلاک ```json``` بده.'}
## قالب JSON
\`\`\`json
${JSON.stringify(spec,null,1)}
\`\`\``}
function mainPrompt(){
  const b=HS.BMC_TO_MAIN;const spec={};Object.keys(b).forEach(k=>spec[k]=k==='segments'?[{name:'<نام گروه>',percent:0,note:'<توضیح کوتاه>'}]:'<متن فارسی>');
  return `تو مشاور پذیرش مرکز رشد پارک علم و فناوری هرمزگان هستی. بر پایهٔ بوم مدل کسب‌وکار زیر، فیلدهای «داشبورد پذیرش» را برای من پیش‌نویس کن.
## بوم من (${S.name||''}${S.sub?' — '+S.sub:''})
${cur()}
## فیلدهای خروجی (کلید | شرح)
${Object.entries(b).map(([k,v])=>`- ${k} | ${v}`).join('\n')}
## قواعد
- فقط از روی بوم بنویس؛ هیچ عدد، نام یا ادعای جدید نساز. اگر چیزی در بوم نبود، مقدار را رشتهٔ خالی بگذار («») و در یک خط پیش از JSON بگو چه چیزی کم است.
- فارسی رسمی، کوتاه و مناسب کاربرگ و اسلاید. segments: مجموع percent حدود ۱۰۰ و فقط اگر از بوم قابل‌استنباط است.
## خروجی
فقط یک بلاک \`\`\`json\`\`\` با همین کلیدها:
\`\`\`json
${JSON.stringify(spec,null,1)}
\`\`\`
سپس من این JSON را در داشبورد اصلی (مرحلهٔ «بوم مدل کسب‌وکار» ← «اعمال JSON کلی») می‌چسبانم.`}
function renderChat(){const el=$('#chat');el.innerHTML=chat.map((m,i)=>m.role==='user'?`<div class="msg u">${esc(i===0?'(پرامپت BMC ارسال شد)':m.content)}</div>`:m.role==='error'?`<div class="msg"><div class="note err">${esc(m.content)}</div></div>`:`<div class="msg a">${esc(m.content)}${extractJSON(m.content)?`<div class="mb"><button class="btn sm" data-ap="${i}" data-r="0">اعمال روی خالی‌ها</button><button class="btn sm sec" data-ap="${i}" data-r="1">اعمال و جایگزینی</button></div>`:''}</div>`).join('');$('#rbox').hidden=!chat.length;el.scrollTop=el.scrollHeight}
async function send(text){chat.push({role:'user',content:text});busy=true;renderChat();
  try{const out=await HS.chatAPI([{role:'system',content:'همیشه به فارسی پاسخ بده.'},...chat.filter(m=>m.role!=='error')]);chat.push({role:'assistant',content:out})}catch(e){chat.push({role:'error',content:e.message})}busy=false;renderChat()}
function apply(obj,rep){if(!obj){toast('JSON معتبری پیدا نشد');return}let n=0;BMC.forEach(b=>{if(obj[b.id]!=null){const v=Array.isArray(obj[b.id])?obj[b.id].join('\n'):String(obj[b.id]);if(rep||!String(S.bmc[b.id]||'').trim()){S.bmc[b.id]=v;n++}}});paint();save();toast(n?n+' کادر به‌روز شد ✓':'کادر خالی‌ای برای پر شدن نبود')}
$('#chat').addEventListener('click',e=>{const b=e.target.closest('[data-ap]');if(b)apply(extractJSON(chat[+b.dataset.ap].content),b.dataset.r==='1')});
$('#bCopy').onclick=()=>copyText(bmcPrompt());
$('#bMain').onclick=()=>{const p=mainPrompt();copyText(p);const pv=$('#pv');pv.textContent=p;pv.hidden=false};
$('#bSend').onclick=async()=>{if(!HS.hasKey()){openSettings();return}chat=[];await send(bmcPrompt())};
$('#bReply').onclick=async()=>{const t=$('#aiReply').value.trim();if(t){$('#aiReply').value='';await send(t)}};
$('#bFinal').onclick=()=>send('نهایی. اکنون فقط بلاک JSON نهایی را بده.');
$('#bAp0').onclick=()=>apply(extractJSON($('#aiPaste').value),false);$('#bAp1').onclick=()=>apply(extractJSON($('#aiPaste').value),true);
$('#bPdf').onclick=()=>HS.bmcPrint(S.bmc,{name:S.name,sub:S.sub});
$('#bJson').onclick=()=>download('bmc.json',JSON.stringify({name:S.name,sub:S.sub,bmc:S.bmc},null,1),'application/json');
$('#bLoad').onclick=async()=>{const f=await pickFile('.json');if(!f)return;try{const j=JSON.parse(await readText(f));S.name=j.name||S.name;S.sub=j.sub||S.sub;S.bmc=Object.assign({},j.bmc||j);paint();save();toast('وارد شد ✓')}catch(e){toast('فایل معتبر نیست')}};
$('#bSync').onclick=()=>{store.set(KEY,S);toast('ذخیره شد؛ در داشبورد «دریافت از حافظهٔ مرورگر» را بزنید')};
$('#bClear').onclick=()=>{if(confirm('همهٔ کادرها پاک شود؟')){S.bmc={};paint();save()}};
HS.initTheme($('#themeBtn'));HS.mountSettings();$('#apiBtn').onclick=()=>openSettings();
})();
