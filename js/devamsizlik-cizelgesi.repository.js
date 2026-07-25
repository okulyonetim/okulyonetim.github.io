/* ================================================================
   js/core/repositories/devamsizlik-cizelgesi.repository.js
   DEVAMSIZLIK ÇİZELGESİ MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI
   (devamsizlikCizelgesi)

   Bu dosyada SADECE db.collection() / onSnapshot() / set() / update() /
   delete() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü,
   hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/devamsizlik-cizelgesi.service.js

   Belge ID şeması: 'YIL-AY' (ör. '2026-5', ay başında sıfır YOK).
   Her ay tek doküman — içinde tüm öğretmenlerin o aya ait verisi
   ogretmenler haritası (map) olarak tutulur. Tekil hücre güncellemesi
   Firestore'un nokta-yollu (dot-path) update() özelliğiyle SADECE ilgili
   günü değiştirir; tüm dokümanı yeniden yazmaz.
   ================================================================ */

const DevamsizlikCizelgesiRepository = {

  _belgeId(yil, ay){ return `${yil}-${ay}`; },

  /* Tek bir ay dokümanını dinler (yoksa null döner). callback(doc, fromCache)
     — fromCache bilgisi UI katmanına geçirilir çünkü Firestore'un yerel
     önbellek kaynaklı bir kopyası, sunucudan doğru veri geldikten SONRA bile
     arka planda gelip ekranı sessizce eski haline döndürebiliyor (bkz. tatil
     modu bug'ı, js/app.js _dersSaatleriSunucuOnaylandi). UI bu bilgiyle aynı
     korumayı burada da uygulayabilir. */
  ayDinle(yil, ay, callback, hataCb){
    return db.collection(COL.devamsizlikCizelgesi).doc(this._belgeId(yil, ay))
      .onSnapshot(
        d => callback(d.exists ? { id: d.id, ...d.data() } : null, d.metadata.fromCache),
        hataCb || hataGoster
      );
  },

  /* Tek seferlik okuma (Excel içe aktarma öncesi çakışma kontrolü vb. için). */
  ayGetir(yil, ay){
    return db.collection(COL.devamsizlikCizelgesi).doc(this._belgeId(yil, ay)).get()
      .then(d => d.exists ? { id: d.id, ...d.data() } : null);
  },

  /* Ay dokümanını oluşturur/tamamen değiştirir (Excel içe aktarma, ay ilk kez oluşturulurken). */
  aySetle(yil, ay, veri){
    return db.collection(COL.devamsizlikCizelgesi).doc(this._belgeId(yil, ay)).set({
      ...veri,
      yil, ay,
      guncellemeTarihi: new Date().toISOString()
    }, { merge: false });
  },

  /* Bir öğretmenin tek bir gününü günceller (hücre tıklama popup'ından). */
  gunGuncelle(yil, ay, ogretmenId, gun, kod){
    const yol = `ogretmenler.${ogretmenId}.gunler.${gun}`;
    return db.collection(COL.devamsizlikCizelgesi).doc(this._belgeId(yil, ay)).update({
      [yol]: kod,
      guncellemeTarihi: new Date().toISOString()
    });
  },

  /* Bir öğretmenin o aya ait tüm gün haritasını + haftalık saatlerini yazar
     (Excel içe aktarma veya "haftalık çizelgeden otomatik doldur" akışı için).
     ÖNEMLİ: burada [`ogretmenler.${ogretmenId}`] gibi NOKTALI bir computed-key
     KULLANILMAZ — bu sadece update()'te bir alan yolu olarak yorumlanır.
     set(..., {merge:true}) içinde noktalı bir key, "ogretmenler" alanının
     İÇİNE değil, "ogretmenler.xyz" adında TAMAMEN AYRI/gerçek dışı bir üst
     seviye alana yazar; gerçek ogretmenler haritası hiç güncellenmez ve tüm
     düzenlemeler (haftalık saat, hücre kodu, açıklama) sessizce kaybolmuş
     gibi görünür (ızgara/modal hep eski veriyi gösterir). Bunun yerine
     GERÇEK iç içe (nested) bir obje veriyoruz; merge:true bunu doğru
     şekilde sadece ilgili öğretmenin alt ağacına derin-birleştirir. */
  ogretmenVerisiSetle(yil, ay, ogretmenId, veri){
    return db.collection(COL.devamsizlikCizelgesi).doc(this._belgeId(yil, ay)).set({
      yil, ay,
      ogretmenler: { [ogretmenId]: veri },
      guncellemeTarihi: new Date().toISOString()
    }, { merge: true });
  },

  /* Bir öğretmeni o ay dokümanından tamamen siler (öğretmen listeden çıkarılırsa). */
  ogretmenSil(yil, ay, ogretmenId){
    const yol = `ogretmenler.${ogretmenId}`;
    return db.collection(COL.devamsizlikCizelgesi).doc(this._belgeId(yil, ay)).update({
      [yol]: firebase.firestore.FieldValue.delete(),
      guncellemeTarihi: new Date().toISOString()
    });
  },

  /* Bir aralıktaki tüm ay dokümanlarını tek seferlik getirir (yıllık rapor / dışa aktarma için). */
  araliktakiAylariGetir(baslangicYilAy, bitisYilAy){
    // baslangicYilAy/bitisYilAy: {yil, ay} — Firestore'da doküman ID'si string olduğundan
    // sıralı karşılaştırma yerine tüm koleksiyon çekilip JS tarafında filtrelenir
    // (bu koleksiyonun boyutu okul başına yıllık en fazla ~12 doküman olacağından sorun değildir).
    return db.collection(COL.devamsizlikCizelgesi).get().then(snap => {
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(v => {
          const sira = v.yil * 12 + v.ay;
          const bas = baslangicYilAy.yil * 12 + baslangicYilAy.ay;
          const bit = bitisYilAy.yil * 12 + bitisYilAy.ay;
          return sira >= bas && sira <= bit;
        })
        .sort((a, b) => (a.yil * 12 + a.ay) - (b.yil * 12 + b.ay));
    });
  }
};
