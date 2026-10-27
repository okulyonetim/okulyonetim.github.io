/* Koruk Asistan — Sınıf Rehberlik çekirdeği (saf mantık, DOM'suz)
 * · Hafta → tarih: ayın 1'ini içeren hafta o ayın 1. haftasıdır (2026 Eylül 3. hafta = 14 Eylül Pazartesi).
 * · Yıllık plan: rehberlik-veri.js'teki taban plan + öğretmenin düzenlemeleri + "yapıldı" işaretleri → ay ay madde listesi.
 * · Takip durumu (cihazlar arası birleşir, her kayıt kendi zaman damgasıyla): m = yapıldı işaretleri, p = plan düzenlemeleri, r = rapor metinleri.
 * · Rapor verisi: aylık rapor, I./II. dönem sonu, yıl sonu. Kâğıt çıktısı: rehberlik-belge.js · Ekran: rehberlik.js
 */
(function(global){
'use strict';
if(global.RehberlikCore)return;

const V=()=>global.RehberlikVeri||{aylar:[],kazanim:{},plan:{},alanlar:[],yil:''};
const AY_NO={'EYLÜL':9,'EKİM':10,'KASIM':11,'ARALIK':12,'OCAK':1,'ŞUBAT':2,'MART':3,'NİSAN':4,'MAYIS':5,'HAZİRAN':6};
const DONEMLER={1:['EYLÜL','EKİM','KASIM','ARALIK','OCAK'],2:['ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN']};
const DONEM_ADI={1:'I. DÖNEM',2:'II. DÖNEM'};
const GUN=86400000;

const egitimYili=(d=new Date())=>{const y=d.getFullYear();return d.getMonth()+1>=9?`${y}-${y+1}`:`${y-1}-${y}`};
const yilBaslangici=yil=>parseInt(String(yil||'').trim(),10)||new Date().getFullYear();
/* "EYLÜL" → "Eylül" */
const ayAdi=ad=>String(ad||'').charAt(0).toLocaleUpperCase('tr')+String(ad||'').slice(1).toLocaleLowerCase('tr');
const duzeyOf=ad=>{const n=parseInt(String(ad||'').trim(),10);return n>=1&&n<=8?n:0};

/* ── tarih ── */
/* Bugünün yerel tarihi (UTC değil): gece yarısına yakın saatlerde gün kaymasın. */
const bugun=()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const iso=d=>`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
/* Ayın hafta başlangıcı (Pazartesi), ISO "YYYY-MM-DD". Eylül–Aralık yıl başında, Ocak–Haziran bir sonraki takvim yılındadır. */
function haftaBasi(yil,ay,hafta){
 const no=AY_NO[ay];if(!no)return'';
 const y=yilBaslangici(yil)+(no>=9?0:1),ilk=new Date(Date.UTC(y,no-1,1)),pazartesi=(ilk.getUTCDay()+6)%7;
 return iso(new Date(ilk.getTime()-pazartesi*GUN+(Math.max(1,Number(hafta)||1)-1)*7*GUN));
}
/* Planlanan tarih: haftanın Pazartesi'si; ay başından önceye düşerse (Ocak 1. hafta gibi) ayın 1'i. */
function planTarihi(yil,ay,hafta){
 const no=AY_NO[ay],basi=haftaBasi(yil,ay,hafta);
 if(!no||!basi)return'';
 const ilk=`${yilBaslangici(yil)+(no>=9?0:1)}-${String(no).padStart(2,'0')}-01`;
 return basi<ilk?ilk:basi;
}
const gunEkle=(s,n)=>{const[y,m,d]=s.split('-').map(Number);return iso(new Date(Date.UTC(y,m-1,d)+n*GUN))};
/* "Yapıldı" işaretlenirken önerilen tarih: bugün planlanan haftanın içindeyse bugün, değilse haftanın en yakın günü. */
function onerilenTarih(planlanan,simdi=bugun()){
 if(!planlanan)return simdi;
 const son=gunEkle(planlanan,4);
 return simdi<planlanan?planlanan:simdi>son?son:simdi;
}
const tarihTR=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||''));return m?`${m[3]}.${m[2]}.${m[1]}`:''};
const gecerliTarih=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''));

/* ── kazanım kataloğu ── */
function kazanimlar(duzey){
 return(V().kazanim[duzey]||[]).map(([sira,hafta,metin,alan,yeterlik,aciklama])=>({sira,hafta,metin,alan,yeterlik,aciklama}));
}
function kazanimBul(duzey,sira){return kazanimlar(duzey).find(k=>k.sira.includes(Number(sira)))||null}

/* ── takip durumu ──
 * durum = { m:{id:{y:1|0,d:'YYYY-MM-DD',a:'etkinlik adı',t}}, p:{id:{ay,h,m,s,x,t}}, r:{anahtar:{…,t}} }
 * m: yapıldı işareti · p: taban maddenin taşınması/silinmesi/adı veya eklenen madde ("o…" kimlikli) · r: rapor ek metinleri ("ay:EKİM", "yil")
 * Her kayıt zaman damgasıyla (t, ms) birleşir: cihazlar arası son yazan kazanır, farklı kayıtlar birlikte korunur. */
const bosDurum=()=>({m:{},p:{},r:{}});
function durumTemizle(x){
 const d=bosDurum();
 if(!x||typeof x!=='object')return d;
 for(const k of Object.keys(d)){
  const kaynak=x[k];if(!kaynak||typeof kaynak!=='object')continue;
  for(const [id,e] of Object.entries(kaynak)){if(id&&e&&typeof e==='object'&&Number.isFinite(Number(e.t)))d[k][id]={...e,t:Number(e.t)}}
 }
 return d;
}
function durumBirlestir(a,b){
 const x=durumTemizle(a),y=durumTemizle(b),s=bosDurum();
 for(const k of Object.keys(s)){
  for(const id of new Set([...Object.keys(x[k]),...Object.keys(y[k])])){
   const p=x[k][id],q=y[k][id];
   s[k][id]=!p?q:!q?p:(q.t>p.t?q:p);
  }
 }
 return s;
}
const sirali=d=>JSON.stringify(Object.keys(d).sort().map(k=>[k,typeof d[k]==='object'&&d[k]?sirali(d[k]):d[k]]));
const durumAyni=(a,b)=>sirali(durumTemizle(a))===sirali(durumTemizle(b));
const durumAnahtari=(yil,sinifId)=>`rehberlik_${String(yil||'').replace(/[^0-9]+/g,'_')}_${String(sinifId||'').replace(/[^A-Za-z0-9]+/g,'_')}`;
function isaretle(d,id,yapildi,tarih,t=Date.now()){
 const eski=d.m[id]||{};
 d.m[id]={y:yapildi?1:0,d:yapildi&&gecerliTarih(tarih)?tarih:'',a:String(eski.a||''),t};
 return d;
}
function tarihYaz(d,id,tarih,t=Date.now()){
 const eski=d.m[id]||{};
 d.m[id]={y:eski.y===1?1:0,d:gecerliTarih(tarih)?tarih:'',a:String(eski.a||''),t};
 return d;
}
function etkinlikAdiYaz(d,id,ad,t=Date.now()){
 const eski=d.m[id]||{};
 d.m[id]={y:eski.y===1?1:0,d:String(eski.d||''),a:String(ad||'').trim().slice(0,160),t};
 return d;
}
function maddeDuzenle(d,id,alanlar,t=Date.now()){
 const e={...(d.p[id]||{})};
 for(const k of ['ay','h','m','s','x'])if(k in alanlar)e[k]=alanlar[k];
 d.p[id]={...e,t};
 return d;
}
function maddeEkle(d,{ay,hafta,metin},t=Date.now()){
 const id=`o${t.toString(36)}${Math.random().toString(36).slice(2,5)}`;
 d.p[id]={ay,h:Math.max(1,Math.min(5,Number(hafta)||1)),m:String(metin||'').trim().slice(0,160),t};
 return id;
}
function maddeSil(d,id,t=Date.now()){maddeDuzenle(d,id,{x:1},t);return d}
function raporYaz(d,anahtar,alanlar,t=Date.now()){d.r[anahtar]={...(d.r[anahtar]||{}),...alanlar,t};return d}
const rapor=(d,anahtar)=>d?.r?.[anahtar]||{};

/* ── plan ── */
function tabanMaddeler(duzey){
 const plan=V().plan[duzey]||[];
 return plan.map(([ay,list],ai)=>list.map(([hafta,x],n)=>{
  const k=typeof x==='number';
  return{id:k?`k${x}`:`e${ai}_${n}`,tur:k?'k':/^ARA TATİL$/i.test(x)?'tatil':'e',sira:k?x:0,hafta,ay,ozel:false,metin:k?(kazanimBul(duzey,x)?.metin||''):x};
 })).flat();
}
/* Plan: ay ay madde listesi. Madde: {id,tur:'k'|'e'|'tatil',sira,metin,ay,hafta,ozel,yapildi,tarih,ad,planTarihi,yeterlik,alan}
 * tarih = işaretlenen/yazılan tarih, planTarihi = planlanan haftanın Pazartesi'si. */
function planOlustur(duzey,durum,yil){
 const d=durumTemizle(durum),aylar=V().aylar.map(ad=>({ad,no:AY_NO[ad],maddeler:[]})),ayBul=Object.fromEntries(aylar.map(a=>[a.ad,a]));
 const ekle=m=>{
  const a=ayBul[m.ay];if(!a)return;
  const kaz=m.tur==='k'?kazanimBul(duzey,m.sira):null,is=d.m[m.id]||{};
  a.maddeler.push({...m,yapildi:is.y===1,tarih:is.d||'',ad:is.a||'',planTarihi:planTarihi(yil,m.ay,m.hafta),yeterlik:kaz?.yeterlik||'',alan:kaz?.alan||''});
 };
 for(const m of tabanMaddeler(duzey)){
  const o=d.p[m.id];if(o?.x)continue;
  ekle({...m,ay:o?.ay&&ayBul[o.ay]?o.ay:m.ay,hafta:o?.h||m.hafta,metin:o?.m&&m.tur!=='k'?o.m:m.metin});
 }
 for(const [id,o] of Object.entries(d.p)){
  if(id[0]!=='o'||o.x||!o.m)continue;
  ekle({id,tur:'e',sira:0,hafta:o.h||1,ay:o.ay,ozel:true,metin:o.m});
 }
 aylar.forEach(a=>a.maddeler.sort((p,q)=>p.hafta-q.hafta));   // sıralama kararlıdır: aynı haftada plan sırası korunur
 return{duzey,yil,aylar};
}
const maddeler=plan=>plan.aylar.flatMap(a=>a.maddeler);
function ilerleme(plan){
 const s={k:{toplam:0,yapilan:0},e:{toplam:0,yapilan:0}};
 for(const m of maddeler(plan)){
  if(m.tur==='tatil')continue;
  const g=s[m.tur];g.toplam++;if(m.yapildi)g.yapilan++;
 }
 const toplam=s.k.toplam+s.e.toplam,yapilan=s.k.yapilan+s.e.yapilan;
 return{kazanim:s.k,etkinlik:s.e,toplam,yapilan,yuzde:toplam?Math.round(yapilan/toplam*100):0};
}
/* Haftanın bugüne göre durumu: geçmiş (işaretsiz) madde vurgulanır. */
const gecikmis=(m,simdi=bugun())=>m.tur!=='tatil'&&!m.yapildi&&!!m.planTarihi&&gunEkle(m.planTarihi,6)<simdi;

/* ── sınıf mevcudu ── */
function mevcut(ogrenciler){
 const l=Array.isArray(ogrenciler)?ogrenciler:[];
 const kiz=l.filter(o=>o.cinsiyet==='Kız').length,erkek=l.filter(o=>o.cinsiyet==='Erkek').length;
 return{kiz,erkek,toplam:l.length};
}

/* ── rapor verisi ── */
const bos=()=>({test:[],veli:[],ogrenci:[],diger:[]});
const liste=x=>Array.isArray(x)?x:[];
/* Aylık rapor: seçilen ayın yapılan (ya da hepsi) kazanım etkinlikleri + diğer çalışmalar + elle eklenen satırlar.
 * Yeterlik alanı kaynak tabloda boşsa (36. kazanım: "Tüm Alanlar") gelişim alanı yazılır. */
function aylikRapor(plan,ay,durum,secenek={}){
 const a=plan.aylar.find(x=>x.ad===ay),d=durumTemizle(durum),ek={...bos(),...rapor(d,`ay:${ay}`)};
 const sec=m=>m.tur!=='tatil'&&(secenek.hepsi||m.yapildi),tarih=m=>m.tarih||m.planTarihi;
 const maddeler=(a?.maddeler||[]).filter(sec);
 const etkinlikler=maddeler.filter(m=>m.tur==='k').map((m,i)=>({sira:i+1,tarih:tarih(m),yeterlik:m.yeterlik||m.alan,kazanim:m.metin,ad:m.ad}));
 const diger=[...maddeler.filter(m=>m.tur==='e').map(m=>({metin:m.metin,tarih:tarih(m)})),...liste(ek.diger).map(x=>({metin:String(x.metin||x||''),tarih:String(x.tarih||'')}))].filter(x=>x.metin);
 return{ay,etkinlikler,test:liste(ek.test),veli:liste(ek.veli),ogrenci:liste(ek.ogrenci),diger,
  planlanan:(a?.maddeler||[]).filter(m=>m.tur!=='tatil').length,isaretli:(a?.maddeler||[]).filter(m=>m.yapildi).length};
}
/* Dönem sonu: dönemin her ayı için yapılan (ya da hepsi) çalışmaların listesi. */
function donemRaporu(plan,donem,secenek={}){
 return{donem,ad:DONEM_ADI[donem],aylar:DONEMLER[donem].map(ad=>{
  const a=plan.aylar.find(x=>x.ad===ad);
  const satirlar=(a?.maddeler||[]).filter(m=>m.tur!=='tatil'&&(secenek.hepsi||m.yapildi)).map(m=>({metin:m.metin,tur:m.tur,tarih:m.tarih||m.planTarihi,yapildi:m.yapildi}));
  return{ad,satirlar};
 })};
}
/* Yıl sonu: kazanım sayıları ve "gerçekleşti mi" otomatik; metinler r.yil içinde elle yazılır. */
function yilSonuRaporu(plan,durum){
 const d=durumTemizle(durum),y=rapor(d,'yil'),ip=ilerleme(plan),k=ip.kazanim;
 const otomatik=k.toplam&&k.yapilan>=k.toplam?'Evet':k.yapilan>0?'Kısmen':'Hayır';
 const gerceklesmeyen=maddeler(plan).filter(m=>m.tur==='k'&&!m.yapildi).map(m=>({sira:m.sira,metin:m.metin,neden:String(y.nedenler?.[m.sira]||'')}));
 return{kazanimToplam:k.toplam,kazanimYapilan:k.yapilan,otomatik,gerceklesti:['Evet','Kısmen','Hayır'].includes(y.gerceklesti)?y.gerceklesti:otomatik,
  gerceklesmeyen,
  teknikler:liste(y.teknikler),faaliyetler:liste(y.faaliyetler),
  veliFaaliyetleri:liste(y.veliFaaliyetleri).length?liste(y.veliFaaliyetleri):[{ad:'Veli Toplantısı'},{ad:'Bireysel Görüşme'}],
  yonlendirilen:liste(y.yonlendirilen),guclukler:String(y.guclukler||''),cozumler:String(y.cozumler||''),
  isbirligi:String(y.isbirligi||''),beklenti:String(y.beklenti||'')};
}

/* ── yazdırılacak plan: 3 sütunlu ay blokları (kaynak xlsx düzeni) ── */
const PLAN_BANTLARI=[['EYLÜL','EKİM','KASIM'],['ARALIK','OCAK','ŞUBAT'],['MART','NİSAN','MAYIS'],['HAZİRAN']];
const haftaMetni=h=>`${h}. Hafta`;
/* Kâğıt/Excel için madde metni: kazanım "12- metin", etkinlik adı olduğu gibi. */
const maddeMetni=m=>m.tur==='k'?`${m.sira}- ${m.metin}`:m.metin;

global.RehberlikCore={AY_NO,DONEMLER,DONEM_ADI,PLAN_BANTLARI,egitimYili,yilBaslangici,ayAdi,duzeyOf,haftaBasi,planTarihi,onerilenTarih,gunEkle,tarihTR,gecerliTarih,iso,bugun,
 kazanimlar,kazanimBul,bosDurum,durumTemizle,durumBirlestir,durumAyni,durumAnahtari,isaretle,tarihYaz,etkinlikAdiYaz,maddeDuzenle,maddeEkle,maddeSil,raporYaz,rapor,
 tabanMaddeler,planOlustur,maddeler,ilerleme,gecikmis,mevcut,aylikRapor,donemRaporu,yilSonuRaporu,haftaMetni,maddeMetni};
})(window);
