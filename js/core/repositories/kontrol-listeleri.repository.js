/* ================================================================
   js/core/repositories/kontrol-listeleri.repository.js
   KONTROL LİSTELERİ — local-first repository

   Firestore tek kalıcı kaynak olmaya devam eder. Ekran açılışında son
   başarılı snapshot yerel cache'ten SENKRON olarak verilir; Firestore
   cache/sunucu sonucu geldiğinde aynı callback güncel veriyle yenilenir.
   Böylece UI ağ onSnapshot'ını beklemez.
   ================================================================ */
(function(global){
'use strict';

const LIST_CACHE_KEY = 'oy_kontrolListeleri_local_v1';
const TAM_CACHE_PREFIX = 'oy_kontrolTamamlama_local_v1_';

function oku(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  }catch(_){ return fallback; }
}
function yaz(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch(_){}
}
function listeSirala(arr){
  return (Array.isArray(arr)?arr:[]).slice().sort((a,b)=>(Number(a?.sira)||0)-(Number(b?.sira)||0));
}
function snapListe(s){ return listeSirala(s.docs.map(d=>({id:d.id,...d.data()}))); }
function tamKey(ogretmenId,listeId){ return TAM_CACHE_PREFIX + String(ogretmenId||'') + '_' + String(listeId||''); }
function fakeDoc(data){
  return {
    exists: !!data,
    data: function(){ return data || undefined; },
    id: data?.id || ''
  };
}

const KontrolListeleriRepository = {
  listeleriDinle(callback, hataCb){
    const ref = db.collection(COL.kontrolListeleri).orderBy('sira');
    let sonImza = null;
    const yayinla = (liste, kaynak) => {
      const temiz = listeSirala(liste);
      let imza='';
      try{ imza=JSON.stringify(temiz); }catch(_){ imza=String(Date.now()); }
      if(imza===sonImza) return;
      sonImza=imza;
      try{ callback(temiz, {source:kaynak}); }catch(e){ console.warn('[kontrol-listeleri] callback',e); }
    };

    // 1) Uygulama açılır açılmaz: ağ veya Firestore beklemeden son bilinen veri.
    const yerel = oku(LIST_CACHE_KEY, []);
    if(Array.isArray(yerel) && yerel.length) yayinla(yerel,'local');

    // 2) Firestore'un SDK cache'i varsa onu da mümkün olan en kısa sürede kullan.
    try{
      ref.get({source:'cache'}).then(s=>{
        const liste=snapListe(s);
        if(liste.length || !yerel.length){ yaz(LIST_CACHE_KEY,liste); yayinla(liste,'firestore-cache'); }
      }).catch(()=>{});
    }catch(_){}

    // 3) Tek canlı sahip: sunucu/cache snapshot geldikçe yerel cache'i güncelle.
    return ref.onSnapshot(
      s=>{
        const liste=snapListe(s);
        yaz(LIST_CACHE_KEY,liste);
        yayinla(liste, s.metadata?.fromCache ? 'firestore-cache' : 'firestore');
      },
      hataCb || (typeof hataGoster==='function'?hataGoster:console.error)
    );
  },

  listeEkle(veri){
    return db.collection(COL.kontrolListeleri).add(veri);
  },
  listeGuncelle(id, veri){
    // Ekranda eski değerin beklememesi için yerel cache'i iyimser güncelle.
    const mevcut=oku(LIST_CACHE_KEY,[]);
    if(Array.isArray(mevcut)){
      const yeni=mevcut.map(x=>x.id===id?{...x,...veri}:x);
      yaz(LIST_CACHE_KEY,listeSirala(yeni));
    }
    return db.collection(COL.kontrolListeleri).doc(id).update(veri);
  },
  listeSil(id){
    const mevcut=oku(LIST_CACHE_KEY,[]);
    if(Array.isArray(mevcut)) yaz(LIST_CACHE_KEY,mevcut.filter(x=>x.id!==id));
    return db.collection(COL.kontrolListeleri).doc(id).delete();
  },

  /* ---- Öğretmenin kendi tamamlama durumu ---- */
  tamamlamaGetir(ogretmenId, listeId){
    const key=tamKey(ogretmenId,listeId);
    const yerel=oku(key,null);
    // Yerel kayıt varsa UI'ın beklememesi için Firestore DocumentSnapshot benzeri
    // minimal nesneyi hemen döndür; arka planda Firestore cache'i yenilenir.
    if(yerel){
      try{
        db.collection(COL.kontrolListeTamamlama).doc(`${ogretmenId}_${listeId}`)
          .get({source:'cache'})
          .then(d=>{ if(d.exists) yaz(key,{id:d.id,...d.data()}); })
          .catch(()=>{});
      }catch(_){}
      return Promise.resolve(fakeDoc(yerel));
    }
    return db.collection(COL.kontrolListeTamamlama).doc(`${ogretmenId}_${listeId}`)
      .get({source:'cache'})
      .catch(()=>db.collection(COL.kontrolListeTamamlama).doc(`${ogretmenId}_${listeId}`).get())
      .then(d=>{ if(d.exists) yaz(key,{id:d.id,...d.data()}); return d; });
  },
  tamamlamaKaydet(ogretmenId, listeId, tamamlananMaddeIdler){
    const veri={ogretmenId,listeId,tamamlananMaddeIdler:Array.isArray(tamamlananMaddeIdler)?tamamlananMaddeIdler:[]};
    // Tik telefonda anında kalıcı olsun; Firestore sonra eşitlensin.
    yaz(tamKey(ogretmenId,listeId),veri);
    return db.collection(COL.kontrolListeTamamlama).doc(`${ogretmenId}_${listeId}`).set(veri,{merge:true});
  },

  /* ---- Admin özeti ---- */
  tumTamamlamalariDinle(listeId, callback, hataCb){
    return db.collection(COL.kontrolListeTamamlama).where('listeId','==',listeId).onSnapshot(
      s=>callback(s.docs.map(d=>({id:d.id,...d.data()}))),
      hataCb || (typeof hataGoster==='function'?hataGoster:console.error)
    );
  }
};

global.KontrolListeleriRepository=KontrolListeleriRepository;
})(window);
