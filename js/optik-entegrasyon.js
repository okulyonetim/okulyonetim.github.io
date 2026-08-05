/* ================================================================
   js/optik-entegrasyon.js
   OPTİK OKUMA (OMR) MODÜLÜ — ANA UYGULAMAYA ENTEGRASYON KATMANI

   Optik sistem (bkz. optik/ klasörü) TAMAMEN AYRI, kendi kendine yeten
   bir mini-uygulamadır: kendi index.html'i, kendi ES module tabanlı
   JS mimarisi, kendi localStorage deposu vardır ve Firestore'a hiç
   dokunmaz. Ana uygulamanın global fonksiyonlarıyla (özellikle
   hataGoster/toast gibi aynı isimli ama FARKLI imzaya sahip
   fonksiyonlarla) doğrudan aynı script kapsamına alınması isim
   çakışmasına yol açacağından (örn. optik kendi hataGoster(mesaj:string)
   fonksiyonunu bekler, ana uygulamanın hataGoster(err:Error) fonksiyonu
   onun yerine çalışırsa hata mesajı yerine "undefined" basar), bu
   entegrasyon KASITLI OLARAK bir <iframe> ile izole ediliyor — tıpkı
   Puantaj/Dilekçe modüllerinin yazdırma önizlemesinde kullandığı
   iframe deseni gibi (bkz. js/puantaj.js _overlayOlustur).

   DİKKAT: optik/ klasörü APK derlemesinde de paketlenmeli — bkz.
   .github/workflows/build-apk.yml "Web dosyalarını www/ klasörüne
   kopyala" adımı (cp -r optik www/).
   ================================================================ */

(function() {
  'use strict';

  let _ov = null;
  let _iframeYuklendi = false;

  function _overlayOlustur() {
    if (_ov) return _ov;

    const ov = document.createElement('div');
    ov.id = 'optikOverlay';
    ov.style.cssText = 'position:fixed; inset:0; z-index:99999; background:#0A6E6E; display:none; flex-direction:column;';
    ov.innerHTML =
      '<div id="optikToolbar" style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:linear-gradient(135deg,#0A6E6E,#0d8a8a); color:#fff; padding:10px 14px; flex-shrink:0;">' +
        '<span style="font-weight:700;font-size:14px;">🔍 Optik Okuma</span>' +
        '<button id="optikKapatBtn" style="background:rgba(255,255,255,.25);border:none;color:#fff;border-radius:7px;padding:7px 16px;font-size:13px;font-weight:700;">✕ Kapat</button>' +
      '</div>' +
      '<iframe id="optikFrame" title="Optik Form Okuyucu" allow="camera; microphone" style="flex:1 1 auto; width:100%; border:none; background:#fff;"></iframe>';
    document.body.appendChild(ov);

    ov.querySelector('#optikKapatBtn').addEventListener('click', function(){ OptikSistemi.kapat(); });

    _ov = ov;
    return ov;
  }

  const OptikSistemi = {
    ac() {
      const ov = _overlayOlustur();
      if (!_iframeYuklendi) {
        // İlk açılışta yüklenir; sonraki ac()/kapat() çağrılarında iframe
        // DOM'da kalır — kullanıcı yanlışlıkla kapatırsa sürmekte olan bir
        // tarama oturumu (Raporlar sekmesindeki sayaç vb.) kaybolmaz.
        document.getElementById('optikFrame').src = 'optik/index.html';
        _iframeYuklendi = true;
      }
      ov.style.display = 'flex';
      document.body.classList.add('modal-open');
      if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);
    },
    kapat() {
      if (!_ov) return;
      // Kamera akışı iframe içinde açık kalmışsa (kullanıcı tarama sırasında
      // kapat'a bastıysa) önce onu durdurmayı dene — pil/gizlilik için.
      try {
        const dahiliBelge = document.getElementById('optikFrame').contentWindow.document;
        const durdurBtn = dahiliBelge.getElementById('stop');
        if (durdurBtn) durdurBtn.click();
        const kameraKapatBtn = dahiliBelge.getElementById('kameraKapatBtn');
        if (kameraKapatBtn) kameraKapatBtn.click();
      } catch(e) { /* iframe henüz yüklenmemiş olabilir — sorun değil */ }
      _ov.style.display = 'none';
      document.body.classList.remove('modal-open');
      if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
      if (typeof _menuyeGeriDon === 'function') _menuyeGeriDon();
    },
    acikMi() {
      return !!(_ov && _ov.style.display === 'flex');
    }
  };

  window.OptikSistemi = OptikSistemi;

  /* ----------------------------------------------------------------
     ÖĞRENCİ LİSTESİ KÖPRÜSÜ
     Optik iframe'i aynı origin'den servis edildiği için window.parent
     üzerinden bu nesneye doğrudan erişebilir (bkz. optik/js/*.js).
     Ana uygulamada sınıf/öğrenci verileri `let siniflar`/`let veliler`
     ile (js/siniflar.js) tanımlı — bunlar top-level `let` olduğundan
     window.siniflar / window.veliler olarak GÖRÜNMÜYOR (var değil let).
     Bu yüzden burada fonksiyonlarla köprü kuruluyor.
     Veri modeli: veliler[] içindeki her kayıt aslında bir ÖĞRENCİ
     kaydı (ogrenciAdi, ogrenciNo, sinifId) — bkz. js/siniflar.js. */
  window.OptikVeriKaynagi = {
    siniflarGetir() {
      if (typeof siniflar === 'undefined' || !siniflar) return [];
      return siniflar
        .map(function(s){ return { id: s.id, ad: s.ad || '' }; })
        .sort(function(a,b){ return a.ad.localeCompare(b.ad, 'tr'); });
    },
    ogrencilerGetir(sinifId) {
      if (typeof veliler === 'undefined' || !veliler) return [];
      return veliler
        .filter(function(v){ return v.sinifId === sinifId; })
        .map(function(v){ return { id: v.id, adSoyad: v.ogrenciAdi || '', ogrenciNo: v.ogrenciNo || '' }; })
        .sort(function(a,b){ return a.adSoyad.localeCompare(b.adSoyad, 'tr'); });
    },
    /* YENİ (Ağustos 2026, Sedat isteği: Optik Form Editörü'nde "kimlik
       bilgilerinde... okul adını da ekleyebilme olsun") — Okul Bilgileri
       sayfasında girilen (js/app.js: okulBilgileriAyari) birleşik okul
       adını optik iframe'ine açar. Kademeye özel (İlkokul/Ortaokul ayrı)
       ad KASITLI OLARAK verilmiyor — optik tarafında hangi öğrencinin
       hangi kademede olduğu bilgisi yok, yanlış/tutarsız bir ad basmaktansa
       her zaman birleşik/genel adı basmak daha güvenli. */
    /* YENİ (Ağustos 2026, Sedat isteği: "Oluşturduğum formlar Firestore'a
       kaydedilsin") — Optik Form Editörü şablonları artık oy_optikSablonlari
       koleksiyonunda saklanıyor (cihazlar arası senkron/yedek için).
       NOT: optik modülü kasıtlı olarak Firestore'a hiç dokunmuyor (bkz.
       dosya başındaki izolasyon notu) — bu yüzden ana uygulamanın zaten
       giriş yapmış Firestore bağlantısını (üstteki `db`, js/firebase-init.js)
       burada köprülüyoruz, aynı siniflarGetir/ogrencilerGetir deseniyle. */
    sablonlariGetir() {
      if (typeof db === 'undefined' || !db) return Promise.reject(new Error('Firestore hazır değil (db tanımsız)'));
      // KÖK NEDEN DÜZELTMESİ (Sedat geri bildirimi, Ağustos 2026: "Android
      // sadece kendi yazdığı 1 şablonu okudu, diğer 4'ü değil") —
      // .get() varsayılan olarak önce YEREL ÖNBELLEĞİ kullanabiliyor,
      // özellikle ağ isteği o an tetiklenmemişse. source:'server' ile
      // her zaman SUNUCUDAN taze veri çekilmesi zorlanıyor.
      return db.collection('oy_optikSablonlari').get({ source: 'server' }).then(function(snap) {
        return snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
      });
      // NOT (Sedat geri bildirimi, Ağustos 2026: "hem okuma hem yazma
      // başarısız, 0/0" teşhisi): önceden burada bir .catch(...) vardı ve
      // hatayı YUTUP sessizce [] döndürüyordu — bu, olası bir izin/kural
      // hatasını görünmez kılıyordu (çağıran taraf boş bir dizi ile
      // GERÇEK bir "0 şablon var" durumunu ayırt edemiyordu). Artık hata
      // olduğu gibi yukarı fırlatılıyor, optik/js/app.js tarafındaki
      // görünür alert bunu yakalayıp gösteriyor.
    },
    sablonKaydet(kayit) {
      if (typeof db === 'undefined' || !db) return Promise.reject(new Error('Firestore hazır değil'));
      const veri = Object.assign({}, kayit);
      delete veri.id;
      // KÖK NEDEN DÜZELTMESİ (Sedat geri bildirimi, Ağustos 2026: "hem
      // okuma hem yazma başarısız, 0/0" — Firestore, bir nesnenin
      // İÇİNDE (iç içe geçmiş, örn. sablon.ogeler[].bazıAlan) HERHANGİ
      // bir yerde "undefined" değer varsa .set() çağrısının TAMAMINI
      // REDDEDİYOR. Optik Form Editörü'nün ürettiği şablon nesnelerinde
      // (opsiyonel alanlar: baslikYuksekligi, fontPt, gorselData, vb.)
      // bu çok olası. JSON üzerinden geçirmek (JSON'da "undefined" diye
      // bir şey yoktur) tüm bu alanları güvenle temizliyor.
      let temizVeri;
      try {
        temizVeri = JSON.parse(JSON.stringify(veri));
      } catch (e) {
        return Promise.reject(new Error('Şablon verisi JSON\'a çevrilemedi: ' + e.message));
      }
      return db.collection('oy_optikSablonlari').doc(kayit.id).set(temizVeri, { merge: true });
    },
    sablonSil(id) {
      if (typeof db === 'undefined' || !db) return Promise.reject(new Error('Firestore hazır değil'));
      return db.collection('oy_optikSablonlari').doc(id).delete();
    }
  };
})();
