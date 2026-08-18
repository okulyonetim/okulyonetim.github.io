/* ====================================================================
   PUSH BİLDİRİM İZNİ VE CİHAZ KAYDI — UI KATMANI

   Katmanlı mimari: bkz. docs/Pragmatik-Mimari-Tasarimi.md §2
     UI (bu dosya)          → PushService çağrısı, db bilmez
     js/core/services/push.service.js    → (yetki gerekmez, bkz. dosya notu)
     js/core/repositories/push.repository.js → TEK Firestore erişim noktası
   ==================================================================== */

function isNative(){
  try {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform());
  } catch(e){ return false; }
}

/* ---------- Diğer modüllerin (örn. haberler.js) erişebilmesi için cihaz token'ı ---------- */
let _cihazTokenGlobal = null;
function cihazTokenGetir(){ return _cihazTokenGlobal; }

/* Web push ve PWA cache aynı service worker kaydını kullanır.
   Ayrı firebase-messaging-sw.js kaydı aynı scope'ta ana PWA worker'ını
   değiştirebildiği için artık kullanılmıyor. */
async function _anaServiceWorkerKaydiGetir(){
  if(!('serviceWorker' in navigator)) throw new Error('Service Worker desteklenmiyor');
  return navigator.serviceWorker.register('./service-worker.js');
}

/* Lokalde saklanan kategori tercihlerini token kaydıyla birlikte Firestore'a yaz */
async function _cihazKategoriTercihleriSenkronla(token){
  if(!token || !db) return;
  try{
    const ham = localStorage.getItem('haberKategoriTercihleri');
    const kategoriler = ham ? JSON.parse(ham) : null;
    if(kategoriler) await PushService.kategorileriGuncelle(token, kategoriler);
  }catch(e){ console.warn('Kategori tercihi senkronize edilemedi:', e.message); }
}

/* Sayfa açılışında, izin zaten verilmişse token'ı sessizce al (yeniden izin istemeden) */
async function _webPushTokenSessizceAl(){
  try{
    if(isNative() || !messaging) return;
    if(!('Notification' in window) || Notification.permission !== 'granted') return;
    const kayit = await _anaServiceWorkerKaydiGetir();
    const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: kayit });
    if(token){ _cihazTokenGlobal = token; await _cihazKategoriTercihleriSenkronla(token); }
  }catch(e){ console.warn('Sessiz token alma başarısız:', e.message); }
}
document.addEventListener('DOMContentLoaded', ()=> setTimeout(_webPushTokenSessizceAl, 1500));

async function _getNativePush(){
  if(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications){
    return window.Capacitor.Plugins.PushNotifications;
  }
  if(typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.PushNotifications){
    return Capacitor.Plugins.PushNotifications;
  }
  throw new Error('PushNotifications plugin bulunamadı');
}

function pushDurumGuncelle(){
  const dot   = document.getElementById('pushDot');
  const metin = document.getElementById('pushMetin');
  if(!metin) return;

  if(isNative()){
    metin.textContent = 'Kontrol ediliyor...';
    setTimeout(()=> _nativePushDurumKontrol(dot, metin), 2000);
    return;
  }

  if(!('Notification' in window)){
    metin.textContent = 'Bu tarayıcı bildirimleri desteklemiyor.';
    return;
  }
  if(Notification.permission === 'granted'){
    if(dot) dot.classList.add('on');
    metin.textContent = 'Bildirimler açık.';
  } else if(Notification.permission === 'denied'){
    if(dot) dot.classList.remove('on');
    metin.textContent = 'Bildirimler engellendi.';
  } else {
    if(dot) dot.classList.remove('on');
    metin.textContent = 'Bildirimler henüz açılmadı.';
  }
}

async function _nativePushDurumKontrol(dot, metin){
  try {
    const PushNotifications = await _getNativePush();
    const perm = await PushNotifications.checkPermissions();
    if(perm.receive === 'granted'){
      if(dot) dot.classList.add('on');
      metin.textContent = 'Bildirimler açık.';
    } else {
      if(dot) dot.classList.remove('on');
      metin.textContent = 'Bildirimler henüz açılmadı.';
    }
  } catch(e){
    metin.textContent = 'Bildirim durumu alınamadı.';
    console.warn('Push durum:', e.message);
  }
}

async function bildirimleriAc(){
  if(isNative()){
    await _nativeBildirimleriAc();
    return;
  }
  if(!messaging){ toast('Bu ortam push bildirimleri desteklemiyor.'); return; }
  try{
    const izin = await Notification.requestPermission();
    if(izin !== 'granted'){ toast('Bildirim izni verilmedi.'); pushDurumGuncelle(); return; }
    const kayit = await _anaServiceWorkerKaydiGetir();
    const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: kayit });
    if(!token){ toast('Token alınamadı.'); return; }
    _cihazTokenGlobal = token;
    await PushService.cihazKaydet(token, {
      token, eklenmeTarihi: new Date().toISOString(), tarayici: navigator.userAgent,
      uid: (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null
    });
    await _cihazKategoriTercihleriSenkronla(token);
    toast('Bildirimler açıldı.');
    pushDurumGuncelle();
  }catch(err){
    toast('Hata: '+err.message);
  }
}

let _nativePushDinleyicileriKuruldu = false;

async function _nativePushDinleyicileriniKur(PushNotifications){
  if(_nativePushDinleyicileriKuruldu) return;

  try{
    await PushNotifications.addListener('registration', async (tokenObj) => {
      const token = tokenObj.value;
      try {
        _cihazTokenGlobal = token;
        await PushService.cihazKaydet(token, {
          token, eklenmeTarihi: new Date().toISOString(), tarayici: 'Android-Native',
          uid: (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null
        });
        await _cihazKategoriTercihleriSenkronla(token);
        toast('Bildirimler açıldı, cihaz kaydedildi.');
        pushDurumGuncelle();
      } catch(e){
        toast('Token kaydedilemedi: ' + e.message);
      }
    });

    await PushNotifications.addListener('registrationError', (err) => {
      toast('Kayıt hatası: ' + JSON.stringify(err));
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      toast((notification.title||'Bildirim') + ': ' + (notification.body||''));
    });

    _nativePushDinleyicileriKuruldu = true;
  }catch(e){
    _nativePushDinleyicileriKuruldu = false;
    throw e;
  }
}

async function _nativeBildirimleriAc(){
  try{
    const PushNotifications = await _getNativePush();

    let perm = await PushNotifications.checkPermissions();
    if(perm.receive === 'prompt'){
      perm = await PushNotifications.requestPermissions();
    }
    if(perm.receive !== 'granted'){
      toast('Bildirim izni verilmedi.');
      return;
    }

    await _nativePushDinleyicileriniKur(PushNotifications);
    await PushNotifications.register();
  } catch(e){
    console.error('Native bildirim hatası:', e);
    toast('Native bildirim hatası: ' + e.message);
  }
}

let _webOnMessageDinleyicisiKuruldu = false;
function pushOnMessageDinleyiciKur(){
  if(isNative() || !messaging || _webOnMessageDinleyicisiKuruldu) return;
  _webOnMessageDinleyicisiKuruldu = true;
  messaging.onMessage(payload=>{
    const b = payload.notification || {};
    const d = payload.data || {};
    toast((b.title || d.baslik || 'Bildirim') + ': ' + (b.body || d.icerik || ''));
  });
}
