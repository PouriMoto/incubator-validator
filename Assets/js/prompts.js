/* hormat-studio · prompts.js — پرامپت‌ساز، اعمال پاسخ AI، کاربرگ Word و پرامپت‌های خروجی
   اصل حریم خصوصی: فیلدهای priv (کد ملی، تلفن، ایمیل، آدرس) و مدارک اعضا هرگز در هیچ پرامپتی نمی‌آیند. */
(function(g){
'use strict';
const {fa2en,esc,uid,extractJSON}=HS;const S=HSCHEMA;
const strip=h=>String(h||'').replace(/<[^>]+>/g,'');
const norm=s=>fa2en(String(s||'')).replace(/[‌\s]+/g,' ').replace(/\(.*?\)/g,'').trim();
const optsOf=f=>f.o||f.items||(f.groups?f.groups.flatMap(x=>x.items):[])||[];

function filled(f,v){
  if(v==null)return false;
  if(f.type==='list')return Array.isArray(v)&&v.some(r=>f.cols.some(c=>c.t!=='file'&&c.t!=='months'&&String(r[c.id]||'').trim()));
  if(f.type==='matrix')return !!(v&&((v.rows||[]).some(r=>String(r.f||'').trim())||(v.names||[]).some(n=>String(n||'').trim())));
  if(f.type==='multi')return Array.isArray(v)&&v.length>0;
  if(f.type==='file')return !!(v&&v.path);
  if(f.type==='bmcbox')return !!v&&Object.values(v).some(x=>String(x||'').trim());
  return String(v).trim()!=='';
}
function plain(f,v){
  if(!filled(f,v))return '';
  switch(f.type){
    case 'multi':return v.join('، ');
    case 'file':return v.path;
    case 'list':return v.map((r,i)=>(i+1)+') '+f.cols.map(c=>{
        if(c.t==='file')return r[c.id]&&r[c.id].path?c.l+': '+r[c.id].path:'';
        if(c.t==='months')return Array.isArray(r[c.id])&&r[c.id].some(Boolean)?'ماه‌های '+r[c.id].map((b,k)=>b?k+1:0).filter(Boolean).join('،'):'';
        const x=String(r[c.id]||'').trim();return x?c.l+': '+x:''}).filter(Boolean).join('؛ ')).filter(x=>x.length>3).join('\n');
    case 'matrix':{const n=v.names||[];const heads=[...n.map((x,i)=>x||('رقیب '+(i+1))),'کسب‌وکار ما'];
      return 'ستون‌ها: '+heads.join(' | ')+'\n'+(v.rows||[]).filter(r=>String(r.f||'').trim()).map(r=>r.f+': '+heads.map((h,i)=>r.v&&r.v[i]?'✓':'✗').join(' | ')).join('\n')}
    case 'bmcbox':return HS.BMC.map(b=>v[b.id]?b.t+': '+v[b.id]:'').filter(Boolean).join('\n');
    default:return String(v).trim()}
}
function ctxText(D,exceptId,maxEach=500){
  const out=[];
  S.steps.forEach(s=>{if(s.id===exceptId||s.id==='export')return;const ls=[];
    s.fields.forEach(f=>{if(f.priv||f.type==='tree'||f.type==='file')return;let t=plain(f,D[f.id]);if(f.id==='bmc')t=plain(f,D.bmc);if(!t)return;
      if(t.length>maxEach)t=t.slice(0,maxEach)+'…';ls.push('- '+f.label+': '+t.replace(/\n/g,' ⏎ '))});
    if(ls.length)out.push('### '+s.title+'\n'+ls.join('\n'))});
  return out.join('\n\n')||'(هنوز اطلاعاتی از بخش‌های دیگر وارد نشده است.)'}
function dossier(D){return ctxText(D,'__none__',1200)}

/* ---------- ساختار JSON مورد انتظار ---------- */
function exampleOf(f){
  if(f.type==='list'){const o={};f.cols.forEach(c=>{if(c.t==='file')return;o[c.id]=c.t==='months'?[false,false,false,false,false,false]:c.t==='number'?0:c.t==='select'?'یکی از: '+c.o.join(' | '):'<متن>'});return [o,'...']}
  if(f.type==='matrix')return {names:['<نام رقیب ۱>','<نام رقیب ۲>'],rows:[{f:'<ویژگی>',v:[true,false,true]}]};
  if(f.type==='multi')return ['<فقط از گزینه‌های مجاز>'];
  if(f.type==='select')return 'یکی از: '+f.o.join(' | ');
  return '<متن فارسی>'}
function specOf(step){
  const fields=step.id==='bmc'?HS.BMC.map(b=>({id:b.id,label:b.t,type:'area',help:b.q})):step.fields.filter(f=>f.type!=='file'&&f.type!=='tree');
  const ex={};fields.forEach(f=>ex[f.id]=exampleOf(f));
  const bul=fields.map(f=>{let extra='';
    if(f.type==='multi')extra=' — گزینه‌های مجاز: '+optsOf(f).join(' | ');
    if(f.type==='list')extra=' — آرایه‌ای از ردیف‌ها با کلیدهای: '+f.cols.filter(c=>c.t!=='file').map(c=>c.id+'('+c.l+(c.t==='months'?' — آرایهٔ ۶ مقداری true/false':'')+')').join('، ');
    if(f.type==='matrix')extra=' — names = نام رقبا (حداکثر ۴)، rows[i].v = آرایهٔ true/false به تعداد رقبا + ۱ (آخری = کسب‌وکار ما)';
    return `- ${f.id} | ${f.label}${f.req?' (الزامی)':''} — ${strip(f.help)||'—'}${extra}`}).join('\n');
  return {json:JSON.stringify(ex,null,1),bullets:bul,fields}}

function stepPrompt(D,step,mode,note){
  const sp=specOf(step);
  const cur=step.id==='bmc'?plain({type:'bmcbox'},D.bmc):step.fields.filter(f=>!f.priv&&f.type!=='tree'&&f.type!=='file').map(f=>{const t=plain(f,D[f.id]);return t?'- '+f.label+': '+t:''}).filter(Boolean).join('\n');
  return `تو «مشاور پذیرش مرکز رشد» هستی؛ با تجربهٔ داوری و ارزیابی طرح‌های فناورانه در پارک‌های علم و فناوری ایران، و مسلط به بوم مدل کسب‌وکار و ارائهٔ سرمایه‌گذاری (Pitch).

## هدف
به من کمک کن بخش «${step.title}» از «کاربرگ درخواست پذیرش و استقرار هسته‌های فناوری در دورهٔ رشد مقدماتی» (مرکز رشد پارک علم و فناوری هرمزگان) را درست و قانع‌کننده بنویسم. همین محتوا در جلسهٔ پذیرش با پاورپوینت ارائه می‌شود (${step.slides}).
شرط‌های پذیرش: ایدهٔ نوآورانهٔ فناورانه با قابلیت تجاری‌سازی؛ تیمی با حداقل یک نیروی کارشناس؛ اقامت در هرمزگان؛ استقرار در پارک.
نکتهٔ تخصصی این بخش: ${step.coach||'—'}

## زمینهٔ پروژه (پاسخ‌های قبلی من در سایر بخش‌ها)
${ctxText(D,step.id)}

## آنچه تا الان در همین بخش نوشته‌ام
${cur||'(هنوز چیزی ننوشته‌ام)'}
${note?`\n## توضیح اضافهٔ من\n${note}\n`:''}
## فیلدهای این بخش (کلید | عنوان — راهنما)
${sp.bullets}

## قواعد
- فارسی، رسمی و روان؛ جمله‌های کوتاه؛ مناسب کاربرگ و اسلاید؛ بدون اغراق و تعارف.
- هیچ عدد، نام، منبع یا سابقه‌ای از خودت نساز. هر جا اطلاعات کم است، همان‌جا بنویس «[نیاز به اطلاعات از من]» یا از من بپرس.
- اگر چیزی مبهم، ضعیف یا بی‌پشتوانه است صادقانه و کوتاه نقد کن (حداکثر ۴ خط) و راه اصلاح بگو.
- ورودی من را حفظ و بهتر کن؛ معنای آن را عوض نکن.

## روش کار
${mode==='interview'
?`۱) ابتدا حداکثر ۵ پرسش کوتاه و مشخص بپرس (همه را یک‌جا) و منتظر پاسخ من بمان.
۲) پس از پاسخ‌های من، پیش‌نویس هر فیلد را بنویس و نقد کوتاه بده.
۳) وقتی نوشتم «نهایی»، فقط و فقط یک بلاک \`\`\`json\`\`\` طبق قالب زیر بده.`
:`بدون پرسش، همین حالا ابتدا نقد کوتاه (حداکثر ۴ خط) و سپس نسخهٔ بهتر را به‌صورت یک بلاک \`\`\`json\`\`\` طبق قالب زیر بده.`}

## قالب JSON خروجی نهایی (فقط کلیدهای بالا؛ مقدارها فارسی)
\`\`\`json
${sp.json}
\`\`\``}

/* ---------- اعمال JSON ---------- */
function bool6(x){if(Array.isArray(x))return Array.from({length:6},(_,i)=>!!x[i]);const set=new Set(String(x||'').split(/[,،\s]+/).map(n=>+fa2en(n)).filter(Boolean));return Array.from({length:6},(_,i)=>set.has(i+1))}
function matchOpt(opts,v){const n=norm(v);if(!n)return null;return opts.find(o=>norm(o)===n)||opts.find(o=>norm(o).includes(n)||n.includes(norm(o)))||null}
function applyJSON(D,step,obj,replace){
  let n=0;
  const put=(id,val,empty)=>{if(replace||empty){D[id]=val;n++}};
  if(step.id==='bmc'){D.bmc=D.bmc||{};HS.BMC.forEach(b=>{if(obj[b.id]!=null){const v=Array.isArray(obj[b.id])?obj[b.id].join('\n'):String(obj[b.id]);if(replace||!String(D.bmc[b.id]||'').trim()){D.bmc[b.id]=v;n++}}});return n}
  step.fields.forEach(f=>{if(!(f.id in obj)||f.type==='file'||f.type==='tree')return;const v=obj[f.id];const empty=!filled(f,D[f.id]);
    switch(f.type){
      case 'text':case 'area':if(v!=null&&typeof v!=='object')put(f.id,String(v),empty);else if(Array.isArray(v))put(f.id,v.join('\n'),empty);break;
      case 'select':{const m=matchOpt(f.o,v);if(m)put(f.id,m,empty);break}
      case 'multi':{const arr=(Array.isArray(v)?v:String(v).split(/[،,\n]/)).map(x=>matchOpt(optsOf(f),x)).filter(Boolean);if(arr.length)put(f.id,[...new Set(arr)],empty);break}
      case 'list':{if(!Array.isArray(v))break;const rows=v.filter(r=>r&&typeof r==='object').map(r=>{const o={_id:uid()};f.cols.forEach(c=>{if(c.t==='file')return;let x=r[c.id];
          if(c.t==='months')o[c.id]=bool6(x);else if(c.t==='select'){o[c.id]=matchOpt(c.o,x)||''}else o[c.id]=x==null?'':String(x)});if(f.docs)o.folderAuto=true;return o});
        if(rows.length)put(f.id,rows,empty);break}
      case 'matrix':{if(!v||typeof v!=='object')break;const names=(v.names||[]).slice(0,f.max||4).map(String);const rows=(v.rows||[]).map(r=>({f:String(r.f||''),v:Array.from({length:names.length+1},(_,i)=>!!(r.v&&r.v[i]))}));if(names.length||rows.length)put(f.id,{names,rows},empty);break}
    }});
  return n}

/* ---------- BMC → فیلدهای اصلی (ورود مستقیم، فقط فیلدهای خالی) ---------- */
function bmcToMain(D){
  const b=D.bmc||{};let n=0;const set=(id,val)=>{if(val&&!String(D[id]||'').trim()){D[id]=val;n++}};
  set('customers',b.segments);set('value',b.value);set('channels',[b.channels,b.relations&&('ارتباط با مشتری: '+b.relations)].filter(Boolean).join('\n'));
  set('revenue',b.revenue);set('partners',b.partners);set('res_human',b.resources);set('opexText',b.costs);
  if(b.activities&&!(D.planRows||[]).length){D.planRows=b.activities.split(/\n+/).map(x=>x.replace(/^[\s\-•\d\.\)]+/,'').trim()).filter(Boolean).slice(0,8).map(a=>({_id:uid(),act:a,m:[false,false,false,false,false,false],cost:''}));n++}
  return n}

/* ---------- پرامپت‌های خروجی ---------- */
function assetsList(D){
  const L=[];if(D.logo&&D.logo.path)L.push('لوگو: '+D.logo.path);
  (D.images||[]).forEach(r=>{if(r.img&&r.img.path)L.push('تصویر محصول: '+r.img.path+(r.caption?' — '+r.caption:''))});
  (D.members||[]).forEach(m=>{const ph=m.docs&&m.docs.photo;if(m.name)L.push('عکس عضو «'+m.name+'»: '+(ph?ph:'Assets/team/'+(m.folder||'member')+'/photo.jpg')+' (فقط عکس؛ هیچ مدرک هویتی استفاده نشود)')});
  return L.join('\n')||'(تصویری ثبت نشده؛ از طرح‌های هندسی/آیکون استفاده کن.)'}

const GSAP_T=`تو یک «طراح و توسعه‌دهندهٔ ارشد وب» هستی که در روایت‌پردازی تعاملی (Scrollytelling) با GSAP تخصص دارد. بر اساس اطلاعات پروژهٔ زیر، یک صفحهٔ وب اسکرولی‌تلینگ فارسی بساز که پروژه را برای داوران مرکز رشد پارک علم و فناوری هرمزگان و سرمایه‌گذاران معرفی کند.

## خروجی مورد انتظار
- یک فایل index.html (HTML+CSS+JS در یک فایل) به‌همراه ساختار پوشه‌ای که در بخش «دارایی‌ها» آمده. فایل را کامل و قابل اجرا بده، نه توضیح.
- راست‌به‌چپ (dir="rtl", lang="fa")، فونت از مسیر Assets/fonts/estedad-400/500/700.woff2 با @font-face (فونت خارجی ممنوع).
- کتابخانه‌ها: GSAP 3.12.x و ScrollTrigger از cdnjs (نسخهٔ دقیق ثابت)؛ در توضیح پایانی بگو چطور نسخهٔ آفلاین را در Assets/js/vendor/ بگذارم.
- بدون فریم‌ورک؛ جاوااسکریپت خالص.

## تم و هویت بصری
- زمینه مشکی (#0B0B0C) با رنگ تأکید زرد (#FFC107)؛ متن سفید و خاکستری (#A1A1AA)؛ کارت‌ها #17171A با کادر ظریف #2A2A2E.
- حس: مدرن، سینمایی، مینیمال؛ تایپوگرافی بزرگ و پرتضاد؛ فضای خالی سخاوتمند. از گرادیان‌های بنفش/آبی و ظاهر «قالب آماده» پرهیز کن.
- موبایل‌محور و ریسپانسیو؛ روی ۳۶۰px هم سالم.

## روایت (به همین ترتیب؛ هر بخش یک صحنه)
۱) Hero: نام پروژه، عنوان ایده، شعار؛ ورود کلمه‌به‌کلمه (SplitText دستی یا span) + نشانگر اسکرول.
۲) مشکل: یک عدد/جملهٔ تکان‌دهنده + سه نقطهٔ درد که با اسکرول یکی‌یکی ظاهر می‌شوند (pin + scrub).
۳) راه‌حل: تغییر شکل (morph) ساده از «وضع فعلی» به «وضع با محصول» با timeline.
۴) محصول: گالری تصاویر (در صورت وجود) با parallax و کلیپ‌پث؛ ویژگی‌ها با stagger.
۵) مشتریان و بازار: شمارنده‌های متحرک (TAM/SAM/SOM) و نوار درصد بخش‌های مشتری.
۶) رقبا: جدول مقایسه که ردیف‌ها با اسکرول ✓/✗ می‌شوند و ستون «ما» برجسته می‌شود.
۷) مدل درآمد و مالی: کارت‌های عدد با شمارندهٔ متحرک.
۸) نقشهٔ راه ۶ ماهه: تایم‌لاین افقی pin‌شده که با اسکرول جلو می‌رود.
۹) تیم: کارت‌ها با عکس و نقش (فقط عکس؛ بدون هیچ مدرک هویتی).
۱۰) ریسک‌ها و راهکارها: کارت‌های تاب‌خورنده (flip) در صورت تمایل.
۱۱) چشم‌انداز و درخواست (Ask) + دکمهٔ تماس.

## الزامات فنی
- ScrollTrigger با pin و scrub فقط جایی که معنا دارد؛ gsap.matchMedia برای موبایل/دسکتاپ.
- احترام به prefers-reduced-motion (انیمیشن‌ها ساده یا غیرفعال).
- دسترس‌پذیری: ساختار معنایی، کنتراست کافی، alt برای تصاویر، focus-visible.
- کارایی: transform/opacity، lazy-loading تصاویر، بدون layout thrash؛ حجم کل کم.
- متن‌ها را عیناً از اطلاعات زیر بردار یا فقط کوتاه‌شده کن؛ هیچ عدد/ادعا/نام ساختگی اضافه نکن. اگر داده‌ای نبود، آن بخش را حذف کن یا یک جای‌خالی مشخص بگذار.
- اعداد را فارسی نمایش بده (Intl.NumberFormat('fa-IR')).
- هیچ اطلاعات شخصی (کد ملی، تلفن، آدرس، مدارک) نمایش نده.

## دارایی‌ها (مسیرهای نسبی نسبت به index.html)
{{ASSETS}}

## اطلاعات پروژه
{{DOSSIER}}

## پایان کار
در آخر: فهرست فایل‌ها، دستور اجرا (باز کردن در مرورگر)، و ۳ پیشنهاد برای بهتر شدن را کوتاه بنویس.`;
const PITCH_T=`تو «مربی ارائه» (Pitch Coach) و داور سخت‌گیر اما منصف مرکز رشد هستی. بر اساس اطلاعات پروژهٔ زیر:

۱) یک سناریوی ارائهٔ ۷ تا ۱۰ دقیقه‌ای اسلاید به اسلاید بنویس: برای هر اسلاید «پیام اصلی در یک جمله»، «متن گفتاری ۳۰ تا ۶۰ ثانیه‌ای» و «زمان».
۲) ۱۲ پرسش دشوار و محتمل داوران (فنی، بازار، مالی، تیم، ریسک) و پاسخ پیشنهادی کوتاه برای هرکدام بنویس. اگر اطلاعات کافی برای پاسخ نیست، بنویس چه داده‌ای باید جمع کنم.
۳) ۵ نقطه‌ضعف اصلی ارائه/طرح را صادقانه بگو و راه رفعش را بده.
۴) ۳ جملهٔ افتتاحیهٔ قوی و ۲ جملهٔ پایانی با درخواست مشخص (Ask) پیشنهاد بده.
قواعد: فارسی محاوره‌ای-رسمی؛ هیچ عدد یا ادعایی از خودت نساز؛ هرجا اطلاعات نیست «[نیاز به داده]» بنویس.

## اطلاعات پروژه
{{DOSSIER}}`;
const REVIEW_T=`تو داور باتجربهٔ کمیتهٔ پذیرش مرکز رشد پارک علم و فناوری هرمزگان هستی. پرونده‌ی زیر را مثل یک داور بررسی کن:

۱) امتیاز ۰ تا ۱۰ به هر محور بده و دلیل بیاور: نوآوری و فناوری، مشکل و ارزش، بازار و مشتری، مدل کسب‌وکار و مالی، تیم، قابلیت اجرا در ۶ ماه، شفافیت و کامل‌بودن.
۲) ناسازگاری‌ها را پیدا کن (مثلاً مشتری با کانال، قیمت با درآمد، تیم با برنامهٔ ۶ ماهه، اعداد بازار با مالی).
۳) ۱۰ مورد مشخص که باید پیش از ارسال اصلاح شود، به ترتیب اولویت؛ برای هرکدام بگو در کدام بخش کاربرگ و چه تغییری.
۴) فهرست بخش‌های خالی یا ضعیف و پرسش‌هایی که باید از من بپرسی.
هیچ اطلاعاتی از خودت نساز؛ فقط بر پایهٔ پرونده قضاوت کن.

## پرونده
{{DOSSIER}}`;
const fill=(t,D)=>t.replace('{{DOSSIER}}',dossier(D)).replace('{{ASSETS}}',assetsList(D));
const gsapPrompt=D=>fill(GSAP_T,D),pitchPrompt=D=>fill(PITCH_T,D),reviewPrompt=D=>fill(REVIEW_T,D);

/* ---------- کاربرگ برای Word (HTML با پسوند doc) ---------- */
function formDoc(D){
  const name=D.coreName||D.projectName||'';
  let h=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>کاربرگ پذیرش</title><style>body{font-family:Tahoma,'B Nazanin';direction:rtl;font-size:11pt;line-height:1.8}h1{color:#065f46}h2{color:#0f766e;border-bottom:2px solid #0d9488;margin-top:22px}table{border-collapse:collapse;width:100%;margin:6px 0}td,th{border:1px solid #888;padding:4px 6px;vertical-align:top}th{background:#d1fae5}.l{font-weight:bold;color:#065f46;margin-top:8px}.n{font-size:9pt;color:#777}</style></head><body dir="rtl"><h1>کاربرگ درخواست پذیرش و استقرار هسته‌های فناوری در دورهٔ رشد مقدماتی</h1><p class="n">پیش‌نویس تولیدشده از داشبورد hormat-studio؛ محتوا را در قالب رسمی پارک کپی کنید. هسته: <b>${esc(name)}</b></p>`;
  S.steps.forEach(s=>{if(s.id==='export'||s.id==='folder')return;h+=`<h2>${esc(s.title)}</h2><div class="n">بخش کاربرگ: ${esc(s.form)} — ${esc(s.slides)}</div>`;
    s.fields.forEach(f=>{if(f.type==='tree'||f.type==='file')return;
      if(f.type==='bmcbox'){h+=`<table><tr><th>بخش</th><th>محتوا</th></tr>`+HS.BMC.map(b=>`<tr><td>${esc(b.t)}</td><td>${esc((D.bmc||{})[b.id]||'').replace(/\n/g,'<br>')}</td></tr>`).join('')+'</table>';return}
      const v=D[f.id];
      if(f.type==='list'){const cols=f.cols.filter(c=>c.t!=='file'&&c.t!=='months'||c.t==='months');const rows=(v||[]);
        h+=`<div class="l">${esc(f.label)}</div><table><tr><th>ردیف</th>${cols.map(c=>`<th>${esc(c.l)}</th>`).join('')}</tr>`+(rows.length?rows:[{}]).map((r,i)=>`<tr><td>${i+1}</td>${cols.map(c=>`<td>${c.t==='months'?(r[c.id]||[]).map((b,k)=>b?('ماه '+(k+1)):'').filter(Boolean).join('، '):esc(r[c.id]||'')}</td>`).join('')}</tr>`).join('')+'</table>';return}
      if(f.type==='matrix'){const t=plain(f,v);h+=`<div class="l">${esc(f.label)}</div><pre style="font-family:inherit">${esc(t)}</pre>`;return}
      if(f.priv&&!v)return;
      h+=`<div class="l">${esc(f.label)}</div><div>${esc(plain(f,v)||'—').replace(/\n/g,'<br>')}</div>`})});
  return h+'</body></html>'}

g.HSP={plain,filled,ctxText,dossier,specOf,stepPrompt,applyJSON,bmcToMain,gsapPrompt,pitchPrompt,reviewPrompt,formDoc,assetsList,optsOf,matchOpt,GSAP_T,PITCH_T,REVIEW_T};
})(window);
