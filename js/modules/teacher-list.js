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
let preparedFor='';

async function prepare(){
  const tid=teacherId();
  if(!tid||!global.SyncEngine||!global.COL?.ogretmenListeSablon||!global.COL?.ogretmenListeKayit)return false;
  if(preparedFor===tid)return true;
  preparedFor=tid;
  SyncEngine.register('ogretmenListeSablon',COL.ogretmenListeSablon,{query:q=>q.where('ogretmenId','==',tid)});
  SyncEngine.register('ogretmenListeKayit',COL.ogretmenListeKayit,{query:q=>q.where('ogretmenId','==',tid)});
  await SyncEngine.localHydrate(['ogretmenListeSablon','ogretmenListeKayit']);
  SyncEngine.schedule(100);
  return true;
}

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
  prepare,
  ogretmenId:teacherId,
  sablonId:templateId,
  async sablonGetir(sinif){await prepare();const id=teacherId();if(!id)return null;return OgretmenListeRepository.sablonGetir(id,sinif);},
  async sablonKaydet(sinif,veri){await prepare();const id=teacherId();if(!id)throw new Error('ogretmen-bagli-degil');return OgretmenListeRepository.sablonKaydet(id,sinif,veri);},
  kayitlariDinle(sinif,cb){const id=teacherId();if(!id){cb([]);return()=>{};}prepare().catch(e=>console.warn('[OgretmenListe]',e?.message||e));return OgretmenListeRepository.kayitlariDinle(id,sinif,cb);},
  async kayitlariGetir(sinif){await prepare();const id=teacherId();if(!id)return[];return OgretmenListeRepository.kayitlariGetir(id,sinif);},
  async kayitKaydet(sinif,mevcutId,veri){await prepare();const id=teacherId();if(!id)throw new Error('ogretmen-bagli-degil');return mevcutId?OgretmenListeRepository.kayitGuncelle(mevcutId,id,{...veri,sinif:safeClass(sinif)}):OgretmenListeRepository.kayitEkle(id,sinif,veri);},
  async kayitSil(id){await prepare();const tid=teacherId();if(!tid)throw new Error('ogretmen-bagli-degil');return OgretmenListeRepository.kayitSil(id,tid);}
};

global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='tools')prepare().catch(err=>console.warn('[OgretmenListe/prepare]',err?.message||err));});
})(window);
