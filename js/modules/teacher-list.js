/* Koruk Asistan — Öğretmen özel çizelgeleri local-first veri servisi.
 * UI sahibi değildir. Tools tarafından lazy-load edilir; tüm yazmalar DeviceData/SyncEngine kuyruğundan geçer.
 */
(function(global){
'use strict';
if(global.OgretmenListeService)return;
function device(){if(!global.DeviceData)throw new Error('DeviceData hazır değil.');return global.DeviceData;}
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const teacherId=()=>user().bagliOgretmenId||user().ogretmenId||'';
const own=(row,id)=>!!row&&!!id&&row.ogretmenId===id;
const safeClass=v=>String(v||'').trim();
const templateId=(ogretmenId,sinif)=>`${ogretmenId}__${safeClass(sinif)}`.replace(/[^\w\-]/g,'_');

const OgretmenListeRepository={
  sablonId:templateId,
  sablonGetir(ogretmenId,sinif){const id=templateId(ogretmenId,sinif);return Promise.resolve(device().list('ogretmenListeSablon').find(x=>x.id===id)||null);},
  sablonKaydet(ogretmenId,sinif,veri){const id=templateId(ogretmenId,sinif);return device().set('ogretmenListeSablon',COL.ogretmenListeSablon,id,{...veri,ogretmenId,sinif:safeClass(sinif),guncellenme:new Date().toISOString()},{merge:false});},
  kayitlariDinle(ogretmenId,sinif,callback){return device().listen('ogretmenListeKayit',rows=>callback((rows||[]).filter(x=>own(x,ogretmenId)&&x.sinif===safeClass(sinif)).sort((a,b)=>String(b.guncellenme||'').localeCompare(String(a.guncellenme||'')))));},
  kayitlariGetir(ogretmenId,sinif){return Promise.resolve(device().list('ogretmenListeKayit').filter(x=>own(x,ogretmenId)&&x.sinif===safeClass(sinif)).sort((a,b)=>String(b.guncellenme||'').localeCompare(String(a.guncellenme||''))));},
  kayitEkle(ogretmenId,sinif,veri){const now=new Date().toISOString();return device().add('ogretmenListeKayit',COL.ogretmenListeKayit,{...veri,ogretmenId,sinif:safeClass(sinif),olusturulma:veri.olusturulma||now,guncellenme:now});},
  kayitGuncelle(id,ogretmenId,veri){const mevcut=device().list('ogretmenListeKayit').find(x=>x.id===id);if(mevcut&&!own(mevcut,ogretmenId))return Promise.reject(new Error('sahip-degil'));return device().update('ogretmenListeKayit',COL.ogretmenListeKayit,id,{...veri,ogretmenId,guncellenme:new Date().toISOString()});},
  kayitSil(id,ogretmenId){const mevcut=device().list('ogretmenListeKayit').find(x=>x.id===id);if(mevcut&&!own(mevcut,ogretmenId))return Promise.reject(new Error('sahip-degil'));return device().remove('ogretmenListeKayit',COL.ogretmenListeKayit,id);}
};

global.OgretmenListeRepository=OgretmenListeRepository;
global.OgretmenListeService={
  ogretmenId:teacherId,
  sablonId:templateId,
  sablonGetir(sinif){const id=teacherId();if(!id)return Promise.resolve(null);return OgretmenListeRepository.sablonGetir(id,sinif);},
  sablonKaydet(sinif,veri){const id=teacherId();if(!id)return Promise.reject(new Error('ogretmen-bagli-degil'));return OgretmenListeRepository.sablonKaydet(id,sinif,veri);},
  kayitlariDinle(sinif,cb){const id=teacherId();if(!id){cb([]);return()=>{};}return OgretmenListeRepository.kayitlariDinle(id,sinif,cb);},
  kayitlariGetir(sinif){const id=teacherId();if(!id)return Promise.resolve([]);return OgretmenListeRepository.kayitlariGetir(id,sinif);},
  kayitKaydet(sinif,mevcutId,veri){const id=teacherId();if(!id)return Promise.reject(new Error('ogretmen-bagli-degil'));return mevcutId?OgretmenListeRepository.kayitGuncelle(mevcutId,id,{...veri,sinif:safeClass(sinif)}):OgretmenListeRepository.kayitEkle(id,sinif,veri);},
  kayitSil(id){const tid=teacherId();if(!tid)return Promise.reject(new Error('ogretmen-bagli-degil'));return OgretmenListeRepository.kayitSil(id,tid);}
};
})(window);
