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
let firebaseSdkKurtarmaPromise = null;
window.db = null;
window.auth = null;
window.messaging = null;
window.storage = null;
window.firebaseHazir = false;

const FIREBASE_COMPAT_SURUM = '10.12.2';
const FIREBASE_COMPAT_SCRIPTLERI = [
  `https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_SURUM}/firebase-app-compat.js`,
  `https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_SURUM}/firebase-firestore-compat.js`,
  `https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_SURUM}/firebase-auth-compat.js`,
  `https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_SURUM}/firebase-messaging-compat.js`
];

function yapilandirmaEksikMi(){ return firebaseConfig.apiKey === "BURAYA_API_KEY"; }
function firebaseSdkSaglikliMi(){
  const fb = window.firebase;
  return !!fb && typeof fb.initializeApp === 'function' && Array.isArray(fb.apps) &&
    typeof fb.firestore === 'function' && typeof fb.auth === 'function' && !!fb.SDK_VERSION;
}
function firebaseScriptYukle(src){
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=src;
    s.async=false;
    s.dataset.korukFirebaseRecovery='1';
    s.onload=()=>resolve(src);
    s.onerror=()=>reject(new Error('firebase-sdk-load:'+src));
    document.head.appendChild(s);
  });
}
function firebaseUyariGoster(){
  document.documentElement.classList.add('ka-auth-resolved');
  const warning=document.getElementById('configWarning');
  if(warning){warning.classList.remove('ka-hidden');warning.hidden=false;warning.classList.add('active');}
}
async function firebaseSdkKurtar(){
  if(firebaseSdkSaglikliMi()) return true;
  if(firebaseSdkKurtarmaPromise) return firebaseSdkKurtarmaPromise;
  document.documentElement.classList.add('ka-auth-resolved');
  firebaseSdkKurtarmaPromise=(async()=>{
    const token=`koruk-${Date.now()}`;
    try{
      try{delete window.firebase;}catch(_){window.firebase=undefined;}
      if(window.firebase) window.firebase=undefined;
      for(const src of FIREBASE_COMPAT_SCRIPTLERI) await firebaseScriptYukle(`${src}?v=${encodeURIComponent(token)}`);
      if(!firebaseSdkSaglikliMi()) throw new Error('firebase-sdk-runtime-sagliksiz');
      console.info('[Firebase] Compat SDK runtime temiz olarak yeniden yüklendi.',window.firebase.SDK_VERSION);
      return true;
    }catch(e){
      console.error('[Firebase SDK recovery]',e);
      firebaseUyariGoster();
      return false;
    }
  })();
  return firebaseSdkKurtarmaPromise;
}

function firebaseStorageHazirla(){
  if(storage) return storage;
  const fb=window.firebase;
  if(!fb || typeof fb.storage !== 'function') throw new Error('firebase-storage-sdk-yok');
  storage = fb.storage();
  window.storage = storage;
  return storage;
}
window.firebaseStorageHazirla = firebaseStorageHazirla;

function firebaseyiBaslatTemel(){
  if(firebaseHazir && db && auth) return true;
  const fb=window.firebase;
  if(!firebaseSdkSaglikliMi()) return false;
  try{
    if(!fb.apps.length) fb.initializeApp(firebaseConfig);
    db = fb.firestore();
    db.settings({ experimentalAutoDetectLongPolling: true, merge: true });
    auth = fb.auth();
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
      if(fb.messaging?.isSupported?.()) messaging = fb.messaging();
      window.messaging = messaging;
    }catch(e){ console.warn('Bu tarayıcı push bildirimlerini desteklemiyor.', e); }
    window.dispatchEvent(new CustomEvent('koruk:firebase-ready'));
    return true;
  }catch(e){
    console.error(e);
    firebaseUyariGoster();
    return false;
  }
}

function firebaseAuthDinleyicisiniKurtarmaSonrasiBaslat(deneme=0){
  if(typeof authDinleyiciKur === 'function'){
    authDinleyiciKur();
    return;
  }
  if(deneme<80) setTimeout(()=>firebaseAuthDinleyicisiniKurtarmaSonrasiBaslat(deneme+1),50);
  else firebaseUyariGoster();
}

function firebaseyiBaslat(){
  if(yapilandirmaEksikMi()){
    firebaseUyariGoster();
    return false;
  }
  if(firebaseSdkSaglikliMi()) return firebaseyiBaslatTemel();

  /*
     Bazı mobil Chromium/Kiwi oturumlarında global firebase nesnesi var olduğu halde
     compat App runtime eksik kalabiliyor (SDK_VERSION/firestore kayıp). AppLoader'ı
     kilitlemeden giriş yüzeyini aç; SDK'ları cache-bust ile temiz sırada yeniden yükle.
     AppLoader bu ilk çağrıyı tamamlanmış sayar; gerçek auth listener kurtarma bitince kurulur.
  */
  document.documentElement.classList.add('ka-auth-resolved');
  firebaseSdkKurtar().then(ok=>{
    if(!ok) return;
    if(firebaseyiBaslatTemel()) firebaseAuthDinleyicisiniKurtarmaSonrasiBaslat();
  });
  return true;
}
