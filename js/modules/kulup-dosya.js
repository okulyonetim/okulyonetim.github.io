/* Koruk Asistan — Sosyal Kulüpler: Word çıktıları
 * 9 evrakın Word dosyası: kulübe özel dördü (iç tüzük, yıllık plan, toplum hizmeti, aylık raporlar) kulübün kendi dosyasıdır (assets/kulup/{id}/*.docx; içerik ve görünüm kulüpten geldiği gibi),
 * diğerleri ortak şablondur (assets/kulup/sablon/*.docx). Hepsinde okul, danışman, müdür, üye sayısı… {{ALAN}} olarak uygulamadan doldurulur; tekrarlanan satırlar OgretmenDosyasiCore.satirCogalt ile çoğaltılır.
 * Dönem / yıl sonu ay özetleri ve hazır değerlendirme metinleri data/kulup/{id}.json'dan, öğretmenin yazdıkları (katılım, sonuç, tarihler, görevler) kulüp durumundan gelir. Çıktı A4; her sayfada üst/alt boşluk ≥15 mm.
 */
(function(global){
'use strict';
if(global.KulupDosya)return;

const KOK='./assets/kulup/';
const K=()=>global.KulupCore,O=()=>global.OgretmenDosyasiCore;

/* Evrak başına Word dosyası. kulube: kulübün kendi dosyası (assets/kulup/{id}/…); değilse ortak şablon (assets/kulup/sablon/…). gruplar: çoğaltılan satır türleri. */
const SABLON={
 tuzuk:{dosya:'tuzuk.docx',kulube:true},
 plan:{dosya:'yillik-plan.docx',kulube:true},
 toplum:{dosya:'toplum-hizmeti.docx',kulube:true},
 tutanak:{dosya:'tutanak.docx'},
 uyeler:{dosya:'uye-listesi.docx',gruplar:[['UYE']]},
 aylik:{dosya:'aylik-rapor.docx',kulube:true},
 donem:{dosya:'donem-sonu.docx',gruplar:[['ISL']]},
 yil:{dosya:'yil-sonu.docx',gruplar:[['ISL']]},
 denetleme:{dosya:'denetleme.docx'}
};
const BELGELER=K().BELGELER.map(b=>({...b,...SABLON[b.k]}));
const belge=k=>BELGELER.find(b=>b.k===k)||null;

/* ── evrak başına alanlar ──
 * b = { okul, il, ilce, mudur, yil, danismanlar, kulup, uyeler, durum, paket, kademe }  ·  girdi = { aylar: ['EYLÜL'…], donem: 1|2 } */
function hazirla(kod,b,girdi={}){
 const bl=belge(kod);if(!bl)throw new Error('Evrak bulunamadı.');
 const k=K(),paket=b.paket||null;
 if(bl.katalog&&!paket)throw new Error('Bu kulübün hazır evrakları henüz eklenmedi.');
 const ortak=k.ortakDegerler(b,O()),d=b.durum,al=a=>k.deger(d,a);
 const cikti={bl,v:ortak,satirlar:null,gruplar:bl.gruplar,donustur:null,ek:''};
 switch(kod){
  case 'tutanak':
   Object.assign(cikti.v,{TOPLANTI_NO:al('toplantiNo')||'1',TARIH:k.gunAy(al('toplantiTarihi'))||k.NOKTA,SAAT:al('toplantiSaati')||'……:……',YER:al('toplantiYeri')||'Okul'});break;
  case 'plan':{const p=k.planSecimi(paket,b.kademe);cikti.bl={...bl,dosya:p.dosya};if(p.kademe)cikti.ek=k.baslikHarfi(p.kademe);break}   // kademeye özel plan varsa onun dosyası
  case 'uyeler':cikti.satirlar=k.uyeSatirlari(b.uyeler||[]);break;
  case 'aylik':{
   const secim=(girdi.aylar||[]).map(a=>(paket.aylar||[]).indexOf(a));
   if(secim.some(i=>i<0))throw new Error('Seçilen ay için rapor bulunamadı.');
   if(secim.length){cikti.donustur=xml=>k.bolumSec(xml,secim);if(secim.length===1)cikti.ek=girdi.aylar[0]}
   break;
  }
  case 'donem':case 'yil':{
   const donem=kod==='donem'?(girdi.donem===2?2:1):0,onEk=kod==='yil'?'y':`d${donem}`;
   const aylar=(paket.yilSonu?.aylar?.length?paket.yilSonu.aylar:paket.donemSonu?.aylar||[]).filter(a=>kod==='yil'||k.DONEM_AYLARI[donem].includes(a.ay));
   Object.assign(cikti.v,k.degerlendirme(paket,onEk,d));
   for(const a of ['GENEL','GUCLUK','ONERI'])cikti.v[a]=cikti.v[a]||k.NOKTA;   // kulübün dosyasında değerlendirme yazısı yoksa yazılacak noktalı satır
   if(kod==='donem'){cikti.v.DONEM=`${donem}. Dönem`;cikti.ek=`${donem}_Donem`}else cikti.v.RAPOR_TARIHI=k.gunAy(al('yRaporTarihi'))||k.NOKTA;
   cikti.satirlar=k.islerSatirlari(aylar,d,onEk);break;
  }
  case 'denetleme':
   Object.assign(cikti.v,{DONEM:girdi.donem===2?'2. Dönem':girdi.donem===1?'1. Dönem':'1. Dönem / 2. Dönem',INCELEME_TARIHI:k.gunAy(al('inceleme'))||k.NOKTA,
    DENETLEME_UYE1:al('denetleme1')||k.NOKTA,DENETLEME_UYE2:al('denetleme2')||k.NOKTA,DENETLEME_UYE3:al('denetleme3')||k.NOKTA});break;
 }
 return cikti;
}
async function sablon(bl,paket){
 const yol=`${KOK}${bl.kulube?`${encodeURIComponent(paket.id)}/`:'sablon/'}${bl.dosya}`;
 const r=await global.fetch(yol);
 if(!r.ok)throw new Error(`Evrak şablonu alınamadı (${r.status}).`);
 return r.arrayBuffer();
}
/* → { blob, ad } */
async function olustur(kod,b,girdi={}){
 const c=hazirla(kod,b,girdi),tampon=await sablon(c.bl,b.paket);
 const blob=await O().docxDoldur(tampon,c.v,c.satirlar,c.gruplar,c.donustur);
 return{blob,ad:O().dosyaAdi(`${K().kulupAdi(b.kulup?.ad||b.kulup?.kulupAdi)||'Kulup'} ${c.bl.ad}${c.ek?` ${c.ek}`:''}`,'','docx')};
}
async function indir(kod,b,girdi){const {blob,ad}=await olustur(kod,b,girdi);await O().dosyaKaydet(blob,ad);return ad}

global.KulupDosya={BELGELER,belge,hazirla,olustur,indir};
})(window);
