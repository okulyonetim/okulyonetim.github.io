/* ================================================================
   js/core/services/sinavlar.service.js
   SINAV İŞLEMLERİ MODÜLÜ — YETKİ KONTROLÜ (sinavlar + denemeSinavlari)

   Bu katman:
   - Her yazma işleminden önce duzenleyebilir('sinavIslemleri') kontrolü
     yapar (yetki anahtarı 'sinavlar' değil — bkz. js/kullanici-yonetimi.js,
     sekme id'si de 'tab-sinavIslemleri').
   - YAZILI SINAVLAR ve DENEME SINAVLARI için KAYIT SAHİPLİĞİ uygular:
     "Düzenle" yetkili bir kullanıcı bile, kendi eklemediği bir sınav
     kaydını düzenleyemez/silemez — sadece görüntüleyebilir. Admin ve
     sahipsiz (sahipUid'siz — eski/paylaşımlı) kayıtlar bu kısıtlamanın
     dışındadır. Deneme sınavı sayacını başlatma/durdurma da aynı kurala
     tabidir: admin her zaman, admin olmayan sadece kendi oluşturduğu
     deneme sınavının sayacını başlatıp durdurabilir.
   - db değişkenine DOĞRUDAN dokunmaz — sadece SinavlarRepository çağırır.
   - Hiçbir DOM işlemi yapmaz (confirm/prompt/modal UI katmanında kalır).
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const SinavlarService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('sinavIslemleri')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  /* Bir yazılı sınav kaydını mevcut kullanıcının düzenleyip düzenleyemeyeceğini
     belirler: admin her zaman düzenleyebilir; kaydın sahibi de düzenleyebilir;
     sahipUid hiç damgalanmamış (eski/ortak) kayıtlar da düzenlenebilir sayılır. */
  sinavDuzenlenebilirMi(s){
    if(!duzenleyebilir('sinavIslemleri')) return false;
    if(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin) return true;
    if(!s || !s.sahipUid) return true; // sahipsiz/eski kayıt — herkese açık
    return !!(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && s.sahipUid === AKTIF_KULLANICI.uid);
  },

  /* Aynı kural deneme sınavları için: admin her zaman düzenleyebilir; kaydın
     sahibi de düzenleyebilir; sahipUid hiç damgalanmamış (eski/ortak) kayıtlar
     da düzenlenebilir sayılır. (Sedat isteği, Ağustos 2026: önceden herkes
     tüm deneme sınavlarını düzenleyebiliyordu — artık yazılı sınavlarla aynı
     "sadece kendi eklediğini düzenler" kuralına tabi.) */
  denemeDuzenlenebilirMi(d){
    if(!duzenleyebilir('sinavIslemleri')) return false;
    if(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin) return true;
    if(!d || !d.sahipUid) return true; // sahipsiz/eski kayıt — herkese açık
    return !!(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && d.sahipUid === AKTIF_KULLANICI.uid);
  },

  /* ================= YAZILI SINAVLAR ================= */
  /* mevcutKayit: düzenleniyorsa mevcut sınav objesi (sahiplik kontrolü için) — yeni kayıtta null geçilir. */
  sinavKaydet(mevcutId, mevcutKayit, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(mevcutId){
      if(!this.sinavDuzenlenebilirMi(mevcutKayit)) return Promise.reject(new Error('sahip-degil'));
      return SinavlarRepository.sinavGuncelle(mevcutId, veri);
    }
    if(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI){
      veri = { ...veri, sahipUid: AKTIF_KULLANICI.uid };
    }
    return SinavlarRepository.sinavEkle(veri);
  },
  sinavSil(id, mevcutKayit){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(!this.sinavDuzenlenebilirMi(mevcutKayit)) return Promise.reject(new Error('sahip-degil'));
    return SinavlarRepository.sinavSil(id);
  },

  /* ================= DENEME SINAVLARI ================= */
  /* mevcutKayit: düzenleniyorsa mevcut deneme objesi (sahiplik kontrolü için) — yeni kayıtta null geçilir. */
  denemeKaydet(mevcutId, mevcutKayit, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(mevcutId){
      if(!this.denemeDuzenlenebilirMi(mevcutKayit)) return Promise.reject(new Error('sahip-degil'));
      return SinavlarRepository.denemeGuncelle(mevcutId, veri);
    }
    if(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI){
      veri = { ...veri, sahipUid: AKTIF_KULLANICI.uid };
    }
    return SinavlarRepository.denemeEkle(veri);
  },
  denemeSil(id, mevcutKayit){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(!this.denemeDuzenlenebilirMi(mevcutKayit)) return Promise.reject(new Error('sahip-degil'));
    return SinavlarRepository.denemeSil(id);
  },

  /* Sayaç başlat/durdur — admin her zaman yapabilir; admin değilse SADECE
     kendi oluşturduğu (sahipUid'i kendisi olan) deneme sınavının sayacını
     başlatıp durdurabilir. (Sedat isteği, Ağustos 2026.)
     mevcutKayit: ilgili deneme sınavı objesi (sahiplik kontrolü için). */
  _sayacYetkiKontrol(mevcutKayit){
    const admin = typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin;
    if(admin) return true;
    const sahibi = typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && mevcutKayit && mevcutKayit.sahipUid === AKTIF_KULLANICI.uid;
    if(sahibi) return true;
    toast(mevcutKayit && mevcutKayit.sahipUid ? 'Bu sayacı yalnızca oluşturan kişi veya yönetici başlatabilir.' : 'Bu işlem için yönetici yetkisi gereklidir.');
    return false;
  },
  denemeSayacBaslat(id, mevcutKayit){
    if(!this._sayacYetkiKontrol(mevcutKayit)) return Promise.reject(new Error('yetkisiz'));
    const uid = AKTIF_KULLANICI?.uid || '';
    return SinavlarRepository.denemeSayacBaslat(id, uid);
  },
  denemeSayacDurdur(id, mevcutKayit){
    if(!this._sayacYetkiKontrol(mevcutKayit)) return Promise.reject(new Error('yetkisiz'));
    return SinavlarRepository.denemeSayacDurdur(id);
  }
};
