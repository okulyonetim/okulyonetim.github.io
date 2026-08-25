/* Koruk Asistan — People veri katmanı
 * Sınıflar/öğrenciler + yoklama repository/service birleşimi.
 * Mevcut global API adları korunur; UI katmanı ve Firestore veri modeli değişmez.
 */

const SiniflarRepository = {
  siniflariDinle(callback, hataCb){
    return db.collection(COL.siniflar).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  sinifEkle(veri){ return db.collection(COL.siniflar).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  sinifGuncelle(id, veri){ return db.collection(COL.siniflar).doc(id).update(veri); },
  sinifSil(id){ return db.collection(COL.siniflar).doc(id).delete(); },
  sinifGetir(id){ return db.collection(COL.siniflar).doc(id).get(); },
  velileriDinle(callback, hataCb){
    return db.collection(COL.veliler).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  veliEkle(veri){ return db.collection(COL.veliler).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  veliGuncelle(id, veri){ return db.collection(COL.veliler).doc(id).update(veri); },
  veliSil(id){ return db.collection(COL.veliler).doc(id).delete(); },
  yeniBatch(){ return db.batch(); },
  batchSinifYaz(batch, veri, id){
    const ref = id ? db.collection(COL.siniflar).doc(id) : db.collection(COL.siniflar).doc();
    batch.set(ref, veri, { merge: true });
  },
  batchVeliYaz(batch, veri, id){
    const ref = id ? db.collection(COL.veliler).doc(id) : db.collection(COL.veliler).doc();
    batch.set(ref, veri, { merge: true });
  },
  batchVeliSil(batch, id){ batch.delete(db.collection(COL.veliler).doc(id)); },
  batchCommit(batch){ return batch.commit(); }
};

const SiniflarService = {
  _yetkiKontrol(){
    if(!duzenleyebilir('siniflar')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },
  adBenzersizMi(siniflarListesi, ad, haricId){
    return !(siniflarListesi || []).find(x => x.ad === ad && (!haricId || x.id !== haricId));
  },
  sinifKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return mevcutId ? SiniflarRepository.sinifGuncelle(mevcutId, veri) : SiniflarRepository.sinifEkle(veri);
  },
  sinifSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return SiniflarRepository.sinifSil(id);
  },
  veliKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return mevcutId ? SiniflarRepository.veliGuncelle(mevcutId, veri) : SiniflarRepository.veliEkle(veri);
  },
  veliSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return SiniflarRepository.veliSil(id);
  },
  _kulupDanismaniMi(kulupId){
    const ben = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;
    if(!ben) return false;
    const kulup = (typeof cizelgeVerileri !== 'undefined' && cizelgeVerileri.sosyalKulupler || []).find(k=>k.id===kulupId);
    return !!(kulup && Array.isArray(kulup.ogretmenIdler) && kulup.ogretmenIdler.includes(ben.id));
  },
  ogrenciKulupGuncelle(ogrenciId, kulupId, kulupAdi){
    const genelYetkiVar = this._yetkiKontrolSessiz();
    const kulupDanismaniMi = this._kulupDanismaniMi(kulupId) || this._kulupDanismaniMi(this._ogrenciMevcutKulupId ? this._ogrenciMevcutKulupId(ogrenciId) : null);
    if(!genelYetkiVar && !kulupDanismaniMi){ toast('Bu işlem için yetkiniz yok.'); return Promise.reject(new Error('yetkisiz')); }
    return SiniflarRepository.veliGuncelle(ogrenciId, { kulupId: kulupId || '', kulupAdi: kulupAdi || '' });
  },
  _yetkiKontrolSessiz(){ return typeof duzenleyebilir==='function' && (duzenleyebilir('siniflar') || duzenleyebilir('ogrenciler')); },
  _ogrenciMevcutKulupId(ogrenciId){ const v=(typeof veliler!=='undefined'?veliler:[]).find(x=>x.id===ogrenciId); return v?v.kulupId:null; },
  _turkceEsitMi(a, b){
    return String(a||'').localeCompare(String(b||''), 'tr', { sensitivity: 'base' }) === 0;
  },
  sinifBul(siniflarListesi, ad){
    return (siniflarListesi || []).find(s => this._turkceEsitMi(s.ad, ad));
  },
  ogretmenBul(ogretmenlerListesi, adSoyad){
    return (ogretmenlerListesi || []).find(o => this._turkceEsitMi(`${o.ad} ${o.soyad}`, adSoyad));
  },
  servisBul(servislerListesi, servisAdi){
    return (servislerListesi || []).find(s => this._turkceEsitMi(s.servisAdi, servisAdi));
  },
  veliEslesenBul(velilerListesi, sinifId, ogrenciAdi){
    return (velilerListesi || []).find(v =>
      this._turkceEsitMi(v.ogrenciAdi, ogrenciAdi) && (!sinifId || v.sinifId === sinifId)
    );
  },
  eOkulEslesenBul(mevcutOgrenciler, ogrenciNo, ogrenciAdi){
    return (mevcutOgrenciler || []).find(v =>
      (ogrenciNo && v.ogrenciNo === ogrenciNo) ||
      (!ogrenciNo && this._turkceEsitMi(v.ogrenciAdi, ogrenciAdi))
    );
  },
  eOkulCinsiyetNormallestir(deger){
    const v = String(deger || '').toLocaleLowerCase('tr');
    if(v.includes('kız') || v.includes('kiz')) return 'Kız';
    if(v.includes('erkek')) return 'Erkek';
    return '';
  },
  async ogrenciVeliListesiIceAktar(satirlar, velilerListesi){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    let eklenen = 0, guncellenen = 0;
    for(const veri of satirlar){
      const mevcut = this.veliEslesenBul(velilerListesi, veri.sinifId, veri.ogrenciAdi);
      if(mevcut){ await SiniflarRepository.veliGuncelle(mevcut.id, veri); guncellenen++; }
      else { await SiniflarRepository.veliEkle(veri); eklenen++; }
    }
    return { eklenen, guncellenen };
  },
  async sinifListesiIceAktar(satirlar, siniflarListesi){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    let eklenen = 0, guncellenen = 0;
    for(const veri of satirlar){
      const mevcut = this.sinifBul(siniflarListesi, veri.ad);
      if(mevcut){ await SiniflarRepository.sinifGuncelle(mevcut.id, veri); guncellenen++; }
      else { await SiniflarRepository.sinifEkle({ ...veri, ogrenciSayisi: 0, kizSayisi: 0, erkekSayisi: 0 }); eklenen++; }
    }
    return { eklenen, guncellenen };
  },
  async eOkulPlanlariniUygula(planlar){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    let eklenecek = 0, guncellenecek = 0, silinecek = 0;
    let batch = SiniflarRepository.yeniBatch();
    let sayac = 0;
    const commitVeDevamEt = async () => { await SiniflarRepository.batchCommit(batch); batch = SiniflarRepository.yeniBatch(); sayac = 0; };
    for(const plan of planlar){
      for(const { o, eslesen } of plan.eslesmeler){
        const veri = { sinifId: plan.sinifId, ogrenciAdi: o.ogrenciAdi, ogrenciNo: o.ogrenciNo, cinsiyet: o.cinsiyet };
        if(eslesen){
          SiniflarRepository.batchVeliYaz(batch, veri, eslesen.id);
          guncellenecek++;
        } else {
          SiniflarRepository.batchVeliYaz(batch, {
            ...veri, veliAdi: '', yakinlik1: '', yakinlik2: '', yakinlik3: '',
            telefon1: '', telefon2: '', telefon3: '', adres: '', servisId: '', servisAdi: '', notlar: '',
            eklenmeTarihi: new Date().toISOString()
          });
          eklenecek++;
        }
        sayac++;
        if(sayac >= 400) await commitVeDevamEt();
      }
      for(const v of plan.silinecekler){
        SiniflarRepository.batchVeliSil(batch, v.id);
        silinecek++;
        sayac++;
        if(sayac >= 400) await commitVeDevamEt();
      }
      const kiz = plan.eslesmeler.filter(x => x.o.cinsiyet === 'Kız').length;
      const erkek = plan.eslesmeler.filter(x => x.o.cinsiyet === 'Erkek').length;
      SiniflarRepository.batchSinifYaz(batch, { kizSayisi: kiz, erkekSayisi: erkek, ogrenciSayisi: kiz + erkek }, plan.sinifId);
      sayac++;
      if(sayac >= 400) await commitVeDevamEt();
    }
    if(sayac > 0) await SiniflarRepository.batchCommit(batch);
    return { eklenecek, guncellenecek, silinecek };
  }
};

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

const YoklamaService={
  DURUMLAR:['var','yok','gec','izinli'],
  DURUM_ADLARI:{var:'Var',yok:'Yok',gec:'Geç',izinli:'İzinli'},
  _kendiKimlik(){
    const kimlik=(typeof _hesapKimligi==='function')?_hesapKimligi():{ad:''};
    return{
      uid:(typeof AKTIF_KULLANICI!=='undefined'&&AKTIF_KULLANICI)?AKTIF_KULLANICI.uid:null,
      ad:kimlik.ad||(typeof AKTIF_KULLANICI!=='undefined'&&AKTIF_KULLANICI?(AKTIF_KULLANICI.ad||AKTIF_KULLANICI.kullaniciAdi):'')||'Kullanıcı',
      adminMi:!!(typeof AKTIF_KULLANICI!=='undefined'&&AKTIF_KULLANICI&&AKTIF_KULLANICI.admin===true)
    };
  },
  bugununTarihi(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;},
  belgeGetir(sinifId,tarih){return YoklamaRepository.belgeGetir(sinifId,tarih);},
  dinle(sinifId,tarih,cb,hataCb){return YoklamaRepository.dinle(sinifId,tarih,cb,hataCb);},
  erisilebilirSiniflar(){
    const tum=(typeof siniflar!=='undefined'?siniflar:[]).slice();
    if(this._kendiKimlik().adminMi)return tum.sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr'));
    const ben=(typeof bagliOgretmenimGetir==='function')?bagliOgretmenimGetir():null;
    if(!ben)return [];
    const adlar=new Set();
    (typeof dersProgrami!=='undefined'?dersProgrami:[]).filter(d=>d.ogretmenId===ben.id).forEach(d=>{if(d.sinif)adlar.add(d.sinif)});
    tum.filter(s=>s.sinifOgretmeniId===ben.id).forEach(s=>adlar.add(s.ad));
    return tum.filter(s=>adlar.has(s.ad)).sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr'));
  },
  ogrenciDurumKaydet(sinifId,tarih,ogrenciId,durum){
    if(typeof gorebilir==='function'&&!gorebilir('yoklama'))return Promise.reject(new Error('yetkisiz'));
    if(!this.DURUMLAR.includes(durum))return Promise.reject(new Error('geçersiz durum'));
    const ben=this._kendiKimlik();return YoklamaRepository.ogrenciDurumYaz(sinifId,tarih,ogrenciId,durum,ben.uid,ben.ad);
  },
  yoklamaKaydet(sinifId,tarih,kayitlar){
    if(typeof gorebilir==='function'&&!gorebilir('yoklama'))return Promise.reject(new Error('yetkisiz'));
    const izinliSinif=this.erisilebilirSiniflar().some(s=>s.id===sinifId);
    if(!izinliSinif&&!this._kendiKimlik().adminMi)return Promise.reject(new Error('yetkisiz'));
    const gecersiz=Object.values(kayitlar||{}).some(d=>!this.DURUMLAR.includes(d));
    if(gecersiz)return Promise.reject(new Error('geçersiz durum'));
    const ben=this._kendiKimlik();return YoklamaRepository.yoklamaKaydet(sinifId,tarih,kayitlar,ben.uid,ben.ad);
  },
  async gunOzetiGetir(tarih){
    if(!this._kendiKimlik().adminMi)return Promise.reject(new Error('yetkisiz'));
    return YoklamaRepository.gunGetir(tarih);
  },
  async gununDevamsizlariGetir(tarih){
    if(!this._kendiKimlik().adminMi)return Promise.reject(new Error('yetkisiz'));
    const belgeler=await YoklamaRepository.gunGetir(tarih),satirlar=[];
    belgeler.forEach(b=>{
      const kayitlar=b.kayitlar||{},gonderilmis=b.mesajGonderildi||{};
      Object.keys(kayitlar).forEach(ogrenciId=>{
        const durum=kayitlar[ogrenciId];if(durum!=='yok'&&durum!=='gec')return;
        const veli=(typeof veliler!=='undefined'?veliler:[]).find(v=>v.id===ogrenciId);if(!veli)return;
        const sinif=(typeof siniflar!=='undefined'?siniflar:[]).find(s=>s.id===b.sinifId);
        satirlar.push({sinifId:b.sinifId,tarih:b.tarih,ogrenciId,durum,ogrenciAdi:veli.ogrenciAdi||'',veliAdi:veli.veliAdi||'',telefon:veli.telefon1||veli.telefon||veli.telefon2||'',sinifAdi:sinif?sinif.ad:'',gonderildi:!!gonderilmis[ogrenciId]});
      });
    });
    return satirlar.sort((a,b)=>(a.sinifAdi||'').localeCompare(b.sinifAdi||'','tr')||(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));
  },
  mesajGonderildiIsaretle(sinifId,tarih,ogrenciId){if(!this._kendiKimlik().adminMi)return Promise.reject(new Error('yetkisiz'));return YoklamaRepository.mesajGonderildiIsaretle(sinifId,tarih,ogrenciId);},
  _telefonuTemizle(ham){if(!ham)return null;let t=String(ham).replace(/\D/g,'');if(t.startsWith('0090'))t=t.slice(2);if(t.startsWith('90')&&t.length===12)t=t.slice(2);if(t.startsWith('0')&&t.length===11)t=t.slice(1);if(t.length!==10)return null;return '90'+t;},
  mesajMetniOlustur(s){const [y,a,g]=(s.tarih||'').split('-'),tr=(y&&a&&g)?`${g}.${a}.${y}`:s.tarih,okul=(typeof okulBilgileriAyari!=='undefined'&&okulBilgileriAyari?.okulAdi)||'Okulumuz',durum=s.durum==='gec'?'derse geç kalmıştır':s.durum==='izinli'?'izinli olarak işaretlenmiştir':'okula gelmemiştir';return `Sayın ${s.veliAdi||'Velimiz'}, öğrenciniz ${s.ogrenciAdi}, ${tr} tarihinde ${durum}. Bilginize. — ${okul}`;},
  whatsappLinkOlustur(s){const tel=this._telefonuTemizle(s.telefon);if(!tel)return null;return `https://wa.me/${tel}?text=${encodeURIComponent(this.mesajMetniOlustur(s))}`;},
  smsLinkOlustur(s){const tel=this._telefonuTemizle(s.telefon);if(!tel)return null;return `sms:+${tel}?body=${encodeURIComponent(this.mesajMetniOlustur(s))}`;},
  async ogrenciGecmisiGetir(sinifId,ogrenciId){
    if(!sinifId||!ogrenciId)return[];
    const belgeler=await YoklamaRepository.sinifTumunuGetir(sinifId);
    return belgeler.filter(b=>b.kayitlar&&b.kayitlar[ogrenciId]).map(b=>({tarih:b.tarih,durum:b.kayitlar[ogrenciId],girenAdi:b.girenAdi||''}));
  },
  async sinifOzetiGetir(sinifId,baslangicTarih,bitisTarih){
    const belgeler=await YoklamaRepository.sinifAraligiGetir(sinifId,baslangicTarih,bitisTarih),ozet={};
    belgeler.forEach(b=>Object.entries(b.kayitlar||{}).forEach(([ogrenciId,durum])=>{if(!ozet[ogrenciId])ozet[ogrenciId]={var:0,yok:0,gec:0,izinli:0};if(ozet[ogrenciId][durum]!==undefined)ozet[ogrenciId][durum]++;}));return ozet;
  }
};
window.YoklamaService=YoklamaService;
