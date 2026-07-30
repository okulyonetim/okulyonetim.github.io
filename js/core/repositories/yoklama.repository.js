/* ================================================================
   js/core/repositories/yoklama.repository.js
   ÖĞRENCİ YOKLAMA — ham Firestore erişimi (bkz. Pragmatik-Mimari-
   Tasarimi.md §2: Repository → Service → UI).

   Koleksiyon: oy_yoklama, belge ID = '{sinifId}_{YYYY-MM-DD}' (sınıf+gün
   başına TEK belge — mevcut Devamsızlık Çizelgesi'nin ay başına tek
   belge deseniyle aynı mantık, gereksiz belge çoğalmasını önler).

   ÖNEMLİ: kayitlar/mesajGonderildi gibi iç içe (nested) alanlara TEK bir
   öğrencinin durumunu yazarken .update() + noktalı alan yolu kullanılır
   — set(...,{merge:true}) ile aynı işlemin nokta'lı iç içe alanlarda
   güvenilmez olduğu (bkz. depolamaKullanimi hep 0 görünme hatası, Temmuz
   2026) zaten kanıtlandı. Belge yoksa önce set(merge:true) ile temel
   alanlarla oluşturulur, SONRA update() ile asıl alan yazılır.
   ================================================================ */

const YoklamaRepository = {
  _id(sinifId, tarih){ return sinifId + '_' + tarih; },
  _ref(sinifId, tarih){ return db.collection(COL.yoklama).doc(this._id(sinifId, tarih)); },

  async belgeGetir(sinifId, tarih){
    const snap = await this._ref(sinifId, tarih).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },

  /* Canlı dinleme — Yoklama Gir ekranı açıkken başka bir cihazdan
     yapılan işaretlemeler de anlık yansısın diye. */
  dinle(sinifId, tarih, cb, hataCb){
    return this._ref(sinifId, tarih).onSnapshot(
      snap => cb(snap.exists ? { id: snap.id, ...snap.data() } : null),
      hataCb || hataGoster
    );
  },

  async ogrenciDurumYaz(sinifId, tarih, ogrenciId, durum, girenUid, girenAdi){
    const ref = this._ref(sinifId, tarih);
    await ref.set({ sinifId, tarih }, { merge: true }); // belge yoksa oluştur
    await ref.update({
      [`kayitlar.${ogrenciId}`]: durum,
      girenUid, girenAdi,
      guncellenmeTarihi: firebase.firestore.FieldValue.serverTimestamp(),
    });
  },

  async mesajGonderildiIsaretle(sinifId, tarih, ogrenciId){
    const ref = this._ref(sinifId, tarih);
    await ref.set({ sinifId, tarih }, { merge: true });
    await ref.update({ [`mesajGonderildi.${ogrenciId}`]: true });
  },

  /* Bugünün (ya da verilen tek bir günün) TÜM sınıflardaki yoklama
     belgelerini getirir — "Bugünün Devamsızları" ekranı için. Belge ID
     '{sinifId}_{tarih}' olduğu için tarihe göre doğrudan sorgu (eşitlik,
     indeks gerektirmez). */
  async gunGetir(tarih){
    const snap = await db.collection(COL.yoklama).where('tarih', '==', tarih).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  /* Bir sınıfın belirli bir tarih aralığındaki TÜM yoklama belgeleri —
     dönemlik özet raporu için. Tek eşitlik (sinifId) + tek aralık
     (tarih) sorgusu, composite indeks gerektirmez. */
  async sinifAraligiGetir(sinifId, baslangicTarih, bitisTarih){
    const snap = await db.collection(COL.yoklama)
      .where('sinifId', '==', sinifId)
      .where('tarih', '>=', baslangicTarih)
      .where('tarih', '<=', bitisTarih)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
};
