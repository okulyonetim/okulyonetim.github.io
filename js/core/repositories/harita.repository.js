/* ================================================================
   js/core/repositories/harita.repository.js
   HARİTA MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI (haritaFavoriler)

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / delete()
   çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü, hiçbir DOM
   işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/harita.service.js

   Kişisel veri güvenliği: normal kullanıcı Firestore'dan yalnız kendi
   olusturanUid kayıtlarını sorgular. Admin tüm kayıtları (eski/sahipsiz
   dahil) görmeye devam eder. Böylece Firestore Rules sahiplik kuralıyla
   sorgu davranışı birebir uyumludur.

   Not: Servis güzergahını (mesafe/koordinatlar) servis kaydına yazma
   işlemi COL.servisler'i etkiler — bu koleksiyonun TEK Firestore erişim
   noktası TasimaRepository'dir (bkz. tasima.repository.js), bu yüzden
   burada tekrarlanmadı; HaritaService doğrudan TasimaRepository çağırır.
   ================================================================ */

const HaritaRepository = {
  _favoriSorgusu(){
    let ref = db.collection(COL.haritaFavoriler);
    if(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin !== true){
      ref = ref.where('olusturanUid', '==', AKTIF_KULLANICI.uid);
    }
    return ref;
  },
  favorileriDinle(callback, hataCb){
    return this._favoriSorgusu().orderBy('olusturmaTarihi', 'desc').onSnapshot(
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || (err => console.warn('Favori bağlantı hatası:', err))
    );
  },
  favoriEkle(veri){
    return db.collection(COL.haritaFavoriler).add({ ...veri, olusturmaTarihi: firebase.firestore.FieldValue.serverTimestamp() });
  },
  favoriSil(id){ return db.collection(COL.haritaFavoriler).doc(id).delete(); }
};
