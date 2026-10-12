// Tema merkezi sözleşmesi: üretimdeki tüm renk/yüzey/ölçü değerleri css/design-system-base.css başındaki
// "TEMA MERKEZİ" bloğundan gelir. Bu test mimarinin yeniden dağılmasını (yama katmanları, ikinci token tanımı,
// bileşen kuralında sabit marka rengi) engeller.
const fs=require('fs'),assert=require('assert');
const css=fs.readFileSync('css/design-system-base.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const entry=fs.readFileSync('css/design-system.css','utf8');

// yorumları aynı uzunlukta boşlukla maskele (konumlar korunur)
const masked=css.replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,' '));

// --- 1) Merkez bloğu ve sınırları
const START=css.indexOf('KORUK ASİSTAN — TEMA MERKEZİ');
const END_MARK='@media(max-width:767px){:root{--ka-font-size-md:var(--ka-fs-14)}}';
const END=css.indexOf(END_MARK);
assert(START>-1,'TEMA MERKEZİ başlığı bulunamadı.');
assert(END>START,'TEMA MERKEZİ bloğunun sonu (mobil yazı boyutu kuralı) bulunamadı.');
const core=masked.slice(START,END);
const outside=masked.slice(0,START)+' '.repeat(END-START)+masked.slice(END+END_MARK.length);

// --- 2) Basit kural ayrıştırıcı (iç içe @media/@supports dahil)
function parse(text){
  const out=[];
  (function scan(i,end,ctx,media){
    while(i<end){
      while(i<end&&/\s/.test(text[i]))i++;
      if(i>=end)break;
      let j=i,depth=0,q=null;
      for(;j<end;j++){
        const c=text[j];
        if(q){if(c==='\\')j++;else if(c===q)q=null;continue}
        if(c==='"'||c==="'"){q=c;continue}
        if(c==='(')depth++;else if(c===')')depth--;
        else if(depth===0&&(c==='{'||c===';'))break;
      }
      if(j>=end)break;
      if(text[j]===';'){i=j+1;continue}
      const prelude=text.slice(i,j).trim();
      let k=j+1,d=1;q=null;
      for(;k<end&&d>0;k++){
        const c=text[k];
        if(q){if(c==='\\')k++;else if(c===q)q=null;continue}
        if(c==='"'||c==="'"){q=c;continue}
        if(c==='{')d++;else if(c==='}')d--;
      }
      const body=text.slice(j+1,k-1);
      if(prelude.startsWith('@')){
        if(/^@(media|supports|layer|container)/.test(prelude))scan(j+1,k-1,ctx+1,media+' '+prelude);
      }else out.push({sel:prelude.replace(/\s+/g,' '),body,start:i,nested:ctx>0,media});
      i=k;
    }
  })(0,text.length,0,'');
  return out;
}
const rules=parse(masked);

// --- 3) html düzeyinde değişken tanımı yalnız merkez bloğunda olabilir
const HTML_LEVEL=new Set([':root','html','body','[data-theme="dark"]','html[data-theme="dark"]','html[data-theme="light"]','[data-theme="light"]',':root:not([data-theme="dark"])','html:not([data-theme="dark"])']);
const htmlRules=rules.filter(r=>r.sel.split(',').every(p=>HTML_LEVEL.has(p.trim()))&&/(^|[;{\s])--[a-zA-Z0-9-]+\s*:/.test(r.body));
const LIMIT=END+END_MARK.length;
const stray=htmlRules.filter(r=>r.start<START||r.start>LIMIT);
assert.strictEqual(stray.length,0,`html düzeyinde değişken tanımı merkez bloğunun dışında: ${stray.slice(0,3).map(r=>r.sel).join(' | ')} — TEMA MERKEZİ'ne taşıyın.`);
const inCore=htmlRules.filter(r=>r.start>=START&&r.start<=LIMIT);
assert.strictEqual(inCore.length,4,`Merkez bloğunda 4 kural beklenir (ortak + açık + koyu + mobil yazı boyutu), bulunan: ${inCore.length}`);

// --- 4) Merkez bloğunun zorunlu parçaları
for(const t of ['--t-accent-rgb','--t-accent','--t-accent-deep','--t-accent-bright','--t-on-accent','--t-tint-rgb','--t-accent-text',
  '--c-amber','--c-emerald','--c-indigo','--c-red','--c-blue','--c-violet',
  '--ka-primary','--ka-app-bg','--ka-text','--ka-text-muted','--ka-border','--ka-card-bg','--ka-card-raised-bg','--ka-input-bg',
  '--gl-bg','--gl-field','--gl-edge','--gl-sep','--gl-fg','--gl-sub','--gl-dim','--gl-shadow','--gl-blur',
  '--hd-bg','--hd-solid','--pp-bg','--pp-solid','--ka-danger','--ka-success','--ka-warning','--ka-info'])
  assert(core.includes(t+':'),`TEMA MERKEZİ'nde tanım eksik: ${t}`);
// açık ve koyu palet aynı değişkenleri tanımlamalı (koyu yalnız-koyu istisnaları hariç: profil hero türevleri)
const names=b=>new Set([...b.matchAll(/(^|[;{\s])(--[a-zA-Z0-9-]+)\s*:/g)].map(m=>m[2]));
const [shared,light,dark]=inCore.slice(0,3).map(r=>names(r.body));
for(const n of light)assert(dark.has(n),`Açık palette olup koyu palette olmayan değişken: ${n}`);

// --- 5) Bileşen kurallarında sabit marka / kategori rengi yok
const BRAND=[/#ffc400(?![0-9a-fA-F])/i,/rgba?\(\s*255\s*,\s*196\s*,\s*0\b/,/#e5b000(?![0-9a-fA-F])/i,/#ffd34d(?![0-9a-fA-F])/i,
  /rgba?\(\s*245\s*,\s*158\s*,\s*11\b/,/rgba?\(\s*16\s*,\s*185\s*,\s*129\b/,/rgba?\(\s*99\s*,\s*102\s*,\s*241\b/,/rgba?\(\s*239\s*,\s*68\s*,\s*68\b/,/rgba?\(\s*59\s*,\s*130\s*,\s*246\b/];
for(const rx of BRAND){
  const m=outside.match(rx);
  assert(!m,`Bileşen kuralında sabit marka/kategori rengi var (${m&&m[0]}); var(--t-*) veya var(--c-*) kullanın.`);
}

// --- 6) Sürüm kuralı: giriş noktası ve index aynı CSS'i yüklüyor, sürüm numaraları tanımlı
assert(/@import url\("\.\/design-system-base\.css\?v=\d+"\)/.test(entry),'design-system.css taban CSS’i sürüm numarasıyla içe aktarmalı.');
assert(/css\/design-system\.css\?v=\d+/.test(index),'index.html design-system.css’i sürüm numarasıyla yüklemeli.');

// --- 7) Bileşen merkezi: köşe / çizgi / bulanıklık / odak halkası değerleri de merkezden gelir
for(const t of ['--ka-radius-base','--ka-r-1','--ka-r-6','--ka-r-10','--ka-border-w','--ka-ring-w','--ka-blur-k',
  '--ka-btn-radius','--ka-btn-radius-sm','--ka-btn-radius-lg','--ka-btn-grow','--ka-btn-h-md','--ka-btn-px','--ka-btn-weight',
  '--ka-field-radius','--ka-field-grow','--ka-field-h-md','--ka-field-px','--ka-field-ring',
  '--ka-card-radius','--ka-card-radius-sm','--ka-card-radius-lg','--ka-card-pad',
  '--ka-cover-radius','--ka-cover-radius-sm','--ka-cover-radius-lg','--ka-sheet-radius','--ka-sheet-radius-lg',
  '--ka-chip-radius','--ka-chip-h','--ka-tab-radius','--ka-tab-h','--ka-table-radius','--ka-cmd-radius','--ka-cmd-h',
  '--ka-orb-a','--ka-orb-b','--ka-orb-c','--ka-orb-blur'])
  assert(core.includes(t+':'),`TEMA MERKEZİ'nde bileşen değişkeni eksik: ${t}`);
// Rapor / belge önizleme kâğıt yüzeyleri temadan bağımsızdır; onun dışındaki kurallarda sabit köşe/çizgi olmaz.
const PAPER=/\.ka-report|\.dv3|@page|\.ka-pt-preview/;
const literalRadius=/(^|[;\s])border(-(top|bottom)-(left|right))?-radius\s*:[^;}]*?(?<![\w.-])(8|9|1[0-9]|2[0-8])(\.\d+)?px/;
const literalBorder=/(^|[;\s])border(-(top|right|bottom|left))?\s*:\s*1px\b/;
const badR=[],badB=[];
for(const r of rules){
  if(r.start>=START&&r.start<=LIMIT)continue;
  if(PAPER.test(r.sel))continue;
  if(literalRadius.test(r.body))badR.push(r.sel.slice(0,60));
  if(literalBorder.test(r.body))badB.push(r.sel.slice(0,60));
}
assert.strictEqual(badR.length,0,`Bileşen kuralında sabit köşe değeri var (var(--ka-r-*) veya aile değişkeni kullanın): ${badR.slice(0,3).join(' | ')}`);
assert.strictEqual(badB.length,0,`Bileşen kuralında sabit 1px çizgi var (var(--ka-border-w) veya aile değişkeni kullanın): ${badB.slice(0,3).join(' | ')}`);

// Diğer üretim stil dosyaları da aynı kurala tabidir (giriş noktasındaki ek kurallar, duyuru medya stili).
for(const f of ['css/design-system.css','css/dashboard-announcement-media.css']){
  const t=fs.readFileSync(f,'utf8').replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,' '));
  const bad=parse(t).filter(r=>!PAPER.test(r.sel)&&(literalRadius.test(r.body)||literalBorder.test(r.body))).map(r=>r.sel.slice(0,60));
  assert.strictEqual(bad.length,0,`${f}: bileşen kuralında sabit köşe/1px çizgi var: ${bad.slice(0,3).join(' | ')}`);
}


// --- 8) Tüm uygulama merkezden yönetilir: yazı, boşluk, gölge, hareket, renk, köşe, çizgi, ikon boyutu
for(const t of ['--ka-font-scale','--ka-fw-shift','--ka-lh-k','--ka-tracking-k','--ka-density','--ka-motion-k','--ka-shadow-a','--ka-shadow-k','--ka-shadow-rgb',
  '--ka-icon-k','--ka-row-grow','--ka-ring-offset','--k-white','--k-black','--ka-fs-12','--ka-fw-800','--ka-sp-12','--ka-sh-8','--ka-ic-44','--ka-dur-200','--ka-rs-4'])
  assert(core.includes(t+':'),`TEMA MERKEZİ'nde genel düğme/basamak eksik: ${t}`);

function splitDecls(body){
  const out=[];let cur='',d=0,q=null;
  for(const c of body){
    if(q){cur+=c;if(c===q)q=null;continue}
    if(c==='"'||c==="'"){q=c;cur+=c;continue}
    if(c==='(')d++;else if(c===')')d--;
    if(c===';'&&d===0){out.push(cur);cur=''}else cur+=c;
  }
  out.push(cur);
  return out.map(x=>{const i=x.indexOf(':');return i<0?null:[x.slice(0,i).trim().toLowerCase(),x.slice(i+1).trim()]}).filter(Boolean);
}
const stripVar=v=>{let p;do{p=v;v=v.replace(/var\([^()]*(?:\([^()]*\)[^()]*)*\)/g,'')}while(v!==p);return v};
const stripUrl=v=>v.replace(/url\((?:"[^"]*"|'[^']*'|[^)])*\)/g,'').replace(/"[^"]*"|'[^']*'/g,'');
const PXNZ=/(?<![\w.#-])(?!0+(?:\.0+)?(?:px|rem)\b)-?\d*\.?\d+(?:px|rem)\b/;
function declViolation(prop,raw){
  const v=stripUrl(raw);
  if(/#[0-9a-fA-F]{3,8}\b/.test(v)||/(^|[^\w-])rgba?\(\s*\d/i.test(v))return 'sabit renk (renk havuzu / palet değişkeni kullanın)';
  const nv=stripVar(v);
  if(prop==='font-size'&&PXNZ.test(nv))return 'sabit yazı boyutu (--ka-fs-* kullanın)';
  if(prop==='font-weight'&&/^\s*\d{3,4}\b/.test(nv))return 'sabit yazı kalınlığı (--ka-fw-* kullanın)';
  if(prop==='letter-spacing'&&/(?<![\w.#-])-?\d*\.?\d+(em|px)\b/.test(nv.replace(/(?<![\w.#-])-?0*\.?0+(em|px)\b/g,'')))return 'sabit harf aralığı (--ka-ls-* kullanın)';
  if(prop==='line-height'&&(/^\s*\d*\.\d+\s*(!important)?\s*$/.test(nv)||PXNZ.test(nv)))return 'sabit satır yüksekliği (--ka-lh-* kullanın)';
  if(/^(padding|margin)(-(top|right|bottom|left|inline|block)(-(start|end))?)?$/.test(prop)||/^(grid-)?(row-|column-)?gap$/.test(prop)){
    if(PXNZ.test(nv))return 'sabit boşluk (--ka-sp-* kullanın)';
  }
  if((prop==='transition'||prop==='animation'||/^(transition|animation)-(duration|delay)$/.test(prop))&&/(?<![\w.#-])-?(?!0+(?:\.0+)?m?s\b)\d*\.?\d+m?s\b/.test(nv))return 'sabit süre (--ka-dur-* kullanın)';
  if(/^border(-(top|bottom)-(left|right))?-radius$/.test(prop)){
    const m=[...nv.matchAll(/(?<![\w.#-])(\d*\.?\d+)px\b/g)].find(x=>parseFloat(x[1])>0&&parseFloat(x[1])<100);
    if(m)return 'sabit köşe yarıçapı (--ka-r-* / --ka-rs-* / --ka-ic-* kullanın)';
  }
  if(prop==='outline-offset'&&/^\s*2px\b/.test(nv))return 'sabit halka uzaklığı (--ka-ring-offset kullanın)';
  if(/^(border(-(top|right|bottom|left|inline|block))?|outline)$/.test(prop)&&/^\s*[1-6](\.\d+)?px\s+(solid|dashed|dotted|double)\b/.test(nv))return 'sabit çizgi kalınlığı (--ka-border-w kullanın)';
  if(prop==='box-shadow'||prop==='text-shadow'){
    let depth=0,cur='';const layers=[];
    for(const c of nv){if(c==='(')depth++;else if(c===')')depth--;if(c===','&&depth===0){layers.push(cur);cur=''}else cur+=c}
    layers.push(cur);
    for(const L of layers){
      const lens=L.trim().split(/\s+/).filter(t=>/^-?(\d*\.?\d+px|0)$/.test(t));
      if(lens.length>=3&&/^-?\d*\.?\d+px$/.test(lens[2])&&parseFloat(lens[2])!==0)return 'sabit gölge boyutu (--ka-sh-* kullanın)';
    }
  }
  return null;
}
function cssViolations(text,label){
  const t=text.replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,' '));
  const bad=[];
  for(const r of parse(t)){
    if(PAPER.test(r.sel)||/print/.test(r.media))continue;
    for(const [prop,val] of splitDecls(r.body)){
      const why=declViolation(prop,val);
      if(why)bad.push(`${label} ${r.sel.slice(0,50)} { ${prop}:${val.slice(0,50)} } → ${why}`);
    }
  }
  return bad;
}
// Çekirdek (TEMA MERKEZİ) dışındaki üretim CSS'i
const prodBad=[
  ...cssViolations(outside,'design-system-base.css'),
  ...['css/design-system.css','css/dashboard-announcement-media.css','css/v3/hava-durumu-skin.css','css/v3/okul-ozeti-skin.css']
    .flatMap(f=>cssViolations(fs.readFileSync(f,'utf8'),f))
];
assert.strictEqual(prodBad.length,0,`Merkez dışında sabit değer var (${prodBad.length}): \n  ${prodBad.slice(0,6).join('\n  ')}`);

// JS içine gömülü ekran (UI) stilleri de aynı kurala tabidir; kâğıt/yazdırma stilleri (rapor, çıktı) hariç.
function jsStyleRegions(file){
  const s=fs.readFileSync(file,'utf8');
  if(file.endsWith('reports.js'))return [...s.matchAll(/<style[^>]*>(.*?)<\/style>/gs)].slice(0,2).map(m=>m[1]);
  if(file.endsWith('food-menu.js')){const i=s.indexOf("const FOOD_MENU_STYLE='<style>'");return [s.slice(i,s.indexOf("</style>';",i))]}
  const key=file.endsWith('report-customizer.js')?'s.textContent=`':'style.textContent=`';
  const i=s.indexOf(key)+key.length;return [s.slice(i,s.indexOf('`',i))];
}
const jsBad=[];
for(const f of ['js/modules/reports.js','js/modules/food-menu.js','js/core/teacher-reminder-academic-year.js','js/core/report-customizer.js']){
  for(const region of jsStyleRegions(f)){
    for(const seg of region.replace(/\/\*[\s\S]*?\*\//g,' ').split(/[{};]/)){
      const i=seg.indexOf(':');if(i<0)continue;
      const prop=seg.slice(0,i).trim().toLowerCase(),val=seg.slice(i+1).trim();
      if(!/^-?[a-z][a-z-]*$/.test(prop))continue;
      const why=declViolation(prop,val);
      if(why)jsBad.push(`${f} { ${prop}:${val.slice(0,50)} } → ${why}`);
    }
  }
}
assert.strictEqual(jsBad.length,0,`JS içine gömülü ekran stilinde sabit değer var (${jsBad.length}): \n  ${jsBad.slice(0,6).join('\n  ')}`);

// Her kullanılan merdiven değişkeni merkezde tanımlı olmalı (yazım hatası / unutulan basamak = sessiz bozulma)
const LADDER=/var\(\s*(--(?:ka-(?:fs|fw|lh|ls|sp|sh|ic|rs|dur|ease)-[\w-]+|k-[\w-]+))\s*[,)]/g;
const sources=[outside,...['css/design-system.css','css/dashboard-announcement-media.css','css/v3/hava-durumu-skin.css','css/v3/okul-ozeti-skin.css'].map(f=>fs.readFileSync(f,'utf8')),
  ...['js/modules/reports.js','js/modules/food-menu.js','js/core/teacher-reminder-academic-year.js','js/core/report-customizer.js'].map(f=>fs.readFileSync(f,'utf8'))];
const missing=new Set();
for(const src of sources)for(const m of src.matchAll(LADDER))if(!new RegExp('(^|[;{\\s])'+m[1].replace(/[-]/g,'\\-')+'\\s*:').test(core))missing.add(m[1]);
assert.strictEqual(missing.size,0,`Merkezde tanımsız basamak/havuz değişkeni kullanılıyor: ${[...missing].slice(0,8).join(', ')}`);

// Merkez blokları kendi içinde aynı değişkeni iki kez tanımlamaz (sessiz geçersiz kılma = yönetilemez merkez)
for(const [label,r] of [['ortak',inCore[0]],['açık',inCore[1]],['koyu',inCore[2]]]){
  const seen=new Map();
  for(const m of r.body.matchAll(/(?<![\w-])(--[a-zA-Z0-9-]+)\s*:/g))seen.set(m[1],(seen.get(m[1])||0)+1);
  const dup=[...seen].filter(([,n])=>n>1).map(([k])=>k);
  assert.strictEqual(dup.length,0,`TEMA MERKEZİ (${label} blok) içinde birden fazla tanımlanan değişken: ${dup.slice(0,6).join(', ')}`);
}

// --- 9) Sayfa başlığı: her sayfanın üst kartı tek ailede (--ka-ph-*) toplanır
for(const t of ['--ka-ph-bg','--ka-ph-border-w','--ka-ph-border','--ka-ph-radius','--ka-ph-shadow','--ka-ph-blur','--ka-ph-pad-y','--ka-ph-pad-x','--ka-ph-gap','--ka-ph-min-h','--ka-ph-bar-pad-y','--ka-ph-bar-pad-x','--ka-ph-bar-title-size',
  '--ka-ph-title','--ka-ph-title-size','--ka-ph-title-weight','--ka-ph-title-tracking','--ka-ph-title-lh','--ka-ph-sub','--ka-ph-sub-size','--ka-ph-sub-lh',
  '--ka-ph-kicker','--ka-ph-kicker-size','--ka-ph-kicker-tracking','--ka-ph-icon-bg','--ka-ph-icon-fg','--ka-ph-icon-border','--ka-ph-icon-radius','--ka-ph-icon-shadow','--ka-ph-deco'])
  assert(core.includes(t+':'),`TEMA MERKEZİ'nde sayfa başlığı değişkeni eksik: ${t}`);
{
  const rules9=parse(masked);
  const phRules=rules9.filter(r=>/\.ka-page-head[,)\s]/.test(r.sel)&&/:is\(#v2ModuleRoot/.test(r.sel));
  assert(phRules.length>=5,'SAYFA BAŞLIĞI birleşik kuralları bulunamadı.');
  const head=phRules.find(r=>/background\s*:\s*var\(--ka-ph-bg\)/.test(r.body));
  assert(head,'Sayfa başlığı kabuğu --ka-ph-bg ile çizilmeli.');
  // bilinen tüm başlık varyantı aynı kabuğa bağlı kalmalı
  for(const c of ['ka-page-head','ka-cizelge-page-head','ka-guidance-page-head','ka-gradebook-hero','ka-transport-page-hero','ka-map-hero','ka-schedule-hero','ka-teacher-list-hero',
    'ka-people-page-head','ogm-head','ka-notes-hero','ka-communication-heading','ka-management-intro','ka-evrak-page-head','ka-payroll-header','ka-plan-hero','ka-meeting-page__intro','ka-settings-toolbar',
    'ka-detail-topbar','ka-class-hero','ka-student-hero','ka-teacher-profile-hero','ka-transport-service-hero','ka-checklist-hero','ka-results-hero','ka-statistics-hero','ka-search-hero','ka-admin-info-hero','ka-meeting-detail-head','ka-profile-hero'])
    assert(head.sel.includes('.'+c),`Sayfa başlığı kabuğunda eksik varyant: .${c}`);
  // kabuk kuralı sabit renk/ölçü içermez: yalnız --ka-ph-* değişkenleri
  assert(!/#[0-9a-fA-F]{3,8}\b|rgba?\(|\d+px/.test(head.body),'Sayfa başlığı kabuğu sabit renk/ölçü içermemeli (--ka-ph-* kullanın).');
}
