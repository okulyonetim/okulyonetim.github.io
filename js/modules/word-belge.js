/* Koruk Asistan — Ortak Word (.docx) üretici: şablon dosyası olmadan, veriden gerçek Word metni (paragraf, tablo, sayfa düzeni)
 * Kullanan modüller: Kudüs Ben'im Projesi belgeleri (kudus-benim-belge.js). JSZip tembel yüklenir (assets/vendor/jszip.min.js).
 * Sayfa: A4 dikey ya da yatay; her sayfada üst ve alt boşluk 20 mm (sol/sağ 20 mm). Yazı tipi Times New Roman.
 */
(function(global){
'use strict';
if(global.WordBelge)return;

const DOCX_TURU='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const JSZIP_YOLU='assets/vendor/jszip.min.js';
const KENAR_BOSLUGU=1134; /* 20 mm, twip */
const SAYFA={dikey:{w:11906,h:16838},yatay:{w:16838,h:11906}};
const genislik=yatay=>(yatay?SAYFA.yatay.w:SAYFA.dikey.w)-2*KENAR_BOSLUGU; /* yazı alanı: dikey 9638, yatay 14570 twip */

const xml=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const buyuk=s=>String(s||'').toLocaleUpperCase('tr');

/* ── paragraf / hücre / tablo parçaları ── */
const calis=(metin,{b=false,i=false,sz=0,renk=''}={})=>`<w:r><w:rPr>${b?'<w:b/><w:bCs/>':''}${i?'<w:i/><w:iCs/>':''}${renk?`<w:color w:val="${renk}"/>`:''}${sz?`<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`:''}</w:rPr><w:t xml:space="preserve">${xml(metin)}</w:t></w:r>`;
const sekme='<w:r><w:tab/></w:r>';
const satirSonu='<w:r><w:br/></w:r>';
const KENAR=(ad,sz=6)=>`<w:${ad} w:val="single" w:sz="${sz}" w:space="4" w:color="000000"/>`;
function par(icerik,{al='left',once=0,sonra=0,satir=276,sol=0,asili=0,ilkSatir=0,sayfaSonrasi=false,sonraki=false,kutu=false,altCizgi=false}={}){
 const ind=sol||asili||ilkSatir?`<w:ind w:left="${sol}"${asili?` w:hanging="${asili}"`:''}${ilkSatir?` w:firstLine="${ilkSatir}"`:''}/>`:'';
 const cerceve=kutu?`<w:pBdr>${KENAR('top')}${KENAR('left')}${KENAR('bottom')}${KENAR('right')}</w:pBdr>`:altCizgi?`<w:pBdr>${KENAR('bottom',4)}</w:pBdr>`:'';
 const tabs=asili?`<w:tabs><w:tab w:val="left" w:pos="${sol}"/></w:tabs>`:'';
 return`<w:p><w:pPr>${sonraki?'<w:keepNext/>':''}${sayfaSonrasi?'<w:pageBreakBefore/>':''}${cerceve}${tabs}<w:spacing w:before="${once}" w:after="${sonra}" w:line="${satir}" w:lineRule="auto"/>${ind}<w:jc w:val="${al}"/></w:pPr>${icerik}</w:p>`;
}
const bosPar=(once=0)=>par('',{once});
const KENARSIZ='<w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders>';
/* dikeyBirlestir: 'basla' (birleşik hücrenin ilk satırı) ya da 'devam' (altındaki satırlar) */
const hucre=(w,icerik,{kenar=true,dikey='center',zemin='',birlestir=0,dikeyBirlestir=''}={})=>`<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${birlestir>1?`<w:gridSpan w:val="${birlestir}"/>`:''}${dikeyBirlestir==='basla'?'<w:vMerge w:val="restart"/>':dikeyBirlestir==='devam'?'<w:vMerge/>':''}${kenar?'':KENARSIZ}${zemin?`<w:shd w:val="clear" w:color="auto" w:fill="${zemin}"/>`:''}<w:vAlign w:val="${dikey}"/></w:tcPr>${icerik}</w:tc>`;
/* satirlar: hücre XML'i birleştirilmiş satır dizgeleri. baslik: ilk satır her sayfada tekrarlanır. dar: sık tablo (hücre üst/alt boşluğu küçük). */
function tablo(sutunlar,satirlar,{kenar=true,baslik=false,dar=false}={}){
 const cerceve=kenar?['top','left','bottom','right','insideH','insideV'].map(k=>`<w:${k} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join(''):'';
 return`<w:tbl><w:tblPr><w:tblW w:w="${sutunlar.reduce((a,b)=>a+b,0)}" w:type="dxa"/>${kenar?`<w:tblBorders>${cerceve}</w:tblBorders>`:''}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="${dar?15:40}" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="${dar?15:40}" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${sutunlar.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${satirlar.map((s,i)=>`<w:tr><w:trPr><w:cantSplit/>${baslik&&i===0?'<w:tblHeader/>':''}</w:trPr>${s}</w:tr>`).join('')}</w:tbl>`;
}
/* Üst/sol/sağ/alt hizalı iki bloklu imza satırı: solda ilk blok, sağda ikinci blok (ortalı). */
const imzaSatiri=(yatay,solIcerik,sagIcerik)=>{
 const w=genislik(yatay),sag=4000,sol=w-sag;
 return tablo([sol,sag],[hucre(sol,solIcerik,{kenar:false,dikey:'top'})+hucre(sag,sagIcerik,{kenar:false,dikey:'top'})],{kenar:false});
};

/* ── paket ── */
const BASLIK_XML='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const STILLER=`${BASLIK_XML}<w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="tr-TR" w:eastAsia="tr-TR" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`;
const ICERIK_TURLERI=`${BASLIK_XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
const KOK_ILISKI=`${BASLIK_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
const BELGE_ILISKI=`${BASLIK_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
const sayfaDuzeni=yatay=>{const p=yatay?SAYFA.yatay:SAYFA.dikey;return`<w:sectPr><w:pgSz w:w="${p.w}" w:h="${p.h}"${yatay?' w:orient="landscape"':''}/><w:pgMar w:top="${KENAR_BOSLUGU}" w:right="${KENAR_BOSLUGU}" w:bottom="${KENAR_BOSLUGU}" w:left="${KENAR_BOSLUGU}" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>`};
const belgeXml=(govde,{yatay=false}={})=>`${BASLIK_XML}<w:document ${NS}><w:body>${govde}${sayfaDuzeni(yatay)}</w:body></w:document>`;

function betikYukle(src,hazir,hata){
 if(hazir())return Promise.resolve();
 if(!global.AppLoader?.loadScript)return Promise.reject(new Error(hata));
 return global.AppLoader.loadScript(src).then(()=>{if(!hazir())throw new Error(hata)});
}
async function paketle(govde,secenek={}){
 await betikYukle(JSZIP_YOLU,()=>typeof global.JSZip!=='undefined','Word paketleyici yüklenemedi.');
 const z=new global.JSZip();
 z.file('[Content_Types].xml',ICERIK_TURLERI,{createFolders:false});
 z.file('_rels/.rels',KOK_ILISKI,{createFolders:false});
 z.file('word/document.xml',belgeXml(govde,secenek),{createFolders:false});
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
async function indir(govde,dosyaAdi,secenek){await kaydet(await paketle(govde,secenek),dosyaAdi)}

global.WordBelge={xml,buyuk,calis,sekme,satirSonu,par,bosPar,hucre,tablo,imzaSatiri,genislik,belgeXml,paketle,kaydet,indir,DOCX_TURU,KENAR_BOSLUGU};
})(window);
