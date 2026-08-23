/* ================================================================
   ÖĞRENCİ YOKLAMA — Firestore repository
   Koleksiyon: oy_yoklama, belge: {sinifId}_{YYYY-MM-DD}
   ================================================================ */
const YoklamaRepository = {
  _id(sinifId,tarih){ return sinifId+'_'+tarih; },
  _ref(sinifId,tarih){ return db.collection(COL.yoklama).doc(this._id(sinifId,tarih)); },

  async belgeGetir(sinifId,tarih){
    const snap=await this._ref(sinifId,tarih).get();
    return snap.exists?{id:snap.id,...snap.data()}:null;
  },

  dinle(sinifId,tarih,cb,hataCb){
    return this._ref(sinifId,tarih).onSnapshot(
      snap=>cb(snap.exists?{id:snap.id,...snap.data()}:null),
      hataCb||hataGoster
    );
  },

  async ogrenciDurumYaz(sinifId,tarih,ogrenciId,durum,girenUid,girenAdi){
    const ref=this._ref(sinifId,tarih);
    await ref.set({sinifId,tarih},{merge:true});
    await ref.update({
      [`kayitlar.${ogrenciId}`]:durum,
      girenUid,girenAdi,
      guncellenmeTarihi:firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async yoklamaKaydet(sinifId,tarih,kayitlar,girenUid,girenAdi){
    const ref=this._ref(sinifId,tarih);
    await ref.set({sinifId,tarih},{merge:true});
    await ref.update({
      kayitlar:{...(kayitlar||{})},
      girenUid:girenUid||null,
      girenAdi:girenAdi||'',
      guncellenmeTarihi:firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async mesajGonderildiIsaretle(sinifId,tarih,ogrenciId){
    const ref=this._ref(sinifId,tarih);
    await ref.set({sinifId,tarih},{merge:true});
    await ref.update({[`mesajGonderildi.${ogrenciId}`]:true});
  },

  async gunGetir(tarih){
    const snap=await db.collection(COL.yoklama).where('tarih','==',tarih).get();
    return snap.docs.map(d=>({id:d.id,...d.data()}));
  },

  async sinifTumunuGetir(sinifId){
    const snap=await db.collection(COL.yoklama).where('sinifId','==',sinifId).get();
    return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||'')));
  },

  async sinifAraligiGetir(sinifId,baslangicTarih,bitisTarih){
    const tum=await this.sinifTumunuGetir(sinifId);
    return tum.filter(x=>(!baslangicTarih||x.tarih>=baslangicTarih)&&(!bitisTarih||x.tarih<=bitisTarih));
  }
};
window.YoklamaRepository=YoklamaRepository;
