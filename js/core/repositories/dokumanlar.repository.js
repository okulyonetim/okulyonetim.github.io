/* ================================================================
   js/core/repositories/dokumanlar.repository.js
   DÖKÜMANLAR MODÜLÜ — TEK FIRESTORE + STORAGE ERİŞİM NOKTASI
   ================================================================ */

function _dokumanTarihDegeri(d){
  const t = d && d.yuklenmeTarihi;
  if(!t) return 0;
  if(typeof t.toMillis === 'function') return t.toMillis();
  if(typeof t.seconds === 'number') return t.seconds * 1000;
  const ms = new Date(t).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function _dokumanGuvenliDosyaAdi(ad){
  const temiz = String(ad || 'dosya')
    .replace(/[\\/\u0000-\u001f\u007f]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return (temiz || 'dosya').slice(0, 180);
}

const DokumanlarRepository = {
  /* Admin tüm kayıtları dinler. Normal kullanıcıda Firestore Rules ile
     uyumlu iki sorgu birleştirilir: herkese açık kayıtlar + kendi kayıtları.
     Böylece özel dokümanların metadata/dosyaUrl alanları başka kullanıcıya
     hiç indirilmez. */
  dokumanlariDinle(callback, hataCb){
    const hata = hataCb || hataGoster;
    const ben = (typeof AKTIF_KULLANICI !== 'undefined') ? AKTIF_KULLANICI : null;
    if(!ben || ben.admin === true){
      return db.collection(COL.dokumanlar).orderBy('yuklenmeTarihi', 'desc').onSnapshot(
        snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        hata
      );
    }

    const uid = ben.uid;
    if(!uid){ hata(new Error('Aktif kullanıcı kimliği bulunamadı.')); return ()=>{}; }
    let acik = [];
    let benim = [];
    const birlestir = ()=>{
      const map = new Map();
      [...acik, ...benim].forEach(d => map.set(d.id, d));
      callback([...map.values()].sort((a,b)=>_dokumanTarihDegeri(b)-_dokumanTarihDegeri(a)));
    };
    const u1 = db.collection(COL.dokumanlar).where('gorunurluk','==','herkes').onSnapshot(
      s=>{ acik=s.docs.map(d=>({id:d.id,...d.data()})); birlestir(); }, hata
    );
    const u2 = db.collection(COL.dokumanlar).where('olusturanUid','==',uid).onSnapshot(
      s=>{ benim=s.docs.map(d=>({id:d.id,...d.data()})); birlestir(); }, hata
    );
    return ()=>{ try{u1();}catch(_){} try{u2();}catch(_){} };
  },

  dokumanGetir(id){ return db.collection(COL.dokumanlar).doc(id).get(); },
  dokumanEkle(meta){ return db.collection(COL.dokumanlar).add(meta); },
  dokumanSil(id){ return db.collection(COL.dokumanlar).doc(id).delete(); },
  dokumanGuncelle(id, veri){ return db.collection(COL.dokumanlar).doc(id).update(veri); },

  /* Yeni güvenli yol: dokumanlar/{olusturanUid}/{dosya}.
     Görünürlük ve sahiplik ayrıca Storage custom metadata içinde tutulur. */
  dosyaYukle(dosya, sahipUid, gorunurluk, ilerlemeCb){
    return new Promise((resolve, reject)=>{
      if(!sahipUid){ reject(new Error('Dosya sahibi bulunamadı.')); return; }
      const dosyaAdi = _dokumanGuvenliDosyaAdi(dosya && dosya.name);
      const yol = `dokumanlar/${sahipUid}/${Date.now()}_${dosyaAdi}`;
      const ref = storage.ref().child(yol);
      const metadata = {
        contentType: (dosya && dosya.type) || 'application/octet-stream',
        customMetadata: {
          olusturanUid: String(sahipUid),
          gorunurluk: gorunurluk === 'herkes' ? 'herkes' : 'kisisel'
        }
      };
      const gorev = ref.put(dosya, metadata);
      gorev.on('state_changed',
        snap=>{ if(ilerlemeCb) ilerlemeCb(Math.round((snap.bytesTransferred/snap.totalBytes)*100)); },
        reject,
        async ()=>{
          try{
            const url = await gorev.snapshot.ref.getDownloadURL();
            resolve({ url, storagePath: yol });
          }catch(err){ reject(err); }
        }
      );
    });
  },

  /* Sadece yeni güvenli yol biçiminde custom metadata güncellenebilir.
     Eski dokumanlar/{dosya} kayıtları geriye dönük uyumlulukta bırakılır. */
  async dosyaGorunurlukGuncelle(storagePath, gorunurluk){
    if(!storagePath || !/^dokumanlar\/[^/]+\/.+/.test(storagePath)) return false;
    const ref = storage.ref().child(storagePath);
    const mevcut = await ref.getMetadata();
    const customMetadata = { ...(mevcut.customMetadata || {}), gorunurluk: gorunurluk === 'herkes' ? 'herkes' : 'kisisel' };
    await ref.updateMetadata({ customMetadata });
    return true;
  },

  dosyaSil(storagePath){ return storage.ref().child(storagePath).delete(); }
};
