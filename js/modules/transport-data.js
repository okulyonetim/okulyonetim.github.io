/* Koruk Asistan — Transport veri katmanı
 * Taşıma + servis oturma + sınıf oturma + araç yerleşim şeması.
 * Veri akışı: DeviceData/IndexedDB -> AppStore -> UI; Firestore yalnız queue/sync arka planındadır.
 */
(function(global){
'use strict';
function device(){if(!global.DeviceData)throw new Error('DeviceData hazır değil.');return global.DeviceData;}
function localDoc(type,id){return device().get(type,id)}
function fakeDoc(row,id){return{exists:!!row,id:id||row?.id||'',data:()=>row?{...row}:undefined}}
function fakeQuery(rows){const docs=(rows||[]).map(r=>({id:r.id,data:()=>({...r})}));return{empty:docs.length===0,size:docs.length,docs}}

/* ========================= SERVİS YERLEŞİM ŞEMASI ========================= */
const SO_SEMA_VERSIYON=2;
function duzenA(siraMax=7){const y=[];y.push({sira:0,konum:'sag-ic',aktif:true},{sira:0,konum:'sag-dis',aktif:true},{sira:1,konum:'sol-dis',kapiSag:true,aktif:true},{sira:1,konum:'sol-ic',kapiSag:true,aktif:true});for(let s=2;s<=siraMax;s++)y.push({sira:s,konum:'sol-dis',aktif:true},{sira:s,konum:'sol-ic',aktif:true},{sira:s,konum:'sag-dis',aktif:true});for(let k=0;k<4;k++)y.push({sira:siraMax+1,konum:'arka',aktif:true});return y;}
function duzenB(siraMax=5){const y=[{sira:0,konum:'sol-dis',soforYani:true,kapiSag:true,aktif:true}];for(let s=1;s<=siraMax;s++)y.push({sira:s,konum:'sol-dis',aktif:true},{sira:s,konum:'sol-ic',aktif:true},{sira:s,konum:'sag-ic',aktif:true},{sira:s,konum:'sag-dis',aktif:true});y.push({sira:siraMax+1,konum:'sol-dis',kapiSag:true,aktif:true},{sira:siraMax+1,konum:'sol-ic',kapiSag:true,aktif:true});for(let k=0;k<4;k++)y.push({sira:siraMax+2,konum:'arka',aktif:true});return y;}
const SO_SABLONLAR={
 ducato:{ad:'Fiat Ducato',ikon:'🚐',aciklama:'2+1 düzen, orta boy',yerlesimUret:(n=7)=>duzenA(n)},
 'ford-transit':{ad:'Ford Transit',ikon:'🚐',aciklama:'2+1 düzen, kompakt',yerlesimUret:(n=6)=>duzenA(n)},
 'mercedes-sprinter':{ad:'Mercedes Sprinter',ikon:'🚐',aciklama:'2+1 düzen, uzun şasi',yerlesimUret:(n=8)=>duzenA(n)},
 'vw-crafter':{ad:'Volkswagen Crafter',ikon:'🚐',aciklama:'2+1 düzen',yerlesimUret:(n=7)=>duzenA(n)},
 buyuk:{ad:'Büyük Servis',ikon:'🚍',aciklama:'2+2 düzen + arka sıra',yerlesimUret:(n=5)=>duzenB(n)},
 midibus:{ad:'Midibüs',ikon:'🚌',aciklama:'2+2 düzen, orta boy',yerlesimUret:(n=7)=>duzenB(n)},
 ozel:{ad:'Özel Tasarım',ikon:'🛠️',aciklama:'Manuel yerleşim',yerlesimUret:()=>[]}
};
function legacyToElements(yerlesim,koltuklar){koltuklar=Array.isArray(koltuklar)?koltuklar:[];return(yerlesim||[]).map((yuva,idx)=>{const no=idx+1,k=koltuklar.find(x=>Number(x.no)===no),p={konum:yuva.konum||'',kapiSag:!!yuva.kapiSag,soforYani:!!yuva.soforYani,studentName:k?.ogrenciAdi||'',stop:k?.durak||'',note:k?.not||'',reserved:!!k?.rezerve};return{id:'el_'+no,type:yuva.soforYani?'sofor':yuva.konum==='arka'?'arka-koltuk':'koltuk',seatNumber:yuva.soforYani?null:no,studentId:k?.ogrenciId||null,row:yuva.sira,column:idx,x:null,y:null,rotation:0,locked:!!k?.kilit,visible:yuva.aktif!==false,color:k?.renk||null,properties:p};});}
function elementsToLegacy(elements){const yerlesim=[],koltuklar=[];(elements||[]).forEach((el,idx)=>{const no=idx+1,p=el.properties||{},yuva={sira:el.row,konum:p.konum||'',aktif:el.visible!==false};if(p.soforYani)yuva.soforYani=true;if(p.kapiSag)yuva.kapiSag=true;yerlesim.push(yuva);if(el.type!=='sofor'&&(el.studentId||p.studentName||p.reserved||p.stop||p.note||el.color||el.locked))koltuklar.push({no,ogrenciId:el.studentId||null,ogrenciAdi:p.studentName||'',rezerve:!!p.reserved,durak:p.stop||'',not:p.note||'',renk:el.color||null,kilit:!!el.locked});});return{yerlesim,koltuklar};}
function planElements(plan,sablon){const sb=sablon||plan?.sablon||'ducato';if(Array.isArray(plan?.elements)&&plan.elements.length)return structuredClone(plan.elements);const yerlesim=Array.isArray(plan?.yerlesim)&&plan.yerlesim.length?plan.yerlesim:(SO_SABLONLAR[sb]?.yerlesimUret()||[]);return legacyToElements(yerlesim,plan?.koltuklar||[]);}
function elementStats(elements){const seats=(elements||[]).filter(e=>e.type!=='sofor'&&e.visible!==false),dolu=seats.filter(e=>e.studentId||e.properties?.studentName).length,rezerve=seats.filter(e=>e.properties?.reserved&&!(e.studentId||e.properties?.studentName)).length,toplam=seats.length;return{toplam,dolu,bos:Math.max(0,toplam-dolu-rezerve),rezerve,doluluk:toplam?Math.round(dolu/toplam*100):0};}
global.SO_SABLONLAR=SO_SABLONLAR;global.soPlanElementleriGetir=planElements;global.soElementIstatistik=elementStats;

const TasimaRepository={
 servisleriDinle(callback){return device().listen('servisler',callback);},
 servisEkle(veri){return device().add('servisler',COL.servisler,{...veri,eklenmeTarihi:new Date().toISOString()});},
 servisGuncelle(id,veri){return device().update('servisler',COL.servisler,id,veri);},
 servisSil(id){return device().remove('servisler',COL.servisler,id);}
};global.TasimaRepository=TasimaRepository;
const TasimaService={_yetkiKontrol(){if(!duzenleyebilir('tasima')){toast?.('Bu işlem için yetkiniz yok.');return false;}return true;},servisKaydet(id,veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return id?TasimaRepository.servisGuncelle(id,veri):TasimaRepository.servisEkle(veri);},servisSil(id){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return TasimaRepository.servisSil(id);},ogrencileriServiseAta(ids,servisId,servisAdi){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return Promise.all((ids||[]).map(id=>device().update('veliler',COL.veliler,id,{servisId,servisAdi})));}};global.TasimaService=TasimaService;

const ServisOturmaRepository={
 planlariDinle(callback){return device().listen('servisOturma',callback);},
 planKaydet(servisId,veri,merge){return device().set('servisOturma',COL.servisOturma,servisId,{servisId,...veri},{merge:!!merge});},
 planGuncelle(servisId,veri){return device().update('servisOturma',COL.servisOturma,servisId,veri);},
 planServisIdIleGetir(servisId){return Promise.resolve(fakeQuery(device().list('servisOturma').filter(x=>x?.servisId===servisId||x?.id===servisId)));}
};global.ServisOturmaRepository=ServisOturmaRepository;
const ServisOturmaService={
 _yetkiKontrol(){if(!duzenleyebilir('tasima')){toast?.('Bu işlem için yetkiniz yok.');return false;}return true;},
 planKaydet(servisId,veri,merge){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return ServisOturmaRepository.planKaydet(servisId,veri,merge);},
 planGuncelle(servisId,veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return ServisOturmaRepository.planGuncelle(servisId,veri);},
 planElementsGetir(servisId,sablon='ducato'){return planElements(localDoc('servisOturma',servisId)||{},sablon);},
 planElementsKaydet(servisId,sablon,elements,merge=false){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));const legacy=elementsToLegacy(elements);return ServisOturmaRepository.planKaydet(servisId,{sablon,elements,...legacy,semaVersiyon:SO_SEMA_VERSIYON,guncellendi:new Date().toISOString()},merge);},
 sablonUygula(servisId,sablon){const elements=legacyToElements(SO_SABLONLAR[sablon]?.yerlesimUret?.()||[],[]);return this.planElementsKaydet(servisId,sablon,elements,false);}
};global.ServisOturmaService=ServisOturmaService;

const SinifOturmaRepository={planGetir(id){return Promise.resolve(fakeDoc(localDoc('sinifOturma',id),id));},planDinle(id,cb){const run=()=>{const r=localDoc('sinifOturma',id);cb(r?{id,...r}:null,{source:'device'});};run();return AppStore.subscribe('data.sinifOturma',run);},planKaydet(id,veri){return device().set('sinifOturma',COL.sinifOturma,id,{sinifId:id,...veri},{merge:false});}};global.SinifOturmaRepository=SinifOturmaRepository;
const SinifOturmaService={_yetkiKontrol(){if(!duzenleyebilir('siniflar')){toast?.('Bu işlem için yetkiniz yok.');return false;}return true;},planGetir:id=>SinifOturmaRepository.planGetir(id),planDinle(id,cb,hata){try{return SinifOturmaRepository.planDinle(id,cb);}catch(e){hata?.(e);return()=>{};}},planKaydet(id,veri){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return SinifOturmaRepository.planKaydet(id,veri);}};global.SinifOturmaService=SinifOturmaService;
})(window);
