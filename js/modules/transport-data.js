/* Koruk Asistan — Transport veri katmanı
 * Taşıma + servis oturma + sınıf oturma repository/service birleşimi.
 * Veri akışı: DeviceData/IndexedDB -> AppStore -> UI; Firestore yalnız queue/sync arka planındadır.
 */
(function(global){
'use strict';

function device(){
  if(!global.DeviceData) throw new Error('DeviceData hazır değil.');
  return global.DeviceData;
}
function localDoc(type,id){return device().get(type,id)}
function fakeDoc(row,id){return{exists:!!row,id:id||row?.id||'',data:()=>row?{...row}:undefined}}
function fakeQuery(rows){const docs=(rows||[]).map(r=>({id:r.id,data:()=>({...r})}));return{empty:docs.length===0,size:docs.length,docs}}

const TasimaRepository={
  servisleriDinle(callback){return device().listen('servisler',callback);},
  servisEkle(veri){return device().add('servisler',COL.servisler,{...veri,eklenmeTarihi:new Date().toISOString()});},
  servisGuncelle(id,veri){return device().update('servisler',COL.servisler,id,veri);},
  servisSil(id){return device().remove('servisler',COL.servisler,id);}
};
global.TasimaRepository=TasimaRepository;

const TasimaService={
  _yetkiKontrol(){if(!duzenleyebilir('tasima')){toast('Bu işlem için yetkiniz yok.');return false;}return true;},
  servisKaydet(mevcutId,veri){
    if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));
    return mevcutId?TasimaRepository.servisGuncelle(mevcutId,veri):TasimaRepository.servisEkle(veri);
  },
  servisSil(id){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return TasimaRepository.servisSil(id);},
  ogrencileriServiseAta(ogrenciIdListesi,servisId,servisAdi){
    if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));
    return Promise.all((ogrenciIdListesi||[]).map(id=>device().update('veliler',COL.veliler,id,{servisId,servisAdi})));
  }
};
global.TasimaService=TasimaService;

const ServisOturmaRepository={
  planlariDinle(callback){return device().listen('servisOturma',callback);},
  planKaydet(servisId,veri,merge){return device().set('servisOturma',COL.servisOturma,servisId,{servisId,...veri},{merge:!!merge});},
  planGuncelle(servisId,kismiVeri){return device().update('servisOturma',COL.servisOturma,servisId,kismiVeri);},
  planServisIdIleGetir(servisId){
    const rows=device().list('servisOturma').filter(x=>x?.servisId===servisId||x?.id===servisId);
    return Promise.resolve(fakeQuery(rows));
  }
};
global.ServisOturmaRepository=ServisOturmaRepository;

const ServisOturmaService={
  _yetkiKontrol(){if(!duzenleyebilir('tasima')){toast('Bu işlem için yetkiniz yok.');return false;}return true;},
  planKaydet(servisId,veri,merge){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return ServisOturmaRepository.planKaydet(servisId,veri,merge);},
  planGuncelle(servisId,kismiVeri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return ServisOturmaRepository.planGuncelle(servisId,kismiVeri);}
};
global.ServisOturmaService=ServisOturmaService;

const SinifOturmaRepository={
  planGetir(sinifId){return Promise.resolve(fakeDoc(localDoc('sinifOturma',sinifId),sinifId));},
  planDinle(sinifId,callback){
    const yayinla=()=>{const row=localDoc('sinifOturma',sinifId);callback(row?{id:sinifId,...row}:null,{source:'device'});};
    yayinla();return AppStore.subscribe('data.sinifOturma',yayinla);
  },
  planKaydet(sinifId,veri){return device().set('sinifOturma',COL.sinifOturma,sinifId,{sinifId,...veri},{merge:false});}
};
global.SinifOturmaRepository=SinifOturmaRepository;

const SinifOturmaService={
  _yetkiKontrol(){if(!duzenleyebilir('siniflar')){toast('Bu işlem için yetkiniz yok.');return false;}return true;},
  planGetir(sinifId){return SinifOturmaRepository.planGetir(sinifId);},
  planDinle(sinifId,callback,hataCb){try{return SinifOturmaRepository.planDinle(sinifId,callback);}catch(e){hataCb?.(e);return()=>{};}},
  planKaydet(sinifId,veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return SinifOturmaRepository.planKaydet(sinifId,veri);}
};
global.SinifOturmaService=SinifOturmaService;
})(window);
