/* Koruk Asistan — Management veri katmanı
 * Personel + periyodik işler + öğretmen izin repository/service birleşimi.
 * Nöbet rotasyon motoru ayrı tutulur. Mevcut global API adları korunur.
 */

const PersonelRepository = {
  personelDinle(callback, hataCb){
    return db.collection(COL.personel).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  personelEkle(veri){ return db.collection(COL.personel).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  personelGuncelle(id, veri){ return db.collection(COL.personel).doc(id).update(veri); },
  personelSil(id){ return db.collection(COL.personel).doc(id).delete(); },
  izinleriDinle(callback, hataCb){
    return db.collection(COL.personelIzinler).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  izinEkle(veri){ return db.collection(COL.personelIzinler).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  izinGuncelle(id, veri){ return db.collection(COL.personelIzinler).doc(id).update(veri); },
  izinSil(id){ return db.collection(COL.personelIzinler).doc(id).delete(); }
};

const PersonelService = {
  _yetkiKontrol(){
    if(!duzenleyebilir('personel')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },
  tcGecerliMi(tc){ return !tc || /^\d{11}$/.test(tc); },
  tarihAraligiGecerliMi(baslangic, bitis){ return !!(baslangic && bitis) && bitis >= baslangic; },
  personelKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return mevcutId ? PersonelRepository.personelGuncelle(mevcutId, veri) : PersonelRepository.personelEkle(veri);
  },
  personelSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return PersonelRepository.personelSil(id);
  },
  izinKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return mevcutId ? PersonelRepository.izinGuncelle(mevcutId, veri) : PersonelRepository.izinEkle(veri);
  },
  izinSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return PersonelRepository.izinSil(id);
  }
};

const PeriyodikRepository = {
  islerDinle(callback, hataCb){
    return db.collection(COL.periyodikIsler).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  isEkle(veri){ return db.collection(COL.periyodikIsler).add(veri); },
  isGuncelle(id, veri){ return db.collection(COL.periyodikIsler).doc(id).update(veri); },
  isSil(id){ return db.collection(COL.periyodikIsler).doc(id).delete(); },
  sabloniDinle(callback, hataCb){
    return db.collection(COL.periyodikSablon).doc('sablon').onSnapshot(
      doc => callback(doc.exists ? (doc.data().gorevler || []) : []),
      hataCb || hataGoster
    );
  },
  sabloniKaydet(gorevler){ return db.collection(COL.periyodikSablon).doc('sablon').set({ gorevler }); }
};

const PeriyodikService = {
  _yetkiKontrol(){
    if(!duzenleyebilir('periyodikIsler')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },
  isKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(mevcutId) return PeriyodikRepository.isGuncelle(mevcutId, veri);
    return PeriyodikRepository.isEkle({ ...veri, eklenmeTarihi: new Date().toISOString() });
  },
  isSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return PeriyodikRepository.isSil(id);
  },
  tamamlandiGuncelle(id, deger){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return PeriyodikRepository.isGuncelle(id, { tamamlandi: deger });
  },
  sabloniKaydet(gorevler){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return PeriyodikRepository.sabloniKaydet(gorevler);
  },
  _gunToISO(yil, ay0, gun){
    const sonGun = new Date(yil, ay0+1, 0).getDate();
    return `${yil}-${String(ay0+1).padStart(2,'0')}-${String(Math.min(Math.max(gun,1), sonGun)).padStart(2,'0')}`;
  },
  _grupAnahtari(p){
    const t = p.bitis || p.baslangic;
    return t ? t.slice(0,7) : '9999-99';
  },
  async buAyinGorevleriniOlustur(sablon, mevcutIsler){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    if(!sablon.length) throw new Error('sablon-bos');
    const d = new Date();
    const yil = d.getFullYear(), ay0 = d.getMonth();
    let olusturulan = 0, atlanan = 0;
    for(const g of sablon){
      if(!g.isAdi) continue;
      const baslangic = this._gunToISO(yil, ay0, g.baslangicGun);
      const bitis = this._gunToISO(yil, ay0, g.bitisGun);
      const ayAnahtari = bitis.slice(0,7);
      const zatenVar = mevcutIsler.some(p => p.isAdi===g.isAdi && this._grupAnahtari(p)===ayAnahtari);
      if(zatenVar){ atlanan++; continue; }
      await PeriyodikRepository.isEkle({ isAdi:g.isAdi, baslangic, bitis, tamamlandi:false, not:'', bildirimGonderildi:false });
      olusturulan++;
    }
    return { olusturulan, atlanan };
  }
};

const OgretmenIzinRepository = {
  izinleriDinle(callback, hataCb){
    return db.collection(COL.ogretmenIzinleri).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  izinEkle(veri){ return db.collection(COL.ogretmenIzinleri).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  izinGuncelle(id, veri){ return db.collection(COL.ogretmenIzinleri).doc(id).update(veri); },
  izinSil(id){ return db.collection(COL.ogretmenIzinleri).doc(id).delete(); }
};

const OgretmenIzinService = {
  _yetkiKontrol(){
    if(!duzenleyebilir('ogretmenler')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },
  gunSayisiHesapla(baslangic, bitis){
    const b1 = new Date(baslangic + 'T00:00:00');
    const b2 = new Date(bitis + 'T00:00:00');
    return Math.round((b2 - b1) / 86400000) + 1;
  },
  tarihAraligiGecerliMi(baslangic, bitis){ return !!(baslangic && bitis) && bitis >= baslangic; },
  _isoTarihYaz(d){
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  },
  async izinKaydet(mevcutId, eskiHatirlaticiId, adSoyad, veri){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    if(eskiHatirlaticiId) await TakvimRepository.hatirlaticiSil(eskiHatirlaticiId);
    let hatirlaticiId = null;
    const bitisTarihi = new Date(veri.bitis + 'T00:00:00');
    const hatirlaticiTarihi = new Date(bitisTarihi.getTime() - 86400000);
    if(hatirlaticiTarihi >= new Date(todayISO()+'T00:00:00')){
      const hRef = await TakvimRepository.hatirlaticiEkle({
        baslik: `🏥 ${adSoyad} — ${veri.tur} bitiyor`,
        tarih: this._isoTarihYaz(hatirlaticiTarihi),
        saat: '',
        oncelik: 'Orta',
        aciklama: `${veri.tur} kaydı ${formatTarih(veri.bitis)} tarihinde sona eriyor.`,
        tamamlandi: false,
        bildirimGonderildi: false,
        sahipUid: AKTIF_KULLANICI.uid
      });
      hatirlaticiId = hRef.id;
    }
    veri = { ...veri, hatirlaticiId };
    return mevcutId ? OgretmenIzinRepository.izinGuncelle(mevcutId, veri) : OgretmenIzinRepository.izinEkle(veri);
  },
  async izinSil(id, hatirlaticiId){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    if(hatirlaticiId) await TakvimRepository.hatirlaticiSil(hatirlaticiId);
    return OgretmenIzinRepository.izinSil(id);
  }
};
