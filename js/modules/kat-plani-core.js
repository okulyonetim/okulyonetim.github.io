/* Koruk Asistan — Kat Planı / Acil Durum Tahliye Planı · saf veri katmanı
 * Arayüz ve çizim yok: model (kat, sembol, kaçış yolu, "şu an buradasınız"), geometri, kontrol listesi, lejant ve sayfa düzeni.
 * Koordinatlar altlığın (kat projesi görüntüsü) piksel düzlemindedir; altlık yoksa BOS boyutlu boş tuval kullanılır.
 * Kullananlar: kat-plani-cizim.js (çizim/çıktı), kat-plani.js (editör).
 */
(function(global){
'use strict';
if(global.KatPlaniCore)return;

const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const num=(v,d)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const str=(v,m)=>String(v??'').trim().slice(0,m);
const r1=n=>Math.round(n*10)/10;
const r2=n=>Math.round(n*100)/100;
const BOY=v=>r2(clamp(num(v,1),.4,4));          /* tek sembolün/yazının boyut çarpanı (katın genel boyutuna ek) */
const yeniId=p=>p+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-3);

/* Altlıksız katın tuval boyutu (yatay A3 oranı) */
const BOS={w:2400,h:1700};
/* Güvenlik işaretleri ISO 7010 renkleridir; temaya göre değişmez. */
const RENK={kirmizi:'#d32f2f',yesil:'#1b8a3a',sari:'#ffd400',mavi:'#1d5fb8',mor:'#7b3fb0',yol:'#12a150',koyu:'#1f2933',gri:'#6b7280'};

/* Sembol kataloğu (palet bu gruplarla açılır). Renk ve şekil ISO 7010 gibidir: yangın kırmızı · tahliye/ilk yardım/güvenli alan yeşil · uyarı sarı üçgen (siyah işaret) · tesis ve erişim mavi.
   sekil: kare (renkli rozet) · ucgen (sarı üçgen) · beyaz (beyaz fayans, siyah işaret) · ham (kendi çizimi) · yazi (oda adı).
   onerilen: kat planında bulunması beklenen (kontrol listesinde uyarı verir, engellemez). lejant:false: kendi yazısı olan öğe (oda adı) lejanta girmez.
   don: döndürme adımı (derece); yoksa döndürülmez. Çizimi kat-plani-cizim.js içindeki IC tablosunda aynı kimlikle durur. */
const GRUPLAR=[{id:'tahliye',ad:'Tahliye'},{id:'yangin',ad:'Yangın'},{id:'saglik',ad:'İlk yardım'},{id:'uyari',ad:'Uyarı'},{id:'tesis',ad:'Tesis'},
  {id:'ekipman',ad:'Ekipman'},{id:'erisim',ad:'Erişim'},{id:'toplanma',ad:'Toplanma'},{id:'plan',ad:'Plan'},{id:'yazi',ad:'Yazı'}];
const sb=(id,ad,kisa,grup,renk,o)=>({id,ad,kisa,grup,renk,sekil:renk===RENK.sari?'ucgen':'kare',onerilen:false,lejant:true,don:0,...o});
const SEMBOLLER=[
  /* tahliye ve yönlendirme */
  sb('kosan','Acil çıkış','Acil çıkış','tahliye',RENK.yesil),
  sb('acil_kapi','Acil çıkış kapısı','Acil çıkış kapısı','tahliye',RENK.yesil),
  sb('cikis','Acil çıkış kapısı (ok)','Acil çıkış yönü','tahliye',RENK.yesil,{don:90}),
  sb('yon','Kaçış yönü oku','Kaçış yönü','tahliye',RENK.yesil,{don:45}),
  sb('merdiven_cikis','Merdiven (çıkış)','Merdiven (çıkış)','tahliye',RENK.yesil),
  sb('merdiven_inis','Merdiven (iniş)','Merdiven (iniş)','tahliye',RENK.yesil),
  sb('engelli_tahliye','Engelli tahliye yolu','Engelli tahliye yolu','tahliye',RENK.yesil),
  /* yangın güvenliği */
  sb('sondurucu','Yangın söndürücü','Yangın söndürücü','yangin',RENK.kirmizi,{onerilen:true}),
  sb('yangin_dolabi','Yangın dolabı','Yangın dolabı','yangin',RENK.kirmizi),
  sb('hortum','Yangın hortumu','Yangın hortumu','yangin',RENK.kirmizi),
  sb('hidrant','Yangın hidrantı','Yangın hidrantı','yangin',RENK.kirmizi),
  sb('alarm','Yangın alarm butonu','Alarm butonu','yangin',RENK.kirmizi,{onerilen:true}),
  sb('siren','Yangın alarmı (siren)','Alarm sireni','yangin',RENK.kirmizi),
  sb('ihbar','Yangın ihbar paneli','İhbar paneli','yangin',RENK.kirmizi),
  sb('yangin_merdiveni','Yangın merdiveni','Yangın merdiveni','yangin',RENK.kirmizi),
  sb('battaniye','Yangın battaniyesi','Yangın battaniyesi','yangin',RENK.kirmizi),
  sb('balta','Yangın baltası','Yangın baltası','yangin',RENK.kirmizi),
  sb('kova','Yangın kovası','Yangın kovası','yangin',RENK.kirmizi),
  sb('sprinkler','Yangın sprinkleri','Yangın sprinkleri','yangin',RENK.kirmizi),
  sb('yangin_telefonu','Yangın telefonu','Yangın telefonu','yangin',RENK.kirmizi),
  sb('yangin_kapisi','Yangın kapısı','Yangın kapısı','yangin',RENK.kirmizi),
  /* ilk yardım ve sağlık */
  sb('ilkyardim','İlk yardım dolabı','İlk yardım dolabı','saglik',RENK.yesil,{onerilen:true}),
  sb('ilkyardim_noktasi','İlk yardım noktası','İlk yardım noktası','saglik',RENK.yesil),
  sb('revir','Revir (sağlık odası)','Revir','saglik',RENK.yesil),
  sb('sedye','Sedye','Sedye','saglik',RENK.yesil),
  sb('aed','Defibrilatör (AED)','Defibrilatör','saglik',RENK.yesil),
  sb('acil_dus','Acil duş','Acil duş','saglik',RENK.yesil),
  sb('goz_dusu','Göz duşu','Göz duşu','saglik',RENK.yesil),
  sb('saglik_personeli','Sağlık personeli','Sağlık personeli','saglik',RENK.yesil),
  sb('ilkyardim_malzeme','İlk yardım malzemeleri','İlk yardım malzemesi','saglik',RENK.yesil),
  /* tehlike ve uyarı */
  sb('pano','Elektrik panosu','Elektrik panosu','uyari',RENK.sari,{onerilen:true}),
  sb('genel_tehlike','Genel tehlike','Genel tehlike','uyari',RENK.sari),
  sb('yanici','Yanıcı madde','Yanıcı madde','uyari',RENK.sari),
  sb('patlayici','Patlayıcı madde','Patlayıcı madde','uyari',RENK.sari),
  sb('zehirli','Zehirli madde','Zehirli madde','uyari',RENK.sari),
  sb('biyolojik','Biyolojik tehlike','Biyolojik tehlike','uyari',RENK.sari),
  sb('radyasyon','Radyasyon tehlikesi','Radyasyon','uyari',RENK.sari),
  sb('kaygan','Kaygan zemin','Kaygan zemin','uyari',RENK.sari),
  sb('makine','Hareketli makine aksamı','Makine aksamı','uyari',RENK.sari),
  sb('dusme','Düşme riski','Düşme riski','uyari',RENK.sari),
  sb('yuksek_sicaklik','Yüksek sıcaklık','Yüksek sıcaklık','uyari',RENK.sari),
  sb('dusuk_sicaklik','Düşük sıcaklık','Düşük sıcaklık','uyari',RENK.sari),
  sb('kimyasal','Kimyasal / laboratuvar','Laboratuvar','uyari',RENK.sari),
  /* yapı ve tesis */
  sb('asansor','Asansör','Asansör','tesis',RENK.mavi),
  sb('asansor_yasak','Asansör kullanılmaz','Asansör kullanılmaz','tesis',RENK.kirmizi),
  sb('wc','Tuvalet (WC)','WC','tesis',RENK.mavi),
  sb('su','Su deposu','Su deposu','tesis',RENK.mavi),
  sb('su_vanasi','Su vanası','Su vanası','tesis',RENK.mavi),
  sb('dogalgaz','Doğalgaz vanası','Doğalgaz vanası','tesis',RENK.sari),
  sb('salter','Ana elektrik şalteri','Ana şalter','tesis',RENK.sari),
  sb('kazan','Kazan dairesi','Kazan dairesi','tesis',RENK.sari),
  sb('jenerator','Jeneratör','Jeneratör','tesis',RENK.sari),
  sb('teknik_oda','Teknik oda','Teknik oda','tesis',RENK.mavi),
  sb('havalandirma','Havalandırma','Havalandırma','tesis',RENK.mavi),
  sb('cop','Atık / çöp konteyneri','Çöp konteyneri','tesis',RENK.mavi),
  /* acil durum ekipmanları */
  sb('anons','Yangın anons sistemi','Anons sistemi','ekipman',RENK.kirmizi),
  sb('aydinlatma','Acil aydınlatma','Acil aydınlatma','ekipman',RENK.kirmizi),
  sb('duman','Duman dedektörü','Duman dedektörü','ekipman',RENK.kirmizi),
  sb('isi_dedektoru','Isı dedektörü','Isı dedektörü','ekipman',RENK.kirmizi),
  sb('alev_dedektoru','Alev dedektörü','Alev dedektörü','ekipman',RENK.kirmizi),
  sb('acil_telefon','Acil durum telefonu','Acil durum telefonu','ekipman',RENK.kirmizi),
  sb('kum_unitesi','Kum ünitesi','Kum ünitesi','ekipman',RENK.kirmizi),
  sb('acil_canta','Acil durum çantası','Acil durum çantası','ekipman',RENK.kirmizi),
  sb('acil_dugme','Acil durum düğmesi','Acil durum düğmesi','ekipman',RENK.kirmizi),
  /* erişilebilirlik */
  sb('engelli','Engelli erişimi','Engelli erişimi','erisim',RENK.mavi),
  sb('rampa','Engelli rampası','Engelli rampası','erisim',RENK.mavi),
  sb('engelli_wc','Engelli tuvaleti','Engelli tuvaleti','erisim',RENK.mavi),
  sb('gorme_engelli','Görme engelli yüzey','Görme engelli yüzey','erisim',RENK.mavi),
  sb('isitme_engelli','İşitme engelli','İşitme engelli','erisim',RENK.mavi),
  sb('engelli_asansor','Engelli asansörü','Engelli asansörü','erisim',RENK.mavi),
  /* toplanma ve güvenli alanlar */
  sb('toplanma','Acil toplanma alanı','Toplanma alanı','toplanma',RENK.yesil),
  sb('guvenli_alan','Güvenli alan','Güvenli alan','toplanma',RENK.yesil),
  sb('dis_toplanma','Dış mekân toplanma alanı','Dış toplanma alanı','toplanma',RENK.yesil),
  sb('ic_toplanma','İç mekân toplanma alanı','İç toplanma alanı','toplanma',RENK.yesil),
  sb('siginak','Sığınma alanı','Sığınma alanı','toplanma',RENK.yesil),
  /* plan sembolleri */
  sb('merdiven','Merdiven','Merdiven','plan',RENK.mavi),
  sb('kat_gecisi','Kat geçişi','Kat geçişi','plan',RENK.mavi),
  sb('kapi','Kapı','Kapı','plan',RENK.koyu,{sekil:'beyaz'}),
  sb('kapi_acilis','Kapı açılış yönü','Kapı açılış yönü','plan',RENK.koyu,{sekil:'beyaz',don:90}),
  sb('sutun','Sütun','Sütun','plan',RENK.koyu,{sekil:'ham'}),
  sb('tahliye_noktasi','Tahliye noktası','Tahliye noktası','plan',RENK.yesil,{sekil:'ham'}),
  sb('yangin_noktasi','Yangın noktası','Yangın noktası','plan',RENK.kirmizi,{sekil:'ham'}),
  sb('onemli_nokta','Önemli nokta','Önemli nokta','plan',RENK.koyu,{sekil:'ham'}),
  /* yazı */
  sb('etiket','Oda adı / yazı','Oda adı','yazi',RENK.koyu,{sekil:'yazi',lejant:false})
];
/* Çizgi ve alan türleri ("Yol / alan" aracı). cizgi: duz · kesik · cift (pencere) · tarali / alan (kapalı şekil: üçgen çokgen, iki dokunuşta dikdörtgen).
   ok: yön okları (güzergâhlar). kalin: kalınlık çarpanı. Güzergâhlar ve sınır halkalı beyaz zarfla okunur. */
const YOL_GRUPLARI=[{id:'guzergah',ad:'Güzergâh'},{id:'alan',ad:'Alan'},{id:'plan',ad:'Plan çizgisi'}];
const yt=(id,ad,kisa,grup,renk,o)=>({id,ad,kisa,grup,renk,cizgi:'duz',ok:false,kapali:false,kalin:1,...o});
const YOL_TURLERI=[
  yt('temel','Tahliye yönü (temel)','Kaçış yolu (temel)','guzergah',RENK.yol,{ok:true}),
  yt('alternatif','Tahliye yönü (alternatif)','Kaçış yolu (alternatif)','guzergah',RENK.yol,{ok:true,cizgi:'kesik'}),
  yt('yangin_ekibi','Yangın ekibi güzergâhı','Yangın ekibi güzergâhı','guzergah',RENK.kirmizi,{ok:true,cizgi:'kesik'}),
  yt('engelli','Engelli tahliye güzergâhı','Engelli güzergâhı','guzergah',RENK.mavi,{ok:true,cizgi:'kesik'}),
  yt('ilkyardim_ekibi','İlk yardım ekibi güzergâhı','İlk yardım güzergâhı','guzergah',RENK.mor,{ok:true,cizgi:'kesik'}),
  yt('bolge','Yangın bölgesi (sınır)','Yangın bölgesi sınırı','guzergah',RENK.kirmizi,{kalin:1.5}),
  yt('tehlikeli','Tehlikeli alan','Tehlikeli alan','alan',RENK.kirmizi,{cizgi:'tarali',kapali:true}),
  yt('guvenli','Güvenli alan','Güvenli alan','alan',RENK.yesil,{cizgi:'alan',kapali:true}),
  yt('kapali','Kapalı alan (girilmez)','Kapalı alan','alan',RENK.kirmizi,{cizgi:'alan',kapali:true}),
  yt('duvar','Duvar','Duvar','plan','#2b2f36',{kalin:.7}),
  yt('bolme','Bölme duvar','Bölme duvar','plan','#2b2f36',{cizgi:'kesik',kalin:.45}),
  yt('pencere','Pencere','Pencere','plan','#2f7fc1',{cizgi:'cift',kalin:.8})
];
const YOL_ID=new Set(YOL_TURLERI.map(t=>t.id));
const yolStil=id=>YOL_TURLERI.find(t=>t.id===id)||YOL_TURLERI[0];
/* Alan iki noktayla verilmişse dikdörtgenin dört köşesi; aksi halde noktalar olduğu gibi */
const kapaliNoktalar=p=>p.length===2?[[p[0][0],p[0][1]],[p[1][0],p[0][1]],[p[1][0],p[1][1]],[p[0][0],p[1][1]]]:p;

const SEMBOL_ID=new Set(SEMBOLLER.map(s=>s.id));
const sembol=id=>SEMBOLLER.find(s=>s.id===id)||null;

/* Oda adı / etiket önerileri (yazı kutusunda öneri listesi olarak çıkar; istenen her ad yazılabilir) */
const ODA_ADLARI=['Müdür Odası','Müdür Yardımcısı Odası','Öğretmenler Odası','Rehberlik Servisi','Kazan Dairesi','Pano Odası','Jeneratör Odası','Depo','Arşiv','Kantin','Yemekhane','Kütüphane','Spor Salonu','Çok Amaçlı Salon','Fen Laboratuvarı','Bilişim Sınıfı','Anasınıfı','Revir','Sığınak','Hizmetli Odası','Nöbetçi Öğretmen','Ana Giriş','Bahçe Kapısı','Mescit','Tuvalet'];
/* Hızlı kat adları ve doğal sıralama (bodrum < zemin < 1. kat …) */
const KAT_ADLARI=['Bodrum Kat','Zemin Kat','1. Kat','2. Kat','3. Kat','4. Kat','Çatı Katı'];
function katSira(ad){
  const s=String(ad||'').toLocaleLowerCase('tr');
  if(/bodrum/.test(s)){const m=s.match(/(\d+)/);return m?-Number(m[1]):-1}
  if(/zemin/.test(s))return 0;
  if(/çatı|cati/.test(s))return 90;
  const m=s.match(/(\d+)/);
  return m?Number(m[1]):50;
}

/* ───────── model ───────── */
function normalizeOge(o){
  if(!o||typeof o!=='object'||!SEMBOL_ID.has(o.tur))return null;
  return{id:str(o.id,40)||yeniId('o'),tur:o.tur,x:r1(num(o.x,0)),y:r1(num(o.y,0)),aci:((Math.round(num(o.aci,0))%360)+360)%360,not:str(o.not,60),boy:BOY(o.boy)};
}
/* Bellekte noktalar [[x,y],…]; Firestore iç içe dizi kabul etmediği için kayıtta düz dizi p:[x0,y0,x1,y1,…] kullanılır. */
function ciftlere(p){const o=[];if(Array.isArray(p))for(let i=0;i+1<p.length;i+=2)o.push([p[i],p[i+1]]);return o}
function normalizeYol(y){
  const ham=Array.isArray(y?.noktalar)?y.noktalar:ciftlere(y?.p);
  const pts=ham.map(p=>Array.isArray(p)&&p.length>=2?[r1(num(p[0],NaN)),r1(num(p[1],NaN))]:null).filter(p=>p&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
  if(pts.length<2)return null;
  return{id:str(y.id,40)||yeniId('y'),tur:YOL_ID.has(y.tur)?y.tur:'temel',noktalar:pts.slice(0,200),boy:BOY(y.boy)};
}
function normalizeBur(b){
  if(!b||typeof b!=='object')return null;
  const x=num(b.x,NaN),y=num(b.y,NaN);
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  return{id:str(b.id,40)||yeniId('b'),x:r1(x),y:r1(y),ad:str(b.ad,40),boy:BOY(b.boy)};
}
function normalizeKat(x){
  x=x&&typeof x==='object'?x:{};
  const w=Math.round(clamp(num(x.w,BOS.w),200,6000)),h=Math.round(clamp(num(x.h,BOS.h),200,6000));
  const ad=str(x.ad,40)||'Kat';
  return{
    id:str(x.id,60)||yeniId('kat'),ad,sira:Number.isFinite(Number(x.sira))?Number(x.sira):katSira(ad),
    w,h,olcek:str(x.olcek,16),sembolBoyut:clamp(num(x.sembolBoyut,1),.5,2.5),
    ogeler:(Array.isArray(x.ogeler)?x.ogeler:[]).map(normalizeOge).filter(Boolean).slice(0,400),
    yollar:(Array.isArray(x.yollar)?x.yollar:[]).map(normalizeYol).filter(Boolean).slice(0,60),
    buradasiniz:(Array.isArray(x.buradasiniz)?x.buradasiniz:[]).map(normalizeBur).filter(Boolean).slice(0,20),
    guncellendi:str(x.guncellendi,40)
  };
}
function yeniKat(ad,sira){const a=str(ad,40)||'Kat';return normalizeKat({ad:a,sira:Number.isFinite(Number(sira))?Number(sira):katSira(a)})}
function normalizeAyar(a){
  a=a&&typeof a==='object'?a:{};
  return{baslik:str(a.baslik,60)||'ACİL DURUM TAHLİYE PLANI',okulAdi:str(a.okulAdi,90),onayAd:str(a.onayAd,60),onayUnvan:str(a.onayUnvan,40)||'Okul Müdürü',onayTarih:str(a.onayTarih,10)};
}
/* Firestore doküman kimlikleri: kat belgesi küçük kalır, altlık görüntüsü ayrı belgededir. */
const altlikId=katId=>katId+'__altlik';
/* Kayda giden kat belgesi (altlık görüntüsü hariç). */
function katBelgesi(k){const n=normalizeKat(k);return{...n,yollar:n.yollar.map(y=>({id:y.id,tur:y.tur,boy:y.boy,p:y.noktalar.flat()})),tur:'kat'}}

/* ───────── geometri ───────── */
const sembolPx=k=>Math.max(k.w,k.h)*.026*(k.sembolBoyut||1);
/* Çizginin kalınlığı: genel boyut × türün kalınlığı × kendi çarpanı */
const yolKalinlik=(k,y)=>sembolPx(k)*.26*(y?(yolStil(y.tur).kalin||1)*(y.boy||1):1);
/* Tek öğenin boyutu: katın genel boyutu × kendi çarpanı. Oda adında yazı yüksekliği boyutun yarısıdır. */
const ogeBoyut=(k,o)=>sembolPx(k)*(o.boy||1);
const etiketMetni=o=>o.not||'Oda adı';
/* Öğenin yarı genişlik/yükseklik kutusu. olcu(metin,punto): gerçek yazı ölçüsü (tuvalden); yoksa kaba tahmin. */
function ogeYari(k,o,olcu){
  const s=ogeBoyut(k,o);
  if(o.tur!=='etiket')return{hw:s/2,hh:s/2,s};
  const fs=s*.5,m=(olcu||((t,f)=>t.length*f*.6))(etiketMetni(o),fs);
  return{hw:(m+fs*.9)/2,hh:fs*.8,s};
}
const uzaklik=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
function noktaSegMesafe(px,py,ax,ay,bx,by){
  const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;
  if(!l2)return uzaklik(px,py,ax,ay);
  const t=clamp(((px-ax)*dx+(py-ay)*dy)/l2,0,1);
  return uzaklik(px,py,ax+t*dx,ay+t*dy);
}
function yolUzunluk(pts){let t=0;for(let i=1;i<pts.length;i++)t+=uzaklik(pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1]);return t}
/* Kaçış yolu üzerinde yön okları: her doğru parçasında aralık kadar bir ok (kısa parçalarda yok) + yolun ucunda son ok.
   aci: radyan (0 = sağa). */
function okNoktalari(pts,aralik){
  const out=[];
  if(!Array.isArray(pts)||pts.length<2||!(aralik>0))return out;
  for(let i=1;i<pts.length;i++){
    const ax=pts[i-1][0],ay=pts[i-1][1],bx=pts[i][0],by=pts[i][1],L=uzaklik(ax,ay,bx,by);
    if(L<aralik*.5)continue;
    const n=Math.max(1,Math.round(L/aralik)),a=Math.atan2(by-ay,bx-ax);
    for(let j=0;j<n;j++){const t=(j+.5)/n;out.push({x:ax+(bx-ax)*t,y:ay+(by-ay)*t,aci:a,uc:false})}
  }
  const p=pts[pts.length-2],q=pts[pts.length-1];
  out.push({x:q[0],y:q[1],aci:Math.atan2(q[1]-p[1],q[0]-p[0]),uc:true});
  return out;
}
function noktaIcinde(px,py,p){
  let ic=false;
  for(let i=0,j=p.length-1;i<p.length;j=i++){
    if((p[i][1]>py)!==(p[j][1]>py)&&px<(p[j][0]-p[i][0])*(py-p[i][1])/(p[j][1]-p[i][1])+p[i][0])ic=!ic;
  }
  return ic;
}
/* Dokunulan nesneyi bul: önce "buradasınız", sonra semboller, yol köşeleri, yol doğruları. tol: model birimi; olcu: ogeYari'ye */
function isabet(k,x,y,tol,olcu){
  const sp=sembolPx(k),t=Math.max(tol||0,sp*.15);
  for(let i=k.buradasiniz.length-1;i>=0;i--){const b=k.buradasiniz[i];if(uzaklik(x,y,b.x,b.y)<=Math.max(t,sp*(b.boy||1)*.7))return{t:'bur',i}}
  for(let i=k.ogeler.length-1;i>=0;i--){
    const o=k.ogeler[i],a=ogeYari(k,o,olcu);
    if(o.tur==='etiket'?(Math.abs(x-o.x)<=Math.max(t,a.hw)&&Math.abs(y-o.y)<=Math.max(t,a.hh)):uzaklik(x,y,o.x,o.y)<=Math.max(t,a.s*.62))return{t:'oge',i};
  }
  for(let yi=k.yollar.length-1;yi>=0;yi--){const p=k.yollar[yi].noktalar;for(let ni=0;ni<p.length;ni++)if(uzaklik(x,y,p[ni][0],p[ni][1])<=Math.max(t,sp*.4))return{t:'nokta',yi,ni}}
  const seg=(a,b,tl)=>noktaSegMesafe(x,y,a[0],a[1],b[0],b[1])<=tl;
  for(let yi=k.yollar.length-1;yi>=0;yi--){
    const yl=k.yollar[yi],p=yl.noktalar,st=yolStil(yl.tur),tl=Math.max(t,yolKalinlik(k,yl)*.9);
    if(st.kapali&&p.length===2){const r=kapaliNoktalar(p);for(let i=0;i<4;i++)if(seg(r[i],r[(i+1)%4],tl))return{t:'yol',yi,ni:0,ic:true};continue}   /* iki noktalı dikdörtgen: köşe eklenemez */
    for(let ni=1;ni<p.length;ni++)if(seg(p[ni-1],p[ni],tl))return{t:'yol',yi,ni};
    if(st.kapali&&p.length>2&&seg(p[p.length-1],p[0],tl))return{t:'yol',yi,ni:p.length};                                      /* kapanış kenarı */
  }
  /* alanın içi: en düşük öncelik, yani üstündeki semboller ve çizgiler önce seçilir */
  for(let yi=k.yollar.length-1;yi>=0;yi--){const yl=k.yollar[yi];if(yolStil(yl.tur).kapali&&noktaIcinde(x,y,kapaliNoktalar(yl.noktalar)))return{t:'yol',yi,ni:0,ic:true}}
  return null;
}

/* ───────── sayım, kontrol listesi, lejant ───────── */
function sayim(k){const m={};SEMBOLLER.forEach(s=>{m[s.id]=0});k.ogeler.forEach(o=>{m[o.tur]=(m[o.tur]||0)+1});return m}
/* Kılavuz kontrolü: uyarı verir, engellemez. opt.altlik: katın projesi yüklü mü */
function kontrol(k,opt){
  const m=sayim(k),L=[];
  L.push({id:'altlik',ok:!!opt?.altlik,ad:'Kat projesi (altlık) yüklü'});
  L.push({id:'yol',ok:k.yollar.some(y=>y.tur==='temel'||y.tur==='alternatif'),ad:'Yeşil kaçış yolu çizildi'});
  L.push({id:'buradasiniz',ok:k.buradasiniz.length>0,ad:'"Şu an buradasınız" noktası konuldu'});
  SEMBOLLER.filter(s=>s.onerilen).forEach(s=>L.push({id:s.id,ok:m[s.id]>0,ad:s.kisa+' işaretlendi'}));
  return L;
}
/* Lejant: önce "şu an buradasınız", sonra kullanılan çizgi/alan türleri, sonra kullanılan semboller (katalog sırasıyla).
   Yol türlerinin kimliği 'yol:<tur>'. */
function lejant(k){
  const m=sayim(k),L=[];
  if(k.buradasiniz.length)L.push({id:'buradasiniz',ad:'Şu an buradasınız',renk:RENK.kirmizi});
  YOL_TURLERI.filter(t=>k.yollar.some(y=>y.tur===t.id)).forEach(t=>L.push({id:'yol:'+t.id,ad:t.kisa,renk:t.renk}));
  SEMBOLLER.filter(s=>s.lejant&&m[s.id]>0).forEach(s=>L.push({id:s.id,ad:s.kisa,renk:s.renk}));
  return L;
}
/* Çıktı sayfaları: her "şu an buradasınız" noktası bir sayfa; hiç yoksa noktasız tek sayfa (-1). */
const sayfalar=k=>k.buradasiniz.length?k.buradasiniz.map((_,i)=>i):[-1];

/* ───────── sayfa düzeni (mm) ─────────
 * Kenar boşluğu her sayfada üst/alt/yan 10 mm; çizim yalnız kalan içerik kutusuna yapılır.
 * A3 yatay 420×297, A4 yatay 297×210. */
const SAYFA_KENAR=10;
function sayfaDuzen(boyut){
  const a4=boyut==='A4',pw=a4?297:420,ph=a4?210:297,m=SAYFA_KENAR,w=pw-2*m,h=ph-2*m;
  const ust=a4?14:18,alt=a4?34:42,onayW=a4?64:84,bosluk=a4?3:4;
  return{boyut:a4?'A4':'A3',pw,ph,m,w,h,ust,alt,onayW,bosluk,
    plan:{x:0,y:ust+bosluk,w,h:h-ust-alt-2*bosluk},
    lejant:{x:0,y:h-alt,w:w-onayW-bosluk,h:alt},
    onay:{x:w-onayW,y:h-alt,w:onayW,h:alt}};
}
function fitRect(w,h,r){const s=Math.min(r.w/w,r.h/h);return{s,x:r.x+(r.w-w*s)/2,y:r.y+(r.h-h*s)/2,w:w*s,h:h*s}}

global.KatPlaniCore={BOS,RENK,GRUPLAR,SEMBOLLER,sembol,YOL_GRUPLARI,YOL_TURLERI,yolStil,kapaliNoktalar,noktaIcinde,KAT_ADLARI,ODA_ADLARI,katSira,SAYFA_KENAR,
  normalizeKat,normalizeOge,normalizeYol,normalizeBur,normalizeAyar,yeniKat,yeniId,altlikId,katBelgesi,
  sembolPx,yolKalinlik,ogeBoyut,ogeYari,etiketMetni,uzaklik,noktaSegMesafe,yolUzunluk,okNoktalari,isabet,
  sayim,kontrol,lejant,sayfalar,sayfaDuzen,fitRect};
if(typeof module!=='undefined'&&module.exports)module.exports=global.KatPlaniCore;
})(typeof window!=='undefined'?window:globalThis);
