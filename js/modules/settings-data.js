/* Koruk Asistan — Settings veri katmanı
 * Kullanıcı yönetimi + depolama sınırı.
 * Okuma/yazma cihaz-first'tür; Firestore yalnız SyncEngine + queue arka planındadır.
 */
(function(global){
'use strict';
function device(){if(!global.DeviceData)throw new Error('DeviceData hazır değil.');return global.DeviceData;}
function row(type,id){return device().get(type,id);}
function legacySeviye(v){
  const n=global.PermissionService?.normalize?.(v)||String(v||'');
  if(n==='hidden')return'gizle';
  if(n==='preview'||n==='read')return'goruntule';
  if(n==='edit')return'duzenle';
  return null;
}
function rolYetkileriniUyumla(veri){
  if(!veri?.yetkiler||typeof veri.yetkiler!=='object')return veri;
  const yetkiler={...veri.yetkiler},aliases=global.PermissionService?.aliases||{};
  Object.entries(yetkiler).forEach(([key,value])=>{
    if(!key.startsWith('module.'))return;
    const legacy=legacySeviye(value);if(!legacy)return;
    (aliases[key]||[]).forEach(alias=>{yetkiler[alias]=legacy;});
  });
  return{...veri,yetkiler};
}

const KullaniciYonetimiRepository={
  rolleriDinle(callback){return device().listen('roller',callback);},
  rolEkle(veri){return device().add('roller',COL.roller,veri);},
  rolGuncelle(id,veri){return device().update('roller',COL.roller,id,veri);},
  rolSil(id){return device().remove('roller',COL.roller,id);},
  kullanicilariDinle(callback){return device().listen('kullanicilar',callback);},
  kullaniciGuncelle(uid,veri){return device().update('kullanicilar',COL.kullanicilar,uid,veri);},
  kullaniciSil(uid){return device().remove('kullanicilar',COL.kullanicilar,uid);}
};
global.KullaniciYonetimiRepository=KullaniciYonetimiRepository;

const KullaniciYonetimiService={
  _yetkiKontrol(){if(!kullaniciYonetimiYetkisiVar()){toast('Bu işlem için yetkiniz yok.');return false;}return true;},
  rolKaydet(mevcutId,veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));veri=rolYetkileriniUyumla(veri);return mevcutId?KullaniciYonetimiRepository.rolGuncelle(mevcutId,veri):KullaniciYonetimiRepository.rolEkle(veri);},
  rolSil(id,atanmisKullaniciSayisi){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));if(atanmisKullaniciSayisi>0)return Promise.reject(new Error('rol-kullanimda:'+atanmisKullaniciSayisi));return KullaniciYonetimiRepository.rolSil(id);},
  kullaniciKaydet(uid,veri,kendiUid){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));if(uid===kendiUid&&veri.aktif===false)return Promise.reject(new Error('kendini-pasif-yapamaz'));return KullaniciYonetimiRepository.kullaniciGuncelle(uid,veri);},
  kullaniciSil(uid,kendiUid){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));if(uid===kendiUid)return Promise.reject(new Error('kendini-silemez'));return KullaniciYonetimiRepository.kullaniciSil(uid);}
};
global.KullaniciYonetimiService=KullaniciYonetimiService;

const DEPOLAMA_KATEGORILERI=['mesaj','duyuru','dokuman','takvim'];
const DEPOLAMA_KATEGORI_ADLARI={mesaj:'Mesajlaşma Dosyaları',duyuru:'Duyurular Galerisi',dokuman:'Dokümanlar',takvim:'Akademik Takvim'};
const DepolamaSinirService={
  varsayilanAyarlar(){const t={};DEPOLAMA_KATEGORILERI.forEach(k=>{t[k]={aktif:true,MB:100};});return t;},
  _tamamla(veri){const tam=this.varsayilanAyarlar();DEPOLAMA_KATEGORILERI.forEach(k=>{if(veri&&veri[k])tam[k]={...tam[k],...veri[k]};});return tam;},
  _ayar(){return row('depolamaAyarlari','ayarlar')||device().list('depolamaAyarlari')[0]||null;},
  dinle(callback){return device().listen('depolamaAyarlari',rows=>callback(this._tamamla(rows.find(x=>x.id==='ayarlar')||rows[0]||null)));},
  kaydet(ayarlar){
    if(!(typeof AKTIF_KULLANICI!=='undefined'&&AKTIF_KULLANICI&&AKTIF_KULLANICI.admin))return Promise.reject(new Error('yetkisiz'));
    return device().set('depolamaAyarlari',COL.depolamaAyarlari,'ayarlar',ayarlar,{merge:true});
  },
  async yuklemeIzniVarMi(kategori,yeniBayt){
    const aktif=global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user');
    if(!aktif)return{izinVar:true};
    const ayar=(this._ayar()?.[kategori])||{aktif:false,MB:100};
    if(!ayar.aktif)return{izinVar:true};
    const kullanici=row('kullanicilar',aktif.uid)||aktif;
    if(kullanici?.depolamaMuaf)return{izinVar:true};
    const ist=row('kullaniciIstatistikleri',aktif.uid)||device().list('kullaniciIstatistikleri').find(x=>x.id===aktif.uid)||null;
    const mevcutBayt=ist?.depolamaKullanimi?.[kategori]||0;
    const sinirBayt=Number(ayar.MB||100)*1024*1024;
    if(mevcutBayt+(yeniBayt||0)>sinirBayt){
      const kalanMB=Math.max(0,(sinirBayt-mevcutBayt)/(1024*1024)).toFixed(1);
      return{izinVar:false,mesaj:`${DEPOLAMA_KATEGORI_ADLARI[kategori]||kategori} için depolama sınırınıza (${ayar.MB} MB) ulaştınız. Kalan: ${kalanMB} MB.`};
    }
    return{izinVar:true};
  }
};
global.DepolamaSinirService=DepolamaSinirService;
})(window);
