const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync('js/modules/report-engine.js','utf8');

/* Android yazdırma WebView'ı uygulamanın stil dosyasını getiremez (içerik ayrı adresten yüklenir):
   kâğıt kuralları ve değişkenler yazdırılan belgenin içine gömülmelidir. */
assert(src.includes('html=inlineReportCss(await inlineReportAssets(html));return previewHtml('),'printReport stilleri belgeye gömmeli.');

const stil=(q,t)=>({type:1,selectorText:q,cssText:`${q}{${t}}`});
const kok=stil(':root','--ka-report-text:#111'),kagit=stil('.ka-report .vtp-paper','padding:2mm'),yabanci=stil('#v2ModuleRoot .vtp-page','display:flex');
const dalga=(kosul,ic)=>({type:4,conditionText:kosul,cssText:`@media ${kosul}{}`,cssRules:ic});
const sayfa={cssRules:[kok,yabanci,kagit,dalga('print',[stil('.ka-report .vtp-kararlar','break-before:page')]),dalga('(prefers-color-scheme: dark)',[stil(':root','--ka-report-text:#eee')]),dalga('(max-width:700px)',[yabanci]),{type:3,styleSheet:{cssRules:[stil('.ka-report .vtp-ust','text-align:center')]}},{type:5,cssText:'@font-face{}'}]};
const yasak={get cssRules(){throw new Error('SecurityError')}};
const w={document:{styleSheets:[yasak,sayfa]},location:{href:'https://localhost/index.html'}};w.window=w;
new Function('window',src)(w);
const html='<head><link rel="stylesheet" href="https://localhost/css/design-system.css"><style>@page{size:A4}</style></head>';
const s=w.ReportEngine.inlineReportCss(html);
assert(!s.includes('<link rel="stylesheet"'),'Dış stil bağlantısı kalmamalı.');
for(const k of ['--ka-report-text:#111','.ka-report .vtp-paper','@media print{','break-before:page','.vtp-ust{text-align:center}'])assert(s.includes(k),k+' gömülmeli.');
for(const k of ['#v2ModuleRoot','@font-face','prefers-color-scheme','#eee','max-width:700px'])assert(!s.includes(k),k+' gömülmemeli (yalnız kâğıt kuralları, açık renk değişkenleri).');
assert(s.includes('<style>@page{size:A4}</style>'),'Belgenin kendi stili korunur.');

/* stil okunamazsa belge değişmeden kalır */
const w2={document:{styleSheets:[yasak]}};w2.window=w2;new Function('window',src)(w2);
assert.strictEqual(w2.ReportEngine.inlineReportCss(html),html,'Gömülecek kural yoksa bağlantı olduğu gibi kalır.');
/* logo (2248 px / 1,1 MB) her pusula kopyasına gömülür; küçültülmeden gömülürse belge onlarca MB olur */
assert(/const REPORT_LOGO_PX=\d+;/.test(src)&&Number(/REPORT_LOGO_PX=(\d+)/.exec(src)[1])<=512,'Raporlara gömülen logo en çok 512 px olmalı.');
assert(src.includes('kucuk=await reportLogoKucult(b)')&&src.includes("toDataURL('image/png')"),'Logo gömülmeden önce küçültülmeli (başarısızsa özgün dosyaya düşer).');
console.log('Rapor stil gömme testi geçti.');
