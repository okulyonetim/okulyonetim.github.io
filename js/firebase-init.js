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
  ogretmenListeSablon:'oy_ogretmenListeSablon', ogretmenListeKayit:'oy_ogretmenListeKayit', toplantiCizelgesi:'oy_toplantiCizelgesi', idariBilgiler:'oy_idariBilgiler'
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

function baglantiUyarisiGoster(mesaj){
  const uyari = document.getElementById('configWarning');
  if(uyari){
    uyari.classList.remove('ka-hidden');
    uyari.classList.add('active');
    const govde = uyari.querySelector('.ka-card__body p');
    if(govde && mesaj) govde.textContent = mesaj;
  }
}

function firebaseyiBaslat(){
  if(yapilandirmaEksikMi()){
    baglantiUyarisiGoster();
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
    const agSorunuMu = typeof e?.message === 'string' && /firebase is not defined/i.test(e.message);
    baglantiUyarisiGoster(agSorunuMu
      ? 'Sunucu bağlantı dosyaları (Firebase) yüklenemedi. İnternet bağlantınızı, güvenlik duvarı/reklam engelleyici ayarlarınızı kontrol edip sayfayı yenileyin.'
      : 'Firebase başlatılamadı. Yapılandırma ve bağlantı bilgileri kontrol edilmelidir.');
    return false;
  }
}

/* Profil güvenliği ve giriş konumu özelliği auth oturumundan bağımsız yüklenir;
   servis kendi içinde AppStore/DeviceData hazır olana kadar bekler. */
(function loginSecurityFeatureLoad(){
  if(document.querySelector('script[data-login-security-feature]'))return;
  const script=document.createElement('script');
  script.src='js/core/login-security.js?v=885';
  script.async=false;
  script.dataset.loginSecurityFeature='';
  document.head.appendChild(script);
})();

/* Nöbet raporu, sabit eski sütunlar yerine güncel nöbet yerleriyle üretilir. */
(function dutyReportLivePlacesFeatureLoad(){
  if(document.querySelector('script[data-duty-report-live-places]'))return;
  const script=document.createElement('script');
  script.src='js/core/duty-report-live-places.js?v=913';
  script.async=false;
  script.dataset.dutyReportLivePlaces='';
  document.head.appendChild(script);
})();

/* Nöbet Programı ve bağlı servis çizelgeleri, Ayarlar > Tatil Modu içindeki planlı tatilleri de
   resmi tatil kaynağının yanında ortak tatil kaynağı olarak kullanır. */
(function dutyHolidayModeSourceFeatureLoad(){
  if(document.querySelector('script[data-duty-holiday-mode-source]'))return;
  const script=document.createElement('script');
  script.src='js/core/duty-holiday-mode-source.js?v=930';
  script.async=false;
  script.dataset.dutyHolidayModeSource='';
  document.head.appendChild(script);
})();

/* Ders programında gecikmiş uzak snapshot'ın yeni eklenen/güncellenen yerel
   dersleri görünümden düşürmesini engelleyen küçük veri bütünlüğü katmanı. */
(function scheduleDataIntegrityFeatureLoad(){
  if(document.querySelector('script[data-schedule-data-integrity]'))return;
  const script=document.createElement('script');
  script.src='js/core/schedule-data-integrity.js?v=917';
  script.async=false;
  script.dataset.scheduleDataIntegrity='';
  document.head.appendChild(script);
})();

/* Ders programı raporları: toner dostu yeni tasarım, ikili kesilebilir programlar,
   yatay çarşaflar ve öğretmen imza/onay alanı. */
(function scheduleReportRedesignFeatureLoad(){
  if(document.querySelector('script[data-schedule-report-redesign]'))return;
  const script=document.createElement('script');
  script.src='js/core/schedule-report-redesign.js?v=920';
  script.async=false;
  script.dataset.scheduleReportRedesign='';
  document.head.appendChild(script);
})();

/* Ders programı çıktılarında merkezi rapor motorunun satır zebrasını bastırıp
   yalnız Pazartesi-Cuma gün sütunları arasında çok açık zebra uygula. */
(function scheduleReportColumnZebraFeatureLoad(){
  if(document.querySelector('script[data-schedule-report-column-zebra]'))return;
  const script=document.createElement('script');
  script.src='js/core/schedule-report-column-zebra.js?v=922';
  script.async=false;
  script.dataset.scheduleReportColumnZebra='';
  document.head.appendChild(script);
})();

/* Ana sayfa duyuruları: kaydırılabilir görsel galeri, tam ekran zoom ve
   göz ikonuna bağlı okuyanlar popover'ı. */
(function dashboardAnnouncementMediaFeatureLoad(){
  if(document.querySelector('script[data-dashboard-announcement-media]'))return;
  const script=document.createElement('script');
  script.src='js/core/dashboard-announcement-media.js?v=921';
  script.async=false;
  script.dataset.dashboardAnnouncementMedia='';
  document.head.appendChild(script);
})();

/* Öğrenci sınav sonuçlarını OMR ders ayrıntıları, LGS puanı ve sıralamayla zenginleştirir. */
(function studentExamResultDetailsFeatureLoad(){
  if(document.querySelector('script[data-student-exam-result-details]'))return;
  const script=document.createElement('script');
  script.src='js/core/student-exam-result-details.js?v=925';
  script.async=false;
  script.dataset.studentExamResultDetails='';
  document.head.appendChild(script);
})();