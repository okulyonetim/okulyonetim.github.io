/* ================================================================
   js/core/repositories/takvim.repository.js
   TAKVİM MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI (hatirlaticilar + gorevler)

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / update() /
   delete() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü,
   hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/takvim.service.js

   Not: "hatirlaticilar" ve "gorevler" koleksiyonları hem js/takvim.js
   (Aylık Takvim/Ajanda görünümü) hem de js/app.js'teki genel "Hızlı Ekle"
   butonundan açılan modallar tarafından kullanılıyor — TEK erişim noktası
   burası, her iki UI de bu repository'yi çağırır.

   Kişisel veri güvenliği: normal kullanıcı Firestore'dan yalnız kendi
   sahipUid kayıtlarını sorgular. Admin tüm kayıtları (eski/sahipsiz dahil)
   görmeye devam eder. Böylece Firestore Rules sahiplik kuralıyla sorgu
   davranışı birebir uyumludur.
   ================================================================ */

const TakvimRepository = {

  _kisiselSorgu(koleksiyon){
    let ref = db.collection(koleksiyon);
    if(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin !== true){
      ref = ref.where('sahipUid', '==', AKTIF_KULLANICI.uid);
    }
    return ref;
  },

  /* ---------- Hatırlatıcılar (Etkinlikler) ---------- */
  hatirlaticilariDinle(callback, hataCb){
    return this._kisiselSorgu(COL.hatirlaticilar).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  hatirlaticiEkle(veri){ return db.collection(COL.hatirlaticilar).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  hatirlaticiGuncelle(id, veri){ return db.collection(COL.hatirlaticilar).doc(id).update(veri); },
  hatirlaticiSil(id){ return db.collection(COL.hatirlaticilar).doc(id).delete().catch(()=>{}); },

  /* ---------- Görevler ---------- */
  gorevleriDinle(callback, hataCb){
    return this._kisiselSorgu(COL.gorevler).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  gorevEkle(veri){ return db.collection(COL.gorevler).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  gorevGuncelle(id, veri){ return db.collection(COL.gorevler).doc(id).update(veri); },
  gorevSil(id){ return db.collection(COL.gorevler).doc(id).delete(); }
};
