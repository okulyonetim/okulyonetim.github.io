// Web arayüzü sözleşmesi (≥1100px: sol menü + üst çubuk + geniş ana sayfa).
// Telefon / APK görünümü değişmez: tüm web kuralları genişlik koşulu altındadır, ölçüler TEMA MERKEZİ'ndeki --ka-web-* belirteçlerinden gelir,
// yazı tipi (Inter latin + latin-ext) uygulamayla birlikte paketlenir ve Türkçe karakterleri (ğ ü ş ı İ ö ç) kapsar.
const fs=require('fs'),assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');
const css=read('css/design-system-base.css');
const entry=read('css/design-system.css');
const index=read('index.html');
const beta=read('beta.html');
const sw=read('service-worker.js');
const shell=read('js/core/shell-ui.js');
const web=read('js/core/web-shell.js');
const docs=read('docs/TASARIM-SISTEMI.md');
const masked=css.replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,' '));

// --- 1) Yazı tipi: dosyalar diskte, @font-face tanımlı, Türkçe karakter bloğu (latin-ext) kapsanıyor
const fonts={
  latin:'assets/fonts/inter-latin-wght-normal.woff2',
  latinExt:'assets/fonts/inter-latin-ext-wght-normal.woff2'
};
for(const f of Object.values(fonts)){
  assert(fs.existsSync(f),`${f} bulunamadı.`);
  const buf=fs.readFileSync(f);
  assert(buf.length>20000,`${f} beklenenden küçük.`);
  assert.strictEqual(buf.slice(0,4).toString('latin1'),'wOF2',`${f} geçerli bir woff2 değil.`);
  assert(css.includes(f.replace('assets/','../assets/')),`${f} @font-face ile bağlanmalı.`);
}
assert(fs.existsSync('assets/fonts/Inter-OFL.txt'),'Inter lisansı (OFL) yazı tipiyle birlikte bulunmalı.');
const faces=[...masked.matchAll(/@font-face\s*\{[^}]*\}/g)].map(m=>m[0]);
assert(faces.length>=2,'Inter için latin ve latin-ext @font-face kuralları bulunmalı.');
const extFace=faces.find(f=>f.includes('inter-latin-ext-wght-normal.woff2'));
assert(extFace,'latin-ext @font-face kuralı bulunamadı.');
assert(/U\+0100-/i.test(extFace),'latin-ext kuralı Ğ/Ş/İ/ı aralığını (U+0100…) kapsamalı.');
assert(/font-display\s*:\s*swap/.test(extFace)&&/font-weight\s*:\s*100\s+900/.test(extFace),'Yazı tipi değişken ağırlıklı ve font-display:swap olmalı.');
const latinFace=faces.find(f=>f.includes('inter-latin-wght-normal.woff2'));
assert(latinFace&&/U\+0000-00FF/i.test(latinFace),'latin kuralı U+0000-00FF aralığını kapsamalı (ç ö ü dahil).');
assert(/--ka-font\s*:\s*Inter\b/.test(masked),'Merkezi yazı tipi ailesi (--ka-font) Inter ile başlamalı.');
for(const html of [index,beta])assert(html.includes('rel="preload" href="assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin'),'Ana yazı tipi dosyası ön yüklenmeli.');

// --- 2) Sayfalara betik ve sürüm bağları
for(const [name,html] of [['index.html',index],['beta.html',beta]]){
  assert(/<script src="js\/core\/shell-ui\.js\?v=\d+" defer><\/script>\s*<script src="js\/core\/web-shell\.js\?v=\d+" defer><\/script>/.test(html),`${name}: web-shell.js, shell-ui.js'den hemen sonra yüklenmeli.`);
}
for(const [name,html] of [['index.html',index],['beta.html',beta]]){
  const head=html.slice(0,html.indexOf('</head>'));
  assert(head.includes("localStorage.getItem('ka-web-preview')!=='1'")&&head.includes("get('web')")&&head.includes('width=1280'),`${name}: telefondan web önizleme anahtarı (?web=1) bulunmalı.`);
  assert(head.indexOf('ka-web-preview')>head.indexOf('name="viewport"')&&head.indexOf('ka-web-preview')<head.indexOf('design-system.css'),`${name}: önizleme betiği viewport etiketinden sonra, stil dosyasından önce çalışmalı.`);
  assert(/matchMedia\('\(min-width:1100px\)'\)\.matches\)return/.test(head),`${name}: geniş ekranda önizleme anahtarı hiçbir şey yapmamalı.`);
}
assert(/design-system-base\.css\?v=(\d+)/.test(entry),'Merkezi giriş dosyası base CSS sürümünü taşımalı.');

// --- 3) Service Worker: yazı tipi + web kabuğu önbellekte, yazı tipi cache-first
const cacheVer=Number(sw.match(/const CACHE_ADI='oy-cache-v(\d+)'/)?.[1]||0);
assert(cacheVer>=1287,'Service Worker cache sürümü web arayüzü yayınından geri kalmamalı.');
for(const f of Object.values(fonts))assert(sw.includes(`'./${f}'`),`SW ${f} dosyasını precache etmeli.`);
assert(sw.includes("'./js/core/web-shell.js"),'SW web-shell.js dosyasını precache etmeli.');
assert(/function yaziTipiMi\(/.test(sw)&&/yaziTipiCacheFirst/.test(sw)&&/\\\.woff2\?\$/.test(sw),'SW yazı tipi dosyaları için cache-first kolu içermeli.');
new Function(sw);

// --- 4) Belirteçler TEMA MERKEZİ'nde tanımlı, web kuralları yalnız geniş ekranda
const START=css.indexOf('KORUK ASİSTAN — TEMA MERKEZİ');
const END_MARK='@media(max-width:767px){:root{--ka-font-size-md:var(--ka-fs-14)}}';
const END=css.indexOf(END_MARK);
assert(START>-1&&END>START,'TEMA MERKEZİ sınırları bulunamadı.');
const core=masked.slice(START,END);
const rest=masked.slice(END+END_MARK.length);
const defined=new Set([...core.matchAll(/(--ka-web-[a-z0-9-]+)\s*:/g)].map(m=>m[1]));
for(const t of ['--ka-web-side-w','--ka-web-top-h','--ka-web-page-max','--ka-web-gutter','--ka-web-gap','--ka-web-aside-w','--ka-web-row','--ka-web-hero-card'])assert(defined.has(t),`${t} TEMA MERKEZİ'nde tanımlı olmalı.`);
const used=new Set([...rest.matchAll(/var\((--ka-web-[a-z0-9-]+)/g)].map(m=>m[1]));
for(const t of used)assert(defined.has(t),`${t} kullanılıyor ama TEMA MERKEZİ'nde tanımlı değil.`);
for(const t of defined)assert(used.has(t),'Kullanılmayan web belirteci: '+t);
assert(web.includes('getComputedStyle(home).gridAutoRows')&&/grid-auto-rows:var\(--ka-web-row\)/.test(rest),'Ana sayfa ızgara satır birimi --ka-web-row belirtecinden gelmeli ve web-shell.js bunu hesaplanmış stilden okumalı.');

// Basit kural ayrıştırıcı: her kuralı çevreleyen @media koşulunu tutar
function parse(text){
  const out=[];
  (function scan(i,end,media){
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
      if(prelude.startsWith('@')){if(/^@(media|supports)/.test(prelude))scan(j+1,k-1,media+' '+prelude)}
      else out.push({sel:prelude.replace(/\s+/g,' '),body,media:media.replace(/\s+/g,'').toLowerCase()});
      i=k;
    }
  })(0,text.length,'');
  return out;
}
const HIDE='.ka-web-side,.ka-web-crumb,.ka-web-search,.ka-web-wx,.ka-web-note';
const WEB_START=masked.indexOf(HIDE+'{display:none}');
assert(WEB_START>END,'Web arayüzü bölümü (gizleme kuralı) bulunamadı.');
const webRules=parse(masked.slice(WEB_START));
const wide=r=>{const m=r.media.match(/\(min-width:(\d+)px\)/);return !!m&&Number(m[1])>=1100};
assert(webRules.length>100,'Web arayüzü kuralları beklenenden az bulundu (ayrıştırma bozulmuş olabilir).');
assert.strictEqual(webRules.filter(r=>r.sel===HIDE&&!r.media).length,1,'Web öğelerini dar ekranda gizleyen kural tek olmalı.');
for(const r of webRules){
  if(r.sel===HIDE&&!r.media)continue;
  assert(wide(r),`Genişlik koşulu dışında web kuralı: "${r.sel.slice(0,100)}" (media: ${r.media||'yok'})`);
}
// Dosyanın geri kalanında .ka-web-* geçen hiçbir kural dar ekranı etkileyemez (simge maskeleri yalnız --ic tanımlar; öğe telefonda display:none)
for(const r of parse(rest)){
  if(!/\.ka-web-/.test(r.sel)||r.sel===HIDE)continue;
  if(/^\s*--ic\s*:/.test(r.body)&&/\[data-ka-glyph=/.test(r.sel))continue;
  assert(wide(r),`.ka-web-* kuralı dar ekranda uygulanıyor: "${r.sel.slice(0,100)}"`);
}

// --- 5) Menü grup renkleri: telefon menüsü ile yan menü AYNI eşleme (--mc-rgb)
function groupMap(prefix){
  const out={};
  const re=new RegExp(`html ${prefix.replace(/[.#]/g,'\\$&')} \\[data-ka-menu-group="([a-z]+)"\\]\\s*(?:,[^{]*)?\\{--mc-rgb:var\\((--c-[a-z]+)\\)\\}`,'g');
  for(const m of masked.matchAll(re))out[m[1]]=m[2];
  return out;
}
const phoneMap=groupMap('#kaMenuLayer.ka-menu-layer');
const webMap=groupMap('.ka-web-side');
assert(Object.keys(phoneMap).length>=10,'Telefon menüsü grup renk eşlemesi bulunamadı.');
assert.deepStrictEqual(webMap,phoneMap,'Yan menü grup renkleri telefon menüsüyle aynı olmalı.');
for(const [name,c] of Object.entries({green:'--c-emerald',red:'--c-red',amber:'--c-amber',orange:'--c-orange',cyan:'--c-cyan',slate:'--c-slate'})){
  assert(masked.includes(`html .ka-web-side [data-tone="${name}"]{--mc-rgb:var(${c})}`),`Yan menü "${name}" tonu ${c} rengine bağlı olmalı.`);
  assert(masked.includes(`html #kaMenuLayer.ka-menu-layer .ka-menu-card--${name}{--mc-rgb:var(${c})}`),`Telefon menüsü "${name}" tonu ${c} rengine bağlı olmalı.`);
}
// Simge maskeleri: telefon menüsü ve yan menü aynı kural kümesini paylaşır
const glyphRules=masked.split('\n').filter(l=>l.includes('[data-ka-glyph=')&&l.includes('{--ic:'));
assert(glyphRules.length>=35,'Simge maskeleri bulunamadı.');
assert(glyphRules.every(l=>l.startsWith('html :is(#kaMenuLayer.ka-menu-layer,.ka-web-side) ')),'Simge maskeleri telefon menüsü ve yan menüde ortak kullanılmalı.');

// --- 6) ShellUI: web kancaları ve telefon davranışının korunması
assert(shell.includes("const WEB_MEDIA='(min-width:1100px)'"),'ShellUI web eşiği 1100px olmalı.');
assert(/function webMode\(\)\{try\{return global\.matchMedia\?\.\(WEB_MEDIA\)\.matches===true\}catch/.test(shell),'webMode() matchMedia ile belirlenmeli ve hata durumunda telefon sayılmalı.');
assert(/global\.ShellUI=\{[^}]*\bwebMode\b[^}]*\bwebMenu\b[^}]*\bcurrentView\b[^}]*\bprofileInfo\b/.test(shell),'ShellUI webMode/webMenu/currentView/profileInfo dışa vermeli.');
assert(/function syncShellBack\(\)\{[\s\S]*?koruk:shell-route/.test(shell),'syncShellBack rota olayını yayınlamalı.');
assert(/remember&&!parentMenu&&page&&!webMode\(\)/.test(shell)&&/remember&&parentMenu&&!webMode\(\)/.test(shell),'Masaüstünde menü listeleri geri yığınına (rota hafızası) yazılmamalı.');
assert(/function openMenu\(\)\{closeHeaderPopover\(\);if\(webMode\(\)\)\{closeMenu\(\);[^}]*koruk:web-menu-open/.test(shell),'openMenu masaüstünde tam ekran menü yerine web olayını yayınlamalı.');
assert(shell.includes('[data-ka-web-profile]'),'Profil açılır kutusu yan menü tetikleyicisini dışarı tıklama saymamalı.');
assert(/function openProfilePopover\(anchorArg\)/.test(shell),'openProfilePopover bağlantı noktasını argüman olarak kabul etmeli.');

// --- 7) web-shell.js: sözdizimi, yalın veri erişimi, telefonda etkisiz
new Function(web);
assert(!/firebase|firestore|getDocs?\(|onSnapshot|collection\(/i.test(web),'web-shell.js Firestore/Firebase erişimi yapmamalı.');
const lsKeys=[...web.matchAll(/(?:localStorage|sessionStorage)\.\w+\(([^,)]+)/g)].map(m=>m[1].trim());
assert(lsKeys.length>0&&lsKeys.every(k=>k==='RECENT_KEY'),'web-shell.js yalnızca "ka-web-recent" anahtarını kullanmalı: '+lsKeys.join(','));
assert(web.includes("const RECENT_KEY='ka-web-recent'"),'Son kullanılanlar anahtarı sabit olmalı.');
assert(web.includes('const isWeb=()=>ui()?.webMode?.()===true'),'web-shell.js genişlik kararını ShellUI.webMode()den almalı.');
assert(/routeModule/.test(web),'Menü gezinmesi mevcut ShellUI.routeModule üzerinden yürümeli.');
assert(web.includes("addEventListener('koruk:shell-route'")&&web.includes('koruk:web-menu-open'),'web-shell.js rota ve menü olaylarını dinlemeli.');
assert(/aria-label/.test(web)&&/aria-current/.test(web),'Yan menü erişilebilirlik öznitelikleri taşımalı.');

// --- 8) Dokümantasyon
assert(/## Yazı tipi — Inter/.test(docs)&&/## Web arayüzü/.test(docs),'docs/TASARIM-SISTEMI.md yazı tipi ve web arayüzü bölümlerini içermeli.');
assert(docs.includes('tests/web-shell-desktop.test.js'),'Dokümantasyon bu test dosyasına atıf yapmalı.');
console.log('Web arayüzü (sol menü + geniş ana sayfa) sözleşmesi başarılı.');
