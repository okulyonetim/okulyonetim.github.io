/* Koruk Asistan — Sosyal Kulüpler çekirdeği (saf mantık, DOM'suz)
 * · Kulüp kaydı (oy_sosyalKulupler) ↔ hazır kulüp kataloğu (data/kulup/katalog.json) eşleşmesi.
 * · Evrak alanları: okul/danışman/müdür/yıl uygulamadan, üyeler öğrenci kaydındaki kulupId'den; öğretmenin elle yazdıkları durumda.
 * · Durum (cihazlar arası birleşir; her alan kendi zaman damgasıyla): k = { anahtar: { v: değer, t: ms } }, kulüp ve eğitim yılı başına.
 * Word çıktısı: kulup-dosya.js · Ekran: kulup.js · Katalog: scripts/kulup-katalog.mjs → data/kulup/{id}.json
 */
(function(global){
'use strict';
if(global.KulupCore)return;

const NOKTA='……………………………';
const AYLAR=['EYLÜL','EKİM','KASIM','ARALIK','OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN'];
const DONEM_AYLARI={1:AYLAR.slice(0,5),2:AYLAR.slice(5)};
const norm=s=>String(s||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
const buyuk=s=>String(s||'').replace(/\s+/g,' ').trim().toLocaleUpperCase('tr');
const baslikHarfi=s=>String(s||'').charAt(0).toLocaleUpperCase('tr')+String(s||'').slice(1).toLocaleLowerCase('tr');
const egitimYili=(d=new Date())=>{const y=d.getFullYear();return d.getMonth()+1>=9?`${y}-${y+1}`:`${y-1}-${y}`};
const donemOf=(d=new Date())=>{const a=d.getMonth()+1;return a>=9||a===1?1:2};

/* ── evrak listesi (evrakburada sırası) ── katalog: true → kulübün hazır evrak paketi (data/kulup/{id}.json) gerekir; diğerleri her kulüp için hazırlanır. */
const BELGELER=Object.freeze([
 {k:'tuzuk',ad:'İç Tüzük',katalog:true,aciklama:'Dayanak, amaç, organlar, görev ve sorumluluklar, belgeler.'},
 {k:'plan',ad:'Yıllık Çalışma Planı',katalog:true,aciklama:'Tema ve alt hedef kodları, hafta hafta amaç ve etkinlikler, belirli gün ve haftalar.'},
 {k:'toplum',ad:'Toplum Hizmeti Çalışma Planı',katalog:true,aciklama:'Ay ay amaç ve toplum hizmeti etkinlikleri.'},
 {k:'tutanak',ad:'Toplantı Tutanağı',katalog:false,aciklama:'Toplantı daveti, gündem, tutanak ve karar tutanağı (3 sayfa).'},
 {k:'uyeler',ad:'Üye Öğrenci Listesi',katalog:false,aciklama:'Kulübe kayıtlı öğrenciler sınıfa göre sıralı; görevleri yazılır.'},
 {k:'aylik',ad:'Aylık Faaliyet Raporları',katalog:true,aciklama:'Her ay için hafta hafta faaliyet özeti ve hazırlanan ürünler. Bütün aylar tek dosyada ya da ay ay.'},
 {k:'donem',ad:'Dönem Sonu Faaliyet Raporu',katalog:true,aciklama:'Dönemin ay ay çalışmaları; katılım, sonuç, kazanımlar ve öneriler.'},
 {k:'yil',ad:'Yıl Sonu Faaliyet Raporu',katalog:true,aciklama:'Eylül–Haziran çalışmaları; katılım, sonuç, genel değerlendirme ve öneriler.'},
 {k:'denetleme',ad:'Denetleme Kurulu Raporu',katalog:false,aciklama:'İncelenen hususlar, sonuç ve denetleme kurulu imzaları.'}
].map(Object.freeze));

/* ── kulüp adı ──
 * "Siberay" → "Siberay Kulübü"; yönelme: "Siberay Kulübüne" (aylık rapor "…Kulübüne ait"). */
function kulupAdi(ad){
 const a=String(ad||'').replace(/\s+/g,' ').trim();
 if(!a)return'';
 return/kul[uü]b[uü]$/i.test(a)?a:`${a} Kulübü`;
}
const kulupYonelme=ad=>{const a=kulupAdi(ad);return a?a.replace(/(Kul[uü]b[uü])$/i,'$1ne'):'……… Kulübüne'};
const okulYonelme=mudurluk=>String(mudurluk||'').replace(/MÜDÜRLÜĞÜ$/,'MÜDÜRLÜĞÜNE');

/* ── katalog eşleşmesi ──
 * Kayıt adı kataloğun anahtarlarından birini sözcük olarak içeriyorsa eşleşir ("Siberay Kulübü", "Siber Ay" → siberay değil; yalnız tam sözcük).
 * eslesme: { [kulupKaydiId]: katalogId } öğretmenin elle yaptığı eşleme (öncelikli). */
function katalogBul(kulup,katalog,eslesme={}){
 const liste=Array.isArray(katalog?.kulupler)?katalog.kulupler:[];
 const el=eslesme?.[kulup?.id];if(el){const k=liste.find(x=>x.id===el);if(k)return k}
 const ad=` ${norm(String(kulup?.ad||kulup?.kulupAdi||'').replace(/kul[uü]b[uü]?/gi,' '))} `;
 return liste.find(k=>[k.id,...(k.anahtar||[])].some(a=>a&&ad.includes(` ${norm(a)} `)))||null;
}

/* ── danışman / yetki ── */
const kulupOgretmenIdleri=k=>Array.isArray(k?.ogretmenIdler)?k.ogretmenIdler.filter(Boolean).map(String):[k?.ogretmenId,k?.danismanOgretmenId].filter(Boolean).map(String);
const kulupBenim=(k,ogretmenId)=>!!ogretmenId&&kulupOgretmenIdleri(k).includes(String(ogretmenId));

/* ── üyeler ──
 * veliler = öğrenci kayıtları ({id, ogrenciAdi, sinifId, kulupId, ogrenciNo}); siniflar = [{id, ad}]. Sınıf adına (5/A, 6/B…) sonra ada göre sıralı. */
const sinifSirasi=ad=>{const m=/^\s*(\d{1,2})\s*[./\-\s]*\s*([A-Za-zÇĞİÖŞÜçğıöşü]*)/.exec(String(ad||''));return m?[Number(m[1]),m[2].toLocaleUpperCase('tr')]:[99,String(ad||'')]};
function uyeler(kulupId,veliler,siniflar,durum){
 const sinif=new Map((siniflar||[]).map(s=>[String(s.id),String(s.ad||s.sinifAdi||'')]));
 return(veliler||[]).filter(v=>String(v.kulupId||'')===String(kulupId)&&String(v.ogrenciAdi||v.adSoyad||'').trim()).map(v=>{
  const id=String(v.id||''),ad=String(v.ogrenciAdi||v.adSoyad||'').trim().replace(/\s+/g,' ');
  return{id,ad,sinif:sinif.get(String(v.sinifId))||'',no:String(v.ogrenciNo||v.no||'').trim(),gorev:deger(durum,`gorev:${id}`)};
 }).sort((a,b)=>{const x=sinifSirasi(a.sinif),y=sinifSirasi(b.sinif);return x[0]-y[0]||x[1].localeCompare(y[1],'tr')||a.ad.localeCompare(b.ad,'tr')});
}
/* Başkan ve sekreter: üyeler arasında görevi "Başkan" / "Sekreter" içerenin adı (alan elle yazıldıysa o). */
function gorevAdi(liste,aranan,durum,anahtar){
 const elle=deger(durum,anahtar);if(elle)return elle;
 const u=liste.find(x=>norm(x.gorev).split(' ').some(w=>w.startsWith(aranan))&&!/yardimci/.test(norm(x.gorev)));
 return u?u.ad:'';
}

/* ── durum ── */
const bosDurum=()=>({k:{}});
function durumTemizle(x){
 const d=bosDurum();if(!x||typeof x!=='object'||!x.k||typeof x.k!=='object')return d;
 for(const [a,e] of Object.entries(x.k)){if(a&&e&&typeof e==='object'&&Number.isFinite(Number(e.t)))d.k[a]={v:String(e.v??''),t:Number(e.t)}}
 return d;
}
function durumBirlestir(a,b){
 const x=durumTemizle(a),y=durumTemizle(b),s=bosDurum();
 for(const k of new Set([...Object.keys(x.k),...Object.keys(y.k)])){const p=x.k[k],q=y.k[k];s.k[k]=!p?q:!q?p:(q.t>p.t?q:p)}
 return s;
}
const sirali=d=>JSON.stringify(Object.keys(d.k).sort().map(k=>[k,d.k[k].v,d.k[k].t]));
const durumAyni=(a,b)=>sirali(durumTemizle(a))===sirali(durumTemizle(b));
const deger=(d,anahtar)=>String(d?.k?.[anahtar]?.v??'').trim();
function ayarla(d,anahtar,v,t=Date.now()){d.k[anahtar]={v:String(v??'').slice(0,4000),t};return d}
const durumAnahtari=(kulupId,yil)=>`kulup_${String(kulupId||'').replace(/[^A-Za-z0-9]+/g,'_')}_${String(yil||'').replace(/[^0-9]+/g,'_')}`;

/* ── tarih ── */
const gunAy=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||''));return m?`${m[3]}.${m[2]}.${m[1]}`:String(s||'').trim()};
const planTarihi=yil=>`…/09/${String(yil||'').split('-')[0]||'……'}`;

/* ── evrak alanları ── */
/* b = { okul, il, ilce, mudur, yil, danismanlar:[adlar], kulup:{ad}, uyeler, durum, okulAdi } */
function ortakDegerler(b,O){
 const yil=String(b.yil||''),durum=b.durum,liste=b.uyeler||[];
 const d=O.degerler({okul:b.okul,il:b.il,ilce:b.ilce,mudur:b.mudur,yil});
 const ad=kulupAdi(b.kulup?.ad||b.kulup?.kulupAdi),danisman=(b.danismanlar||[]).map(x=>O.imzaAd(x)).filter(Boolean).join(' / ');
 return{
  ...d,
  KULUP_AD:ad||'……… Kulübü',KULUP_BUYUK:buyuk(ad)||'……………… KULÜBÜ',KULUP_YONELME:kulupYonelme(ad),
  OKUL_ADI:String(b.okul||'').trim()||NOKTA,OKUL_MUDURLUGU_YONELME:okulYonelme(d.OKUL_MUDURLUGU),
  DANISMAN:danisman||NOKTA,
  BASKAN:gorevAdi(liste,'baskan',durum,'baskan')||NOKTA,SEKRETER:gorevAdi(liste,'sekreter',durum,'sekreter')||NOKTA,
  UYE_SAYISI:liste.length?String(liste.length):NOKTA,
  PLAN_TARIHI:planTarihi(yil)
 };
}

/* ── üye listesi: en az 25 satır (boş satırlar sıra numaralıdır) ── */
function uyeSatirlari(liste,enAz=25){
 const n=Math.max(enAz,liste.length),s=[];
 for(let i=0;i<n;i++){const u=liste[i];s.push({tur:'UYE',SIRA:String(i+1),SINIF:u?.sinif||'',AD:u?.ad||'',GOREV:u?.gorev||''})}
 return s;
}
/* ── yıllık plan: ayın ilk haftası PLA (ay adı yazılır), diğerleri PLB (birleşik ay hücresi) ── */
function planSatirlari(paket){
 const s=[];let onceki='';
 for(const r of paket?.yillikPlan?.satirlar||[]){
  const tur=r.ay===onceki?'PLB':'PLA';onceki=r.ay;
  s.push({tur,AY:r.ay,HAFTA:r.hafta,TARIH:r.tarih,HEDEF:r.hedef,AMAC:r.amac,FAAL:(r.faaliyetler||[]).join('\n'),GUN:r.belirliGun});
 }
 return s;
}
const toplumSatirlari=paket=>(paket?.toplumHizmeti||[]).map(r=>({tur:'TOP',AY:r.donem,AMAC:r.amac,KONU:r.konu}));
/* ── dönem / yıl sonu: ay özetleri + öğretmenin yazdığı katılım ve sonuç ── */
function islerSatirlari(aylar,durum,onEk){
 return(aylar||[]).map(a=>({tur:'ISL',AY:a.ay,CALISMA:a.calisma,KATILIM:deger(durum,`${onEk}katilim:${a.ay}`),SONUC:deger(durum,`${onEk}sonuc:${a.ay}`)}));
}
/* ── aylık rapor: seçilen aylar, her biri kendi bölümü ── */
function aylikBolumleri(paket,aylar,ortak){
 const secilen=(paket?.aylikRaporlar||[]).filter(r=>!aylar||!aylar.length||aylar.includes(r.ay));
 return secilen.map(r=>({
  ay:r.ay,
  v:{...ortak,AY_BUYUK:r.ay,AY_KUCUK:baslikHarfi(r.ay),RAPOR_NO:String(r.no)},
  satirlar:r.satirlar.map(x=>({tur:'FAA',TARIH:x.tarih,OZET:x.ozet,URUN:x.urun,GUN:x.belirliGun}))
 }));
}
/* ── varsayılan metinler (kataloğun hazır değerlendirmesi; öğretmen düzenleyince durum öncelikli). onEk: 'd1' | 'd2' (dönem sonu) | 'y' (yıl sonu) ── */
function degerlendirme(paket,onEk,durum){
 const k=onEk==='y'?paket?.yilSonu:paket?.donemSonu;
 const al=(alan,hazir)=>deger(durum,`${onEk}${alan}`)||hazir||'';
 return{GENEL:al('genel',k?.b),GUCLUK:al('gucluk',k?.c),ONERI:al('oneri',k?.d)};
}

global.KulupCore={NOKTA,AYLAR,BELGELER,DONEM_AYLARI,norm,buyuk,baslikHarfi,egitimYili,donemOf,kulupAdi,kulupYonelme,okulYonelme,katalogBul,kulupOgretmenIdleri,kulupBenim,
 uyeler,gorevAdi,bosDurum,durumTemizle,durumBirlestir,durumAyni,deger,ayarla,durumAnahtari,gunAy,planTarihi,ortakDegerler,uyeSatirlari,planSatirlari,toplumSatirlari,islerSatirlari,aylikBolumleri,degerlendirme};
})(window);
