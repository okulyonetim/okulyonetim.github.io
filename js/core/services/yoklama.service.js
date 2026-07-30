/* ================================================================
   js/core/services/yoklama.service.js
   ÖĞRENCİ YOKLAMA — iş kuralları + yetki kontrolü.

   Yetki modeli (Sedat'ın isteği): modülü görebilen (gorebilir('yoklama'))
   HERKES yoklama girip düzenleyebilir — idare veya öğretmen ayrımı yok,
   ayrı bir 'duzenleyebilir' kontrolü YOK. Sadece "Bugünün Devamsızları"
   (veli WhatsApp) ekranı admin'e özel (aşağıda ayrıca kontrol edilir).

   Veli mesajı: ücretli/API'li bir WhatsApp Business entegrasyonu YOK —
   sadece tarayıcının/telefonun kendi WhatsApp uygulamasını, mesaj metni
   hazır şekilde açan ücretsiz wa.me linki kullanılıyor. Admin listeden
   tek tek "WhatsApp'ta Aç"a basar, WhatsApp içinde kendisi gönderir.
   ================================================================ */

const YoklamaService = {
  DURUMLAR: ['var', 'yok', 'gec', 'izinli'],
  DURUM_ADLARI: { var: 'Var', yok: 'Yok', gec: 'Geç', izinli: 'İzinli' },
  DURUM_RENKLERI: { var: '#0A9E82', yok: '#EE5A45', gec: '#F2A03D', izinli: '#1F6FD1' },

  _kendiKimlik(){
    const kimlik = (typeof _hesapKimligi === 'function') ? _hesapKimligi() : { ad: '' };
    return {
      uid: (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null,
      ad: kimlik.ad || (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI ? (AKTIF_KULLANICI.ad || AKTIF_KULLANICI.kullaniciAdi) : '') || 'Kullanıcı',
      adminMi: typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin === true,
    };
  },

  bugununTarihi(){
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  },

  belgeGetir(sinifId, tarih){ return YoklamaRepository.belgeGetir(sinifId, tarih); },
  dinle(sinifId, tarih, cb, hataCb){ return YoklamaRepository.dinle(sinifId, tarih, cb, hataCb); },

  ogrenciDurumKaydet(sinifId, tarih, ogrenciId, durum){
    if(!gorebilir('yoklama')){ toast('Bu işlem için yetkiniz yok.'); return Promise.reject(new Error('yetkisiz')); }
    if(this.DURUMLAR.indexOf(durum) === -1) return Promise.reject(new Error('geçersiz durum'));
    const ben = this._kendiKimlik();
    return YoklamaRepository.ogrenciDurumYaz(sinifId, tarih, ogrenciId, durum, ben.uid, ben.ad);
  },

  /* ---------- Bugünün Devamsızları (admin) ---------- */
  async gununDevamsizlariGetir(tarih){
    if(!this._kendiKimlik().adminMi) return Promise.reject(new Error('yetkisiz'));
    const belgeler = await YoklamaRepository.gunGetir(tarih);
    const satirlar = [];
    belgeler.forEach(b => {
      const kayitlar = b.kayitlar || {};
      const gonderilmis = b.mesajGonderildi || {};
      Object.keys(kayitlar).forEach(ogrenciId => {
        const durum = kayitlar[ogrenciId];
        if(durum !== 'yok' && durum !== 'gec') return;
        const veli = (typeof veliler !== 'undefined') ? veliler.find(v => v.id === ogrenciId) : null;
        if(!veli) return; // silinmiş/eşleşmeyen öğrenci kaydı — atla
        const sinif = (typeof siniflar !== 'undefined') ? siniflar.find(s => s.id === b.sinifId) : null;
        satirlar.push({
          sinifId: b.sinifId, tarih: b.tarih, ogrenciId, durum,
          ogrenciAdi: veli.ogrenciAdi || '', veliAdi: veli.veliAdi || '',
          telefon: veli.telefon || '', sinifAdi: sinif ? sinif.ad : '',
          gonderildi: !!gonderilmis[ogrenciId],
        });
      });
    });
    // Sınıf adına, sonra öğrenci adına göre sırala — okunması kolay olsun.
    satirlar.sort((a,b) => (a.sinifAdi||'').localeCompare(b.sinifAdi||'', 'tr') || (a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'', 'tr'));
    return satirlar;
  },

  mesajGonderildiIsaretle(sinifId, tarih, ogrenciId){
    if(!this._kendiKimlik().adminMi) return Promise.reject(new Error('yetkisiz'));
    return YoklamaRepository.mesajGonderildiIsaretle(sinifId, tarih, ogrenciId);
  },

  /* Telefonu wa.me'nin beklediği "90XXXXXXXXXX" biçimine getirir.
     Kabul edilen girişler: '0532...', '532...', '+90532...', boşluklu/
     tireli her hâli. Geçerli bir 10 haneli GSM numarası çıkaramazsa null
     döner (arayan taraf "telefon eksik/hatalı" göstersin diye). */
  _telefonuTemizle(ham){
    if(!ham) return null;
    let t = String(ham).replace(/\D/g, ''); // rakam dışını at
    if(t.startsWith('0090')) t = t.slice(2);
    if(t.startsWith('90') && t.length === 12) t = t.slice(2);
    if(t.startsWith('0') && t.length === 11) t = t.slice(1);
    if(t.length !== 10) return null;
    return '90' + t;
  },

  /* Örnek mesaj: "Sayın Ahmet Yılmaz, öğrenciniz Ayşe Yılmaz, 30.07.2026
     tarihinde okula gelmemiştir. Bilginize. — Koruk İlk-Ortaokulu" */
  whatsappLinkOlustur(satir){
    const tel = this._telefonuTemizle(satir.telefon);
    if(!tel) return null;
    const [yil, ay, gun] = (satir.tarih || '').split('-');
    const tarihTR = (yil && ay && gun) ? `${gun}.${ay}.${yil}` : satir.tarih;
    const okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi) ? okulBilgileriAyari.okulAdi : 'Okulumuz';
    const durumMetni = satir.durum === 'gec' ? 'derse geç kalmıştır' : 'okula gelmemiştir';
    const mesaj = `Sayın ${satir.veliAdi || 'Velimiz'}, öğrenciniz ${satir.ogrenciAdi}, ${tarihTR} tarihinde ${durumMetni}. Bilginize. — ${okulAdi}`;
    return `https://wa.me/${tel}?text=${encodeURIComponent(mesaj)}`;
  },

  /* ---------- Dönemlik özet (sınıf bazında, öğrenci başına toplamlar) ---------- */
  async sinifOzetiGetir(sinifId, baslangicTarih, bitisTarih){
    const belgeler = await YoklamaRepository.sinifAraligiGetir(sinifId, baslangicTarih, bitisTarih);
    const ozet = {}; // ogrenciId -> {var,yok,gec,izinli}
    belgeler.forEach(b => {
      Object.entries(b.kayitlar || {}).forEach(([ogrenciId, durum]) => {
        if(!ozet[ogrenciId]) ozet[ogrenciId] = { var:0, yok:0, gec:0, izinli:0 };
        if(ozet[ogrenciId][durum] !== undefined) ozet[ogrenciId][durum]++;
      });
    });
    return ozet;
  },
};
