/* Koruk Asistan — Sosyal Kulüpler çekirdeği (saf mantık, DOM'suz)
 * · Kulüp kaydı (oy_sosyalKulupler) ↔ hazır kulüp kataloğu (data/kulup/katalog.json) eşleşmesi.
 * · Evrak alanları: okul/danışman/müdür/yıl uygulamadan, üyeler öğrenci kaydındaki kulupId'den; öğretmenin elle yazdıkları durumda.
 * · Durum (cihazlar arası birleşir; her alan kendi zaman damgasıyla): k = { anahtar: { v: değer, t: ms } }, kulüp ve eğitim yılı başına.
 * Word çıktısı: kulup-dosya.js · Ekran: kulup.js · Katalog: scripts/kulup-katalog.mjs → data/kulup/{id}.json + assets/kulup/{id}/*.docx
 */
(function(global){
'use strict';
if(global.KulupCore)return;

const NOKTA='……………………………';
const AYLAR=['EYLÜL','EKİM','KASIM','ARALIK','OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN'];
const DONEM_AYLARI={1:AYLAR.slice(0,5),2:AYLAR.slice(5)};
const norm=s=>String(s||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
const buyuk=s=>String(s||'').replace(/\s+/g,' ').trim().toLocaleUpperCase('tr');
/* 'EKİM' → 'Ekim'; iki aylık birleşik rapor etiketi 'EYLÜL-EKİM' → 'Eylül-Ekim' */
const baslikHarfi=s=>String(s||'').toLocaleLowerCase('tr').replace(/(^|-)(\p{L})/gu,(m,a,h)=>a+h.toLocaleUpperCase('tr'));
const egitimYili=(d=new Date())=>{const y=d.getFullYear();return d.getMonth()+1>=9?`${y}-${y+1}`:`${y-1}-${y}`};
const donemOf=(d=new Date())=>{const a=d.getMonth()+1;return a>=9||a===1?1:2};

/* ── evrak listesi (evrakburada sırası) ── katalog: true → kulübün hazır evrak paketi (data/kulup/{id}.json, assets/kulup/{id}/) gerekir; diğerleri her kulüp için hazırlanır. */
const BELGELER=Object.freeze([
 {k:'tuzuk',ad:'İç Tüzük',katalog:true,aciklama:'Kulübün iç tüzüğü: dayanak, amaç, organlar, görev ve sorumluluklar.'},
 {k:'plan',ad:'Yıllık Çalışma Planı',katalog:true,aciklama:'Tema ve hedefler, etkinlikler, belirli gün ve haftalar.'},
 {k:'toplum',ad:'Toplum Hizmeti Çalışma Planı',katalog:true,aciklama:'Toplum hizmeti konuları, etkinlikleri ve katılanlar.'},
 {k:'tutanak',ad:'Toplantı Tutanağı',katalog:false,aciklama:'Toplantı daveti, gündem, tutanak ve karar tutanağı (3 sayfa).'},
 {k:'uyeler',ad:'Üye Öğrenci Listesi',katalog:false,aciklama:'Kulübe kayıtlı öğrenciler sınıfa göre sıralı; görevleri yazılır.'},
 {k:'aylik',ad:'Aylık Faaliyet Raporları',katalog:true,aciklama:'Her ay için hazır faaliyet raporu. Bütün aylar tek dosyada ya da ay ay.'},
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

/* ── yıllık plan: kulübün kademesine göre ──
 * Katalogda kademeye özel plan varsa (paket.planlar = {ortaokul:'yillik-plan-ortaokul.docx'}) ve kulübün sınıfları o kademedeyse o plan, değilse genel plan verilir.
 * Kademe: sınıf düzeylerinin (1–8) hepsi 5–8 → ortaokul, hepsi 1–4 → ilkokul; karışık ya da bilinmiyorsa '' (genel plan). */
const PLAN_GENEL='yillik-plan.docx';
function kulupKademesi(duzeyler){const d=(duzeyler||[]).map(Number).filter(n=>n>=1&&n<=8);if(!d.length)return'';return d.every(n=>n>=5)?'ortaokul':d.every(n=>n<=4)?'ilkokul':''}
function planSecimi(paket,kademe){const dosya=kademe&&paket?.planlar?.[kademe];return dosya?{dosya,kademe}:{dosya:PLAN_GENEL,kademe:''}}

/* ── danışman / yetki ── */
const kulupOgretmenIdleri=k=>Array.isArray(k?.ogretmenIdler)?k.ogretmenIdler.filter(Boolean).map(String):[k?.ogretmenId,k?.danismanOgretmenId].filter(Boolean).map(String);
const kulupBenim=(k,ogretmenId)=>!!ogretmenId&&kulupOgretmenIdleri(k).includes(String(ogretmenId));

/* ── evrak teslim durumu (kulüp kaydındaki kontroller: Yıllık plan, Toplum hizmeti planı, Eki…Haz (9 ay), Yıl sonu raporu — 12 işaret) ──
 * Okul yönetimi işaretler; öğretmen yalnız okur. Gecikme: son tarih geçmiş ya da ay bitmiş ve işaret yok. */
const TAKIP_AYLARI=Object.freeze(['Ekim','Kasım','Aralık','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran']);
const TAKIP_TOPLAM=2+TAKIP_AYLARI.length+1;
const akademikAy=(d=new Date())=>{const m=d.getMonth()+1;if(m>=10)return m-10;if(m<=6)return m+2;return m===9?-1:TAKIP_AYLARI.length};
const gun10=v=>{const t=String(v||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(t)?t:''};
const yerelGun=d=>{const p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`};
function takipDurumu(k,bugun=new Date()){
 const a=Array.isArray(k?.kontroller)?k.kontroller:[],on=i=>a[i]===true,aktif=k?.aktif!==false,gun=yerelGun(bugun),simdi=akademikAy(bugun);
 const plan=(i,ad,alan)=>{const son=gun10(k?.[alan]);return{ad,son,tamam:on(i),gecikti:aktif&&!!son&&son<gun&&!on(i)}};
 const planlar=[plan(0,'Yıllık plan','yillikPlanTarihi'),plan(1,'Toplum hizmeti planı','toplumHizmetiTarihi')];
 const aylar=TAKIP_AYLARI.map((ad,i)=>({ad,tamam:on(i+2),gecikti:aktif&&i<simdi&&!on(i+2),simdi:aktif&&i===simdi}));
 const yilSonu={ad:'Yıl sonu raporu',tamam:on(TAKIP_TOPLAM-1)};
 const tamam=[...planlar,...aylar,yilSonu].filter(x=>x.tamam).length,gecikti=[...planlar,...aylar].filter(x=>x.gecikti).length;
 return{tamam,toplam:TAKIP_TOPLAM,gecikti,planlar,aylar,yilSonu};
}

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
  UYE_SAYISI:liste.length?String(liste.length):NOKTA
 };
}

/* ── üye listesi: en az 25 satır (boş satırlar sıra numaralıdır) ── */
function uyeSatirlari(liste,enAz=25){
 const n=Math.max(enAz,liste.length),s=[];
 for(let i=0;i<n;i++){const u=liste[i];s.push({tur:'UYE',SIRA:String(i+1),SINIF:u?.sinif||'',AD:u?.ad||'',GOREV:u?.gorev||''})}
 return s;
}
/* ── dönem / yıl sonu: ay özetleri + öğretmenin yazdığı katılım ve sonuç ── */
function islerSatirlari(aylar,durum,onEk){
 return(aylar||[]).map(a=>({tur:'ISL',AY:a.ay,CALISMA:a.calisma,KATILIM:deger(durum,`${onEk}katilim:${a.ay}`),SONUC:deger(durum,`${onEk}sonuc:${a.ay}`)}));
}
/* ── aylık raporlar: kulübün kendi Word dosyası, her rapor bir bölüm ──
 * Bölümler kendi aralarında "yalnız sayfa sonu içeren" paragrafla ayrılır (evrakburada ve Word'ün sayfa sonu). Gövde, en dıştaki öğelere ayrılır (tablo içindeki paragraflar bölünmez). */
function ustOgeler(icerik){
 const ogeler=[],bas=/<([A-Za-z0-9:_.-]+)(?=[\s/>])[^>]*?(\/?)>/y;
 let i=0;
 while(i<icerik.length){
  if(icerik[i]!=='<'){const j=icerik.indexOf('<',i),k=j<0?icerik.length:j;ogeler.push(icerik.slice(i,k));i=k;continue}
  bas.lastIndex=i;const m=bas.exec(icerik);
  if(!m){ogeler.push(icerik.slice(i));break}
  let son=bas.lastIndex;
  if(!m[2]){
   const ad=m[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),re=new RegExp(`<${ad}(?=[\\s/>])[^>]*?(/?)>|</${ad}>`,'g');
   re.lastIndex=son;let d=1,x;
   while((x=re.exec(icerik))){if(x[0][1]==='/')d--;else if(x[1]!=='/')d++;if(!d){son=re.lastIndex;break}}
   if(d)throw new Error(`Word belgesinde ${m[1]} etiketi kapanmıyor.`);
  }
  ogeler.push(icerik.slice(i,son));i=son;
 }
 return ogeler;
}
const sayfaSonuMu=o=>/^<w:p[ >]/.test(o)&&/<w:br\b[^>]*w:type="page"/.test(o)&&!/<w:t[ >]/.test(o);
/* → { ayirac: bölümler arası sayfa sonu paragrafı, bolumler: [xml…] } (boş bölümler atılır) */
function bolumle(icerik){
 const bolumler=[[]];let ayirac='';
 for(const o of ustOgeler(icerik)){
  if(sayfaSonuMu(o)){ayirac=ayirac||o;bolumler.push([]);continue}
  bolumler[bolumler.length-1].push(o);
 }
 return{ayirac,bolumler:bolumler.map(b=>b.join('')).filter(b=>/<w:t[ >]/.test(b))};
}
/* word/document.xml → yalnız seçilen bölümler (dizinler 0'dan; boşsa hepsi), sayfa sonuyla ayrılmış. */
function bolumSec(xml,secim){
 const bas=xml.indexOf('<w:body>')+8,son=xml.lastIndexOf('</w:body>');
 if(bas<8||son<0)throw new Error('Word belgesi okunamadı.');
 const govde=xml.slice(bas,son),ks=govde.lastIndexOf('<w:sectPr'),icerik=ks<0?govde:govde.slice(0,ks),sect=ks<0?'':govde.slice(ks);
 const {ayirac,bolumler}=bolumle(icerik),sec=(secim&&secim.length?secim:bolumler.map((_,i)=>i)).filter(i=>bolumler[i]);
 if(!sec.length)throw new Error('Seçilen rapor bulunamadı.');
 return xml.slice(0,bas)+sec.map(i=>bolumler[i]).join(ayirac)+sect+xml.slice(son);
}
/* ── varsayılan metinler (kataloğun hazır değerlendirmesi; dönem sonu metni yoksa yıl sonununki; öğretmen düzenleyince durum öncelikli). onEk: 'd1' | 'd2' (dönem sonu) | 'y' (yıl sonu) ── */
function degerlendirme(paket,onEk,durum){
 const k=onEk==='y'?paket?.yilSonu:(paket?.donemSonu||paket?.yilSonu);
 const al=(alan,hazir)=>deger(durum,`${onEk}${alan}`)||hazir||'';
 return{GENEL:al('genel',k?.b),GUCLUK:al('gucluk',k?.c),ONERI:al('oneri',k?.d)};
}

global.KulupCore={NOKTA,AYLAR,BELGELER,DONEM_AYLARI,norm,buyuk,baslikHarfi,egitimYili,donemOf,kulupAdi,kulupYonelme,okulYonelme,katalogBul,kulupKademesi,planSecimi,kulupOgretmenIdleri,kulupBenim,
 uyeler,gorevAdi,takipDurumu,bosDurum,durumTemizle,durumBirlestir,durumAyni,deger,ayarla,durumAnahtari,gunAy,ortakDegerler,uyeSatirlari,islerSatirlari,bolumle,bolumSec,degerlendirme};
})(window);
