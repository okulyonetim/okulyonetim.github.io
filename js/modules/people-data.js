/* Koruk Asistan — People veri katmanı
 * Sınıf/öğrenci + yoklama repository/service birleşimi.
 * Veri akışı: DeviceData/IndexedDB -> AppStore -> UI; Firestore yalnız queue/sync arka planındadır.
 */
(function(global){
'use strict';
function device(){if(!global.DeviceData)throw new Error('DeviceData hazır değil.');return global.DeviceData;}
const list=t=>device().list(t);
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
function fakeDoc(row,id){return{exists:!!row,id:id||row?.id||'',data:()=>row?{...row}:undefined};}

const SiniflarRepository={
  siniflariDinle(callback){return device().listen('siniflar',callback);},
  sinifEkle(veri){return device().add('siniflar',COL.siniflar,{...veri,eklenmeTarihi:new Date().toISOString()});},
  sinifGuncelle(id,veri){return device().update('siniflar',COL.siniflar,id,veri);},
  sinifSil(id){return device().remove('siniflar',COL.siniflar,id);},
  sinifGetir(id){return Promise.resolve(fakeDoc(device().get('siniflar',id),id));},
  velileriDinle(callback){return device().listen('veliler',callback);},
  veliEkle(veri){return device().add('veliler',COL.veliler,{...veri,eklenmeTarihi:new Date().toISOString()});},
  veliGuncelle(id,veri){return device().update('veliler',COL.veliler,id,veri);},
  veliSil(id){return device().remove('veliler',COL.veliler,id);},
  yeniBatch(){return[];},
  batchSinifYaz(batch,veri,id){batch.push({type:'siniflar',collection:COL.siniflar,kind:'set',id:id||device().newId(),data:veri,merge:true});},
  batchVeliYaz(batch,veri,id){batch.push({type:'veliler',collection:COL.veliler,kind:'set',id:id||device().newId(),data:veri,merge:true});},
  batchVeliSil(batch,id){batch.push({type:'veliler',collection:COL.veliler,kind:'remove',id});},
  async batchCommit(batch){
    for(const op of batch||[]){if(op.kind==='remove')await device().remove(op.type,op.collection,op.id);else await device().set(op.type,op.collection,op.id,op.data,{merge:op.merge});}
    return true;
  }
};
global.SiniflarRepository=SiniflarRepository;

const SiniflarService={
  _yetkiKontrol(){if(!duzenleyebilir('siniflar')){toast('Bu işlem için yetkiniz yok.');return false;}return true;},
  _yetkiKontrolSessiz(){return typeof duzenleyebilir==='function'&&(duzenleyebilir('siniflar')||duzenleyebilir('ogrenciler'));},
  adBenzersizMi(liste,ad,haricId){return!(liste||[]).find(x=>x.ad===ad&&(!haricId||x.id!==haricId));},
  sinifKaydet(mevcutId,veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return mevcutId?SiniflarRepository.sinifGuncelle(mevcutId,veri):SiniflarRepository.sinifEkle(veri);},
  sinifSil(id){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return SiniflarRepository.sinifSil(id);},
  veliKaydet(mevcutId,veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return mevcutId?SiniflarRepository.veliGuncelle(mevcutId,veri):SiniflarRepository.veliEkle(veri);},
  veliSil(id){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return SiniflarRepository.veliSil(id);},
  _bagliOgretmen(){const id=user()?.bagliOgretmenId;return id?list('ogretmenler').find(x=>x.id===id)||null:null;},
  _kulupDanismaniMi(kulupId){
    const ben=(typeof bagliOgretmenimGetir==='function'?bagliOgretmenimGetir():this._bagliOgretmen());if(!ben)return false;
    const kulupler=list('sosyalKulupler');const kulup=kulupler.find(k=>k.id===kulupId);return!!(kulup&&Array.isArray(kulup.ogretmenIdler)&&kulup.ogretmenIdler.includes(ben.id));
  },
  _ogrenciMevcutKulupId(id){return list('veliler').find(x=>x.id===id)?.kulupId||null;},
  ogrenciKulupGuncelle(ogrenciId,kulupId,kulupAdi){
    const genel=this._yetkiKontrolSessiz(),danisman=this._kulupDanismaniMi(kulupId)||this._kulupDanismaniMi(this._ogrenciMevcutKulupId(ogrenciId));
    if(!genel&&!danisman){toast('Bu işlem için yetkiniz yok.');return Promise.reject(new Error('yetkisiz'));}
    return SiniflarRepository.veliGuncelle(ogrenciId,{kulupId:kulupId||'',kulupAdi:kulupAdi||''});
  },
  _turkceEsitMi(a,b){return String(a||'').localeCompare(String(b||''),'tr',{sensitivity:'base'})===0;},
  sinifBul(liste,ad){return(liste||[]).find(s=>this._turkceEsitMi(s.ad,ad));},
  ogretmenBul(liste,adSoyad){return(liste||[]).find(o=>this._turkceEsitMi(`${o.ad} ${o.soyad}`,adSoyad));},
  servisBul(liste,servisAdi){return(liste||[]).find(s=>this._turkceEsitMi(s.servisAdi,servisAdi));},
  veliEslesenBul(liste,sinifId,ogrenciAdi){return(liste||[]).find(v=>this._turkceEsitMi(v.ogrenciAdi,ogrenciAdi)&&(!sinifId||v.sinifId===sinifId));},
  eOkulEslesenBul(liste,no,ad){return(liste||[]).find(v=>(no&&v.ogrenciNo===no)||(!no&&this._turkceEsitMi(v.ogrenciAdi,ad)));},
  eOkulCinsiyetNormallestir(deger){const v=String(deger||'').toLocaleLowerCase('tr');if(v.includes('kız')||v.includes('kiz'))return'Kız';if(v.includes('erkek'))return'Erkek';return'';},
  async ogrenciVeliListesiIceAktar(satirlar,mevcutListe){
    if(!this._yetkiKontrol())throw new Error('yetkisiz');let eklenen=0,guncellenen=0;
    for(const veri of satirlar||[]){const mevcut=this.veliEslesenBul(mevcutListe,veri.sinifId,veri.ogrenciAdi);if(mevcut){await SiniflarRepository.veliGuncelle(mevcut.id,veri);guncellenen++;}else{await SiniflarRepository.veliEkle(veri);eklenen++;}}
    return{eklenen,guncellenen};
  },
  async sinifListesiIceAktar(satirlar,mevcutListe){
    if(!this._yetkiKontrol())throw new Error('yetkisiz');let eklenen=0,guncellenen=0;
    for(const veri of satirlar||[]){const mevcut=this.sinifBul(mevcutListe,veri.ad);if(mevcut){await SiniflarRepository.sinifGuncelle(mevcut.id,veri);guncellenen++;}else{await SiniflarRepository.sinifEkle({...veri,ogrenciSayisi:0,kizSayisi:0,erkekSayisi:0});eklenen++;}}
    return{eklenen,guncellenen};
  },
  async eOkulPlanlariniUygula(planlar){
    if(!this._yetkiKontrol())throw new Error('yetkisiz');let eklenecek=0,guncellenecek=0,silinecek=0,batch=SiniflarRepository.yeniBatch(),sayac=0;
    const commit=async()=>{if(batch.length)await SiniflarRepository.batchCommit(batch);batch=SiniflarRepository.yeniBatch();sayac=0;};
    for(const plan of planlar||[]){
      for(const{ o,eslesen }of plan.eslesmeler||[]){const veri={sinifId:plan.sinifId,ogrenciAdi:o.ogrenciAdi,ogrenciNo:o.ogrenciNo,cinsiyet:o.cinsiyet};if(eslesen){SiniflarRepository.batchVeliYaz(batch,veri,eslesen.id);guncellenecek++;}else{SiniflarRepository.batchVeliYaz(batch,{...veri,veliAdi:'',yakinlik1:'',yakinlik2:'',yakinlik3:'',telefon1:'',telefon2:'',telefon3:'',adres:'',servisId:'',servisAdi:'',notlar:'',eklenmeTarihi:new Date().toISOString()});eklenecek++;}if(++sayac>=400)await commit();}
      for(const v of plan.silinecekler||[]){SiniflarRepository.batchVeliSil(batch,v.id);silinecek++;if(++sayac>=400)await commit();}
      const kiz=(plan.eslesmeler||[]).filter(x=>x.o.cinsiyet==='Kız').length,erkek=(plan.eslesmeler||[]).filter(x=>x.o.cinsiyet==='Erkek').length;SiniflarRepository.batchSinifYaz(batch,{kizSayisi:kiz,erkekSayisi:erkek,ogrenciSayisi:kiz+erkek},plan.sinifId);if(++sayac>=400)await commit();
    }
    await commit();return{eklenecek,guncellenecek,silinecek};
  }
};
global.SiniflarService=SiniflarService;

let yoklamaPrepared=false;
async function prepareYoklama(){
  if(yoklamaPrepared||!global.SyncEngine||!global.COL?.yoklama)return;yoklamaPrepared=true;SyncEngine.register('yoklama',COL.yoklama);await SyncEngine.localHydrate(['yoklama']);SyncEngine.schedule(100);
}
const YoklamaRepository={
  _id(sinifId,tarih){return`${sinifId}_${tarih}`;},
  _row(sinifId,tarih){return device().get('yoklama',this._id(sinifId,tarih));},
  async belgeGetir(sinifId,tarih){await prepareYoklama();const r=this._row(sinifId,tarih);return r?{...r}:null;},
  dinle(sinifId,tarih,cb,hataCb){
    prepareYoklama().catch(e=>hataCb?.(e));const yayin=()=>cb(this._row(sinifId,tarih)||null,{source:'device'});yayin();return AppStore.subscribe('data.yoklama',yayin);
  },
  async _merge(sinifId,tarih,patch){await prepareYoklama();const id=this._id(sinifId,tarih),mevcut=this._row(sinifId,tarih)||{id,sinifId,tarih};return device().set('yoklama',COL.yoklama,id,{...mevcut,...patch,sinifId,tarih},{merge:true});},
  async ogrenciDurumYaz(sinifId,tarih,ogrenciId,durum,girenUid,girenAdi){const m=this._row(sinifId,tarih)||{},kayitlar={...(m.kayitlar||{}),[ogrenciId]:durum};return this._merge(sinifId,tarih,{kayitlar,girenUid,girenAdi,guncellenmeTarihi:new Date().toISOString()});},
  yoklamaKaydet(sinifId,tarih,kayitlar,girenUid,girenAdi){return this._merge(sinifId,tarih,{kayitlar:{...(kayitlar||{})},girenUid:girenUid||null,girenAdi:girenAdi||'',guncellenmeTarihi:new Date().toISOString()});},
  async mesajGonderildiIsaretle(sinifId,tarih,ogrenciId){const m=this._row(sinifId,tarih)||{},mesajGonderildi={...(m.mesajGonderildi||{}),[ogrenciId]:true};return this._merge(sinifId,tarih,{mesajGonderildi});},
  async gunGetir(tarih){await prepareYoklama();return list('yoklama').filter(x=>x.tarih===tarih);},
  async sinifTumunuGetir(sinifId){await prepareYoklama();return list('yoklama').filter(x=>x.sinifId===sinifId).sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||'')));},
  async sinifAraligiGetir(sinifId,baslangic,bitis){const tum=await this.sinifTumunuGetir(sinifId);return tum.filter(x=>(!baslangic||x.tarih>=baslangic)&&(!bitis||x.tarih<=bitis));}
};
global.YoklamaRepository=YoklamaRepository;

const YoklamaService={
  DURUMLAR:['var','yok','gec','izinli'],DURUM_ADLARI:{var:'Var',yok:'Yok',gec:'Geç',izinli:'İzinli'},
  _kendiKimlik(){const u=user(),kimlik=(typeof _hesapKimligi==='function')?_hesapKimligi():{ad:''};return{uid:u.uid||null,ad:kimlik.ad||u.ad||u.kullaniciAdi||'Kullanıcı',adminMi:u.admin===true};},
  bugununTarihi(){const d=new Date(),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;},
  belgeGetir(s,t){return YoklamaRepository.belgeGetir(s,t);},dinle(s,t,cb,h){return YoklamaRepository.dinle(s,t,cb,h);},
  erisilebilirSiniflar(){
    const tum=[...list('siniflar')];if(this._kendiKimlik().adminMi)return tum.sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr'));
    const benId=user()?.bagliOgretmenId;if(!benId)return[];const adlar=new Set();list('dersProgrami').filter(d=>d.ogretmenId===benId).forEach(d=>{if(d.sinif)adlar.add(d.sinif)});tum.filter(s=>s.sinifOgretmeniId===benId).forEach(s=>adlar.add(s.ad));return tum.filter(s=>adlar.has(s.ad)).sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr'));
  },
  ogrenciDurumKaydet(s,t,o,d){if(typeof gorebilir==='function'&&!gorebilir('yoklama'))return Promise.reject(new Error('yetkisiz'));if(!this.DURUMLAR.includes(d))return Promise.reject(new Error('geçersiz durum'));const b=this._kendiKimlik();return YoklamaRepository.ogrenciDurumYaz(s,t,o,d,b.uid,b.ad);},
  yoklamaKaydet(s,t,k){if(typeof gorebilir==='function'&&!gorebilir('yoklama'))return Promise.reject(new Error('yetkisiz'));if(!this.erisilebilirSiniflar().some(x=>x.id===s)&&!this._kendiKimlik().adminMi)return Promise.reject(new Error('yetkisiz'));if(Object.values(k||{}).some(d=>!this.DURUMLAR.includes(d)))return Promise.reject(new Error('geçersiz durum'));const b=this._kendiKimlik();return YoklamaRepository.yoklamaKaydet(s,t,k,b.uid,b.ad);},
  async gunOzetiGetir(t){if(!this._kendiKimlik().adminMi)throw new Error('yetkisiz');return YoklamaRepository.gunGetir(t);},
  async gununDevamsizlariGetir(t){if(!this._kendiKimlik().adminMi)throw new Error('yetkisiz');const belgeler=await YoklamaRepository.gunGetir(t),satirlar=[];for(const b of belgeler)for(const[ogrenciId,durum]of Object.entries(b.kayitlar||{})){if(!['yok','gec'].includes(durum))continue;const veli=list('veliler').find(v=>v.id===ogrenciId);if(!veli)continue;const sinif=list('siniflar').find(s=>s.id===b.sinifId);satirlar.push({sinifId:b.sinifId,tarih:b.tarih,ogrenciId,durum,ogrenciAdi:veli.ogrenciAdi||'',veliAdi:veli.veliAdi||'',telefon:veli.telefon1||veli.telefon||veli.telefon2||'',sinifAdi:sinif?.ad||'',gonderildi:!!b.mesajGonderildi?.[ogrenciId]});}return satirlar.sort((a,b)=>(a.sinifAdi||'').localeCompare(b.sinifAdi||'','tr')||(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));},
  mesajGonderildiIsaretle(s,t,o){if(!this._kendiKimlik().adminMi)return Promise.reject(new Error('yetkisiz'));return YoklamaRepository.mesajGonderildiIsaretle(s,t,o);},
  _telefonuTemizle(ham){if(!ham)return null;let t=String(ham).replace(/\D/g,'');if(t.startsWith('0090'))t=t.slice(2);if(t.startsWith('90')&&t.length===12)t=t.slice(2);if(t.startsWith('0')&&t.length===11)t=t.slice(1);return t.length===10?'90'+t:null;},
  mesajMetniOlustur(s){const[y,a,g]=(s.tarih||'').split('-'),tr=y&&a&&g?`${g}.${a}.${y}`:s.tarih,okul=global.AppStore?.data?.('okulBilgileri')?.[0]?.okulAdi||'Okulumuz',durum=s.durum==='gec'?'derse geç kalmıştır':s.durum==='izinli'?'izinli olarak işaretlenmiştir':'okula gelmemiştir';return`Sayın ${s.veliAdi||'Velimiz'}, öğrenciniz ${s.ogrenciAdi}, ${tr} tarihinde ${durum}. Bilginize. — ${okul}`;},
  whatsappLinkOlustur(s){const tel=this._telefonuTemizle(s.telefon);return tel?`https://wa.me/${tel}?text=${encodeURIComponent(this.mesajMetniOlustur(s))}`:null;},smsLinkOlustur(s){const tel=this._telefonuTemizle(s.telefon);return tel?`sms:+${tel}?body=${encodeURIComponent(this.mesajMetniOlustur(s))}`:null;},
  async ogrenciGecmisiGetir(s,o){if(!s||!o)return[];const belgeler=await YoklamaRepository.sinifTumunuGetir(s);return belgeler.filter(b=>b.kayitlar?.[o]).map(b=>({tarih:b.tarih,durum:b.kayitlar[o],girenAdi:b.girenAdi||''}));},
  async sinifOzetiGetir(s,b1,b2){const belgeler=await YoklamaRepository.sinifAraligiGetir(s,b1,b2),ozet={};belgeler.forEach(b=>Object.entries(b.kayitlar||{}).forEach(([id,d])=>{if(!ozet[id])ozet[id]={var:0,yok:0,gec:0,izinli:0};if(ozet[id][d]!==undefined)ozet[id][d]++;}));return ozet;}
};
global.YoklamaService=YoklamaService;
})(window);
