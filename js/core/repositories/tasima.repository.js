/* TAŞIMA — local-first repository */
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
