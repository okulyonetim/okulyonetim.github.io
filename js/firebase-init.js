/* ====================================================================
   FIREBASE YAPILANDIRMASI
   Bu bilgileri Firebase Console > Proje Ayarları > Genel sekmesinden,
   "Web uygulaması" eklediğinizde size verilen değerlerle doldurun.
   ==================================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyDJUE-Guw0JD04xXMHPnQURtLXG91H9pCI",
  authDomain: "okul-6e302.firebaseapp.com",
  projectId: "okul-6e302",
  storageBucket: "okul-6e302.firebasestorage.app",
  messagingSenderId: "738103486583",
  appId: "1:738103486583:web:da91129b1a08f2463efe72"
};
const VAPID_KEY = "BATuvupnzSActFxWlfg12dtT-hYMIkND9S_lfA1B-FYHIwJ0aya0HHJ4fRRfifZ5PlKETpRLnnugzOz5zjgi3u4";

const COL = {
  ogretmenler:'oy_ogretmenler', dersProgrami:'oy_dersProgrami', hatirlaticilar:'oy_hatirlaticilar', gorevler:'oy_gorevler', evrak:'oy_evrakTakibi', notlar:'oy_notlar', cihazlar:'oy_cihazTokenleri',
  sosyalKulupler:'oy_sosyalKulupler', belirliGunler:'oy_belirliGunler', zumre:'oy_zumre', sok:'oy_sok', bepPlani:'oy_bepPlani', rehberlik:'oy_rehberlik', maarifRapor:'oy_maarifRapor', digerEvrak:'oy_digerEvrak',
  nobetYerleri:'oy_nobetYerleri', nobetAtamalari:'oy_nobetAtamalari', nobetciAmirleri:'oy_nobetciAmirleri', resmiTatiller:'oy_resmiTatiller', periyodikIsler:'oy_periyodikIsler', dersSaatleri:'oy_dersSaatleri',
  depolamaAyarlari:'oy_depolamaAyarlari', hatirlatmaAyarlari:'oy_hatirlatmaAyarlari', siniflar:'oy_siniflar', veliler:'oy_veliler', servisler:'oy_servisler', periyodikSablon:'oy_periyodikSablon',
  sinavlar:'oy_sinavlar', denemeSinavlari:'oy_denemeSinavlari', okulBilgileri:'oy_okulBilgileri', dersListesi:'oy_dersListesi', bransListesi:'oy_bransListesi', servisOturma:'oy_servisOturma', sinifOturma:'oy_sinifOturma', nobetRotasyon:'oy_nobetRotasyon',
  dokumanlar:'oy_dokumanlar', yoklama:'oy_yoklama', haritaFavoriler:'oy_haritaFavoriler', personel:'oy_personel', odevTakip:'oy_odevTakip', notCizelgesi:'oy_notCizelgesi', dilekceler:'oy_dilekceler',
  personelIzinler:'oy_personelIzinler', ogretmenIzinleri:'oy_ogretmenIzinleri', haberler:'oy_haberler', haberKaynaklari:'oy_haberKaynaklari', kullanicilar:'oy_kullanicilar', roller:'oy_roller', ozelMenu:'oy_ozelMenu', navDuzeni:'oy_navDuzeni',
  konusmalar:'oy_konusmalar', mesajlar:'oy_mesajlar', duyurular:'oy_duyurular', anketler:'oy_anketler', kullaniciIstatistikleri:'oy_kullaniciIstatistikleri', akademikTakvim:'oy_akademikTakvim', kontrolListeleri:'oy_kontrolListeleri',
  kontrolListeTamamlama:'oy_kontrolListeTamamlama', denemeSonuclari:'oy_denemeSonuclari', testSonuclari:'oy_testSonuclari', yillikPlanBasliklari:'oy_yillikPlanBasliklari', yillikPlanTanimlari:'oy_yillikPlanTanimlari',
  ogretmenYillikPlanSecimleri:'oy_ogretmenYillikPlanSecimleri', devamsizlikCizelgesi:'oy_devamsizlikCizelgesi', yillikPlanNotlari:'oy_yillikPlanNotlari',
  ogretmenListeSablon:'oy_ogretmenListeSablon', ogretmenListeKayit:'oy_ogretmenListeKayit'
};

/* V2 uyumluluk API'si: yeni çekirdek aynı gerçek koleksiyon haritasını kullanır. */
window.firebaseConfig = firebaseConfig;
window.VAPID_KEY = VAPID_KEY;
window.COL = COL;

let db = null;
let auth = null;
let messaging = null;
let storage = null;
let firebaseHazir = false;
window.db = null;
window.auth = null;
window.messaging = null;
window.storage = null;
window.firebaseHazir = false;

function yapilandirmaEksikMi(){ return firebaseConfig.apiKey === "BURAYA_API_KEY"; }

function firebaseStorageHazirla(){
  if(storage) return storage;
  if(typeof firebase.storage !== 'function') throw new Error('firebase-storage-sdk-yok');
  storage = firebase.storage();
  window.storage = storage;
  return storage;
}
window.firebaseStorageHazirla = firebaseStorageHazirla;

function firebaseyiBaslat(){
  if(yapilandirmaEksikMi()){
    document.getElementById('configWarning')?.classList.add('active');
    return false;
  }
  try{
    if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    db.settings({ experimentalAutoDetectLongPolling: true, merge: true });
    auth = firebase.auth();
    storage = null;
    firebaseHazir = true;
    window.db = db;
    window.auth = auth;
    window.storage = storage;
    window.firebaseHazir = true;
    db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
      if(err.code === 'failed-precondition') console.warn('Offline destek: birden fazla sekme açık, sadece ilk sekmede etkin.');
      else if(err.code === 'unimplemented') console.warn('Offline destek: bu tarayıcı desteklemiyor.');
      else console.warn('Offline destek etkinleştirilemedi:', err);
    });
    try{
      if(firebase.messaging.isSupported()) messaging = firebase.messaging();
      window.messaging = messaging;
    }catch(e){ console.warn('Bu tarayıcı push bildirimlerini desteklemiyor.', e); }
    window.dispatchEvent(new CustomEvent('koruk:firebase-ready'));
    return true;
  }catch(e){
    console.error(e);
    document.getElementById('configWarning')?.classList.add('active');
    return false;
  }
}

/* Firebase SDK kurtarma: index yükleyicisi bir bileşende takılırsa uygulama başlangıcı sonsuza kadar beklemez. */
const FIREBASE_GEREKLI_SDKLAR = [
  { src:'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', hazir:()=>typeof window.firebase !== 'undefined' },
  { src:'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js', hazir:()=>typeof window.firebase?.firestore === 'function' },
  { src:'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js', hazir:()=>typeof window.firebase?.auth === 'function' }
];
let firebaseSdkKurtarmaPromise = null;
function firebaseSdkDurumYaz(mesaj){
  const el=document.getElementById('girisHataMetni');
  if(el){el.textContent=mesaj||'';el.style.display=mesaj?'':'none';}
}
function firebaseSdkTekYukle(tanim, deneme=1){
  if(tanim.hazir()) return Promise.resolve(true);
  return new Promise((resolve,reject)=>{
    let bitti=false;
    const tamamla=(ok,hata)=>{if(bitti)return;bitti=true;clearTimeout(timer);ok?resolve(true):reject(hata||new Error('firebase-sdk-yuklenemedi'));};
    let script=[...document.scripts].find(s=>String(s.src||'').split('?')[0]===tanim.src);
    if(!script || deneme>1){
      script=document.createElement('script');
      script.src=tanim.src+(deneme>1?`?korukRetry=${Date.now()}-${deneme}`:'');
      script.async=true;
      document.head.appendChild(script);
    }
    script.addEventListener('load',()=>tanim.hazir()?tamamla(true):tamamla(false,new Error('firebase-sdk-servis-yok')),{once:true});
    script.addEventListener('error',()=>tamamla(false,new Error('firebase-sdk-ag-hatasi')),{once:true});
    const timer=setTimeout(()=>tamamla(false,new Error('firebase-sdk-zaman-asimi')),7000);
  }).catch(hata=>{
    if(deneme<3){
      firebaseSdkDurumYaz(`Firebase bileşeni yüklenemedi — tekrar deneniyor (${deneme+1}/3)`);
      return firebaseSdkTekYukle(tanim,deneme+1);
    }
    throw hata;
  });
}
async function firebaseSdkleriniKurtar(){
  if(firebaseSdkKurtarmaPromise) return firebaseSdkKurtarmaPromise;
  firebaseSdkKurtarmaPromise=(async()=>{
    for(const tanim of FIREBASE_GEREKLI_SDKLAR){
      if(tanim.hazir()) continue;
      firebaseSdkDurumYaz('Firebase bağlantısı hazırlanıyor…');
      await firebaseSdkTekYukle(tanim);
    }
    firebaseSdkDurumYaz('');
    window.dispatchEvent(new CustomEvent('koruk:firebase-sdk-recovered'));
    window.AppLoader?.startPlatform?.();
    return true;
  })().catch(hata=>{
    console.error('[Firebase SDK kurtarma]',hata);
    firebaseSdkDurumYaz('Firebase bileşenleri yüklenemedi. 5 saniye sonra tekrar denenecek.');
    setTimeout(()=>{firebaseSdkKurtarmaPromise=null;firebaseSdkleriniKurtar();},5000);
    return false;
  });
  return firebaseSdkKurtarmaPromise;
}
window.firebaseSdkleriniKurtar=firebaseSdkleriniKurtar;
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>firebaseSdkleriniKurtar(),{once:true});
else firebaseSdkleriniKurtar();
