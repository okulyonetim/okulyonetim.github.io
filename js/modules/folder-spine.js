/* Koruk Asistan — Klasör Sırtlığı Oluşturucu
 * Araçlar > Klasör Sırtlığı Oluşturucu (js/modules/araclar-hub.js listeden açar; ilk açılışta yüklenir).
 * 5 cm / 8 cm / özel ölçüde klasör sırtlığı tasarlar; canlı önizleme verir; tek, numaralı, aylık veya liste (sınıf / öğretmen)
 * serisi üretir; sırtlıkları A4'e kesim çizgisiyle dizer ve ReportEngine önizlemesinden yazdırır / PDF / PNG yapar.
 *
 * Görünüm TAMAMEN merkezi CSS'tedir: css/design-system-base.css → TEMA MERKEZİ --ka-spine-* belirteçleri + "KLASÖR SIRTLIĞI" kuralları.
 * Bu dosya renk, boyut ya da yazı tipi değeri taşımaz: belirteçleri okur (renk paleti, oranlar, kenar payları) ve yalnızca
 * sığdırma hesabını (başlık boyu, yerleşim) yapıp .ka-spine* sınıflarıyla işaretleme üretir.
 * Yazdırılan belge, aynı kurallar çalışma anında merkezi stil dosyasından çıkarılıp (paperCss) belgeye gömülerek üretilir;
 * böylece önizleme, yazıcı ve PNG çıktısı aynı kuralları kullanır (ikinci bir stil kopyası yoktur).
 */
(function(global){
'use strict';
if(global.FolderSpine)return;
const D=document;
const KEY='folder-spine';
const MM=96/25.4,PT=25.4/72;               /* mm→px ve pt→mm */
const A4={w:210,h:297};
const MONTHS_SCHOOL=['Eylül','Ekim','Kasım','Aralık','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran'];
const MONTHS_YEAR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const THEMES=[['okul','Okul şeridi'],['klasik','Klasik'],['serit','Şeritli'],['koyu','Dolgulu'],['cerceve','Çerçeveli'],['minimal','Sade']];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const num=(v,d)=>{const n=parseFloat(String(v??'').replace(',','.'));return Number.isFinite(n)?n:d};
const f=n=>String(Math.round(n*100)/100);
const pt=mm=>f(mm/PT)+'pt';
const upper=s=>String(s||'').toLocaleUpperCase('tr-TR');
const HEX=/^#[0-9a-f]{3,8}$/i;
function tok(name,fb){try{return global.getComputedStyle(D.documentElement).getPropertyValue(name).trim()||fb}catch(_){return fb}}
function tnum(name,fb){const n=parseFloat(tok(name,''));return Number.isFinite(n)?n:fb}
const swatches=()=>{const a=[];for(let i=1;i<=9;i++){const v=tok('--ka-spine-sw-'+i,'');if(HEX.test(v))a.push(v)}return a};
function yearHint(){const d=new Date(),y=d.getFullYear(),s=d.getMonth()>=8?y:y-1;return s+'-'+(s+1)}

/* ───────── durum ───────── */
const VER=2;   /* kayıtlı tercih sürümü: 2'den önce kaydedilenlerin şablonu yeni varsayılana (Okul şeridi) döner */
function defaults(){const sw=swatches();return{ver:VER,size:'5',w:7,h:28,title:'',sub:'',year:yearHint(),no:'',code:'',school:true,band:'',logo:true,logoFrame:true,frame:true,logobg:'renk',upper:true,theme:'okul',accent:sw[8]||sw[0]||'',accent2:sw[3]||sw[0]||'',dir:'down',fit:100,mode:'single',copies:4,from:1,count:8,months:'okul',list:'',margin:5,gap:0,cut:'line'}}
let st=defaults(),ui={view:'label',idx:0},touched=false,root=null,pg=null,ro=null,logoSrc='',logoReady=Promise.resolve();
/* Kişisel ayarlar cihazın yerel-öncelikli deposunda (KorukLocalFirst.meta) tutulur; doğrudan localStorage kullanılmaz. */
const uid=()=>global.AKTIF_KULLANICI?.uid||'';
/* Sayfa önce varsayılanlarla hemen çizilir; kayıtlı ayarlar gelince (ve kullanıcı bu arada bir şey değiştirmediyse) uygulanır.
   Depo geç yanıt verse ya da hiç yanıt vermese bile sayfa asla boş kalmaz. */
async function loadPrefs(){
  const u=uid();if(!u||!global.KorukLocalFirst?.meta)return null;
  try{const s=await Promise.race([global.KorukLocalFirst.meta(u,KEY),new Promise(r=>setTimeout(()=>r(null),2500))]);return s&&typeof s==='object'?s:null}catch(_){return null}
}
function applyPrefs(saved){
  const d=defaults(),sv={...saved};
  if(!(num(sv.ver,0)>=VER)){delete sv.theme;delete sv.accent}   /* eski kayıt: yeni varsayılan şablon ve renk gelsin */
  const o={...st,...sv,ver:VER};
  if(!HEX.test(String(o.accent||'')))o.accent=d.accent;
  if(!HEX.test(String(o.accent2||'')))o.accent2=d.accent2;
  if(!THEMES.some(t=>t[0]===o.theme))o.theme=d.theme;
  st=o;
}
let saveTimer=0;
function save(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{const u=uid();if(!u||!global.KorukLocalFirst?.meta)return;try{Promise.resolve(global.KorukLocalFirst.meta(u,KEY,{...st})).catch(()=>{})}catch(_){}},400);
}

/* ───────── hesap: sayfa dizilimi ───────── */
function pageLayout(s){
  const W=clamp(s.size==='5'?5:s.size==='8'?8:num(s.w,7),2,20)*10,H=clamp(num(s.h,28),10,29)*10;
  const m=clamp(num(s.margin,5),3,20),mark=tnum('--ka-spine-mark',3);
  let gap=clamp(num(s.gap,0),0,10);
  if(s.cut==='marks')gap=Math.max(gap,mark*2);   /* köşe işaretleri komşu sırtlığa taşmasın */
  const uw=A4.w-2*m,uh=A4.h-2*m,w=Math.min(W,uw),h=Math.min(H,uh);
  const cols=Math.max(1,Math.floor((uw+gap)/(w+gap)+1e-6)),rows=Math.max(1,Math.floor((uh+gap)/(h+gap)+1e-6));
  return{W:w,H:h,m,gap,cols,rows,per:cols*rows};
}
/* ───────── hesap: metni alana sığdır ─────────
   along: satırın uzanabileceği uzunluk (mm) · across: tüm satırların üst üste kaplayabileceği kalınlık (mm)
   k: ortalama harf genişliği / yazı boyu · lead: satır aralığı çarpanı · en iyi (en büyük) yazı boyu ve satır dağılımı döner. */
function balance(words,n){
  if(n<=1)return[words.join(' ')];
  const target=words.join(' ').length/n,lines=[];let cur=[];
  for(const w of words){
    const len=cur.join(' ').length;
    if(cur.length&&lines.length<n-1&&len+1+w.length/2>target){lines.push(cur.join(' '));cur=[w]}else cur.push(w);
  }
  lines.push(cur.join(' '));return lines;
}
function fitText(text,along,across,maxFs,k,lead,maxLines=3){
  const words=String(text||'').trim().split(/\s+/).filter(Boolean);
  if(!words.length||along<=0)return null;
  let best=null;
  for(let n=1;n<=Math.min(maxLines,words.length);n++){
    const lines=balance(words,n),longest=Math.max(...lines.map(l=>l.length));
    const fs=Math.min(maxFs,along/(longest*k),across/(lines.length*lead));
    if(!best||fs>best.fs+.01)best={lines,fs};
  }
  best.fs=Math.max(best.fs,.8);return best;
}
/* ───────── hesap: tek sırtlığın ölçüleri ───────── */
function model(item,P,s,hasLogo){
  const W=P.W,H=P.H,kLogo=tnum('--ka-spine-k-logo',.44),kNo=tnum('--ka-spine-k-no',.44),kTitle=tnum('--ka-spine-k-title',.46),kCross=tnum('--ka-spine-k-cross',.62),
    kChar=tnum('--ka-spine-k-char',.58),kCaps=tnum('--ka-spine-k-char-caps',.7),kLead=tnum('--ka-spine-k-leading',1.16),kMeta=tnum('--ka-spine-k-meta',.16);
  const okul=s.theme==='okul';
  let pad=Math.min(tnum('--ka-spine-pad',3.5),W*.12);
  if(s.theme==='cerceve')pad+=tnum('--ka-spine-frame-gap',2)+tnum('--ka-spine-frame-w',.7)*3;
  pad=Math.min(pad,W*.3);
  const inner=Math.max(4,W-2*pad),vertical=s.dir!=='flat',caps=!!s.upper,kT=caps?kCaps:kChar,fit=clamp(num(s.fit,100),40,100)/100;
  let title=caps?upper(item.title):String(item.title||''),sub=String(item.sub||'').trim();const no=String(item.no||'').trim();
  if(!title.trim()&&sub){title=caps?upper(sub):sub;sub=''}   /* yalnız alt başlık (ör. aylık seri) varsa o ana metin olur */
  /* üst blok: logo + numara */
  const ref=Math.min(W,H*.28);   /* kısa ve geniş sırtlıklarda logo / numara / alt bilgi uzunluğu aşmasın */
  const showLogo=!!(s.logo&&hasLogo),noS=Math.min(okul?inner*.5:inner,ref*kNo*(okul?.6:1)),parts=[];
  let logoS=Math.min(inner,ref*kLogo),boxS=0,bandLen=0,bandFit=null;
  const gT=pad*.6;let top;
  /* okul adı: Okul şeridi şablonunda renkli şeritte, diğerlerinde alt bilgide; yazı "Okul adı yazısı" alanından (boşsa okul bilgisinden) gelir */
  const schoolRaw=s.school?(String(s.band||'').trim()||item.school||''):'',schoolTxt=schoolRaw?(caps?upper(schoolRaw):schoolRaw):'';
  if(okul){
    /* üst blok: logo kutusu (tam genişlik) + altında okul adı şeridi; numara rozeti ortadaki alana girer */
    if(showLogo){boxS=Math.min(W,ref*tnum('--ka-spine-k-box',.96));logoS=Math.max(4,Math.min(inner,boxS-2*pad))}
    bandFit=schoolTxt?fitText(schoolTxt,inner,99,ref*tnum('--ka-spine-k-band',.12),kT,kLead,3):null;
    bandLen=bandFit?pad*1.4+bandFit.lines.length*bandFit.fs*kLead:0;
    top=boxS+bandLen;
  }else{
    if(showLogo)parts.push(logoS);if(no)parts.push(noS);
    top=parts.length?pad*2+parts.reduce((a,b)=>a+b,0)+gT*(parts.length-1):pad;
  }
  const nfs=Math.min(noS*.56,noS*.86/(Math.max(1,no.length)*kChar*1.15));
  /* alt blok: yıl · arşiv kodu · okul */
  const metaMax=ref*kMeta,foot=[];
  const yearFit=item.year?fitText(item.year,inner,99,metaMax*(okul?1.5:1.15),kT,kLead,1):null;
  const codeFit=item.code?fitText(item.code,inner,99,metaMax*.85,kChar,kLead,1):null;
  const schoolFit=!okul&&schoolTxt?fitText(schoolTxt,inner,99,metaMax*.72,kT,kLead,3):null;
  [yearFit,codeFit,schoolFit].forEach(x=>{if(x)foot.push(x)});
  const gF=pad*.35,footLen=foot.length?pad*2+foot.reduce((a,x)=>a+x.lines.length*x.fs*kLead,0)+gF*(foot.length-1):pad;
  /* orta blok: başlık + alt başlık */
  const noMain=okul&&no?noS+pad*.5:0;   /* Okul şeridinde numara rozeti başlığın üstünde durur */
  const mainLen=Math.max(10,H-top-footLen-noMain),along=vertical?mainLen-pad*1.5:inner,crossAll=vertical?inner:mainLen-pad*1.5,hasSub=!!sub;
  const tFit=title?fitText(title,along,crossAll*(hasSub?kCross:.94),W*kTitle*(vertical?1:.8),kT,kLead,vertical?3:5):null;
  if(tFit)tFit.fs*=fit;
  const usedT=tFit?tFit.lines.length*tFit.fs*kLead:0,gTS=pad*.5;
  const crossS=Math.max(crossAll*.2,crossAll-usedT-(tFit?gTS:0)-(vertical?0:0));
  const sFit=sub?fitText(sub,along,crossS,(tFit?tFit.fs:W*kTitle)*.62,kChar,kLead,4):null;
  if(sFit)sFit.fs*=fit;
  return{okul,pad,top,foot:footLen,showLogo,logoS,boxS,bandLen,bandFit,noS,nfs,no,tFit,sFit,yearFit,codeFit,schoolFit,gTS,gF};
}
const lines=a=>a.map(esc).join('<br>');
const accentOf=s=>HEX.test(String(s.accent||''))?s.accent:(swatches()[0]||'');
const accent2Of=s=>HEX.test(String(s.accent2||''))?s.accent2:(swatches()[3]||accentOf(s));
/* Renkli zemin üstündeki yazı rengi: kâğıt belirteçlerindeki açık / koyu yazıdan, kontrastı yüksek olan seçilir (renk değeri koda yazılmaz). */
function lum(c){
  const h=String(c||'').replace('#','').trim(),v=h.length===3?h.replace(/./g,'$&$&'):h.slice(0,6);
  if(v.length<6||!/^[0-9a-f]{6}$/i.test(v))return null;
  const n=parseInt(v,16),lin=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};
  return .2126*lin(n>>16&255)+.7152*lin(n>>8&255)+.0722*lin(n&255);
}
function inkOn(bg){
  const a=tok('--ka-spine-on-accent',''),b=tok('--ka-spine-ink',''),l=lum(bg);
  if(l==null)return a;
  const ratio=(x,y)=>(Math.max(x,y)+.05)/(Math.min(x,y)+.05),la=lum(a),lb=lum(b);
  return ratio(l,la==null?1:la)>=ratio(l,lb==null?0:lb)?a:b;
}
function labelHtml(item,P,s,cls=''){
  const m=model(item,P,s,!!logoSrc),st2=[`--sp-w:${f(P.W)}mm`,`--sp-h:${f(P.H)}mm`,`--sp-c:${accentOf(s)}`,`--sp-pad:${f(m.pad)}mm`,`--sp-top:${f(m.top)}mm`,`--sp-foot:${f(m.foot)}mm`,
    `--sp-c2:${accent2Of(s)}`,`--sp-c2ink:${inkOn(accent2Of(s))}`,`--sp-logo:${f(m.logoS)}mm`,`--sp-no:${f(m.noS)}mm`,`--sp-nfs:${pt(m.nfs)}`,`--sp-tg:${f(m.gTS)}mm`,`--sp-fg:${f(m.gF)}mm`];
  if(m.okul){st2.push(`--sp-box:${f(m.boxS)}mm`,`--sp-band:${f(m.bandLen)}mm`);if(m.bandFit)st2.push(`--sp-bfs:${pt(m.bandFit.fs)}`)}
  if(m.tFit)st2.push(`--sp-tfs:${pt(m.tFit.fs)}`);
  if(m.sFit)st2.push(`--sp-sfs:${pt(m.sFit.fs)}`);
  if(m.yearFit)st2.push(`--sp-yfs:${pt(m.yearFit.fs)}`);
  if(m.codeFit)st2.push(`--sp-cfs:${pt(m.codeFit.fs)}`);
  if(m.schoolFit)st2.push(`--sp-mfs:${pt(m.schoolFit.fs)}`);
  const logoImg=m.showLogo?`<img class="ka-spine__logo" src="${esc(logoSrc)}" alt="">`:'',noHtml=m.no?`<div class="ka-spine__no">${esc(m.no)}</div>`:'';
  /* Okul şeridi: [logo kutusu] [okul adı şeridi] · numara rozeti ortadaki alanda. Diğer şablonlar: tek üst blok (logo + numara). */
  const topHtml=m.okul
    ?`${m.boxS?`<div class="ka-spine__box">${logoImg}</div>`:''}${m.bandFit?`<div class="ka-spine__band">${lines(m.bandFit.lines)}</div>`:''}`
    :`<div class="ka-spine__top">${logoImg}${noHtml}</div>`;
  const mainHtml=`<div class="ka-spine__main">${m.okul?noHtml:''}<div class="ka-spine__text">${m.sFit?`<div class="ka-spine__sub">${lines(m.sFit.lines)}</div>`:''}${m.tFit?`<div class="ka-spine__title">${lines(m.tFit.lines)}</div>`:''}</div></div>`;
  const footHtml=`<div class="ka-spine__foot">${m.yearFit?`<div class="ka-spine__year">${lines(m.yearFit.lines)}</div>`:''}${m.codeFit?`<div class="ka-spine__code">${lines(m.codeFit.lines)}</div>`:''}${m.schoolFit?`<div class="ka-spine__school">${lines(m.schoolFit.lines)}</div>`:''}</div>`;
  return `<div class="ka-spine t-${esc(s.theme)} lb-${s.logobg==='beyaz'?'beyaz':'renk'} lf-${s.logoFrame===false?'off':'on'} fr-${s.frame===false?'off':'on'} d-${s.dir==='up'?'up':s.dir==='flat'?'flat':'down'} ${cls}" style="${st2.join(';')}">${topHtml}${mainHtml}${footHtml}</div>`;
}
function sheetHtml(items,P,s,page){
  const slice=items.slice(page*P.per,(page+1)*P.per);
  return `<section class="ka-spine-sheet cut-${esc(s.cut)}" style="--sp-m:${f(P.m)}mm;--sp-gap:${f(P.gap)}mm;--sp-cols:${P.cols};--sp-w:${f(P.W)}mm;--sp-h:${f(P.H)}mm">${slice.map(it=>`<div class="ka-spine-cell">${labelHtml(it,P,s)}</div>`).join('')}</section>`;
}

/* ───────── seri: sırtlık listesi ───────── */
function school(){try{return global.ReportEngine?.schoolInfo?.().okulAdi||''}catch(_){return''}}
function buildItems(s,okul=school()){
  const b={title:String(s.title||'').trim(),sub:String(s.sub||'').trim(),no:String(s.no||'').trim(),year:String(s.year||'').trim(),code:String(s.code||'').trim(),school:okul};
  let out=[];
  if(s.mode==='numbered'){const from=Math.round(num(s.from,1)),n=clamp(Math.round(num(s.count,8)),1,120);for(let i=0;i<n;i++)out.push({...b,no:String(from+i)})}
  else if(s.mode==='monthly'){(s.months==='takvim'?MONTHS_YEAR:MONTHS_SCHOOL).forEach(mn=>out.push({...b,sub:mn}))}
  else if(s.mode==='list'){String(s.list||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,200).forEach(line=>{const p=line.split('|').map(x=>x.trim());out.push({...b,title:p[0]||b.title,sub:p[1]?p[1]:b.sub,no:p[2]||''})})}
  else{const n=clamp(Math.round(num(s.copies,1)),1,60);for(let i=0;i<n;i++)out.push({...b})}
  return out.filter(x=>x.title||x.sub||x.no||x.code);
}
const SAMPLE={title:'Klasör Başlığı',sub:'Alt başlık',no:'1',code:'',year:'',school:''};

/* ───────── yazdırılan belge: merkezi CSS'ten çıkarılan kâğıt kuralları ───────── */
let cssCache='';
function paperCss(){
  if(cssCache)return cssCache;
  const rootStyle=global.getComputedStyle(D.documentElement),out=[];
  const resolve=t=>{for(let i=0;i<8&&/var\(/.test(t);i++)t=t.replace(/var\(\s*(--[\w-]+)\s*(?:,((?:[^()]|\([^()]*\))*))?\)/g,(m,n,fb)=>{if(/^--(?:sp|_)/.test(n))return m;const v=rootStyle.getPropertyValue(n).trim();return v||(fb!=null?fb.trim():'')});return t};
  const walk=rules=>{for(const r of rules){
    if(r.type===3&&r.styleSheet){try{walk(r.styleSheet.cssRules)}catch(_){}}
    else if(r.type===1&&/\.ka-spine(?:-sheet|-cell|-doc)?(?![\w-])|\.ka-spine__/.test(r.selectorText)&&!/#v2ModuleRoot/.test(r.selectorText))out.push(resolve(r.cssText));
  }};
  for(const sh of D.styleSheets){try{walk(sh.cssRules)}catch(_){}}
  cssCache=out.join('\n');return cssCache;
}
function docHtml(items,P,s){
  const pages=Math.max(1,Math.ceil(items.length/P.per)),sheets=[];
  for(let i=0;i<pages;i++)sheets.push(sheetHtml(items,P,s,i));
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Klasör Sırtlığı</title></head><body class="ka-spine-doc"><style>@page{size:A4 portrait;margin:0}${paperCss()}</style>${sheets.join('')}</body></html>`;
}

/* ───────── arayüz ───────── */
const seg=(key,opts)=>`<div class="ka-spine-seg" role="group">${opts.map(([v,l])=>`<button type="button" class="ka-tab" data-set="${key}" data-val="${esc(v)}" aria-pressed="false">${esc(l)}</button>`).join('')}</div>`;
const field=(key,label,attrs='',extra='')=>`<label class="ka-field ${extra}"><span class="ka-field__label">${esc(label)}</span><input class="ka-input" data-k="${key}" ${attrs}></label>`;
const check=(key,label)=>`<label class="ka-spine-check"><input type="checkbox" data-k="${key}"><span>${esc(label)}</span></label>`;
function pageHtml(){
  const sw=swatches();
  const dots=(attr,key,label)=>`<div class="ka-spine-sw">${sw.map(c=>`<button type="button" class="ka-spine-sw__dot" data-${attr}="${esc(c)}" style="--sw:${esc(c)}" aria-label="${esc(label)} ${esc(c)}"></button>`).join('')}<label class="ka-spine-sw__custom" title="Özel renk"><input type="color" data-k="${key}" aria-label="${esc(label)} (özel)"></label></div>`;
  return `<section class="ka-page ka-stack" data-folder-spine>
<header class="ka-page-head"><span class="ka-page-head__icon" aria-hidden="true">🗂️</span><div><small>ARAÇLAR</small><h2>Klasör Sırtlığı Oluşturucu</h2><p>Ölçüyü seçin, bilgileri yazın; sırtlıklar A4’e kesim çizgisiyle dizilir ve yazdırılır.</p></div></header>
<div class="ka-spine-layout">
<article class="ka-card ka-spine-viewbox"><div class="ka-card__body ka-stack">
<div class="ka-spine-seg" role="group" aria-label="Önizleme"><button type="button" class="ka-tab" data-view="label" aria-pressed="true">Sırtlık</button><button type="button" class="ka-tab" data-view="sheet" aria-pressed="false">A4 dizilim</button></div>
<div class="ka-spine-stage" data-stage></div>
<div class="ka-spine-pager" data-pager hidden><button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-page="-1" aria-label="Önceki">‹</button><span data-pager-text></span><button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-page="1" aria-label="Sonraki">›</button></div>
<p class="ka-muted ka-spine-info" data-info></p>
<div class="ka-spine-actions"><button type="button" class="ka-btn" data-print>🖨 Önizle ve yazdır</button></div>
</div></article>
<div class="ka-stack ka-spine-form">
<article class="ka-card"><div class="ka-card__body ka-stack"><h3 class="ka-spine-h">1 · Ölçü</h3>
${seg('size',[['5','5 cm · Dar'],['8','8 cm · Geniş'],['ozel','Özel']])}
<div class="ka-spine-grid">${field('w','Genişlik (cm)','type="number" inputmode="decimal" min="2" max="20" step="0.5"','is-when-size')}${field('h','Uzunluk (cm)','type="number" inputmode="decimal" min="10" max="29" step="0.5"')}</div>
</div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><h3 class="ka-spine-h">2 · İçerik</h3>
<div class="ka-spine-grid">${field('title','Başlık','maxlength="60" placeholder="Örn. Gelen Giden Evrak"','is-wide')}${field('sub','Alt başlık','maxlength="60" placeholder="Örn. Resmî yazışmalar"','is-wide')}${field('year','Dönem (en altta, yatay)','maxlength="20" placeholder="Örn. 2025-2026"')}${field('no','Klasör no','maxlength="4" placeholder="Örn. 1"')}${field('code','Arşiv kodu','maxlength="20" placeholder="Örn. 010.01"','is-wide')}${field('band','Okul adı yazısı','maxlength="60" placeholder="Boşsa okul bilgilerindeki ad kullanılır"','is-wide')}</div>
<div class="ka-spine-checks">${check('logo','Okul logosu')}${check('logoFrame','Logo çerçevesi')}${check('frame','Sırtlık çerçevesi')}${check('school','Okul adı')}${check('upper','BÜYÜK HARF')}</div>
</div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><h3 class="ka-spine-h">3 · Tasarım</h3>
<div class="ka-stack ka-spine-tight"><span class="ka-field__label">Şablon</span>${seg('theme',THEMES)}</div>
<div class="ka-stack ka-spine-tight"><span class="ka-field__label">Ana renk</span>${dots('accent','accent','Ana renk')}</div>
<div class="ka-stack ka-spine-tight" data-when-theme="okul"><span class="ka-field__label">Okul adı şeridinin rengi</span>${dots('accent2','accent2','Şerit rengi')}</div>
<div class="ka-stack ka-spine-tight" data-when-theme="okul"><span class="ka-field__label">Logo kutusu</span>${seg('logobg',[['renk','Renkli zemin'],['beyaz','Beyaz zemin']])}</div>
<div class="ka-stack ka-spine-tight"><span class="ka-field__label">Yazı yönü</span>${seg('dir',[['down','Yukarıdan aşağı'],['up','Aşağıdan yukarı'],['flat','Yatay']])}</div>
<label class="ka-field"><span class="ka-field__label">Başlık boyutu <b data-fit-text></b></span><input class="ka-spine-range" data-k="fit" type="range" min="40" max="100" step="5"></label>
</div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><h3 class="ka-spine-h">4 · Seri</h3>
${seg('mode',[['single','Tek'],['numbered','Numaralı'],['monthly','Aylık'],['list','Liste']])}
<div data-when-mode="single" class="ka-spine-grid">${field('copies','Adet','type="number" inputmode="numeric" min="1" max="60"')}<button type="button" class="ka-btn ka-btn--secondary" data-fill-page>Sayfayı doldur</button></div>
<div data-when-mode="numbered" class="ka-spine-grid">${field('from','Başlangıç no','type="number" inputmode="numeric"')}${field('count','Adet','type="number" inputmode="numeric" min="1" max="120"')}</div>
<div data-when-mode="monthly" class="ka-stack ka-spine-tight">${seg('months',[['okul','Eylül – Haziran'],['takvim','Ocak – Aralık']])}<p class="ka-muted ka-spine-note">Ay adı, alt başlık yerine yazılır.</p></div>
<div data-when-mode="list" class="ka-stack ka-spine-tight"><label class="ka-field"><span class="ka-field__label">Her satır bir sırtlık</span><textarea class="ka-input ka-spine-list" data-k="list" rows="6" placeholder="5-A&#10;5-B | Sınıf dosyası&#10;Ayşe Yılmaz | Öğretmen dosyası | 3"></textarea></label>
<div class="ka-spine-seg"><button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-fill="classes">Sınıflardan doldur</button><button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-fill="teachers">Öğretmenlerden doldur</button></div>
<p class="ka-muted ka-spine-note">Biçim: <code>Başlık | Alt başlık | No</code> — alt başlık ve no isteğe bağlıdır.</p></div>
</div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><h3 class="ka-spine-h">5 · Sayfa ve kesim</h3>
<div class="ka-stack ka-spine-tight"><span class="ka-field__label">Kesim</span>${seg('cut',[['line','Kesik çizgi'],['marks','Köşe işareti'],['none','Yok']])}</div>
<div class="ka-spine-grid">${field('margin','Sayfa kenarı (mm)','type="number" inputmode="decimal" min="3" max="20" step="1"')}${field('gap','Sırtlık arası (mm)','type="number" inputmode="decimal" min="0" max="10" step="1"')}</div>
</div></article>
<div class="ka-spine-actions"><button type="button" class="ka-btn" data-print>🖨 Önizle ve yazdır</button><button type="button" class="ka-btn ka-btn--secondary" data-reset>Sıfırla</button></div>
</div></div></section>`;
}
function curItems(){return buildItems(st)}
function stageDims(){const w=pg?.querySelector('[data-stage]');return{w:Math.max(120,(w?.clientWidth||320)-2*tnum('--ka-spine-stage-pad',16))}}
function renderStage(){
  if(!pg||!pg.isConnected)return;
  const stage=pg.querySelector('[data-stage]'),P=pageLayout(st),items=curItems(),sample=!items.length,show=sample?[{...SAMPLE,year:String(st.year||'').trim(),school:st.school?school():''}]:items;
  const pages=Math.max(1,Math.ceil(show.length/P.per)),count=ui.view==='sheet'?pages:show.length;
  ui.idx=clamp(ui.idx,0,count-1);
  const dim=stageDims(),maxH=clamp((global.innerHeight||800)*.6,280,600);
  let html,pw,ph;
  if(ui.view==='sheet'){pw=A4.w*MM;ph=A4.h*MM;html=sheetHtml(show,P,st,ui.idx)}
  else{pw=P.W*MM;ph=P.H*MM;html=labelHtml(show[ui.idx],P,st)}
  const k=Math.min(1,dim.w/pw,maxH/ph);
  stage.innerHTML=`<div class="ka-spine-fit${sample?' is-sample':''}" style="width:${Math.round(pw*k)}px;height:${Math.round(ph*k)}px;--sp-k:${k.toFixed(4)}"><div class="ka-spine-scale">${html}</div></div>`;
  const pager=pg.querySelector('[data-pager]');pager.hidden=count<=1;
  pg.querySelector('[data-pager-text]').textContent=(ui.view==='sheet'?'Sayfa ':'Sırtlık ')+(ui.idx+1)+' / '+count;
  const total=sample?0:items.length;
  pg.querySelector('[data-info]').textContent=`${f(P.W/10)} × ${f(P.H/10)} cm · A4’e ${P.per} sırtlık (${P.cols} × ${P.rows})`+(total?` · ${total} sırtlık → ${Math.ceil(total/P.per)} sayfa`:' · Başlık yazılmazsa boş sırtlık basılır (elle yazmak için)');
}
function syncControls(){
  if(!pg)return;
  pg.querySelectorAll('[data-set]').forEach(b=>{const on=String(st[b.dataset.set])===b.dataset.val;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
  pg.querySelectorAll('[data-view]').forEach(b=>{const on=ui.view===b.dataset.view;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
  [['accent','accent'],['accent2','accent2']].forEach(([attr,key])=>pg.querySelectorAll(`[data-${attr}]`).forEach(b=>{const on=String(b.dataset[attr]).toLowerCase()===String(st[key]).toLowerCase();b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))}));
  pg.querySelectorAll('[data-when-theme]').forEach(e=>{e.hidden=e.dataset.whenTheme!==st.theme});
  pg.querySelectorAll('[data-k]').forEach(el=>{const v=st[el.dataset.k];if(el===D.activeElement)return;if(el.type==='checkbox')el.checked=!!v;else el.value=v??''});
  pg.querySelector('[data-fit-text]').textContent='%'+clamp(num(st.fit,100),40,100);
  pg.querySelectorAll('[data-when-mode]').forEach(e=>{e.hidden=e.dataset.whenMode!==st.mode});
  pg.querySelectorAll('.is-when-size').forEach(e=>{e.hidden=st.size!=='ozel'});
}
function refresh(){syncControls();renderStage()}
function fillList(kind){
  const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
  const names=kind==='classes'
    ?arr('siniflar').map(x=>String(x.ad||x.sinifAdi||'').trim()).filter(Boolean).sort((a,b)=>a.localeCompare(b,'tr',{numeric:true}))
    :arr('ogretmenler').map(x=>[x.ad,x.soyad].filter(Boolean).join(' ').trim()||String(x.adSoyad||'').trim()).filter(Boolean).sort((a,b)=>a.localeCompare(b,'tr'));
  if(!names.length){global.toast?.(kind==='classes'?'Kayıtlı sınıf bulunamadı.':'Kayıtlı öğretmen bulunamadı.');return}
  st.list=names.join('\n');save();refresh();
}
/* İçerik yazılmadıysa elle yazılacak boş sırtlıklar basılır (yıl ve okul adı yine de yer alır). */
function blankItems(){
  const n=clamp(Math.round(num(st.copies,1)),1,60);
  return Array.from({length:n},()=>({title:'',sub:'',no:'',code:'',year:String(st.year||'').trim(),school:school()}));
}
async function print(){
  if(!global.ReportEngine?.previewHtml){try{await global.AppLoader?.loadScript?.('js/modules/report-engine.js?v=4')}catch(_){}}
  const RE=global.ReportEngine;
  if(!RE?.previewHtml){global.toast?.('Yazdırma altyapısı yüklenemedi. Uygulamayı yenileyip tekrar deneyin.');return}
  let items=curItems();
  if(!items.length){
    if(st.mode==='list'&&!String(st.list||'').trim()){global.toast?.('Listeye en az bir satır yazın.');return}
    items=blankItems();
    global.toast?.('Başlık yazılmadığı için boş sırtlıklar hazırlandı; elle yazabilirsiniz.');
  }
  await Promise.race([logoReady,new Promise(r=>setTimeout(r,1500))]);   /* logo gelmezse bekleme */
  RE.previewHtml(docHtml(items,pageLayout(st),st),{title:'Klasör Sırtlığı',fileName:'Klasor_Sirtligi',yon:'dikey'});
}
function onInput(e){
  const el=e.target.closest?.('[data-k]');if(!el||!pg?.contains(el))return;
  const k=el.dataset.k;touched=true;
  st[k]=el.type==='checkbox'?el.checked:el.type==='range'?num(el.value,100):el.value;
  save();
  refresh();
}
function onClick(e){
  const t=e.target.closest?.('button');if(!t||!pg?.contains(t))return;
  touched=true;
  if(t.dataset.set){st[t.dataset.set]=t.dataset.val;save();ui.idx=0;refresh();return}
  if(t.dataset.view){ui.view=t.dataset.view;ui.idx=0;refresh();return}
  if(t.dataset.accent){st.accent=t.dataset.accent;save();refresh();return}
  if(t.dataset.accent2){st.accent2=t.dataset.accent2;save();refresh();return}
  if(t.dataset.page){ui.idx+=Number(t.dataset.page);renderStage();return}
  if(t.dataset.fill){fillList(t.dataset.fill);return}
  if(t.hasAttribute('data-fill-page')){st.copies=pageLayout(st).per;save();refresh();return}
  if(t.hasAttribute('data-print')){
    if(t.disabled)return;
    const label=t.textContent;t.disabled=true;t.textContent='Hazırlanıyor…';
    print().catch(err=>{console.error('[FolderSpine]',err);global.toast?.('Önizleme açılamadı: '+(err?.message||err))}).finally(()=>{t.disabled=false;t.textContent=label});
    return;
  }
  if(t.hasAttribute('data-reset')){st=defaults();ui={view:'label',idx:0};save();refresh();return}
}
function logoPrepare(){
  const RE=global.ReportEngine;let url='';
  try{url=RE?.logoUrl?.()||''}catch(_){}
  logoSrc=url;
  if(!url)return Promise.resolve();
  return fetch(url,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('logo');return r.blob()}).then(b=>new Promise((ok,no)=>{const fr=new FileReader();fr.onload=()=>ok(String(fr.result||''));fr.onerror=no;fr.readAsDataURL(b)})).then(d=>{if(d){logoSrc=d;renderStage()}}).catch(()=>{});
}
async function open(target){
  root=target||D.getElementById('v2ModuleRoot');
  if(!root)return false;
  close();
  st=defaults();ui={view:'label',idx:0};touched=false;
  logoReady=logoPrepare();
  root.innerHTML=pageHtml();
  pg=root.querySelector('[data-folder-spine]');
  /* dinleyiciler yalnız bu sayfa bölümüne bağlıdır: başka modül kök alanı doldurunca birlikte gider */
  pg.addEventListener('input',onInput);pg.addEventListener('change',onInput);pg.addEventListener('click',onClick);
  refresh();
  loadPrefs().then(saved=>{if(saved&&!touched&&pg&&pg.isConnected){applyPrefs(saved);refresh()}});
  const stage=pg.querySelector('[data-stage]');
  if(global.ResizeObserver){ro=new ResizeObserver(()=>{if(!stage.isConnected){close();return}renderStage()});ro.observe(stage)}
  return true;
}
function close(){try{ro?.disconnect()}catch(_){}ro=null;return true}
global.FolderSpine={open,close,engine:{pageLayout,fitText,buildItems,labelHtml,sheetHtml,model,defaults,lum}};
})(window);
