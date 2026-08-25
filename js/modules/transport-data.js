/* Koruk Asistan — Transport veri katmanı
 * Taşıma + servis oturma + sınıf oturma repository/service birleşimi.
 * Mevcut local-first cache anahtarları ve global API adları korunur.
 */

(function(global){
'use strict';
const CACHE_KEY='oy_tasima_servisler_local_v1';
function oku(){try{const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'[]');return Array.isArray(x)?x:[];}catch(_){return[];}}
function yaz(v){try{localStorage.setItem(CACHE_KEY,JSON.stringify(Array.isArray(v)?v:[]));}catch(_){}}
function imza(v){try{return JSON.stringify(v);}catch(_){return String(Date.now());}}
const TasimaRepository={
  servisleriDinle(callback,hataCb){
    const ref=db.collection(COL.servisler);let son='';
    const yayinla=(v,kaynak)=>{const arr=Array.isArray(v)?v:[];const i=imza(arr);if(i===son)return;son=i;callback(arr,{source:kaynak});};
    const yerel=oku();if(yerel.length)yayinla(yerel,'local');
    try{ref.get({source:'cache'}).then(s=>{const a=s.docs.map(d=>({id:d.id,...d.data()}));if(a.length||!yerel.length){yaz(a);yayinla(a,'firestore-cache');}}).catch(()=>{});}catch(_){}
    return ref.onSnapshot(s=>{const a=s.docs.map(d=>({id:d.id,...d.data()}));yaz(a);yayinla(a,s.metadata?.fromCache?'firestore-cache':'firestore');},hataCb||(typeof hataGoster==='function'?hataGoster:console.error));
  },
  servisEkle(veri){return db.collection(COL.servisler).add({...veri,eklenmeTarihi:new Date().toISOString()});},
  servisGuncelle(id,veri){yaz(oku().map(x=>x.id===id?{...x,...veri}:x));return db.collection(COL.servisler).doc(id).update(veri);},
  servisSil(id){yaz(oku().filter(x=>x.id!==id));return db.collection(COL.servisler).doc(id).delete();}
};
global.TasimaRepository=TasimaRepository;
})(window);

const TasimaService = {
  _yetkiKontrol(){
    if(!duzenleyebilir('tasima')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },
  servisKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return mevcutId ? window.TasimaRepository.servisGuncelle(mevcutId, veri) : window.TasimaRepository.servisEkle(veri);
  },
  servisSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return window.TasimaRepository.servisSil(id);
  },
  ogrencileriServiseAta(ogrenciIdListesi, servisId, servisAdi){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return Promise.all(ogrenciIdListesi.map(vId => SiniflarRepository.veliGuncelle(vId, { servisId, servisAdi })));
  }
};

(function(global){
'use strict';
const CACHE_KEY='oy_servis_oturma_local_v1';
function oku(){try{const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'[]');return Array.isArray(x)?x:[];}catch(_){return[];}}
function yaz(v){try{localStorage.setItem(CACHE_KEY,JSON.stringify(Array.isArray(v)?v:[]));}catch(_){}}
const ServisOturmaRepository={
  planlariDinle(callback,hataCb){
    const ref=db.collection(COL.servisOturma);let son='';
    const yayin=(a,k)=>{let i='';try{i=JSON.stringify(a)}catch(_){i=String(Date.now())}if(i===son)return;son=i;callback(a,{source:k});};
    const yerel=oku();if(yerel.length)yayin(yerel,'local');
    try{ref.get({source:'cache'}).then(s=>{const a=s.docs.map(d=>({id:d.id,...d.data()}));if(a.length||!yerel.length){yaz(a);yayin(a,'firestore-cache');}}).catch(()=>{});}catch(_){}
    return ref.onSnapshot(s=>{const a=s.docs.map(d=>({id:d.id,...d.data()}));yaz(a);yayin(a,s.metadata?.fromCache?'firestore-cache':'firestore');},hataCb||(e=>console.warn('servisOturma:',e)));
  },
  planKaydet(servisId,veri,merge){const a=oku();const ix=a.findIndex(x=>x.id===servisId);const nv={id:servisId,...(merge&&ix>=0?a[ix]:{}),...veri};if(ix>=0)a[ix]=nv;else a.push(nv);yaz(a);return db.collection(COL.servisOturma).doc(servisId).set(veri,{merge:!!merge});},
  planGuncelle(servisId,kismiVeri){yaz(oku().map(x=>x.id===servisId?{...x,...kismiVeri}:x));return db.collection(COL.servisOturma).doc(servisId).update(kismiVeri);},
  planServisIdIleGetir(servisId){return db.collection(COL.servisOturma).where('servisId','==',servisId).get({source:'cache'}).catch(()=>db.collection(COL.servisOturma).where('servisId','==',servisId).get());}
};
global.ServisOturmaRepository=ServisOturmaRepository;
})(window);

const ServisOturmaService = {
  _yetkiKontrol(){
    if(!duzenleyebilir('tasima')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },
  planKaydet(servisId, veri, merge){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return window.ServisOturmaRepository.planKaydet(servisId, veri, merge);
  },
  planGuncelle(servisId, kismiVeri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return window.ServisOturmaRepository.planGuncelle(servisId, kismiVeri);
  }
};

const SinifOturmaRepository = {
  planGetir(sinifId){ return db.collection(COL.sinifOturma).doc(sinifId).get(); },
  planDinle(sinifId, callback, hataCb){
    return db.collection(COL.sinifOturma).doc(sinifId).onSnapshot(
      d => callback(d.exists ? { id: d.id, ...d.data() } : null),
      hataCb || (err => console.warn('sinifOturma:', err))
    );
  },
  planKaydet(sinifId, veri){ return db.collection(COL.sinifOturma).doc(sinifId).set(veri, { merge: false }); }
};

const SinifOturmaService = {
  _yetkiKontrol(){
    if(!duzenleyebilir('siniflar')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },
  planGetir(sinifId){ return SinifOturmaRepository.planGetir(sinifId); },
  planDinle(sinifId, callback, hataCb){ return SinifOturmaRepository.planDinle(sinifId, callback, hataCb); },
  planKaydet(sinifId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return SinifOturmaRepository.planKaydet(sinifId, veri);
  }
};
