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

/* Geçici tanılama: ana pencerenin gerçek Firebase/Auth/Firestore aşamalarını
   DevTools bağlamından bağımsız olarak giriş kartında ayrı bir satırda gösterir. */
let firebaseTanilamaDinleyiciKuruldu = false;
function firebaseTanilamaSatiri(){
  let el=document.getElementById('kaAuthDiag');
  if(el) return el;
  const hata=document.getElementById('girisHataMetni');
  if(!hata?.parentElement) return null;
  el=document.createElement('p');
  el.id='kaAuthDiag';
  el.className='ka-muted';
  el.style.fontSize='12px';
  el.style.lineHeight='1.35';
  el.style.wordBreak='break-word';
  hata.insertAdjacentElement('afterend',el);
  return el;
}
function firebaseTanilamaYaz(mesaj){const el=firebaseTanilamaSatiri();if(el)el.textContent='Tanı: '+mesaj;}
function firebaseBaslangicTanilamasiGoster(){
  setTimeout(()=>{
    document.documentElement.classList.add('ka-auth-resolved');
    const fb=window.firebase;
    if(!window.firebaseHazir||!window.auth||!window.db){
      firebaseTanilamaYaz(`Firebase HAZIR DEĞİL | SDK=${fb?.SDK_VERSION||'yok'} | Firestore=${typeof fb?.firestore} | Auth=${typeof fb?.auth} | db=${!!window.db}`);
      return;
    }
    firebaseTanilamaYaz(`Firebase ${fb?.SDK_VERSION||'?'} ✓ | Auth ✓ | oturum=${window.auth.currentUser?'var':'yok'}`);
    if(firebaseTanilamaDinleyiciKuruldu)return;
    firebaseTanilamaDinleyiciKuruldu=true;
    window.auth.onAuthStateChanged(async user=>{
      if(!user){firebaseTanilamaYaz(`Firebase ${fb?.SDK_VERSION||'?'} ✓ | Auth ✓ | oturum yok`);return;}
      firebaseTanilamaYaz('Kimlik doğrulandı ✓ | kullanıcı belgesi okunuyor…');
      try{
        const zamanAsimi=new Promise((_,reject)=>setTimeout(()=>{const e=new Error('7 saniye içinde yanıt gelmedi');e.code='diag-timeout';reject(e)},7000));
        const snap=await Promise.race([window.db.collection(window.COL.kullanicilar).doc(user.uid).get({source:'server'}),zamanAsimi]);
        if(!snap.exists){firebaseTanilamaYaz('Kimlik ✓ | oy_kullanicilar belgesi YOK');return;}
        const veri=snap.data()||{};
        firebaseTanilamaYaz(`Kimlik ✓ | kullanıcı belgesi ✓ | aktif=${veri.aktif!==false} | rol=${veri.rolId||'yok'}`);
      }catch(e){
        firebaseTanilamaYaz(`Kimlik ✓ | kullanıcı belgesi HATA: ${e?.code||e?.message||e}`);
      }
    });
  },700);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',firebaseBaslangicTanilamasiGoster,{once:true});
else firebaseBaslangicTanilamasiGoster();
