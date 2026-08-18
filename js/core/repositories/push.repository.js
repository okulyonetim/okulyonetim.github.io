/* ================================================================
   js/core/repositories/push.repository.js
   PUSH BİLDİRİM MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI (cihazlar)

   Bu dosyada SADECE db.collection() / set() çağrıları bulunur. Hiçbir
   iş kuralı, hiçbir yetki kontrolü, hiçbir DOM işlemi burada yapılmaz
   (bkz. Pragmatik-Mimari-Tasarimi.md §2). Üstündeki katman:
   js/core/services/push.service.js

   Not: "cihazlar" (push token kaydı + bildirim kategori tercihi)
   kişisel/cihaza özgü bir veridir, içerik yönetimi değildir — bu yüzden
   yetki kontrolü gerektirmez. js/haberler.js buradaki
   kategorileriGuncelle() fonksiyonunu çağırır (TEK erişim noktası burası).
   ================================================================ */

const PushRepository = {
  /* İlk kayıt: token'ı ve cihaz bilgisini yazar (tam üzerine yazma). */
  cihazKaydet(token, veri){
    return db.collection(COL.cihazlar).doc(encodeURIComponent(token)).set(veri);
  },
  /* Bildirim kategori tercihini ve saat aralığını mevcut belgeyle birleştirerek günceller.
     UID de merge edilir; belge silinmişse sessiz senkron yeni kaydı sahipsiz bırakmaz. */
  kategorileriGuncelle(token, kategoriler, saatAralik, uid){
    const veri = { kategoriler };
    if(uid) veri.uid = uid;
    if(saatAralik && saatAralik.baslangic && saatAralik.bitis){
      veri.bildirimSaatBaslangic = saatAralik.baslangic;
      veri.bildirimSaatBitis = saatAralik.bitis;
    }
    return db.collection(COL.cihazlar).doc(encodeURIComponent(token)).set(veri, { merge: true });
  }
};
