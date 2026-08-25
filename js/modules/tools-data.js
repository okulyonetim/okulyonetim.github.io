/* Koruk Asistan — Tools veri katmanı
 * İlk taşınan araç: Kontrol Listeleri.
 * Veri AppStore/IndexedDB'de yaşar; Firestore yalnız Core SyncEngine/queue üzerinden çalışır.
 */
(function(global){
'use strict';
if(global.ToolsData)return;
function device(){if(!global.DeviceData)throw new Error('DeviceData hazır değil.');return global.DeviceData;}
const arr=t=>device().list(t);
const sortLists=rows=>(Array.isArray(rows)?rows:[]).slice().sort((a,b)=>(Number(a?.sira)||0)-(Number(b?.sira)||0));
const teacherId=()=>{const u=global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};return u.bagliOgretmenId||u.ogretmenId||'';};
const fakeDoc=row=>({exists:!!row,id:row?.id||'',data:()=>row||undefined});

const KontrolListeleriRepository={
  listeleriDinle(callback){return device().listen('kontrolListeleri',rows=>callback(sortLists(rows),{source:'device'}));},
  listeEkle(veri){return device().add('kontrolListeleri',COL.kontrolListeleri,veri);},
  listeGuncelle(id,veri){return device().update('kontrolListeleri',COL.kontrolListeleri,id,veri);},
  listeSil(id){return device().remove('kontrolListeleri',COL.kontrolListeleri,id);},
  tamamlamaGetir(ogretmenId,listeId){const id=`${ogretmenId}_${listeId}`;return Promise.resolve(fakeDoc(arr('kontrolListeTamamlama').find(x=>x.id===id)));},
  tamamlamaKaydet(ogretmenId,listeId,tamamlananMaddeIdler){const id=`${ogretmenId}_${listeId}`;return device().set('kontrolListeTamamlama',COL.kontrolListeTamamlama,id,{ogretmenId,listeId,tamamlananMaddeIdler:Array.isArray(tamamlananMaddeIdler)?tamamlananMaddeIdler:[]},{merge:true});},
  tumTamamlamalariDinle(listeId,callback){return device().listen('kontrolListeTamamlama',rows=>callback(rows.filter(x=>x.listeId===listeId)));}
};
global.KontrolListeleriRepository=KontrolListeleriRepository;

const KontrolListeleriService={
  _yaziYetkisiVar(){return typeof duzenleyebilir==='function'&&duzenleyebilir('kontrolListeleri');},
  _goruntuleyebilir(){return typeof gorebilir==='function'&&gorebilir('kontrolListeleri');},
  listeleriDinle(cb,hataCb){try{return KontrolListeleriRepository.listeleriDinle(cb,hataCb);}catch(e){hataCb?.(e);return null;}},
  listeEkle(veri){if(!this._yaziYetkisiVar())return Promise.reject(new Error('yetkisiz'));return KontrolListeleriRepository.listeEkle(veri);},
  listeGuncelle(id,veri){if(!this._yaziYetkisiVar())return Promise.reject(new Error('yetkisiz'));return KontrolListeleriRepository.listeGuncelle(id,veri);},
  listeSil(id){if(!this._yaziYetkisiVar())return Promise.reject(new Error('yetkisiz'));return KontrolListeleriRepository.listeSil(id);},
  tamamlamaGetir(ogretmenId,listeId){return KontrolListeleriRepository.tamamlamaGetir(ogretmenId,listeId);},
  tamamlamaKaydet(ogretmenId,listeId,tamamlananMaddeIdler){if(!this._goruntuleyebilir()){if(typeof toast==='function')toast('Bu modülü kullanma yetkiniz yok.');return Promise.reject(new Error('yetkisiz'));}return KontrolListeleriRepository.tamamlamaKaydet(ogretmenId,listeId,tamamlananMaddeIdler);},
  tumTamamlamalariDinle(listeId,cb,hataCb){if(!this._yaziYetkisiVar())return null;try{return KontrolListeleriRepository.tumTamamlamalariDinle(listeId,cb,hataCb);}catch(e){hataCb?.(e);return null;}}
};
global.KontrolListeleriService=KontrolListeleriService;

async function prepareControlLists(){if(!global.SyncEngine||!global.COL)return;const types=[];if(COL.kontrolListeleri){SyncEngine.register('kontrolListeleri',COL.kontrolListeleri);types.push('kontrolListeleri');}if(COL.kontrolListeTamamlama){const u=global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{},admin=!!u.admin,tid=teacherId();SyncEngine.register('kontrolListeTamamlama',COL.kontrolListeTamamlama,{query:q=>admin||!tid?q:q.where('ogretmenId','==',tid)});types.push('kontrolListeTamamlama');}if(types.length){await SyncEngine.localHydrate(types);SyncEngine.schedule(100);}}

global.ToolsData={prepareControlLists,teacherId};
})(window);
