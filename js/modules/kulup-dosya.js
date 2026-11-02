/* Koruk Asistan — Sosyal Kulüpler: Word çıktıları
 * 9 evrakın şablonu assets/kulup/sablon/*.docx ({{ALAN}} işaretli; tekrarlanan satırlar OgretmenDosyasiCore.satirCogalt ile çoğaltılır).
 * Kulübe özel içerik (iç tüzük, yıllık plan, toplum hizmeti, aylık rapor, ay özetleri) data/kulup/{id}.json kataloğundan, okul/danışman/üyeler uygulamadan,
 * öğretmenin yazdıkları (katılım, sonuç, tarihler, görevler) kulüp durumundan gelir. Çıktı A4; her sayfada üst/alt boşluk ≥15 mm.
 */
(function(global){
'use strict';
if(global.KulupDosya)return;

const KOK='./assets/kulup/sablon/';
const K=()=>global.KulupCore,O=()=>global.OgretmenDosyasiCore;
const kac=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* Evrak başına şablon dosyası ve tekrarlanan satır grupları; ad, açıklama ve katalog gereği KulupCore.BELGELER'dedir. */
const SABLON={
 tuzuk:{dosya:'tuzuk.docx'},
 plan:{dosya:'yillik-plan.docx',gruplar:[['PLA','PLB']]},
 toplum:{dosya:'toplum-hizmeti.docx',gruplar:[['TOP']]},
 tutanak:{dosya:'tutanak.docx'},
 uyeler:{dosya:'uye-listesi.docx',gruplar:[['UYE']]},
 aylik:{dosya:'aylik-rapor.docx',gruplar:[['FAA']]},
 donem:{dosya:'donem-sonu.docx',gruplar:[['ISL']]},
 yil:{dosya:'yil-sonu.docx',gruplar:[['ISL']]},
 denetleme:{dosya:'denetleme.docx'}
};
const BELGELER=K().BELGELER.map(b=>({...b,...SABLON[b.k]}));
const belge=k=>BELGELER.find(b=>b.k===k)||null;

/* ── kâğıttaki karşılığı olan XML parçaları ── */
const calis=(t,{b=false,sz=24}={})=>`<w:r><w:rPr>${b?'<w:b/><w:bCs/>':''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${kac(t)}</w:t></w:r>`;
const par=(calisir,{jc='both',once=0,sonra=80,sol=0,asili=0,sakla=false}={})=>`<w:p><w:pPr>${sakla?'<w:keepNext/>':''}<w:spacing w:before="${once}" w:after="${sonra}"/>${sol?`<w:ind w:left="${sol}" w:hanging="${asili}"/>`:''}<w:jc w:val="${jc}"/></w:pPr>${calisir}</w:p>`;
const KENAR=ad=>`<w:${ad} w:val="single" w:sz="6" w:space="0" w:color="555555"/>`;
const hucre=(genis,icerik,gri=false)=>`<w:tc><w:tcPr><w:tcW w:w="${genis}" w:type="dxa"/>${gri?'<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>':''}<w:vAlign w:val="center"/></w:tcPr>${icerik}</w:tc>`;
function tuzukXml(maddeler){
 const GENIS=[2600,7038];
 return(maddeler||[]).map(m=>{
  let x=par(calis(m.baslik,{b:true}),{once:160,sonra:60,sakla:true,jc:'left'});
  x+=par(calis(`MADDE ${m.no} – `,{b:true})+calis(m.metin),{});
  for(const l of m.liste||[])x+=par(calis(`• ${l}`),{sol:567,asili:284,sonra:40});
  if(m.gorevler?.length){
   x+=`<w:tbl><w:tblPr><w:tblW w:w="${GENIS[0]+GENIS[1]}" w:type="dxa"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(KENAR).join('')}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="50" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="50" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${GENIS.map(g=>`<w:gridCol w:w="${g}"/>`).join('')}</w:tblGrid>`;
   x+=`<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>${hucre(GENIS[0],par(calis('Görev',{b:true,sz:22}),{jc:'center',sonra:0}),true)}${hucre(GENIS[1],par(calis('Sorumluluk',{b:true,sz:22}),{jc:'center',sonra:0}),true)}</w:tr>`;
   for(const g of m.gorevler)x+=`<w:tr><w:trPr><w:cantSplit/></w:trPr>${hucre(GENIS[0],par(calis(g.gorev,{b:true,sz:22}),{jc:'left',sonra:0}))}${hucre(GENIS[1],par(calis(g.sorumluluk,{sz:22}),{sonra:0}))}</w:tr>`;
   x+='</w:tbl>'+par('',{sonra:40});
  }
  return x;
 }).join('');
}
const altHedefXml=liste=>(liste||[]).map(h=>`<w:p><w:pPr><w:spacing w:after="10"/><w:ind w:left="120"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t xml:space="preserve">${kac(h.kod)} </w:t></w:r><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>${kac(h.ad)}</w:t></w:r></w:p>`).join('');
const isaretiDegistir=(ad,yeni)=>xml=>{
 const re=new RegExp(`<w:p><w:r><w:t>\\[\\[${ad}\\]\\]</w:t></w:r></w:p>`);
 if(!re.test(xml))throw new Error(`Şablonda [[${ad}]] bulunamadı.`);
 return xml.replace(re,()=>yeni);
};

/* ── evrak başına alanlar ──
 * b = { okul, il, ilce, mudur, yil, danismanlar, kulup, uyeler, durum, paket }  ·  girdi = { aylar: ['EYLÜL'…], donem: 1|2 } */
function hazirla(kod,b,girdi={}){
 const bl=belge(kod);if(!bl)throw new Error('Evrak bulunamadı.');
 const k=K(),paket=b.paket||null;
 if(bl.katalog&&!paket)throw new Error('Bu kulübün hazır evrakları henüz eklenmedi.');
 const ortak=k.ortakDegerler(b,O()),d=b.durum,al=a=>k.deger(d,a);
 const cikti={bl,v:ortak,satirlar:null,gruplar:bl.gruplar,donustur:null,bolumler:null};
 switch(kod){
  case 'tuzuk':cikti.donustur=isaretiDegistir('TUZUK',tuzukXml(paket.tuzuk));break;
  case 'plan':{
   const t=paket.tema||{};
   Object.assign(cikti.v,{TEMA:t.kod?`${t.ad} (${t.kod})`:(t.ad||''),TEMA_HEDEF:t.hedef||'',TEMA_PROTOKOL:t.protokol||''});
   cikti.satirlar=k.planSatirlari(paket);cikti.donustur=isaretiDegistir('ALT_HEDEFLER',altHedefXml(t.altHedefler));break;
  }
  case 'toplum':cikti.satirlar=k.toplumSatirlari(paket);break;
  case 'tutanak':
   Object.assign(cikti.v,{TOPLANTI_NO:al('toplantiNo')||'1',TARIH:k.gunAy(al('toplantiTarihi'))||k.NOKTA,SAAT:al('toplantiSaati')||'……:……',YER:al('toplantiYeri')||'Okul'});break;
  case 'uyeler':cikti.satirlar=k.uyeSatirlari(b.uyeler||[]);break;
  case 'aylik':
   cikti.bolumler=k.aylikBolumleri(paket,girdi.aylar,ortak);
   if(!cikti.bolumler.length)throw new Error('Seçilen ay için rapor bulunamadı.');break;
  case 'donem':case 'yil':{
   const donem=kod==='donem'?(girdi.donem===2?2:1):0,onEk=kod==='yil'?'y':`d${donem}`;
   const aylar=(paket.yilSonu?.aylar?.length?paket.yilSonu.aylar:paket.donemSonu?.aylar||[]).filter(a=>kod==='yil'||k.DONEM_AYLARI[donem].includes(a.ay));
   Object.assign(cikti.v,k.degerlendirme(paket,onEk,d));
   if(kod==='donem')cikti.v.DONEM=`${donem}. Dönem`;else cikti.v.RAPOR_TARIHI=k.gunAy(al('yRaporTarihi'))||k.NOKTA;
   cikti.satirlar=k.islerSatirlari(aylar,d,onEk);break;
  }
  case 'denetleme':
   Object.assign(cikti.v,{DONEM:girdi.donem===2?'2. Dönem':girdi.donem===1?'1. Dönem':'1. Dönem / 2. Dönem',INCELEME_TARIHI:k.gunAy(al('inceleme'))||k.NOKTA,
    DENETLEME_UYE1:al('denetleme1')||k.NOKTA,DENETLEME_UYE2:al('denetleme2')||k.NOKTA,DENETLEME_UYE3:al('denetleme3')||k.NOKTA});break;
 }
 return cikti;
}
async function sablon(dosya){
 const r=await global.fetch(`${KOK}${dosya}`);
 if(!r.ok)throw new Error(`Evrak şablonu alınamadı (${r.status}).`);
 return r.arrayBuffer();
}
/* → { blob, ad } */
async function olustur(kod,b,girdi={}){
 const c=hazirla(kod,b,girdi),tampon=await sablon(c.bl.dosya);
 const blob=c.bolumler?await O().docxBolumlu(tampon,c.bolumler,c.gruplar):await O().docxDoldur(tampon,c.v,c.satirlar,c.gruplar,c.donustur);
 const ek=c.bolumler&&c.bolumler.length===1?c.bolumler[0].ay:kod==='donem'?`${girdi.donem===2?2:1}_Donem`:'';
 return{blob,ad:O().dosyaAdi(`${K().kulupAdi(b.kulup?.ad||b.kulup?.kulupAdi)||'Kulup'} ${c.bl.ad}${ek?` ${ek}`:''}`,'','docx')};
}
async function indir(kod,b,girdi){const {blob,ad}=await olustur(kod,b,girdi);await O().dosyaKaydet(blob,ad);return ad}

global.KulupDosya={BELGELER,belge,hazirla,olustur,indir,tuzukXml,altHedefXml};
})(window);
