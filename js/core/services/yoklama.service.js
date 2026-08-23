/* ================================================================
   ÖĞRENCİ YOKLAMA — servis / iş kuralları
   ================================================================ */
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
