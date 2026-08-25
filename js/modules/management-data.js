/* Koruk Asistan — Management veri katmanı
 * Personel + periyodik işler + öğretmen izin repository/service birleşimi.
 * Nöbet rotasyon motoru ayrı tutulur. Tüm yazmalar DeviceData queue üzerinden gider.
 */
(function(global){
'use strict';
function device(){if(!global.DeviceData)throw new Error('DeviceData hazır değil.');return global.DeviceData;}
const list=t=>device().list(t);
const aktif=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const todayISO=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;};
const formatTarih=v=>{if(!v)return'';const d=new Date(String(v).length===10?v+'T00:00:00':v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('tr-TR');};

const PersonelRepository={
  personelDinle(callback){return device().listen('personel',callback);},
  personelEkle(veri){return device().add('personel',COL.personel,{...veri,eklenmeTarihi:new Date().toISOString()});},
  personelGuncelle(id,veri){return device().update('personel',COL.personel,id,veri);},
  personelSil(id){return device().remove('personel',COL.personel,id);},
  izinleriDinle(callback){return device().listen('personelIzinler',callback);},
  izinEkle(veri){return device().add('personelIzinler',COL.personelIzinler,{...veri,eklenmeTarihi:new Date().toISOString()});},
  izinGuncelle(id,veri){return device().update('personelIzinler',COL.personelIzinler,id,veri);},
  izinSil(id){return device().remove('personelIzinler',COL.personelIzinler,id);}
};
global.PersonelRepository=PersonelRepository;
const PersonelService={
  _yetkiKontrol(){if(!duzenleyebilir('personel')){toast('Bu işlem için yetkiniz yok.');return false;}return true;},
  tcGecerliMi(tc){return!tc||/^\d{11}$/.test(tc);},tarihAraligiGecerliMi(b,b2){return!!(b&&b2)&&b2>=b;},
  personelKaydet(id,veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return id?PersonelRepository.personelGuncelle(id,veri):PersonelRepository.personelEkle(veri);},
  personelSil(id){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return PersonelRepository.personelSil(id);},
  izinKaydet(id,veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return id?PersonelRepository.izinGuncelle(id,veri):PersonelRepository.izinEkle(veri);},
  izinSil(id){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return PersonelRepository.izinSil(id);}
};
global.PersonelService=PersonelService;

const PeriyodikRepository={
  islerDinle(callback){return device().listen('periyodikIsler',callback);},
  isEkle(veri){return device().add('periyodikIsler',COL.periyodikIsler,veri);},
  isGuncelle(id,veri){return device().update('periyodikIsler',COL.periyodikIsler,id,veri);},
  isSil(id){return device().remove('periyodikIsler',COL.periyodikIsler,id);},
  sabloniDinle(callback){return device().listen('periyodikSablon',rows=>callback((rows.find(x=>x.id==='sablon')||{}).gorevler||[]));},
  sabloniKaydet(gorevler){return device().set('periyodikSablon',COL.periyodikSablon,'sablon',{gorevler},{merge:false});}
};
global.PeriyodikRepository=PeriyodikRepository;
const PeriyodikService={
  _yetkiKontrol(){if(!duzenleyebilir('periyodikIsler')){toast('Bu işlem için yetkiniz yok.');return false;}return true;},
  isKaydet(id,veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return id?PeriyodikRepository.isGuncelle(id,veri):PeriyodikRepository.isEkle({...veri,eklenmeTarihi:new Date().toISOString()});},
  isSil(id){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return PeriyodikRepository.isSil(id);},
  tamamlandiGuncelle(id,deger){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return PeriyodikRepository.isGuncelle(id,{tamamlandi:deger});},
  sabloniKaydet(gorevler){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return PeriyodikRepository.sabloniKaydet(gorevler);},
  _gunToISO(yil,ay0,gun){const son=new Date(yil,ay0+1,0).getDate();return`${yil}-${String(ay0+1).padStart(2,'0')}-${String(Math.min(Math.max(gun,1),son)).padStart(2,'0')}`;},
  _grupAnahtari(p){const t=p.bitis||p.baslangic;return t?t.slice(0,7):'9999-99';},
  async buAyinGorevleriniOlustur(sablon,mevcutIsler){if(!this._yetkiKontrol())throw new Error('yetkisiz');if(!sablon.length)throw new Error('sablon-bos');const d=new Date(),y=d.getFullYear(),a=d.getMonth();let olusturulan=0,atlanan=0;for(const g of sablon){if(!g.isAdi)continue;const baslangic=this._gunToISO(y,a,g.baslangicGun),bitis=this._gunToISO(y,a,g.bitisGun),ay=bitis.slice(0,7);if(mevcutIsler.some(p=>p.isAdi===g.isAdi&&this._grupAnahtari(p)===ay)){atlanan++;continue;}await PeriyodikRepository.isEkle({isAdi:g.isAdi,baslangic,bitis,tamamlandi:false,not:'',bildirimGonderildi:false});olusturulan++;}return{olusturulan,atlanan};}
};
global.PeriyodikService=PeriyodikService;

const OgretmenIzinRepository={
  izinleriDinle(callback){return device().listen('ogretmenIzinleri',callback);},
  izinEkle(veri){return device().add('ogretmenIzinleri',COL.ogretmenIzinleri,{...veri,eklenmeTarihi:new Date().toISOString()});},
  izinGuncelle(id,veri){return device().update('ogretmenIzinleri',COL.ogretmenIzinleri,id,veri);},
  izinSil(id){return device().remove('ogretmenIzinleri',COL.ogretmenIzinleri,id);}
};
global.OgretmenIzinRepository=OgretmenIzinRepository;
const OgretmenIzinService={
  _yetkiKontrol(){if(!duzenleyebilir('ogretmenler')){toast('Bu işlem için yetkiniz yok.');return false;}return true;},
  gunSayisiHesapla(b,b2){return Math.round((new Date(b2+'T00:00:00')-new Date(b+'T00:00:00'))/86400000)+1;},
  tarihAraligiGecerliMi(b,b2){return!!(b&&b2)&&b2>=b;},
  _isoTarihYaz(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');},
  async izinKaydet(mevcutId,eskiHatirlaticiId,adSoyad,veri){
    if(!this._yetkiKontrol())throw new Error('yetkisiz');
    if(eskiHatirlaticiId)await device().remove('hatirlaticilar',COL.hatirlaticilar,eskiHatirlaticiId);
    let hatirlaticiId=null;const bitis=new Date(veri.bitis+'T00:00:00'),hat=new Date(bitis.getTime()-86400000);
    if(hat>=new Date(todayISO()+'T00:00:00')){const h=await device().add('hatirlaticilar',COL.hatirlaticilar,{baslik:`🏥 ${adSoyad} — ${veri.tur} bitiyor`,tarih:this._isoTarihYaz(hat),saat:'',oncelik:'Orta',aciklama:`${veri.tur} kaydı ${formatTarih(veri.bitis)} tarihinde sona eriyor.`,tamamlandi:false,bildirimGonderildi:false,sahipUid:aktif().uid||''});hatirlaticiId=h.id;}
    const next={...veri,hatirlaticiId};return mevcutId?OgretmenIzinRepository.izinGuncelle(mevcutId,next):OgretmenIzinRepository.izinEkle(next);
  },
  async izinSil(id,hatirlaticiId){if(!this._yetkiKontrol())throw new Error('yetkisiz');if(hatirlaticiId)await device().remove('hatirlaticilar',COL.hatirlaticilar,hatirlaticiId);return OgretmenIzinRepository.izinSil(id);}
};
global.OgretmenIzinService=OgretmenIzinService;
})(window);
