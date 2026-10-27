/* Koruk Asistan — Sınıf Rehberlik: Word / Excel indirme
 * Plan → Excel (ExcelJS, kaynak planın görünümü). Aylık / dönem sonu / yıl sonu raporu → Word: assets/rehberlik/*.docx şablonları
 * ({{ALAN}} işaretli; tekrarlanan satırlar OgretmenDosyasiCore.satirCogalt ile çoğaltılır). Aynı veri ekranda/baskıda RehberlikBelge ile yazılır.
 */
(function(global){
'use strict';
if(global.RehberlikDosya)return;

const KOK='assets/rehberlik/';
const EXCELJS='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
const OGRETMEN_CORE='js/modules/ogretmen-dosyasi-core.js?v=3';
const XLSX_TURU='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const C=()=>global.RehberlikCore,B=()=>global.RehberlikBelge,O=()=>global.OgretmenDosyasiCore;
const tarih=s=>C().tarihTR(s)||'';
const sayi=(a,b)=>(Number(a||0)+Number(b||0))||'';
const toplam=f=>f&&(f.kiz||f.erkek)?Number(f.kiz||0)+Number(f.erkek||0):'';

/* ── Word şablonları ── */
const SABLON={
 aylik:{dosya:'aylik.docx',ad:'Rehberlik Aylik Rapor',gruplar:[['ETK1','ETK2','ETK3'],['TEST'],['VELI'],['OGR'],['DIG1','DIG2']]},
 donem:{dosya:'donem.docx',ad:'Rehberlik Donem Sonu Raporu',gruplar:[]},
 yil:{dosya:'yilsonu.docx',ad:'Rehberlik Yil Sonu Raporu',gruplar:[['NED'],['TEK'],['FAA'],['YON'],['VEL']]}
};
const ortak=c=>({MUDURLUK:B().mudurluk(c.okul),YIL:c.yil,SINIF:c.sinif,OGRETMEN:c.ogretmen||B().NOKTA,MUDUR:c.mudur||B().NOKTA,TARIH:tarih(c.tarih)});

function aylikIcerik(r,c){
 const d=B().doldur,m=c.mevcut||{kiz:0,erkek:0,toplam:0},say=n=>n?String(n):'';
 const satirlar=[
  ...d(r.etkinlikler,3).flatMap((e,i)=>[{tur:'ETK1',SIRA:e?e.sira:i+1,TARIH:e?tarih(e.tarih):'',YETERLIK:e?.yeterlik||''},{tur:'ETK2',KAZANIM:e?.kazanim||''},{tur:'ETK3',AD:e?.ad||''}]),
  ...d(r.test,2).map((t,i)=>({tur:'TEST',SIRA:i+1,AD:t?.ad||'',TARIH:t?tarih(t.tarih):'',KIZ:t?.kiz||'',ERKEK:t?.erkek||'',TOPLAM:t?sayi(t.kiz,t.erkek):''})),
  ...d(r.veli,3).map((v,i)=>({tur:'VELI',SIRA:i+1,VELI:v?.veli||'',OGRENCI:v?.ogrenci||'',KONU:v?.konu||'',TARIH:v?tarih(v.tarih):''})),
  ...d(r.ogrenci,3).map((o,i)=>({tur:'OGR',SIRA:i+1,NO:o?.no||'',AD:o?.ad||'',KONU:o?.konu||'',TARIH:o?tarih(o.tarih):''})),
  ...d(r.diger,2).map((x,i)=>({tur:i?'DIG2':'DIG1',SIRA:i+1,METIN:x?x.metin+(x.tarih?` (${tarih(x.tarih)})`:''):''}))
 ];
 const degerler={...ortak(c),KONU:`${B().sinifBasligi(c.sinif)} ${C().ayAdi(r.ay).toLocaleUpperCase('tr')} AYI ÇALIŞMA RAPORU`,KIZ:say(m.kiz),ERKEK:say(m.erkek),TOPLAM:say(m.toplam)};
 return{degerler,satirlar,ek:C().ayAdi(r.ay)};
}
function donemIcerik(r,c){
 const degerler={...ortak(c),KONU:`SINIF REHBERLİK ÇALIŞMALARI ${r.ad} SONU ÇALIŞMA RAPORU`};
 r.aylar.forEach((a,i)=>{degerler[`AY${i+1}`]=a.ad;degerler[`AY${i+1}_ETK`]=a.satirlar.map(s=>`• ${s.metin}`).join('\n')});
 return{degerler,satirlar:[],ek:r.ad.replace(/\./g,'').replace(/\s+/g,' ')};
}
function yilIcerik(y,c){
 const d=B().doldur,faal=(liste,en,tur)=>d(liste,en).map((f,i)=>({tur,SIRA:i+1,AD:f?.ad||'',KIZ:f?.kiz||'',ERKEK:f?.erkek||'',TOPLAM:toplam(f)}));
 const satirlar=[
  ...d(y.gerceklesmeyen,8).map((g,i)=>({tur:'NED',SIRA:i+1,NO:g?g.sira:'',NEDEN:g?.neden||''})),
  ...faal(y.teknikler,8,'TEK'),...faal(y.faaliyetler,5,'FAA'),
  ...d(y.yonlendirilen,10).map((o,i)=>({tur:'YON',SIRA:i+1,AD:o?.ad||'',NO:o?.no||'',VELI:o?.veli||'',NEDEN:o?.neden||''})),
  ...faal(y.veliFaaliyetleri,4,'VEL')
 ];
 const isaret=ad=>`${ad} (${y.gerceklesti===ad?'X':'  '})`;
 const degerler={...ortak(c),KAZANIM_METNI:`${y.kazanimToplam} kazanım`,GERCEKLESTI:['Evet','Kısmen','Hayır'].map(isaret).join('   '),GUCLUK:y.guclukler,COZUM:y.cozumler,ISBIRLIGI:y.isbirligi,BEKLENTI:y.beklenti};
 return{degerler,satirlar,ek:''};
}

/* ── dosya kaydetme (uygulamada yerel kaydet, tarayıcıda indir) ── */
async function kaydet(blob,ad,tur){
 if(typeof global.uygulamaDosyaKaydet==='function'){
  const b64=await new Promise((ok,hata)=>{const r=new global.FileReader();r.onload=()=>ok(String(r.result||'').split(',')[1]||'');r.onerror=()=>hata(r.error||new Error('Dosya hazırlanamadı.'));r.readAsDataURL(blob)});
  return global.uygulamaDosyaKaydet(b64,ad,tur,false);
 }
 const url=global.URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=ad;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>global.URL.revokeObjectURL(url),1200);
}
async function betik(src,hazir,hata){
 if(hazir())return;
 if(!global.AppLoader?.loadScript)throw new Error(hata);
 await global.AppLoader.loadScript(src);
 if(!hazir())throw new Error(hata);
}

/* ── Word ── */
async function wordIndir(tur,{ctx,plan,durum,ay,hepsi}){
 await betik(OGRETMEN_CORE,()=>!!O(),'Word bileşeni yüklenemedi.');
 const p=SABLON[tur==='aylik'?'aylik':tur==='yil'?'yil':'donem'];
 const secenek={hepsi};
 const icerik=tur==='aylik'?aylikIcerik(C().aylikRapor(plan,ay,durum,secenek),ctx)
  :tur==='yil'?yilIcerik(C().yilSonuRaporu(plan,durum),ctx)
  :donemIcerik(C().donemRaporu(plan,tur==='donem1'?1:2,secenek),ctx);
 const r=await global.fetch(`${KOK}${p.dosya}`);
 if(!r.ok)throw new Error(`Şablon alınamadı (${r.status}).`);
 const blob=await O().docxDoldur(await r.arrayBuffer(),icerik.degerler,icerik.satirlar,p.gruplar);
 await kaydet(blob,O().dosyaAdi([p.ad,icerik.ek].filter(Boolean).join(' '),ctx.sinif,'docx'),O().DOCX_TURU);
}

/* ── Excel: sınıf rehberlik planı (3 sütunlu ay blokları, kaynak xlsx düzeni) ── */
const RENK={baslik:'FF30859B',ay:'FFDAEDF3',tarih:'FFB7DEE8',tatil:'FFF2F2F2',yazi:'FFFFFFFF'};
const KENAR={style:'thin',color:{argb:'FF7F7F7F'}};
const CERCEVE={top:KENAR,left:KENAR,bottom:KENAR,right:KENAR};
const METIN_EN=58,HAFTA_EN=10;
const satirYuksekligi=(metin,en=METIN_EN)=>Math.max(1,Math.ceil(String(metin||'').length/(en*1.15)))*11+4;
const sayfaAdi=ad=>String(ad||'').replace(/[\\/?*[\]:]/g,'-').trim().slice(0,31)||'Plan';

async function excelPlan({ctx,plan}){
 await betik(EXCELJS,()=>!!global.ExcelJS,'Excel bileşeni yüklenemedi.');
 await betik(OGRETMEN_CORE,()=>!!O(),'Dosya bileşeni yüklenemedi.');
 const wb=new global.ExcelJS.Workbook();wb.creator='Koruk Asistan';
 const ws=wb.addWorksheet(sayfaAdi(ctx.sinif),{pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,horizontalCentered:true,margins:{left:0.4,right:0.4,top:0.6,bottom:0.6,header:0.3,footer:0.3}}});
 ws.columns=[METIN_EN,HAFTA_EN,METIN_EN,HAFTA_EN,METIN_EN,HAFTA_EN].map(width=>({width}));
 let r=0;
 const satir=(yukseklik)=>{r++;if(yukseklik)ws.getRow(r).height=yukseklik;return r};
 const baslik=(metin,{boyut=11,dolgu,renk}={})=>{
  const n=satir(boyut>=11?20:22);ws.mergeCells(n,1,n,6);
  const h=ws.getCell(n,1);h.value=metin;
  h.font={name:'Arial',size:boyut,bold:true,color:{argb:renk||'FF000000'}};h.alignment={horizontal:'center',vertical:'middle',wrapText:true};
  if(dolgu)for(let c=1;c<=6;c++){ws.getCell(n,c).fill={type:'pattern',pattern:'solid',fgColor:{argb:dolgu}};ws.getCell(n,c).border=CERCEVE}
 };
 baslik(`${ctx.yil} EĞİTİM ÖĞRETİM YILI`);
 baslik(B().mudurluk(ctx.okul));
 baslik(`${B().sinifBasligi(ctx.sinif)} SINIF REHBERLİK PLANI`,{boyut:10,dolgu:RENK.baslik,renk:RENK.yazi});
 const aylar=Object.fromEntries(plan.aylar.map(a=>[a.ad,a]));
 const bantlar=C().PLAN_BANTLARI;
 bantlar.forEach((adlar,bi)=>{
  const kolonlar=adlar.map(ad=>aylar[ad]).filter(Boolean);
  if(!kolonlar.length)return;
  const bas=satir(18);
  kolonlar.forEach((a,k)=>{
   const m=ws.getCell(bas,1+k*2),t=ws.getCell(bas,2+k*2);
   m.value=C().ayAdi(a.ad).toLocaleUpperCase('tr');t.value='TARİH';
   for(const [h,dolgu] of[[m,RENK.ay],[t,RENK.tarih]]){h.font={name:'Arial',size:9,bold:true};h.alignment={horizontal:'center',vertical:'middle'};h.fill={type:'pattern',pattern:'solid',fgColor:{argb:dolgu}};h.border=CERCEVE}
  });
  const en=Math.max(...kolonlar.map(a=>a.maddeler.length));
  for(let i=0;i<en;i++){
   const n=satir(Math.max(...kolonlar.map(a=>a.maddeler[i]?satirYuksekligi(C().maddeMetni(a.maddeler[i])):0),15));
   kolonlar.forEach((a,k)=>{
    const m=a.maddeler[i],h=ws.getCell(n,1+k*2),t=ws.getCell(n,2+k*2),tatil=m?.tur==='tatil';
    h.value=m?C().maddeMetni(m):'';t.value=m?C().haftaMetni(m.hafta):'';
    h.font={name:'Arial',size:8,italic:tatil};h.alignment={horizontal:tatil?'center':'left',vertical:'middle',wrapText:true};
    t.font={name:'Arial',size:8};t.alignment={horizontal:'center',vertical:'middle'};
    for(const x of[h,t]){x.border=CERCEVE;if(tatil)x.fill={type:'pattern',pattern:'solid',fgColor:{argb:RENK.tatil}}}
   });
  }
  if(bi===1)ws.getRow(r).addPageBreak();                       // ilk iki bant (Eylül–Şubat) birinci sayfada
 });
 // imzalar: öğretmen solda; müdür sağ sütunda (OLUR, tarih, ad, unvan), yazılar sola hizalı
 satir(10);
 const olur=satir(16),tar=satir(14),ad=satir(18),unvan=satir(16);
 const yaz=(n,sut,deger,kalin,altta)=>{const h=ws.getCell(n,sut);h.value=deger;h.font={name:'Arial',size:10,bold:kalin};h.alignment={horizontal:'left',vertical:altta?'bottom':'top'}};
 yaz(ad,1,ctx.ogretmen||B().NOKTA,true,true);yaz(unvan,1,'Sınıf Rehber Öğretmeni',true);
 yaz(olur,5,'OLUR',true);yaz(tar,5,tarih(ctx.tarih),false);yaz(ad,5,ctx.mudur||B().NOKTA,false,true);yaz(unvan,5,'Okul Müdürü',true);
 ws.pageSetup.printArea=`A1:F${r}`;
 const veri=await wb.xlsx.writeBuffer();
 await kaydet(new global.Blob([veri],{type:XLSX_TURU}),O().dosyaAdi('Rehberlik Plani',ctx.sinif,'xlsx'),XLSX_TURU);
}

async function indir(tur,girdi){
 if(tur==='plan')return excelPlan(girdi);
 if(['aylik','donem1','donem2','yil'].includes(tur))return wordIndir(tur,girdi);
 throw new Error('Bu belge için indirme yok; Yazdır / PDF kullanın.');
}

global.RehberlikDosya={indir,aylikIcerik,donemIcerik,yilIcerik,SABLON};
})(window);
