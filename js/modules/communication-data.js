/* Koruk Asistan — Communication veri katmanı
 * Takvim + Notlar + Duyurular + Anket + Haberler + Push.
 * Veri akışı: AppStore/IndexedDB -> UI; Firestore yalnız Core queue/sync arka planıdır.
 * Mesajlaşma, özel local-first davranışları nedeniyle ayrı tutulur.
 */
(function(global){
'use strict';
function device(){if(!global.DeviceData)throw new Error('DeviceData hazır değil');return global.DeviceData;}
function user(){return global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};}
function uid(){return user().uid||'';}
function isAdmin(){return user().admin===true;}
function arr(type){const v=global.AppStore?.data?.(type);return Array.isArray(v)?v:[];}
function safeToast(m){if(typeof global.toast==='function')global.toast(m);}

const TakvimRepository={
  hatirlaticilariDinle(cb){return device().listen('hatirlaticilar',rows=>cb(isAdmin()?rows:rows.filter(x=>x.sahipUid===uid())));},
  hatirlaticiEkle(v){return device().add('hatirlaticilar',COL.hatirlaticilar,{...v,eklenmeTarihi:new Date().toISOString()});},
  hatirlaticiGuncelle(id,v){return device().update('hatirlaticilar',COL.hatirlaticilar,id,v);},
  hatirlaticiSil(id){return device().remove('hatirlaticilar',COL.hatirlaticilar,id);},
  gorevleriDinle(cb){return device().listen('gorevler',rows=>cb(isAdmin()?rows:rows.filter(x=>x.sahipUid===uid())));},
  gorevEkle(v){return device().add('gorevler',COL.gorevler,{...v,eklenmeTarihi:new Date().toISOString()});},
  gorevGuncelle(id,v){return device().update('gorevler',COL.gorevler,id,v);},
  gorevSil(id){return device().remove('gorevler',COL.gorevler,id);}
};
global.TakvimRepository=TakvimRepository;
const TakvimService={
  _yetkiKontrol(){if(!duzenleyebilir('takvim')){safeToast('Bu işlem için yetkiniz yok.');return false;}return true;},
  gorunurListele(l){return isAdmin()?(l||[]):(l||[]).filter(x=>x.sahipUid===uid());},
  _sahipDamgasiUygula(id,v){return !id?{...v,sahipUid:uid()}:v;},
  hatirlaticiKaydet(id,v){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));v=this._sahipDamgasiUygula(id,v);return id?TakvimRepository.hatirlaticiGuncelle(id,v):TakvimRepository.hatirlaticiEkle(v);},
  hatirlaticiSil(id){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return TakvimRepository.hatirlaticiSil(id);},
  hatirlaticiTamamlandiGuncelle(id,deger){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return TakvimRepository.hatirlaticiGuncelle(id,{tamamlandi:deger});},
  gorevKaydet(id,v){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));v=this._sahipDamgasiUygula(id,v);return id?TakvimRepository.gorevGuncelle(id,v):TakvimRepository.gorevEkle(v);},
  gorevSil(id){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return TakvimRepository.gorevSil(id);},
  gorevDurumGuncelle(id,durum){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return TakvimRepository.gorevGuncelle(id,{durum});},
  gorevTamamlandiGuncelle(id,deger){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return TakvimRepository.gorevGuncelle(id,{tamamlandi:deger,durum:deger?'tamamlandi':'yapilacak'});}
};
global.TakvimService=TakvimService;

function _notlarHtmlGuvenliYap(html){if(typeof html!=='string'||!html)return'';if(typeof document==='undefined')return html.replace(/<[^>]*>/g,'');const tpl=document.createElement('template');tpl.innerHTML=html;const yasak=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','LINK','META','BASE','FORM','INPUT','BUTTON','TEXTAREA','SELECT','OPTION','SVG','MATH','VIDEO','AUDIO']);Array.from(tpl.content.querySelectorAll('*')).forEach(el=>{if(yasak.has(el.tagName)){el.remove();return;}Array.from(el.attributes).forEach(a=>{const ad=a.name.toLowerCase(),d=String(a.value||'').trim();if(ad.startsWith('on')||ad==='srcdoc')el.removeAttribute(a.name);else if((ad==='href'||ad==='src'||ad==='xlink:href')&&/^(?:javascript|vbscript|data):/i.test(d))el.removeAttribute(a.name);else if(ad==='style'&&/(url\s*\(|expression\s*\(|@import|javascript:)/i.test(d))el.removeAttribute(a.name);});});return tpl.innerHTML;}
function _notlarKaydiGuvenliYap(k){return k&&typeof k==='object'&&typeof k.icerik==='string'?{...k,icerik:_notlarHtmlGuvenliYap(k.icerik)}:k;}
const NotlarRepository={
  notlariDinle(cb){return device().listen('notlar',rows=>cb((isAdmin()?rows:rows.filter(x=>x.sahipUid===uid())).map(_notlarKaydiGuvenliYap)));},
  notEkle(v){return device().add('notlar',COL.notlar,{...v,eklenmeTarihi:new Date().toISOString(),guncellenmeTarihi:new Date().toISOString()});},
  notGuncelle(id,v){return device().update('notlar',COL.notlar,id,{...v,guncellenmeTarihi:new Date().toISOString()});},
  notSil(id){return device().remove('notlar',COL.notlar,id);},
  notMaddeleriGuncelle(id,maddeler){return device().update('notlar',COL.notlar,id,{maddeler,guncellenmeTarihi:new Date().toISOString()});}
};
global.NotlarRepository=NotlarRepository;
const NotlarService={
  _yetkiKontrol(){if(!duzenleyebilir('notlar')){safeToast('Bu işlem için yetkiniz yok.');return false;}return true;},
  gorunurListele(l){return (isAdmin()?(l||[]):(l||[]).filter(x=>x.sahipUid===uid())).map(_notlarKaydiGuvenliYap);},
  notKaydet(id,v){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));if(v&&typeof v.icerik==='string')v={...v,icerik:_notlarHtmlGuvenliYap(v.icerik)};if(!id)v={...v,sahipUid:uid()};if(!id&&global.IstatistikService)IstatistikService.notEklemeKaydet();return id?NotlarRepository.notGuncelle(id,v):NotlarRepository.notEkle(v);},
  notSil(id){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return NotlarRepository.notSil(id);},
  notMaddeleriGuncelle(id,m){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));return NotlarRepository.notMaddeleriGuncelle(id,m);}
};
global.NotlarService=NotlarService;

const DuyurularRepository={
  duyurulariDinle(cb){return device().listen('duyurular',cb);},
  duyuruEkle(v){return device().add('duyurular',COL.duyurular,v);},
  duyuruGuncelle(id,v){return device().update('duyurular',COL.duyurular,id,v);},
  duyuruSil(id){return device().remove('duyurular',COL.duyurular,id);},
  okunduIsaretle(id,u,v){const d=arr('duyurular').find(x=>x.id===id),okuyanlar={...(d?.okuyanlar||{}),[u]:v};return device().update('duyurular',COL.duyurular,id,{okuyanlar});},
  resimYukle(dosya,ilerlemeCb){return new Promise((resolve,reject)=>{const yol=`duyurular/${Date.now()}_${dosya.name}`,ref=storage.ref().child(yol),g=ref.put(dosya);g.on('state_changed',s=>{if(ilerlemeCb)ilerlemeCb(Math.round((s.bytesTransferred/s.totalBytes)*100));},reject,async()=>{try{resolve({url:await g.snapshot.ref.getDownloadURL(),storagePath:yol});}catch(e){reject(e);}});});},
  resimSil(path){return storage.ref().child(path).delete();}
};
global.DuyurularRepository=DuyurularRepository;
const DuyurularService={
  _yetkiKontrol(){if(!duzenleyebilir('duyurular')){safeToast('Bu işlem için yetkiniz yok.');return false;}return true;},
  duyuruKaydet(id,v){if(!this._yetkiKontrol())return Promise.reject(new Error('yetkisiz'));if(id)return DuyurularRepository.duyuruGuncelle(id,v);const kimlik=typeof _hesapKimligi==='function'?_hesapKimligi():{ad:''};return DuyurularRepository.duyuruEkle({...v,tarih:new Date().toISOString(),olusturanUid:uid(),olusturanAdi:kimlik.ad||'Yönetici',okuyanlar:{}});},
  async duyuruSil(id,resimler){if(!this._yetkiKontrol())throw new Error('yetkisiz');await Promise.all((resimler||[]).map(r=>DuyurularRepository.resimSil(r.storagePath).catch(()=>{})));return DuyurularRepository.duyuruSil(id);},
  duyuruArsivle(id){return this._yetkiKontrol()?DuyurularRepository.duyuruGuncelle(id,{arsivlendi:true,arsivTarihi:new Date().toISOString()}):Promise.reject(new Error('yetkisiz'));},
  duyuruArsivdenCikar(id){return this._yetkiKontrol()?DuyurularRepository.duyuruGuncelle(id,{arsivlendi:false,arsivTarihi:null}):Promise.reject(new Error('yetkisiz'));},
  async resimYukle(dosya,cb){if(!this._yetkiKontrol())throw new Error('yetkisiz');if(global.DepolamaSinirService){const izin=await DepolamaSinirService.yuklemeIzniVarMi('duyuru',dosya.size);if(!izin.izinVar)throw new Error('depolama-siniri:'+izin.mesaj);}const r=await DuyurularRepository.resimYukle(dosya,cb);return{...r,boyut:dosya.size};},
  resimSil(path){return this._yetkiKontrol()?DuyurularRepository.resimSil(path):Promise.reject(new Error('yetkisiz'));},
  okunduIsaretle(id){const u=uid();if(!u)return Promise.reject(new Error('kimlik-yok'));const kimlik=typeof _hesapKimligi==='function'?_hesapKimligi():{ad:''};return DuyurularRepository.okunduIsaretle(id,u,{ad:kimlik.ad||'Kullanıcı',tarih:new Date().toISOString()});},
  benOkudumMu(d){const u=uid();return!!(u&&d?.okuyanlar?.[u]);}
};
global.DuyurularService=DuyurularService;

const AnketRepository={anketleriDinle(cb){return device().listen('anketler',rows=>cb([...rows].sort((a,b)=>String(b.olusturmaTarihi||'').localeCompare(String(a.olusturmaTarihi||'')))));},anketEkle(v){return device().add('anketler',COL.anketler,v);},anketGuncelle(id,v){return device().update('anketler',COL.anketler,id,v);},anketSil(id){return device().remove('anketler',COL.anketler,id);}};
global.AnketRepository=AnketRepository;
const AnketService={
 _kendiKimlik(){const k=typeof _hesapKimligi==='function'?_hesapKimligi():{ad:''};return{uid:uid(),ad:k.ad||'Kullanıcı',adminMi:isAdmin()};},detayliSonucGorebilirMi(){return isAdmin();},
 async anketOlustur(soru,secenekMetinleri,coklu){const b=this._kendiKimlik();if(!b.adminMi)throw new Error('yetkisiz');const g=(secenekMetinleri||[]).map(s=>s.trim()).filter(Boolean);if(!soru?.trim())throw new Error('soru-gerekli');if(g.length<2)throw new Error('yetersiz-secenek');return AnketRepository.anketEkle({soru:soru.trim(),secenekler:g.map((metin,i)=>({id:'sk'+i+'_'+Date.now(),metin})),coklu:!!coklu,aktif:true,olusturanUid:b.uid,olusturanAdi:b.ad,olusturmaTarihi:new Date().toISOString(),oylar:{}});},
 async oyVer(a,ids){const b=this._kendiKimlik();if(!b.uid)throw new Error('kimlik-yok');if(!gorebilir('anket'))throw new Error('yetkisiz');if(!a.aktif)throw new Error('kapali');if(!ids?.length)return;if(!a.coklu&&ids.length>1)return;const oylar={...(a.oylar||{}),[b.uid]:{secenekIdler:ids,ad:b.ad,tarih:new Date().toISOString()}};return AnketRepository.anketGuncelle(a.id,{oylar});},
 anketKapat(id,k){if(!isAdmin())return Promise.reject(new Error('yetkisiz'));return AnketRepository.anketGuncelle(id,{aktif:!k});},anketSil(id){if(!isAdmin())return Promise.reject(new Error('yetkisiz'));return AnketRepository.anketSil(id);},
 sonuclariHesapla(a){const oylar=a.oylar||{},n=Object.keys(oylar).length,s={};(a.secenekler||[]).forEach(x=>s[x.id]=0);Object.values(oylar).forEach(o=>(o.secenekIdler||[]).forEach(id=>{if(s[id]!==undefined)s[id]++;}));return{katilimciSayisi:n,secenekSonuclari:(a.secenekler||[]).map(x=>({id:x.id,metin:x.metin,sayi:s[x.id],yuzde:n?Math.round(s[x.id]/n*100):0}))};},kendiOyunuGetir(a){return a.oylar?.[uid()]||null;}
};global.AnketService=AnketService;

const PushRepository={cihazKaydet(token,v){return device().set('cihazlar',COL.cihazlar,encodeURIComponent(token),v,{merge:false});},kategorileriGuncelle(token,k,saat,u){const v={kategoriler:k};if(u)v.uid=u;if(saat?.baslangic&&saat?.bitis){v.bildirimSaatBaslangic=saat.baslangic;v.bildirimSaatBitis=saat.bitis;}return device().set('cihazlar',COL.cihazlar,encodeURIComponent(token),v,{merge:true});}};
global.PushRepository=PushRepository;global.PushService={cihazKaydet:(t,v)=>PushRepository.cihazKaydet(t,v),kategorileriGuncelle:(t,k,s)=>PushRepository.kategorileriGuncelle(t,k,s,uid())};

const HaberlerRepository={haberleriDinle(cb){return device().listen('haberler',rows=>cb([...rows].sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||''))).slice(0,600)));},haberEkle(v){return device().add('haberler',COL.haberler,{...v,eklenmeTarihi:new Date().toISOString()});},haberGuncelle(id,v){return device().update('haberler',COL.haberler,id,v);},haberSil(id){return device().remove('haberler',COL.haberler,id);},kaynaklariDinle(cb){return device().listen('haberKaynaklari',cb);},kaynakEkle(v){return device().add('haberKaynaklari',COL.haberKaynaklari,{...v,eklenmeTarihi:new Date().toISOString()});},kaynakGuncelle(id,v){return device().update('haberKaynaklari',COL.haberKaynaklari,id,v);},kaynakSil(id){return device().remove('haberKaynaklari',COL.haberKaynaklari,id);}};
global.HaberlerRepository=HaberlerRepository;global.HaberlerService={_yetkiKontrol(){if(!duzenleyebilir('haberler')){safeToast('Bu işlem için yetkiniz yok.');return false;}return true;},haberKaydet(id,v){return this._yetkiKontrol()?(id?HaberlerRepository.haberGuncelle(id,v):HaberlerRepository.haberEkle(v)):Promise.reject(new Error('yetkisiz'));},haberSil(id){return this._yetkiKontrol()?HaberlerRepository.haberSil(id):Promise.reject(new Error('yetkisiz'));},kaynakKaydet(id,v){return this._yetkiKontrol()?(id?HaberlerRepository.kaynakGuncelle(id,v):HaberlerRepository.kaynakEkle(v)):Promise.reject(new Error('yetkisiz'));},kaynakSil(id){return this._yetkiKontrol()?HaberlerRepository.kaynakSil(id):Promise.reject(new Error('yetkisiz'));},cihazKategoriTercihiKaydet(t,k,s){return PushRepository.kategorileriGuncelle(t,k,s,uid());}};
})(window);
