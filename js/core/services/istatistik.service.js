/* ================================================================
   js/core/services/istatistik.service.js
   KULLANICI İSTATİSTİKLERİ MODÜLÜ

   Her kullanıcı için TEK bir özet belge tutulur (oy_kullaniciIstatistikleri,
   belge ID = uid). Sayaçlar FieldValue.increment() ile atomik artırılır,
   böylece 14 kullanıcı için gereksiz detay-log koleksiyonu / okuma maliyeti
   olmaz — admin panelini açtığında tek bir toplu okuma yeterli olur.

   Kayıt noktaları (bu dosya DIŞINDA, ilgili yerlere tek satır eklendi):
   - js/auth.js            → girişte IstatistikService.girisKaydet()
   - js/app.js (sekmeAc)   → sayfa değişince IstatistikService.sayfaZiyaretiKaydet(tab)
   - notlar.service.js     → yeni not eklenince IstatistikService.notEklemeKaydet()
   - dokumanlar.service.js → dosya yüklenince IstatistikService.dosyaYuklemeKaydet()

   Oturum süresi bu dosya İÇİNDE, kendi kendine (visibilitychange/beforeunload
   dinleyicileriyle) takip edilir — başka dosyaya dokunmaya gerek yok.
   ================================================================ */

const IstatistikService = {

  _kimlik(){
    if(typeof AKTIF_KULLANICI === 'undefined' || !AKTIF_KULLANICI) return null;
    const kimlik = (typeof _hesapKimligi === 'function') ? _hesapKimligi() : { ad: '' };
    return { uid: AKTIF_KULLANICI.uid, ad: kimlik.ad || AKTIF_KULLANICI.ad || AKTIF_KULLANICI.kullaniciAdi || 'Kullanıcı' };
  },

  _belgeRef(uid){
    return db.collection(COL.kullaniciIstatistikleri).doc(uid);
  },

  /* Ortak: belge yoksa oluşturur, varsa günceller. Hatalar sessizce
     loglanır — istatistik kaydı asla kullanıcının asıl işlemini (not
     kaydetme, dosya yükleme vb.) engellememeli/başarısız kılmamalı.

     DÜZELTME (depolama kullanımı hep 0 görünme ihtimaline karşı): nokta
     içeren iç içe alan adları (ör. "depolamaKullanimi.dokuman") sadece
     update()'te KESİN olarak garanti; set(...,{merge:true}) ile aynı
     davranış çoğu durumda çalışsa da resmi olarak update() kadar garanti
     değil. Artık önce belgenin var olduğundan set(merge:true) ile emin
     olunuyor (boş bir yazımla), SONRA gerçek alanlar update() ile
     yazılıyor — nokta'lı iç içe alan artık kesin doğru yere yazılır.
     Ayrıca hata artık konsola daha görünür şekilde loglanıyor. */
  async _guncelle(alanlar){
    const ben = this._kimlik();
    if(!ben || !ben.uid || !db) return;
    const ref = this._belgeRef(ben.uid);
    try{
      await ref.set({ ad: ben.ad, guncellenmeTarihi: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      await ref.update(alanlar);
    }catch(e){
      console.error('[İstatistik] Kaydedilemedi:', e, 'alanlar:', alanlar);
    }
  },

  girisKaydet(){
    this._guncelle({
      girisSayisi: firebase.firestore.FieldValue.increment(1),
      sonGiris: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  dosyaYuklemeKaydet(){
    this._guncelle({ dosyaYuklemeSayisi: firebase.firestore.FieldValue.increment(1) });
  },

  /* ---------- YENİ: Depolama sınırları (kategori bazlı kota) ----------
     Kategori: 'mesaj' | 'duyuru' | 'dokuman' | 'takvim'. Kullanım verisi
     depolamaKullanimi.{kategori} alanında bayt cinsinden tutulur. Bkz.
     js/core/services/depolama-sinir.service.js (kota kontrolü burada
     DEĞİL, orada yapılır — bu servis sadece sayaç tutar). */
  depolamaKullanimEkle(kategori, bayt){
    if(!bayt || !kategori) return;
    this._guncelle({ [`depolamaKullanimi.${kategori}`]: firebase.firestore.FieldValue.increment(bayt) });
  },
  depolamaKullanimCikar(kategori, bayt){
    if(!bayt || !kategori) return;
    this._guncelle({ [`depolamaKullanimi.${kategori}`]: firebase.firestore.FieldValue.increment(-bayt) });
  },
  /* Toplu silme gibi durumlarda (ör. bir konuşmanın TÜM mesajları silinirken)
     dosyalar İSTEĞİ YAPAN kişiden BAŞKA birine ait olabilir — bu yüzden
     _guncelle()'in aksine (her zaman "şu an giriş yapmış kişi" varsayar) bu
     fonksiyon hedef uid'i açıkça alır. */
  depolamaKullanimCikarUid(uid, kategori, bayt){
    if(!bayt || !kategori || !uid || !db) return;
    const ref = db.collection(COL.kullaniciIstatistikleri).doc(uid);
    ref.set({}, { merge:true })
      .then(() => ref.update({ [`depolamaKullanimi.${kategori}`]: firebase.firestore.FieldValue.increment(-bayt) }))
      .catch(e => console.error('[İstatistik] Depolama (uid ile) güncellenemedi:', e));
  },

  /* ---------- YENİ: Depolama sayaçlarını gerçek dosyalardan YENİDEN
     HESAPLA (bkz. Depolama kullanımı hep 0 görünme hatası) — düzeltmeden
     ÖNCE yüklenen dosyalar hiç sayılmamıştı, sonradan silinince sayaç
     eksiye düşüyordu. Bu fonksiyon oy_dokumanlar/oy_duyurular/oy_mesajlar/
     oy_akademikTakvim'i baştan tarayıp her kullanıcının depolamaKullanimi
     alanını GERÇEK toplamla (increment değil, doğrudan set) değiştirir.
     Sadece admin panelinden, elle, tek seferlik çalıştırılması içindir. */
  async depolamaYenidenHesapla(){
    if(!db) return { hata: 'Firestore bağlantısı yok' };
    const toplam = {}; // uid -> {mesaj,duyuru,dokuman,takvim}
    function ekle(uid, kategori, bayt){
      if(!uid || !bayt) return;
      if(!toplam[uid]) toplam[uid] = { mesaj:0, duyuru:0, dokuman:0, takvim:0 };
      toplam[uid][kategori] += bayt;
    }

    const [dokSnap, duySnap, mesSnap, takvimDoc, istSnap] = await Promise.all([
      db.collection(COL.dokumanlar).get(),
      db.collection(COL.duyurular).get(),
      db.collection(COL.mesajlar).get(),
      db.collection(COL.akademikTakvim).doc('aktif').get(),
      db.collection(COL.kullaniciIstatistikleri).get(),
    ]);

    dokSnap.forEach(d => { const v = d.data(); ekle(v.olusturanUid, 'dokuman', v.dosyaBoyutu); });
    duySnap.forEach(d => {
      const v = d.data();
      (v.resimler || []).forEach(r => ekle(v.olusturanUid, 'duyuru', r.boyut));
    });
    mesSnap.forEach(d => {
      const v = d.data();
      if(v.dosya && v.dosya.boyut) ekle(v.gonderenUid, 'mesaj', v.dosya.boyut);
    });
    // Akademik Takvim: tek/aktif bir görsel, belgede sahibinin uid'i
    // tutulmuyor (sadece admin yükleyebiliyor) — bu yüzden ŞU AN işlemi
    // çalıştıran admin'in hesabına sayılır (gerçek yazma anındaki davranışla
    // aynı: her zaman o an giriş yapmış admin'e ekleniyordu).
    if(takvimDoc.exists){
      const v = takvimDoc.data();
      const ben = this._kimlik();
      if(v.dosyaBoyutu && ben && ben.uid) ekle(ben.uid, 'takvim', v.dosyaBoyutu);
    }
    // Hiç dosyası kalmayan ama eski (hatalı) bir depolamaKullanimi değeri
    // olan kullanıcılar da sıfırlanmalı — sadece toplam'da GÖRÜNENLERİ
    // değil, mevcut TÜM istatistik belgelerini kapsa.
    istSnap.forEach(d => { if(!toplam[d.id]) toplam[d.id] = { mesaj:0, duyuru:0, dokuman:0, takvim:0 }; });

    await Promise.all(Object.keys(toplam).map(uid =>
      db.collection(COL.kullaniciIstatistikleri).doc(uid).set({ depolamaKullanimi: toplam[uid] }, { merge:true })
    ));
    return { kullaniciSayisi: Object.keys(toplam).length };
  },

  notEklemeKaydet(){
    this._guncelle({ notEklemeSayisi: firebase.firestore.FieldValue.increment(1) });
  },

  sayfaZiyaretiKaydet(sayfaAdi){
    if(!sayfaAdi) return;
    // Nested alan adı (dot-path) — Firestore'da bir "map" alanı olarak saklanır.
    this._guncelle({ [`sayfaZiyaretleri.${sayfaAdi}`]: firebase.firestore.FieldValue.increment(1) });
  },

  sureEkle(saniye){
    if(!saniye || saniye < 1) return;
    this._guncelle({ toplamSureSaniye: firebase.firestore.FieldValue.increment(Math.round(saniye)) });
  },

  /* Admin paneli için: tüm kullanıcıların istatistik özetlerini tek
     seferde çeker (14 kullanıcı için tek bir okuma grubu — maliyetsiz). */
  async tumIstatistikleriGetir(){
    const snap = await db.collection(COL.kullaniciIstatistikleri).get();
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  }
};

/* ---------- Oturumda geçirilen süre: kendi kendine takip ---------- */
(function _oturumSuresiTakibiKur(){
  let baslangic = Date.now();
  let aktif = !document.hidden;

  function _kaydetVeSifirla(){
    if(!aktif) return;
    const gecenSaniye = (Date.now() - baslangic) / 1000;
    IstatistikService.sureEkle(gecenSaniye);
    baslangic = Date.now();
  }

  document.addEventListener('visibilitychange', () => {
    if(document.hidden){
      _kaydetVeSifirla();
      aktif = false;
    } else {
      aktif = true;
      baslangic = Date.now();
    }
  });

  // Sekme/pencere kapanırken son dilimi de kaydetmeyi dener.
  // (Ağ isteği tamamlanmayabilir, bu normaldir — kritik bir veri değil.)
  window.addEventListener('beforeunload', _kaydetVeSifirla);
})();
