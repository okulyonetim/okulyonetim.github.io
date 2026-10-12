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
  (function scan(i,end,ctx){
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
        if(/^@(media|supports|layer|container)/.test(prelude))scan(j+1,k-1,ctx+1);
      }else out.push({sel:prelude.replace(/\s+/g,' '),body,start:i,nested:ctx>0});
      i=k;
    }
  })(0,text.length,0);
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
