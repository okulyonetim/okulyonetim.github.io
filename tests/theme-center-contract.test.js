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
const END_MARK='@media(max-width:767px){:root{--ka-font-size-md:14px}}';
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
