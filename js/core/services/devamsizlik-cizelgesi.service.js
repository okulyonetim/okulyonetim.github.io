/* ================================================================
   js/core/services/devamsizlik-cizelgesi.service.js
   DEVAMSIZLIK ÇİZELGESİ MODÜLÜ — İŞ KURALLARI + YETKİ KONTROLÜ

   Bu katman:
   - Yetki kontrolünü tek noktadan yapar (duzenleyebilir('ogretmenler')).
   - Bir günün OTOMATİK kodunu üretir: öğretmen izni / resmi tatil /
     hafta sonu / haftalık ders saati sırasıyla değerlendirilir.
   - Excel'den (Öğretmenler sayfası: ADI SOYADI, GÖREVİ, Pzt..Cum saatleri)
     içe aktarılan satırları ay dokümanı şemasına dönüştürür.
   - db / SheetJS'e DOĞRUDAN dokunmaz — sadece Repository çağırır,
     ham veri UI katmanından (devamsizlik-cizelgesi.js) parametre olarak gelir.
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)

   ---- VARSAYIMLAR (Excel şablonundan çıkarıldı, kullanıcı onayladı/belirtti) ----
   1) İDARECİLER ÖZEL DURUM (kullanıcı onayladı): 'Müdür','Müdür Yardımcısı',
      'İdari Personel' unvanındaki kişiler resmi tatilde OTOMATİK 'T' almaz —
      o günün haftalık ders saati değeri (varsa) önerilir, yoksa yine 'T'
      düşer; okul idaresi elle değiştirebilir. Diğer tüm unvanlar resmi
      tatilde otomatik 'T' alır.
   2) İZİN TÜRÜ → ÇİZELGE KODU eşlemesi (netleşmedi, makul varsayım):
      'Sağlık Raporu' → R, 'Görevlendirme' → + (okul dışı görevli ama
      "çalışıyor" sayılır), diğer tüm izin türleri ('Yıllık İzin',
      'Mazeret İzni','Doğum İzni','Refakat İzni','Ücretsiz İzin','Diğer') → İ.
      Bu eşleme İZIN_TUR_KOD_ESLESTIRME sabitinden kolayca değiştirilebilir.
   ================================================================ */

const DevamsizlikCizelgesiService = {

  IDARECI_UNVANLARI: ['Müdür', 'Müdür Yardımcısı', 'İdari Personel'],

  IZIN_TUR_KOD_ESLESTIRME: {
    'Sağlık Raporu': 'R',
    'Görevlendirme': '+'
    // eşlemede olmayan her izin türü varsayılan olarak 'İ' kabul edilir.
  },

  GUN_KISA_ADLARI: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'], // JS Date.getDay() sırasıyla
  HAFTAICI_ANAHTARLARI: ['pzt', 'sal', 'car', 'per', 'cum'],          // haftalikSaatler alan adları, Pzt→Cum

  _yetkiKontrol(){
    if(!duzenleyebilir('ogretmenler')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  gunSayisi(yil, ay){
    return new Date(yil, ay, 0).getDate(); // ay 1-12 girilir, JS'de bir sonraki ayın 0. günü = bu ayın son günü
  },

  /* Verilen ay içindeki bir günün haftanın hangi gününe denk geldiğini döner (0=Paz..6=Cmt). */
  haftaGunu(yil, ay, gun){
    return new Date(yil, ay - 1, gun).getDay();
  },

  haftaSonuMu(yil, ay, gun){
    const g = this.haftaGunu(yil, ay, gun);
    return g === 0 || g === 6; // Paz veya Cmt
  },

  /* Bir öğretmenin belirli bir haftaiçi gününde kaç ders saati olduğunu haftalikSaatler'den okur. */
  _haftaIciSaat(haftalikSaatler, yil, ay, gun){
    const g = this.haftaGunu(yil, ay, gun); // 1..5 = Pzt..Cum
    if(g < 1 || g > 5) return 0;
    const anahtar = this.HAFTAICI_ANAHTARLARI[g - 1];
    return Number((haftalikSaatler || {})[anahtar]) || 0;
  },

  /* İlgili tarihte resmi tatil var mı? */
  _resmiTatilMi(resmiTatiller, iso){
    return (resmiTatiller || []).some(t => t.tarih === iso);
  },

  /* İlgili tarihte, ilgili öğretmen için aktif bir izin kaydı var mı? Varsa kaydı döner. */
  _aktifIzinKaydi(izinKayitlari, ogretmenId, iso){
    return (izinKayitlari || []).find(k =>
      k.ogretmenId === ogretmenId && k.baslangic <= iso && iso <= k.bitis
    ) || null;
  },

  izinTurundenKodUret(tur){
    return this.IZIN_TUR_KOD_ESLESTIRME[tur] || 'İ';
  },

  /* Tek bir gün için OTOMATİK kodu üretir. Öncelik sırası:
     1) Öğretmen izni (izinKayitlari)  2) Resmi tatil  3) Hafta sonu  4) Haftalık ders saati (Devam)
     Dönüş: string ('D'|'İ'|'Y'|'R'|'T'|'+') veya sayı (Devam) veya null (hafta sonu — hücre boş kalır). */
  otomatikKodUret(ogretmen, yil, ay, gun, resmiTatiller, izinKayitlari){
    const iso = `${yil}-${String(ay).padStart(2,'0')}-${String(gun).padStart(2,'0')}`;

    const izin = this._aktifIzinKaydi(izinKayitlari, ogretmen.ogretmenId, iso);
    if(izin) return this.izinTurundenKodUret(izin.tur);

    if(this._resmiTatilMi(resmiTatiller, iso)){
      const idareciMi = this.IDARECI_UNVANLARI.includes(ogretmen.gorev);
      if(!idareciMi) return 'T';
      // İdareci: tatilde de haftalık düzenine göre normal (Devam) kodu önerilir, elle değiştirilebilir.
      const saat = this._haftaIciSaat(ogretmen.haftalikSaatler, yil, ay, gun);
      return saat > 0 ? saat : 'T';
    }

    if(this.haftaSonuMu(yil, ay, gun)) return null; // hücre boş, gri dolgu UI'da otomatik

    return this._haftaIciSaat(ogretmen.haftalikSaatler, yil, ay, gun); // Devam = ders saati sayısı
  },

  /* Bir öğretmenin ay boyunca tüm günlerini otomatik üretir. */
  ogretmenAyiniOtomatikUret(ogretmen, yil, ay, resmiTatiller, izinKayitlari){
    const gunSayisi = this.gunSayisi(yil, ay);
    const gunler = {};
    for(let gun = 1; gun <= gunSayisi; gun++){
      const kod = this.otomatikKodUret(ogretmen, yil, ay, gun, resmiTatiller, izinKayitlari);
      if(kod !== null) gunler[gun] = kod;
    }
    return gunler;
  },

  /* Excel'in "Öğretmenler" sayfasından okunan ham satırları (UI/SheetJS tarafından ayrıştırılmış)
     ay dokümanı şemasına dönüştürür ve otomatik günleri üretir.
     satirlar: [{adSoyad, gorev, ogretmenId?, pzt, sal, car, per, cum}, ...] */
  excelSatirlarindanAyOlustur(satirlar, yil, ay, mevcutOgretmenler, resmiTatiller, izinKayitlari){
    const ogretmenlerMap = {};
    (satirlar || []).forEach(satir => {
      const eslesen = this._adaGoreOgretmenBul(mevcutOgretmenler, satir.adSoyad);
      const ogretmenId = satir.ogretmenId || (eslesen ? eslesen.id : null) || `disaridan_${this._slug(satir.adSoyad)}`;
      const ogretmen = {
        ogretmenId,
        adSoyad: satir.adSoyad,
        gorev: satir.gorev || (eslesen ? eslesen.unvan : '') || '',
        haftalikSaatler: {
          pzt: Number(satir.pzt) || 0,
          sal: Number(satir.sal) || 0,
          car: Number(satir.car) || 0,
          per: Number(satir.per) || 0,
          cum: Number(satir.cum) || 0
        }
      };
      ogretmen.gunler = this.ogretmenAyiniOtomatikUret(ogretmen, yil, ay, resmiTatiller, izinKayitlari);
      ogretmenlerMap[ogretmenId] = ogretmen;
    });
    return ogretmenlerMap;
  },

  _adaGoreOgretmenBul(ogretmenler, adSoyad){
    const norm = s => (s || '').trim().toLocaleUpperCase('tr').replace(/\s+/g, ' ');
    return (ogretmenler || []).find(o => norm(o.ad) === norm(adSoyad)) || null;
  },

  _slug(s){
    return (s || '').toLocaleLowerCase('tr').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  },

  /* --- Yazma işlemleri: hepsi yetki kontrolünden geçer, Repository'ye devreder --- */

  async ayOlustur(yil, ay, ogretmenlerMap){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    return DevamsizlikCizelgesiRepository.aySetle(yil, ay, { ogretmenler: ogretmenlerMap });
  },

  async gunGuncelle(yil, ay, ogretmenId, gun, kod){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    const GECERLI_KODLAR = ['D', 'İ', 'Y', 'R', 'T', '+'];
    const gecerliMi = GECERLI_KODLAR.includes(kod) || (!isNaN(Number(kod)) && Number(kod) >= 0);
    if(!gecerliMi) throw new Error('Geçersiz kod: ' + kod);
    return DevamsizlikCizelgesiRepository.gunGuncelle(yil, ay, ogretmenId, gun, kod);
  },

  /* Bir öğretmeni ay dokümanına yeniden ekler/otomatik günlerini tazeler
     (örn. haftalık ders saati değiştiğinde veya öğretmen sonradan eklendiğinde). */
  async ogretmeniYenidenOlustur(ogretmen, yil, ay, resmiTatiller, izinKayitlari){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    ogretmen.gunler = this.ogretmenAyiniOtomatikUret(ogretmen, yil, ay, resmiTatiller, izinKayitlari);
    return DevamsizlikCizelgesiRepository.ogretmenVerisiSetle(yil, ay, ogretmen.ogretmenId, ogretmen);
  },

  async ogretmenSil(yil, ay, ogretmenId){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    return DevamsizlikCizelgesiRepository.ogretmenSil(yil, ay, ogretmenId);
  }
};
