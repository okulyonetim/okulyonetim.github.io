/* Koruk Asistan — Sınıf bağlamı (Veli Toplantısı, Sınıf Rehberlik ve sınıf bazlı evrak sayfaları ortak kullanır)
 * Uygulama verisinden (siniflar, veliler, ogretmenler, okulBilgileri) okul, sınıf listesi, öğrenciler ve öğretmen / müdür adını çıkarır.
 * Öğretmen yalnız kendi sınıfını görür; yönetici hepsini. Ortak okullarda sınıfın kademesine ait okul adı kullanılır (1–4 ilkokul, 5–8 ortaokul).
 */
(function(global){
'use strict';
if(global.SinifBaglam)return;

const rows=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const user=()=>global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};
const isManager=()=>user().admin===true||!!global.PermissionService?.isManager?.();
const egitimYili=(d=new Date())=>{const y=d.getFullYear();return d.getMonth()+1>=9?`${y}-${y+1}`:`${y-1}-${y}`};

/* "ayşe kaya" → "Ayşe KAYA": adlar baş harfi büyük, soyad tamamen büyük. */
function adBicimi(s){
 const w=String(s||'').trim().split(/\s+/).filter(Boolean);
 if(!w.length)return'';
 const son=w.pop().toLocaleUpperCase('tr');
 return[...w.map(x=>x.charAt(0).toLocaleUpperCase('tr')+x.slice(1).toLocaleLowerCase('tr')),son].join(' ');
}
const adSoyad=t=>t?(`${t.ad||''} ${t.soyad||''}`.trim()||t.adSoyad||''):'';
/* "5/A", "5. Sınıf A", "8-C" → 5, 5, 8; düzeyi çıkarılamayan ad (Anasınıfı…) → 0. */
const duzeyOf=ad=>{const n=parseInt(String(ad||'').trim(),10);return n>=1&&n<=8?n:0};

function teacherId(){const u=user();return String(u.bagliOgretmenId||u.ogretmenId||'')}
const okulKaydi=()=>{const l=rows('okulBilgileri');return l.find(x=>x.id==='ayarlar')||l[0]||global.okulBilgileriAyari||{}};
function okulMuduru(){const o=okulKaydi();return adBicimi(adSoyad(rows('ogretmenler').find(t=>String(t.id)===String(o.mudurId||o.mudirId||'')))||String(o.mudurAdSoyad||o.mudurAdi||''))}
function okulAdi(duzey){
 const o=okulKaydi(),genel=String(o.okulAdi||o.ad||global.ReportEngine?.schoolInfo?.().okulAdi||'').trim();
 const kademe=duzey>=5?'ortaokul':duzey>=1?'ilkokul':'';
 return String(kademe&&o[`${kademe}Adi`]||'').trim()||genel;
}
/* { liste: görülebilen sınıflar (ad sırası), own: kendi sınıflarımın kimlikleri } — öğretmenin sınıfı yoksa ya da yöneticiyse hepsi listelenir. */
function siniflar(){
 const tid=teacherId();
 const hepsi=rows('siniflar').map(c=>({id:String(c.id),ad:String(c.ad||c.sinifAdi||'').trim(),ogretmenId:String(c.sinifOgretmeniId||c.ogretmenId||'')})).filter(c=>c.ad)
  .sort((a,b)=>a.ad.localeCompare(b.ad,'tr',{numeric:true,sensitivity:'base'}));
 const own=hepsi.filter(c=>tid&&c.ogretmenId===tid);
 return{liste:isManager()||!own.length?hepsi:own,own:new Set(own.map(c=>c.id))};
}
const sinifBul=id=>siniflar().liste.find(c=>c.id===id)||null;
function ogrencilerOf(id){
 return rows('veliler').filter(v=>String(v.sinifId)===String(id))
  .sort((a,b)=>Number(a.ogrenciNo||a.no||0)-Number(b.ogrenciNo||b.no||0)||String(a.ogrenciAdi||'').localeCompare(String(b.ogrenciAdi||''),'tr'))
  .map(v=>({id:String(v.id||''),ad:String(v.ogrenciAdi||v.adSoyad||[v.ad,v.soyad].filter(Boolean).join(' ')||'').trim(),no:String(v.ogrenciNo||v.no||'').trim(),cinsiyet:String(v.cinsiyet||'').trim(),veli:String(v.veliAdi||'').trim(),yakinlik:String(v.yakinlik||'').trim()})).filter(o=>o.ad);
}
function sinifOgretmeni(c){
 const t=rows('ogretmenler').find(x=>String(x.id)===String(c?.ogretmenId||'')),me=rows('ogretmenler').find(x=>String(x.id)===teacherId());
 return adBicimi(adSoyad(t)||(isManager()?'':adSoyad(me)||String(user().adSoyad||user().ad||'')));
}

/* Veli Görüşme Formu kayıtları (oy_veliGorusmeleri): sınıfın görüşmeleri, tarihe göre. Öğretmen kendi kayıtlarını, yönetici hepsini görür.
 * Öğrencinin cinsiyeti sınıf listesinden bulunur (ad, yoksa okul numarası ile). */
function veliGorusmeleri(c){
 if(!c)return[];
 const uid=user().uid,tum=rows('veliGorusmeleri'),kendi=isManager()?tum:tum.filter(x=>x.olusturanUid===uid);
 const k=s=>String(s||'').trim().toLocaleLowerCase('tr'),ogr=ogrencilerOf(c.id);
 return kendi.filter(x=>k(x.sinif)===k(c.ad)).map(x=>{
  const o=ogr.find(y=>k(y.ad)===k(x.ogrenciAd))||ogr.find(y=>x.no&&y.no&&y.no===String(x.no).trim());
  const veli=String(x.veliAd||'').trim(),yakin=String(x.yakinlik||'').trim();
  return{id:String(x.id||''),veli:veli&&yakin?`${veli} (${yakin})`:veli,ogrenci:String(x.ogrenciAd||'').trim(),konu:String(x.neden||x.konusulanlar||'').trim(),tarih:String(x.tarih||''),cinsiyet:o?.cinsiyet||''};
 }).sort((a,b)=>a.tarih.localeCompare(b.tarih));
}

/* Sayfa açılırken gereken koleksiyonları kaydedip yerelden yükler (ek: o sayfaya özgü koleksiyonlar); abone olunacak veri yolları: ABONELIK / abonelik(ek). */
const KOLEKSIYONLAR=['siniflar','veliler','ogretmenler','okulBilgileri'];
const abonelik=(ek=[])=>[...KOLEKSIYONLAR,...ek].map(t=>`data.${t}`);
const ABONELIK=abonelik();
const hazirlananlar=new Set();
async function hazirla(ek=[]){
 const SE=global.SyncEngine,col=global.COL;if(!SE||!col)return;
 const tipler=[...KOLEKSIYONLAR,...ek].filter(t=>col[t]&&!hazirlananlar.has(t));
 if(!tipler.length)return;
 for(const t of tipler){hazirlananlar.add(t);SE.register(t,col[t])}
 await SE.localHydrate(tipler);SE.schedule?.(100);
}
const sifirla=()=>hazirlananlar.clear();

global.SinifBaglam={rows,user,isManager,egitimYili,adBicimi,adSoyad,duzeyOf,teacherId,okulKaydi,okulMuduru,okulAdi,siniflar,sinifBul,ogrencilerOf,sinifOgretmeni,veliGorusmeleri,hazirla,sifirla,abonelik,ABONELIK};
})(window);
