/* Koruk Asistan — Veli Toplantısı tutanağı Word (.docx) çıktısı
 * Tutanak içeriği (düzenlenmiş gündem, görüşme metinleri ve kararlar dahil) veli-toplantisi.js'teki tutanakModeli ile gelir;
 * burada A4, Times New Roman, kâğıt çıktısıyla aynı düzende gerçek Word metni olarak yazılır (şablon dosyası yok, JSZip tembel yüklenir).
 * Sayfa kenar boşlukları üst/alt 20 mm, sol 25 mm, sağ 20 mm; "Alınan Kararlar" toplantı başlığıyla yeni sayfadan başlar; imzalar solda.
 */
(function(global){
'use strict';
if(global.VeliToplantisiWord)return;

const DOCX_TURU='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const JSZIP_YOLU='assets/vendor/jszip.min.js';
const GENISLIK=9355;                        // yazı alanı (A4 11906 − 1417 − 1134 twip)
const xml=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const buyuk=s=>String(s||'').toLocaleUpperCase('tr');

/* ── XML parçaları ── */
const calis=(metin,{b=false,sz=0}={})=>`<w:r><w:rPr>${b?'<w:b/><w:bCs/>':''}${sz?`<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`:''}</w:rPr><w:t xml:space="preserve">${xml(metin)}</w:t></w:r>`;
const sekme='<w:r><w:tab/></w:r>';
const KENAR=(ad,sz=6)=>`<w:${ad} w:val="single" w:sz="${sz}" w:space="4" w:color="000000"/>`;
function par(icerik,{al='left',once=0,sonra=0,satir=276,sol=0,asili=0,ilkSatir=0,sayfaSonrasi=false,sonraki=false,kutu=false,altCizgi=false}={}){
 const ind=sol||asili||ilkSatir?`<w:ind w:left="${sol}"${asili?` w:hanging="${asili}"`:''}${ilkSatir?` w:firstLine="${ilkSatir}"`:''}/>`:'';
 const cerceve=kutu?`<w:pBdr>${KENAR('top')}${KENAR('left')}${KENAR('bottom')}${KENAR('right')}</w:pBdr>`:altCizgi?`<w:pBdr>${KENAR('bottom',4)}</w:pBdr>`:'';
 const tabs=asili?`<w:tabs><w:tab w:val="left" w:pos="${sol}"/></w:tabs>`:'';
 return`<w:p><w:pPr>${sonraki?'<w:keepNext/>':''}${sayfaSonrasi?'<w:pageBreakBefore/>':''}${cerceve}${tabs}<w:spacing w:before="${once}" w:after="${sonra}" w:line="${satir}" w:lineRule="auto"/>${ind}<w:jc w:val="${al}"/></w:pPr>${icerik}</w:p>`;
}
const bosPar=(once=0)=>par('',{once});
const hucre=(genislik,icerik,{kenar=true,dikey='center'}={})=>`<w:tc><w:tcPr><w:tcW w:w="${genislik}" w:type="dxa"/>${kenar?'':'<w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders>'}<w:vAlign w:val="${dikey}"/></w:tcPr>${icerik}</w:tc>`;
function tablo(sutunlar,satirlar,{kenar=true}={}){
 const cerceve=kenar?['top','left','bottom','right','insideH','insideV'].map(k=>`<w:${k} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join(''):'';
 return`<w:tbl><w:tblPr><w:tblW w:w="${sutunlar.reduce((a,b)=>a+b,0)}" w:type="dxa"/>${kenar?`<w:tblBorders>${cerceve}</w:tblBorders>`:''}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${sutunlar.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${satirlar.map(s=>`<w:tr><w:trPr><w:cantSplit/></w:trPr>${s}</w:tr>`).join('')}</w:tbl>`;
}

/* ── tutanak ── */
const baslikKutusu=(m,sayfaSonrasi)=>[
 par(calis(`${m.yil} EĞİTİM-ÖĞRETİM YILI`,{sz:19}),{al:'center',kutu:true,sayfaSonrasi}),
 par(calis(buyuk(m.okul),{b:true}),{al:'center',kutu:true}),
 par(calis(buyuk(/sınıf/i.test(m.sinif)?m.sinif:`${m.sinif} SINIFI`),{b:true,sz:26}),{al:'center',kutu:true}),
 par(calis(m.baslik,{b:true}),{al:'center',kutu:true})
].join('');
const altBaslik=(metin,once=240)=>par(calis(metin,{b:true,sz:22}),{once,sonra:80,altCizgi:true,sonraki:true});
const liste=maddeler=>maddeler.map((x,i)=>par(`${calis(`${i+1}.`)}${sekme}${calis(x)}`,{sol:454,asili:454,sonra:40,al:'both'})).join('');
const imzalar=m=>{
 const sol=par(calis(m.ogretmen),{sonraki:true})+par(calis(m.unvan,{b:true}),{once:20});
 const sag=par(calis('UYGUNDUR',{b:true}),{sonraki:true})+par(calis(m.tarihBos),{sonraki:true,once:20})+par(calis(m.mudur),{sonraki:true,once:20})+par(calis('Okul Müdürü',{b:true}),{once:20});
 return tablo([4677,4678],[hucre(4677,sol,{kenar:false,dikey:'top'})+hucre(4678,sag,{kenar:false,dikey:'top'})],{kenar:false});
};
function tutanakBelgesi(m){
 const w=Math.floor(GENISLIK/4),bilgi=tablo([w,w,w,GENISLIK-3*w],[
  ['SINIF / ŞUBE','TARİH','SAAT',buyuk(m.unvan)].map((x,i)=>hucre(i<3?w:GENISLIK-3*w,par(calis(x,{b:true,sz:19}),{al:'center'}))).join(''),
  [m.sinif,m.tarih,m.saat,m.ogretmen].map((x,i)=>hucre(i<3?w:GENISLIK-3*w,par(calis(x,{sz:19}),{al:'center'}))).join('')
 ]);
 const gorusme=m.maddeler.map((g,i)=>par(calis(`${i+1}. ${g.b}`,{b:true,sz:21}),{once:160,sonra:40,sonraki:true})+g.p.map(p=>par(calis(p,{sz:21}),{al:'both',ilkSatir:454,sonra:60})).join('')).join('');
 return[
  baslikKutusu(m,false),bosPar(120),bilgi,
  altBaslik('GÜNDEM MADDELERİ'),liste(m.gundem),
  altBaslik('GÜNDEM MADDELERİNİN GÖRÜŞÜLMESİ'),gorusme,
  baslikKutusu(m,true),bosPar(60),altBaslik('ALINAN KARARLAR',120),liste(m.kararlar),
  bosPar(360),imzalar(m)
 ].join('');
}

/* ── paket ── */
const BASLIK_XML='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const STILLER=`${BASLIK_XML}<w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="tr-TR" w:eastAsia="tr-TR" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`;
const ICERIK_TURLERI=`${BASLIK_XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
const KOK_ILISKI=`${BASLIK_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
const BELGE_ILISKI=`${BASLIK_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
const SAYFA='<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1417" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>';

function belgeXml(m){return`${BASLIK_XML}<w:document ${NS}><w:body>${tutanakBelgesi(m)}${SAYFA}</w:body></w:document>`}

function betikYukle(src,hazir,hata){
 if(hazir())return Promise.resolve();
 if(!global.AppLoader?.loadScript)return Promise.reject(new Error(hata));
 return global.AppLoader.loadScript(src).then(()=>{if(!hazir())throw new Error(hata)});
}
async function tutanakDocx(m){
 await betikYukle(JSZIP_YOLU,()=>typeof global.JSZip!=='undefined','Word paketleyici yüklenemedi.');
 const z=new global.JSZip();
 z.file('[Content_Types].xml',ICERIK_TURLERI,{createFolders:false});
 z.file('_rels/.rels',KOK_ILISKI,{createFolders:false});
 z.file('word/document.xml',belgeXml(m),{createFolders:false});
 z.file('word/styles.xml',STILLER,{createFolders:false});
 z.file('word/_rels/document.xml.rels',BELGE_ILISKI,{createFolders:false});
 return z.generateAsync({type:'blob',mimeType:DOCX_TURU,compression:'DEFLATE'});
}

/* Uygulamada yerel kaydet, tarayıcıda indir. */
async function kaydet(blob,ad){
 if(typeof global.uygulamaDosyaKaydet==='function'){
  const b64=await new Promise((ok,hata)=>{const r=new global.FileReader();r.onload=()=>ok(String(r.result||'').split(',')[1]||'');r.onerror=()=>hata(r.error||new Error('Dosya hazırlanamadı.'));r.readAsDataURL(blob)});
  return global.uygulamaDosyaKaydet(b64,ad,DOCX_TURU,false);
 }
 const url=global.URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=ad;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>global.URL.revokeObjectURL(url),1200);
}
async function indir(m,dosyaAdi){
 await kaydet(await tutanakDocx(m),dosyaAdi);
}

global.VeliToplantisiWord={tutanakDocx,belgeXml,indir,DOCX_TURU};
})(window);
