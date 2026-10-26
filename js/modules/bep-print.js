/* Koruk Asistan — BEP çıktısı
 * Tek bir belge modeli (model) iki çıktıya dönüşür: A4 yatay yazdırma/PDF (ReportEngine) ve Word (.docx, JSZip).
 * İki çıktı aynı modelden üretildiği için içerik ve sıra her zaman aynıdır.
 */
(function(global){
'use strict';
if(global.BepPrint)return;

const JSZIP_YOLU='assets/vendor/jszip.min.js';
const DOCX_TURU='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const core=()=>global.BepCore;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BASLIK='BİREYSELLEŞTİRİLMİŞ EĞİTİM PROGRAMI (BEP)';

/* ── belge modeli ── */
function tarihAraligi(a){
 const c=core(),b=c.trDate(a.baslangic),s=c.trDate(a.bitis);
 return b&&s?`${b} – ${s}`:b?`${b} –`:s?`– ${s}`:'';
}
function durumKutulari(durum){
 return[['','Başlanmadı'],['devam','Devam ediyor'],['tamam','Kazandı']].map(([id,ad])=>`${(durum||'')===id?'☒':'☐'} ${ad}`);
}
function model(rec,ctx={}){
 const c=core(),o=rec.ogrenci,bloklar=[];let n=0;
 const sinif=o.sinif?`${o.sinif}. Sınıf${o.sube?' / '+o.sube:''}`:'';
 const tani=[...o.tani,o.taniNot].filter(Boolean).join(' · ');
 const rapor=[c.trDate(o.raporTarihi),o.raporKurum].filter(Boolean).join(' · ');
 bloklar.push({tur:'kv',baslik:`${++n}. ÖĞRENCİ BİLGİLERİ`,satirlar:[
  ['Adı soyadı',o.adSoyad,'Sınıfı / şubesi',sinif],
  ['Okul numarası',o.no,'Doğum tarihi',c.trDate(o.dogum)],
  ['Eğitim öğretim yılı',rec.yil,'Okulu',rec.okul||ctx.okulAdi||''],
  ['Tanı / özel eğitim gereksinimi',tani,'Rapor tarihi ve kurumu',rapor]
 ]});
 bloklar.push({tur:'metin',baslik:`${++n}. EĞİTSEL PERFORMANS DÜZEYİ`,satirlar:[
  ['Güçlü yönleri',rec.performans.guclu],['İlgi alanları',rec.performans.ilgi],
  ['Gereksinimleri',rec.performans.gereksinim],['Genel değerlendirme',rec.performans.genel]
 ]});
 const amacNo=++n;
 if(!rec.dersler.length)bloklar.push({tur:'amac',baslik:`${amacNo}. UZUN VE KISA DÖNEMLİ AMAÇLAR`,ders:'',performans:'',satirlar:[]});
 rec.dersler.forEach((d,i)=>bloklar.push({
  tur:'amac',baslik:i===0?`${amacNo}. UZUN VE KISA DÖNEMLİ AMAÇLAR`:'',ders:`${d.ad}${d.sinif?' — '+d.sinif+'. Sınıf':''}`,performans:d.performans,
  satirlar:d.amaclar.map(a=>({kod:a.kod,uda:a.uda,kda:a.kda.map(k=>k.metin).filter(Boolean),yontem:a.yontem.join(', '),materyal:a.materyal.join(', '),olcut:a.olcut,tarih:tarihAraligi(a),durum:durumKutulari(a.durum),not:a.not}))
 }));
 bloklar.push({tur:'metin',baslik:`${++n}. EĞİTİM ORTAMI VE DESTEKLER`,satirlar:[
  ['Eğitim ortamı düzenlemeleri',rec.duzenleme.ortam],['Sınav ve değerlendirme uyarlamaları',rec.duzenleme.sinav],
  ['Destek eğitim hizmetleri',rec.duzenleme.destek],['Davranış desteği',rec.duzenleme.davranis],['Aile katılımı',rec.duzenleme.aile]
 ]});
 bloklar.push({tur:'imza',baslik:`${++n}. BEP GELİŞTİRME EKİBİ`,satirlar:rec.ekip.length?rec.ekip:c.defaultTeam(),toplanti:[
  ['BEP toplantı tarihi',c.trDate(rec.toplanti.tarih),'Toplantı yeri',rec.toplanti.yer],
  ['Sonraki değerlendirme',c.trDate(rec.toplanti.sonraki),'Hazırlayan',rec.olusturanAd||'']
 ]});
 return{baslik:BASLIK,okul:rec.okul||ctx.okulAdi||'',yil:rec.yil,bloklar,altBilgi:`${o.adSoyad||'Öğrenci'} · BEP · ${rec.yil}`};
}

/* ── HTML (yazdırma / PDF) ── */
const hucre=v=>String(v??'').trim()?esc(v):'';
function htmlKv(b){
 return`<table class="bep-tbl bep-kv"><tbody>${b.satirlar.map(r=>`<tr><th>${esc(r[0])}</th><td>${hucre(r[1])}</td><th>${esc(r[2])}</th><td>${hucre(r[3])}</td></tr>`).join('')}</tbody></table>`;
}
function htmlMetin(b){
 return`<table class="bep-tbl bep-text"><tbody>${b.satirlar.map(r=>`<tr><th>${esc(r[0])}</th><td>${hucre(r[1])}</td></tr>`).join('')}</tbody></table>`;
}
function htmlAmac(b){
 const baslik=b.baslik?`<h2 class="bep-h">${esc(b.baslik)}</h2>`:'';
 const ders=b.ders?`<h3 class="bep-h3">${esc(b.ders)}</h3>`:'';
 const perf=b.performans?`<p class="bep-note"><b>Dersteki performans düzeyi:</b> ${esc(b.performans)}</p>`:'';
 const rows=b.satirlar.length?b.satirlar.map(a=>`<tr>
  <td class="bep-c">${hucre(a.kod)}</td><td>${hucre(a.uda)}</td>
  <td>${a.kda.length?`<ol class="bep-ol">${a.kda.map(k=>`<li>${esc(k)}</li>`).join('')}</ol>`:''}</td>
  <td>${hucre(a.yontem)}</td><td>${hucre(a.materyal)}</td><td class="bep-c">${hucre(a.olcut)}</td><td class="bep-c">${hucre(a.tarih)}</td>
  <td class="bep-chk">${a.durum.map(esc).join('<br>')}${a.not?`<div class="bep-mini">${esc(a.not)}</div>`:''}</td></tr>`).join(''):`<tr><td colspan="8" class="bep-empty">Henüz amaç eklenmedi.</td></tr>`;
 return`${baslik}${ders}${perf}<table class="bep-tbl bep-goals"><thead><tr><th>Kod</th><th>Uzun dönemli amaç</th><th>Kısa dönemli amaçlar</th><th>Yöntem ve teknikler</th><th>Araç ve gereçler</th><th>Ölçüt</th><th>Başlama – bitiş</th><th>Değerlendirme</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function htmlImza(b){
 const k=b.satirlar.map(x=>`<tr class="bep-sign"><td>${hucre(x.unvan)}</td><td>${hucre(x.ad)}</td><td></td></tr>`).join('');
 return`<table class="bep-tbl bep-team"><thead><tr><th>Görevi</th><th>Adı soyadı</th><th>İmza</th></tr></thead><tbody>${k}</tbody></table>${htmlKv({satirlar:b.toplanti})}`;
}
function html(m){
 const parts=m.bloklar.map(b=>{
  if(b.tur==='amac')return`<section class="bep-sec bep-sec-goals">${htmlAmac(b)}</section>`;
  const baslik=`<h2 class="bep-h">${esc(b.baslik)}</h2>`;
  return`<section class="bep-sec">${baslik}${b.tur==='kv'?htmlKv(b):b.tur==='metin'?htmlMetin(b):htmlImza(b)}</section>`;
 });
 return`<div class="bep-print"><article class="bep-doc"><header class="bep-head"><h1 class="bep-title">${esc(m.baslik)}</h1><p class="bep-sub">${esc([m.okul,m.yil+' Eğitim Öğretim Yılı'].filter(Boolean).join(' · '))}</p></header>${parts.join('')}</article></div>`;
}
function print(rec,ctx={}){
 if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return false}
 const m=model(rec,{okulAdi:ctx.okulAdi||global.ReportEngine.schoolInfo?.().okulAdi||''});
 global.ReportEngine.printReport('BEP',html(m),{fileName:core().fileName(rec),yon:'yatay',akis:true,kenarBosluk:10,logoGoster:false,tarihGoster:false,baslikGoster:false,okulAdi:' '});
 return true;
}

/* ── Word (.docx) ── */
const GENISLIK=15398; /* A4 yatay 16838 − 2×720 */
const X=s=>String(s??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function run(t,o={}){
 return`<w:r><w:rPr>${o.b?'<w:b/>':''}${o.i?'<w:i/>':''}<w:sz w:val="${o.sz||20}"/><w:szCs w:val="${o.sz||20}"/></w:rPr><w:t xml:space="preserve">${X(t)}</w:t></w:r>`;
}
function para(text,o={}){
 const lines=String(text??'').split('\n');
 const runs=lines.map((l,i)=>(i?'<w:r><w:br/></w:r>':'')+run(l,o)).join('');
 return`<w:p><w:pPr>${o.keep?'<w:keepNext/>':''}<w:spacing w:before="${o.before||0}" w:after="${o.after||0}"/><w:jc w:val="${o.jc||'left'}"/></w:pPr>${runs}</w:p>`;
}
function cell(content,w,o={}){
 const body=Array.isArray(content)?content.join(''):content;
 return`<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.span?`<w:gridSpan w:val="${o.span}"/>`:''}${o.shade?`<w:shd w:val="clear" w:color="auto" w:fill="${o.shade}"/>`:''}<w:vAlign w:val="${o.v||'top'}"/></w:tcPr>${body||'<w:p/>'}</w:tc>`;
}
function row(cells,o={}){return`<w:tr><w:trPr>${o.min?`<w:trHeight w:val="${o.min}" w:hRule="atLeast"/>`:''}<w:cantSplit/>${o.head?'<w:tblHeader/>':''}</w:trPr>${cells.join('')}</w:tr>`}
function table(widths,rows){
 const bd=['top','left','bottom','right','insideH','insideV'].map(k=>`<w:${k} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join('');
 return`<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a,b)=>a+b,0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${bd}</w:tblBorders><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.join('')}</w:tbl>`;
}
const GOLGE='E8EEF0';
const th=(t,w,o={})=>cell(para(t,{b:1,sz:18,jc:o.jc||'left'}),w,{shade:GOLGE,v:'center'});
function wordKv(satirlar){
 const w=[2700,5000,2700,4998];
 return table(w,satirlar.map(r=>row([th(r[0],w[0]),cell(para(r[1],{sz:20}),w[1],{v:'center'}),th(r[2],w[2]),cell(para(r[3],{sz:20}),w[3],{v:'center'})],{min:420})));
}
function wordMetin(b){
 const w=[3300,12098];
 return table(w,b.satirlar.map(r=>row([th(r[0],w[0]),cell(para(r[1],{sz:20}),w[1],{v:'center'})],{min:520})));
}
function wordAmac(b){
 const out=[];
 if(b.baslik)out.push(para(b.baslik,{b:1,sz:22,before:200,after:80,keep:1}));
 if(b.ders)out.push(para(b.ders,{b:1,sz:21,before:100,after:60,keep:1}));
 if(b.performans)out.push(para(`Dersteki performans düzeyi: ${b.performans}`,{i:1,sz:19,after:60,keep:1}));
 const w=[1000,2600,3900,1900,1700,1100,1400,1798];
 const head=row(['Kod','Uzun dönemli amaç','Kısa dönemli amaçlar','Yöntem ve teknikler','Araç ve gereçler','Ölçüt','Başlama – bitiş','Değerlendirme'].map((t,i)=>th(t,w[i],{jc:'center'})),{head:1});
 const rows=b.satirlar.length?b.satirlar.map(a=>row([
  cell(para(a.kod,{sz:18,jc:'center'}),w[0]),cell(para(a.uda,{sz:19}),w[1]),
  cell(a.kda.length?a.kda.map((k,i)=>para(`${i+1}) ${k}`,{sz:19,after:30})):para('',{}),w[2]),
  cell(para(a.yontem,{sz:18}),w[3]),cell(para(a.materyal,{sz:18}),w[4]),cell(para(a.olcut,{sz:18,jc:'center'}),w[5]),cell(para(a.tarih,{sz:18,jc:'center'}),w[6]),
  cell([...a.durum.map(t=>para(t,{sz:17})),...(a.not?[para(a.not,{sz:16,i:1})]:[])],w[7])
 ])):[row([cell(para('Henüz amaç eklenmedi.',{sz:19,i:1}),GENISLIK,{span:8})])];
 out.push(table(w,[head,...rows]));
 return out.join('');
}
function wordImza(b){
 const w=[5400,6000,3998];
 const t=table(w,[row([th('Görevi',w[0]),th('Adı soyadı',w[1]),th('İmza',w[2],{jc:'center'})],{head:1}),...b.satirlar.map(x=>row([cell(para(x.unvan,{sz:20}),w[0],{v:'center'}),cell(para(x.ad,{sz:20}),w[1],{v:'center'}),cell('',w[2])],{min:760}))]);
 return t+para('',{after:80})+wordKv(b.toplanti);
}
function belgeXml(m){
 const g=[];
 g.push(para(m.baslik,{b:1,sz:28,jc:'center',after:40}));
 g.push(para([m.okul,`${m.yil} Eğitim Öğretim Yılı`].filter(Boolean).join(' · '),{sz:21,jc:'center',after:160}));
 m.bloklar.forEach(b=>{
  if(b.tur==='amac'){g.push(wordAmac(b));return}
  g.push(para(b.baslik,{b:1,sz:22,before:200,after:80,keep:1}));
  g.push(b.tur==='kv'?wordKv(b.satirlar):b.tur==='metin'?wordMetin(b):wordImza(b));
 });
 const sect='<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="900" w:left="720" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr>';
 return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${g.join('')}${sect}</w:body></w:document>`;
}
function altBilgiXml(m){
 const f=(t)=>`<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">${X(t)}</w:t></w:r>`;
 const alan=(kod)=>`<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:instrText xml:space="preserve"> ${kod} </w:instrText></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>`;
 return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${f(m.altBilgi+' · Sayfa ')}${alan('PAGE')}${f(' / ')}${alan('NUMPAGES')}</w:p></w:ftr>`;
}
const STILLER='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="tr-TR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>';
const ICERIK_TURLERI='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';
const KOK_ILISKI='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>';
const BELGE_ILISKI='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>';
function cekirdekXml(m,yazar){
 const now=new Date().toISOString().replace(/\.\d+Z$/,'Z');
 return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${X(m.altBilgi)}</dc:title><dc:creator>${X(yazar||'Koruk Asistan')}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`;
}
function betikYukle(src,hazir){
 if(hazir())return Promise.resolve();
 const hata=()=>new Error('Word paketleyici yüklenemedi.');
 if(!global.AppLoader?.loadScript)return Promise.reject(hata());
 return global.AppLoader.loadScript(src).then(()=>{if(!hazir())throw hata()});
}
async function docx(rec,ctx={}){
 await betikYukle(JSZIP_YOLU,()=>typeof global.JSZip!=='undefined');
 const m=model(rec,{okulAdi:ctx.okulAdi||global.ReportEngine?.schoolInfo?.().okulAdi||''});
 const z=new global.JSZip();
 z.file('[Content_Types].xml',ICERIK_TURLERI);
 z.file('_rels/.rels',KOK_ILISKI);
 z.file('docProps/core.xml',cekirdekXml(m,rec.olusturanAd));
 z.file('word/document.xml',belgeXml(m));
 z.file('word/styles.xml',STILLER);
 z.file('word/footer1.xml',altBilgiXml(m));
 z.file('word/_rels/document.xml.rels',BELGE_ILISKI);
 return z.generateAsync({type:'blob',mimeType:DOCX_TURU,compression:'DEFLATE'});
}
async function indir(blob,ad){
 if(typeof global.uygulamaDosyaKaydet==='function'){
  const b64=await new Promise((ok,hata)=>{const r=new global.FileReader();r.onload=()=>ok(String(r.result||'').split(',')[1]||'');r.onerror=()=>hata(r.error||new Error('Dosya hazırlanamadı.'));r.readAsDataURL(blob)});
  return global.uygulamaDosyaKaydet(b64,ad,DOCX_TURU,false);
 }
 const url=global.URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=ad;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>global.URL.revokeObjectURL(url),1200);
 return{web:true};
}
async function word(rec,ctx={}){
 const blob=await docx(rec,ctx);
 await indir(blob,core().fileName(rec)+'.docx');
 return true;
}

global.BepPrint={model,html,print,docx,word,belgeXml,indir,BASLIK};
})(typeof window!=='undefined'?window:globalThis);
