/* ================================================================
   js/core/repositories/notlar.repository.js
   NOTLAR MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI (notlar)

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / update() /
   delete() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü,
   hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/notlar.service.js

   Kişisel görünürlük artık sorgu seviyesinde de uygulanır:
   - admin tüm notları dinler,
   - normal kullanıcı yalnız kendi sahipUid değerine sahip notları dinler.
   Böylece istemci filtresiyle aynı davranış korunurken başka kullanıcıların
   notları gereksiz yere indirilmez ve Firestore sahiplik kurallarıyla uyum sağlanır.
   ================================================================ */

const NotlarRepository = {
  notlariDinle(callback, hataCb){
    let ref = db.collection(COL.notlar);
    const aktifKullanici = (typeof AKTIF_KULLANICI !== 'undefined') ? AKTIF_KULLANICI : null;
    const adminMi = !!(aktifKullanici && aktifKullanici.admin === true);

    // Normal kullanıcı yalnız kendi kayıtlarını sorgular. Giriş/bootstrap anında
    // aktif kullanıcı henüz yoksa boş sonuç döndürmek yerine dinleyici kurmayız;
    // notlarBaglantilariKur() auth sonrasında çağrıldığı için normal akış değişmez.
    if(!adminMi){
      if(!aktifKullanici || !aktifKullanici.uid){
        callback([]);
        return () => {};
      }
      ref = ref.where('sahipUid', '==', aktifKullanici.uid);
    }

    return ref.onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  notEkle(veri){ return db.collection(COL.notlar).add({ ...veri, eklenmeTarihi: new Date().toISOString(), guncellenmeTarihi: new Date().toISOString() }); },
  // DÜZELTME: guncellenmeTarihi damgası eklendi — yedekten geri yükleme
  // artık bu notun backup'tan SONRA düzenlenip düzenlenmediğini bu alana
  // bakarak anlıyor (bkz. app.js yedektenGeriYukle). Bu damga olmadan,
  // eski bir yedeği geri yüklemek yeni yapılmış düzenlemeleri sessizce
  // eziyordu.
  notGuncelle(id, veri){ return db.collection(COL.notlar).doc(id).update({ ...veri, guncellenmeTarihi: new Date().toISOString() }); },
  notSil(id){ return db.collection(COL.notlar).doc(id).delete(); },
  /* Grid'den hızlı todo-toggle için: sadece maddeler alanını günceller. */
  notMaddeleriGuncelle(id, maddeler){ return db.collection(COL.notlar).doc(id).update({ maddeler, guncellenmeTarihi: new Date().toISOString() }); }
};
