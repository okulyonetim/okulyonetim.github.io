/**
 * KonumGirisService
 * Kullanıcı girişinde konumu alır ve oy_girisKonumlari koleksiyonuna kaydeder.
 * Hava durumu modülü konum aldıysa window.sonKonum üzerinden kullanır;
 * almadıysa bir kez daha getCurrentPosition dener. Her iki durumda da
 * hata olursa sessizce geçer — giriş akışı hiçbir zaman engellenmez.
 */
const KonumGirisService = (() => {

  const KOLEKSIYON = 'oy_girisKonumlari';

  function _platform() {
    try {
      if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        return 'android';
      }
    } catch (e) {}
    return 'web';
  }

  function _kaydetFirestore(lat, lng) {
    if (!db || !AKTIF_KULLANICI) return;
    const kayit = {
      uid:         AKTIF_KULLANICI.uid        || '',
      email:       AKTIF_KULLANICI.email      || '',
      displayName: AKTIF_KULLANICI.ad         || AKTIF_KULLANICI.displayName || '',
      lat:         lat,
      lng:         lng,
      platform:    _platform(),
      timestamp:   firebase.firestore.FieldValue.serverTimestamp()
    };
    db.collection(KOLEKSIYON).add(kayit).catch(err => {
      console.warn('[KonumGiris] Firestore yazma hatası:', err.message);
    });
  }

  function kaydet() {
    // Hava durumu modülü zaten konum aldıysa onu kullan
    if (window.sonKonum && window.sonKonum.lat) {
      _kaydetFirestore(window.sonKonum.lat, window.sonKonum.lng);
      return;
    }
    // Yoksa bir kez daha iste (izin daha önce verilmişse pop-up çıkmaz)
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        window.sonKonum = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        _kaydetFirestore(pos.coords.latitude, pos.coords.longitude);
      },
      err => {
        console.warn('[KonumGiris] Konum alınamadı:', err.message);
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  }

  return { kaydet };
})();
