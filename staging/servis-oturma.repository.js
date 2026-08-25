/* SERVİS OTURMA — local-first repository */
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
