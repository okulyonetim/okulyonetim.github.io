/* Rapor motoru: başlık hizası (logo solda, metin ortada) + Rapor özelleştirme: sütun genişliği */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const engineSrc=fs.readFileSync('js/modules/report-engine.js','utf8');
const custSrc=fs.readFileSync('js/core/report-customizer.js','utf8');
const academic=fs.readFileSync('js/modules/academic.js','utf8');
const css=fs.readFileSync('css/design-system-base.css','utf8');

/* --- Rapor motoru: baslikHiza --- */
const ctx={console,navigator:{userAgent:''},location:{href:'http://x/'},setTimeout,clearTimeout};ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(engineSrc,ctx);
const E=ctx.ReportEngine;
const orta=E.documentHtml('Rapor','<p>x</p>',{baslikHiza:'orta',ustBaslik:'Üst',okulAdi:'Okul',logoGoster:true,tarihGoster:false});
assert(/<header class="ka-report-head ka-report-head--orta">/.test(orta),'Ortalı başlık sınıfı eklenmeli.');
assert(/\.ka-report-head--orta \.ka-report-headcopy\{[^}]*align-items:center[^}]*text-align:center/.test(orta),'Başlık metinleri ortalanmalı.');
assert(/grid-template-columns:48px 1fr 48px/.test(orta)&&/\.ka-report-head--orta::after\{content:""\}/.test(orta),'Logo solda; metin sayfa ortasında kalsın diye sağda eşit boş sütun olmalı.');
const ortaLogosuz=E.documentHtml('Rapor','<p>x</p>',{baslikHiza:'orta',logoGoster:false,baslikGoster:true});
assert(/grid-template-columns:1fr;/.test(ortaLogosuz)&&!/head--orta::after/.test(ortaLogosuz),'Logo kapalıyken boş sütun açılmaz.');
const sol=E.documentHtml('Rapor','<p>x</p>',{});
assert(/<header class="ka-report-head">/.test(sol)&&!/head--orta/.test(sol)&&/grid-template-columns:48px 1fr;/.test(sol),'Varsayılan başlık hizası değişmez (diğer raporlar etkilenmez).');
assert.strictEqual(E.normalizeOptions({baslikHiza:'garip'}).baslikHiza,'sol','Bilinmeyen değer sola düşer.');

/* --- Yazılı Sınav Takvimi raporu --- */
const pr=academic.slice(academic.indexOf('async function printWrittenReport('),academic.indexOf('function writtenReportModal('));
assert(/baslikHiza:'orta'/.test(pr),'Yazılı Sınav Takvimi başlığı ortalı basılır.');
assert(/\.kwr-c-gun\{width:(\d+(?:\.\d+)?)mm\}/.test(css)&&Number(css.match(/\.kwr-c-gun\{width:(\d+(?:\.\d+)?)mm\}/)[1])>=22,'Gün sütunu "Perşembe" yazısını tek satırda taşıyacak genişlikte.');

/* --- Rapor özelleştirme: sütun genişliği --- */
assert(custSrc.includes('data-rc-col-width')&&custSrc.includes('columnWidths')&&/w:widthOf\(item\)/.test(custSrc),'Özelleştirme penceresinde sütun genişliği alanı, seçimi ve kalıcı tercihi olmalı.');
assert(/\.ka-report-customizer input\[type=number\]/.test(custSrc),'Sayı alanı da pencere temasını kullanır.');
const fn=name=>{const a=custSrc.indexOf('function '+name+'(');assert(a>=0,name);let d=0,i=custSrc.indexOf('{',a);for(let j=i;j<custSrc.length;j++){if(custSrc[j]==='{')d++;else if(custSrc[j]==='}'&&--d===0)return custSrc.slice(a,j+1)}};
const lib=new Function(`const WIDTH_MIN=3,WIDTH_MAX=90,AUTO_MIN=5;const cleanWidth=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?Math.min(WIDTH_MAX,Math.max(WIDTH_MIN,Math.round(n*10)/10)):0};${fn('headerCells')}${fn('applyColumnWidths')}return{cleanWidth,applyColumnWidths}`)();
assert.deepStrictEqual([lib.cleanWidth(''),lib.cleanWidth('abc'),lib.cleanWidth(-4),lib.cleanWidth(1),lib.cleanWidth(25.46),lib.cleanWidth(500)],[0,0,0,3,25.5,90],'Genişlik 3–90 aralığına sıkıştırılır, boş/geçersiz otomatik sayılır.');
const mk=(n,withCols)=>{const cells=Array.from({length:n},()=>({style:{}})),cols=Array.from({length:n},()=>({style:{}}));
 return{cells,cols,table:{tHead:{rows:[{cells}]},querySelector:s=>s==='colgroup'&&withCols?{querySelectorAll:()=>cols}:null}}};
let t=mk(4,true);lib.applyColumnWidths(t.table,[0,1,2,3],[{index:1,width:10},{index:3,width:30}]);
assert.deepStrictEqual(t.cols.map(c=>c.style.width),[undefined,'10%',undefined,'30%'],'Yalnız girilen sütunlar değişir, kalanlar raporun kendi genişliğinde kalır (colgroup).');
t=mk(3,false);lib.applyColumnWidths(t.table,[2,0,1],[{index:0,width:20}]);
assert.deepStrictEqual(t.cells.map(c=>c.style.width),[undefined,'20%',undefined],'Colgroup yoksa başlık hücrelerine yazılır; sütun sırası yeni sıraya göre eşlenir.');
t=mk(3,true);lib.applyColumnWidths(t.table,[0,1,2],[{index:0,width:90},{index:1,width:90}]);
const w=t.cols.map(c=>parseFloat(c.style.width)||0);
assert(w[0]+w[1]<=95.01&&w[2]===0&&t.cols[2].style.width===undefined,'Toplam taşarsa girilenler orantılı küçülür; girilmeyen sütuna en az pay kalır.');
t=mk(3,true);lib.applyColumnWidths(t.table,[0,1,2],[]);
assert(t.cols.every(c=>c.style.width===undefined),'Genişlik girilmemişse tablo olduğu gibi kalır.');
t=mk(3,true);lib.applyColumnWidths(t.table,[0,2],[{index:1,width:40}]);
assert(t.cols.every(c=>c.style.width===undefined),'Rapordan çıkarılan sütunun genişliği yok sayılır.');
console.log('rapor-baslik-hiza-sutun-genislik: OK');
