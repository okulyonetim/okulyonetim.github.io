/* Koruk Asistan — Communication veri katmanı
 * Takvim servisi + Notlar + Duyurular + Anket + Haberler + Push.
 * TakvimRepository ortak bağımlılık olarak loader tarafından önce yüklenir.
 * Mesajlaşma local-first hassasiyeti nedeniyle ayrı tutulur.
 */

const TakvimService = {
  _yetkiKontrol(){
    if(!duzenleyebilir('takvim')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },
  gorunurListele(hamListe){
    return (typeof kisiselKayitGorunurMu === 'function') ? hamListe.filter(kisiselKayitGorunurMu) : hamListe;
  },
  _sahipDamgasiUygula(mevcutId, veri){
    if(!mevcutId && typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) return { ...veri, sahipUid: AKTIF_KULLANICI.uid };
    return veri;
  },
  hatirlaticiKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    veri = this._sahipDamgasiUygula(mevcutId, veri);
    return mevcutId ? TakvimRepository.hatirlaticiGuncelle(mevcutId, veri) : TakvimRepository.hatirlaticiEkle(veri);
  },
  hatirlaticiSil(id){ if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz')); return TakvimRepository.hatirlaticiSil(id); },
  hatirlaticiTamamlandiGuncelle(id, deger){ if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz')); return TakvimRepository.hatirlaticiGuncelle(id, { tamamlandi: deger }); },
  gorevKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    veri = this._sahipDamgasiUygula(mevcutId, veri);
    return mevcutId ? TakvimRepository.gorevGuncelle(mevcutId, veri) : TakvimRepository.gorevEkle(veri);
  },
  gorevSil(id){ if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz')); return TakvimRepository.gorevSil(id); },
  gorevDurumGuncelle(id, durum){ if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz')); return TakvimRepository.gorevGuncelle(id, { durum }); },
  gorevTamamlandiGuncelle(id, deger){ if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz')); return TakvimRepository.gorevGuncelle(id, { tamamlandi: deger, durum: deger ? 'tamamlandi' : 'yapilacak' }); }
};

const NotlarRepository = {
  notlariDinle(callback, hataCb){
    let ref = db.collection(COL.notlar);
    const aktifKullanici = (typeof AKTIF_KULLANICI !== 'undefined') ? AKTIF_KULLANICI : null;
    const adminMi = !!(aktifKullanici && aktifKullanici.admin === true);
    if(!adminMi){
      if(!aktifKullanici || !aktifKullanici.uid){ callback([]); return () => {}; }
      ref = ref.where('sahipUid', '==', aktifKullanici.uid);
    }
    return ref.onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  notEkle(veri){ return db.collection(COL.notlar).add({ ...veri, eklenmeTarihi: new Date().toISOString(), guncellenmeTarihi: new Date().toISOString() }); },
  notGuncelle(id, veri){ return db.collection(COL.notlar).doc(id).update({ ...veri, guncellenmeTarihi: new Date().toISOString() }); },
  notSil(id){ return db.collection(COL.notlar).doc(id).delete(); },
  notMaddeleriGuncelle(id, maddeler){ return db.collection(COL.notlar).doc(id).update({ maddeler, guncellenmeTarihi: new Date().toISOString() }); }
};

function _notlarHtmlGuvenliYap(html){
  if(typeof html !== 'string' || !html) return '';
  if(typeof document === 'undefined') return html.replace(/<[^>]*>/g, '');
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const yasakEtiketler = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','LINK','META','BASE','FORM','INPUT','BUTTON','TEXTAREA','SELECT','OPTION','SVG','MATH','VIDEO','AUDIO']);
  Array.from(tpl.content.querySelectorAll('*')).forEach(el => {
    if(yasakEtiketler.has(el.tagName)){ el.remove(); return; }
    Array.from(el.attributes).forEach(attr => {
      const ad = attr.name.toLowerCase();
      const deger = String(attr.value || '').trim();
      if(ad.startsWith('on') || ad === 'srcdoc'){ el.removeAttribute(attr.name); return; }
      if((ad === 'href' || ad === 'src' || ad === 'xlink:href') && /^(?:javascript|vbscript|data):/i.test(deger)){ el.removeAttribute(attr.name); return; }
      if(ad === 'style' && /(url\s*\(|expression\s*\(|@import|javascript:)/i.test(deger)) el.removeAttribute(attr.name);
    });
  });
  return tpl.innerHTML;
}
function _notlarKaydiGuvenliYap(kayit){
  if(!kayit || typeof kayit !== 'object' || typeof kayit.icerik !== 'string') return kayit;
  return { ...kayit, icerik: _notlarHtmlGuvenliYap(kayit.icerik) };
}
const NotlarService = {
  _yetkiKontrol(){ if(!duzenleyebilir('notlar')){ toast('Bu işlem için yetkiniz yok.'); return false; } return true; },
  gorunurListele(hamListe){
    const liste = (typeof kisiselKayitGorunurMu === 'function') ? hamListe.filter(kisiselKayitGorunurMu) : hamListe;
    return liste.map(_notlarKaydiGuvenliYap);
  },
  notKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(veri && typeof veri.icerik === 'string') veri = { ...veri, icerik: _notlarHtmlGuvenliYap(veri.icerik) };
    if(!mevcutId && typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) veri = { ...veri, sahipUid: AKTIF_KULLANICI.uid };
    if(!mevcutId && typeof IstatistikService !== 'undefined') IstatistikService.notEklemeKaydet();
    return mevcutId ? NotlarRepository.notGuncelle(mevcutId, veri) : NotlarRepository.notEkle(veri);
  },
  notSil(id){ if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz')); return NotlarRepository.notSil(id); },
  notMaddeleriGuncelle(id, maddeler){ if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz')); return NotlarRepository.notMaddeleriGuncelle(id, maddeler); }
};

const DuyurularRepository = {
  duyurulariDinle(callback, hataCb){ return db.collection(COL.duyurular).onSnapshot(s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))), hataCb || hataGoster); },
  duyuruEkle(veri){ return db.collection(COL.duyurular).add(veri); },
  duyuruGuncelle(id, veri){ return db.collection(COL.duyurular).doc(id).update(veri); },
  duyuruSil(id){ return db.collection(COL.duyurular).doc(id).delete(); },
  okunduIsaretle(id, uid, veri){ return db.collection(COL.duyurular).doc(id).update({ [`okuyanlar.${uid}`]: veri }); },
  resimYukle(dosya, ilerlemeCb){
    return new Promise((resolve, reject) => {
      const yol = `duyurular/${Date.now()}_${dosya.name}`;
      const ref = storage.ref().child(yol);
      const gorev = ref.put(dosya);
      gorev.on('state_changed',
        snap => { if(ilerlemeCb) ilerlemeCb(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)); },
        err => reject(err),
        async () => { try { const url = await gorev.snapshot.ref.getDownloadURL(); resolve({ url, storagePath: yol }); } catch (err) { reject(err); } }
      );
    });
  },
  resimSil(storagePath){ return storage.ref().child(storagePath).delete(); }
};
const DuyurularService = {
  _yetkiKontrol(){ if(!duzenleyebilir('duyurular')){ toast('Bu işlem için yetkiniz yok.'); return false; } return true; },
  duyuruKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(mevcutId) return DuyurularRepository.duyuruGuncelle(mevcutId, veri);
    const kimlik = (typeof _hesapKimligi === 'function') ? _hesapKimligi() : { ad: '' };
    return DuyurularRepository.duyuruEkle({ ...veri, tarih: new Date().toISOString(), olusturanUid: (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null, olusturanAdi: kimlik.ad || 'Yönetici', okuyanlar: {} });
  },
  duyuruSil(id, resimler){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    const silmeler=(resimler||[]).map(r=>DuyurularRepository.resimSil(r.storagePath).catch(()=>{}).then(()=>{ if(r.boyut && typeof IstatistikService !== 'undefined') IstatistikService.depolamaKullanimCikar('duyuru',r.boyut); }));
    return Promise.all(silmeler).then(()=>DuyurularRepository.duyuruSil(id));
  },
  duyuruArsivle(id){ if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz')); return DuyurularRepository.duyuruGuncelle(id,{arsivlendi:true,arsivTarihi:new Date().toISOString()}); },
  duyuruArsivdenCikar(id){ if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz')); return DuyurularRepository.duyuruGuncelle(id,{arsivlendi:false,arsivTarihi:null}); },
  async resimYukle(dosya, ilerlemeCb){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(typeof DepolamaSinirService !== 'undefined'){
      const izin=await DepolamaSinirService.yuklemeIzniVarMi('duyuru',dosya.size);
      if(!izin.izinVar) return Promise.reject(new Error('depolama-siniri:'+izin.mesaj));
    }
    const sonuc=await DuyurularRepository.resimYukle(dosya,ilerlemeCb);
    if(typeof IstatistikService !== 'undefined') IstatistikService.depolamaKullanimEkle('duyuru',dosya.size);
    return {...sonuc,boyut:dosya.size};
  },
  resimSil(storagePath,boyut){ if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz')); if(boyut&&typeof IstatistikService!=='undefined')IstatistikService.depolamaKullanimCikar('duyuru',boyut); return DuyurularRepository.resimSil(storagePath); },
  okunduIsaretle(id){
    const uid=(typeof AKTIF_KULLANICI!=='undefined'&&AKTIF_KULLANICI)?AKTIF_KULLANICI.uid:null;
    if(!uid)return Promise.reject(new Error('kimlik-yok'));
    const kimlik=(typeof _hesapKimligi==='function')?_hesapKimligi():{ad:''};
    return DuyurularRepository.okunduIsaretle(id,uid,{ad:kimlik.ad||'Kullanıcı',tarih:new Date().toISOString()});
  },
  benOkudumMu(duyuru){ const uid=(typeof AKTIF_KULLANICI!=='undefined'&&AKTIF_KULLANICI)?AKTIF_KULLANICI.uid:null; return !!(uid&&duyuru?.okuyanlar&&duyuru.okuyanlar[uid]); }
};

const AnketRepository = {
  anketleriDinle(callback,hataCb){ return db.collection(COL.anketler).orderBy('olusturmaTarihi','desc').onSnapshot(s=>callback(s.docs.map(d=>({id:d.id,...d.data()}))),hataCb||hataGoster); },
  anketEkle(veri){ return db.collection(COL.anketler).add(veri); },
  anketGuncelle(id,veri){ return db.collection(COL.anketler).doc(id).update(veri); },
  anketSil(id){ return db.collection(COL.anketler).doc(id).delete(); }
};
const AnketService = {
  _kendiKimlik(){
    const kimlik=(typeof _hesapKimligi==='function')?_hesapKimligi():{ad:''};
    return {uid:(typeof AKTIF_KULLANICI!=='undefined'&&AKTIF_KULLANICI)?AKTIF_KULLANICI.uid:null,ad:kimlik.ad||'Kullanıcı',adminMi:typeof AKTIF_KULLANICI!=='undefined'&&AKTIF_KULLANICI&&AKTIF_KULLANICI.admin===true};
  },
  detayliSonucGorebilirMi(){ return this._kendiKimlik().adminMi; },
  async anketOlustur(soru,secenekMetinleri,coklu){
    const ben=this._kendiKimlik(); if(!ben.adminMi){toast('Anket oluşturmak için yetkiniz yok.');throw new Error('yetkisiz');}
    if(!soru||!soru.trim())throw new Error('soru-gerekli');
    const g=(secenekMetinleri||[]).map(s=>s.trim()).filter(Boolean); if(g.length<2)throw new Error('yetersiz-secenek');
    const secenekler=g.map((metin,i)=>({id:'sk'+i+'_'+Date.now(),metin}));
    return AnketRepository.anketEkle({soru:soru.trim(),secenekler,coklu:!!coklu,aktif:true,olusturanUid:ben.uid,olusturanAdi:ben.ad,olusturmaTarihi:firebase.firestore.FieldValue.serverTimestamp(),oylar:{}});
  },
  async oyVer(anket,seciliSecenekIdler){
    const ben=this._kendiKimlik(); if(!ben.uid)throw new Error('kimlik-yok'); if(!gorebilir('anket')){toast('Bu işlem için yetkiniz yok.');throw new Error('yetkisiz');}
    if(!anket.aktif){toast('Bu anket kapatılmış, artık oy kullanılamaz.');throw new Error('kapali');} if(!seciliSecenekIdler.length){toast('En az bir seçenek işaretleyin.');return;} if(!anket.coklu&&seciliSecenekIdler.length>1){toast('Bu ankette sadece tek seçenek işaretleyebilirsiniz.');return;}
    const oylar={...(anket.oylar||{})}; oylar[ben.uid]={secenekIdler:seciliSecenekIdler,ad:ben.ad,tarih:new Date().toISOString()}; return AnketRepository.anketGuncelle(anket.id,{oylar});
  },
  async anketKapat(id,kapatilsinMi){const ben=this._kendiKimlik();if(!ben.adminMi){toast('Bu işlem için yetkiniz yok.');throw new Error('yetkisiz');}return AnketRepository.anketGuncelle(id,{aktif:!kapatilsinMi});},
  async anketSil(id){const ben=this._kendiKimlik();if(!ben.adminMi){toast('Bu işlem için yetkiniz yok.');throw new Error('yetkisiz');}return AnketRepository.anketSil(id);},
  sonuclariHesapla(anket){
    const oylar=anket.oylar||{},katilimciSayisi=Object.keys(oylar).length,sayaclar={}; anket.secenekler.forEach(s=>sayaclar[s.id]=0); Object.values(oylar).forEach(oy=>(oy.secenekIdler||[]).forEach(id=>{if(sayaclar[id]!==undefined)sayaclar[id]++;}));
    return {katilimciSayisi,secenekSonuclari:anket.secenekler.map(s=>({id:s.id,metin:s.metin,sayi:sayaclar[s.id],yuzde:katilimciSayisi?Math.round(sayaclar[s.id]/katilimciSayisi*100):0}))};
  },
  kendiOyunuGetir(anket){const ben=this._kendiKimlik();if(!ben.uid||!anket.oylar)return null;return anket.oylar[ben.uid]||null;}
};

const PushRepository = {
  cihazKaydet(token,veri){ return db.collection(COL.cihazlar).doc(encodeURIComponent(token)).set(veri); },
  kategorileriGuncelle(token,kategoriler,saatAralik,uid){
    const veri={kategoriler}; if(uid)veri.uid=uid; if(saatAralik&&saatAralik.baslangic&&saatAralik.bitis){veri.bildirimSaatBaslangic=saatAralik.baslangic;veri.bildirimSaatBitis=saatAralik.bitis;}
    return db.collection(COL.cihazlar).doc(encodeURIComponent(token)).set(veri,{merge:true});
  }
};
const PushService = {
  cihazKaydet(token,veri){return PushRepository.cihazKaydet(token,veri);},
  kategorileriGuncelle(token,kategoriler,saatAralik){const uid=(typeof AKTIF_KULLANICI!=='undefined'&&AKTIF_KULLANICI)?AKTIF_KULLANICI.uid:null;return PushRepository.kategorileriGuncelle(token,kategoriler,saatAralik,uid);}
};

const HaberlerRepository = {
  haberleriDinle(callback,hataCb){ return db.collection(COL.haberler).orderBy('tarih','desc').limit(600).onSnapshot(s=>callback(s.docs.map(d=>({id:d.id,...d.data()}))),hataCb||hataGoster); },
  haberEkle(veri){return db.collection(COL.haberler).add({...veri,eklenmeTarihi:new Date().toISOString()});},
  haberGuncelle(id,veri){return db.collection(COL.haberler).doc(id).update(veri);},
  haberSil(id){return db.collection(COL.haberler).doc(id).delete();},
  kaynaklariDinle(callback,hataCb){return db.collection(COL.haberKaynaklari).onSnapshot(s=>callback(s.docs.map(d=>({id:d.id,...d.data()}))),hataCb||hataGoster);},
  kaynakEkle(veri){return db.collection(COL.haberKaynaklari).add({...veri,eklenmeTarihi:new Date().toISOString()});},
  kaynakGuncelle(id,veri){return db.collection(COL.haberKaynaklari).doc(id).update(veri);},
  kaynakSil(id){return db.collection(COL.haberKaynaklari).doc(id).delete();}
};
const HaberlerService = {
  _yetkiKontrol(){if(!duzenleyebilir('haberler')){toast('Bu işlem için yetkiniz yok.');return false;}return true;},
  haberKaydet(mevcutId,veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return mevcutId?HaberlerRepository.haberGuncelle(mevcutId,veri):HaberlerRepository.haberEkle(veri);},
  haberSil(id){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return HaberlerRepository.haberSil(id);},
  kaynakKaydet(mevcutId,veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return mevcutId?HaberlerRepository.kaynakGuncelle(mevcutId,veri):HaberlerRepository.kaynakEkle(veri);},
  kaynakSil(id){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return HaberlerRepository.kaynakSil(id);},
  cihazKategoriTercihiKaydet(token,kategoriler,saatAralik){return PushRepository.kategorileriGuncelle(token,kategoriler,saatAralik);}
};
