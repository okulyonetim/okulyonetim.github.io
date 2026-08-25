/* Koruk Asistan — Mesajlaşma repository (device-first)
 * Konuşma ve mesaj metadata'sı AppStore/IndexedDB'de yaşar.
 * Firestore yalnız SyncEngine + DeviceData queue üzerinden arka planda kullanılır.
 * Binary dosyalar Firebase Storage'da kalır.
 */
(function(global){
'use strict';
function device(){if(!global.DeviceData)throw new Error('DeviceData hazır değil');return global.DeviceData;}
function uid(){return global.AKTIF_KULLANICI?.uid||global.AppStore?.get?.('session.user')?.uid||'';}
function arr(type){const v=global.AppStore?.data?.(type);return Array.isArray(v)?v:[];}
function _mesajlasmaGuvenliProfilUrl(url){if(typeof url!=='string')return'';const d=url.trim();if(!d||!/^https?:\/\//i.test(d)||/[\s"'<>]/.test(d))return'';try{const p=new URL(d);return(p.protocol==='https:'||p.protocol==='http:')?p.href:'';}catch(_){return'';}}
function _mesajlasmaKonusmaVerisiniGuvenliYap(veri){if(!veri||typeof veri!=='object')return veri;const f=veri.katilimciFotolari;if(!f||typeof f!=='object')return veri;const g={};Object.entries(f).forEach(([u,url])=>g[u]=_mesajlasmaGuvenliProfilUrl(url));return{...veri,katilimciFotolari:g};}
async function prepare(type,collection,query){if(!global.SyncEngine||!collection)return;SyncEngine.register(type,collection,query?{query}:{});await SyncEngine.localHydrate([type]);SyncEngine.schedule(80);}
const MesajlasmaRepository={
  konusmalariDinle(kullaniciUid,callback){const u=kullaniciUid||uid();prepare('konusmalar',COL.konusmalar,q=>q.where('katilimciUidler','array-contains',u)).catch(()=>{});return device().listen('konusmalar',rows=>callback(rows.filter(k=>(k.katilimciUidler||[]).includes(u)).map(_mesajlasmaKonusmaVerisiniGuvenliYap)));},
  konusmaOlustur(veri){return device().add('konusmalar',COL.konusmalar,{..._mesajlasmaKonusmaVerisiniGuvenliYap(veri),guncellenmeTarihi:new Date().toISOString()});},
  konusmaGuncelle(id,veri){return device().update('konusmalar',COL.konusmalar,id,_mesajlasmaKonusmaVerisiniGuvenliYap(veri));},
  konusmaSil(id){return device().remove('konusmalar',COL.konusmalar,id);},
  mesajlariDinle(konusmaId,callback){const type=`mesajlar:${konusmaId}`;prepare(type,COL.mesajlar,q=>q.where('konusmaId','==',konusmaId)).catch(()=>{});return device().listen(type,rows=>callback([...rows].sort((a,b)=>String(a.tarih||'').localeCompare(String(b.tarih||'')))));},
  mesajEkle(veri){const type=`mesajlar:${veri.konusmaId}`;return device().add(type,COL.mesajlar,{...veri,tarih:new Date().toISOString()});},
  mesajSil(id,konusmaId){const type=konusmaId?`mesajlar:${konusmaId}`:'mesajlar';return device().remove(type,COL.mesajlar,id);},
  async mesajlariTopluSil(konusmaId){const type=`mesajlar:${konusmaId}`;await prepare(type,COL.mesajlar,q=>q.where('konusmaId','==',konusmaId)).catch(()=>{});const list=arr(type),kullaniciBazliBayt={};for(const m of list){if(m.dosya?.boyut&&m.gonderenUid)kullaniciBazliBayt[m.gonderenUid]=(kullaniciBazliBayt[m.gonderenUid]||0)+m.dosya.boyut;if(m.dosya?.storagePath)await this.dosyaSil(m.dosya.storagePath).catch(()=>{});await device().remove(type,COL.mesajlar,m.id);}return{kullaniciBazliBayt};},
  dosyaYukle(konusmaId,dosya,ilerlemeCb){return new Promise((resolve,reject)=>{const yol=`mesajDosyalari/${konusmaId}/${Date.now()}_${dosya.name}`,ref=storage.ref().child(yol),g=ref.put(dosya);g.on('state_changed',s=>{if(ilerlemeCb)ilerlemeCb(Math.round((s.bytesTransferred/s.totalBytes)*100));},reject,async()=>{try{resolve({url:await g.snapshot.ref.getDownloadURL(),storagePath:yol});}catch(e){reject(e);}});});},
  dosyaSil(path){return storage.ref().child(path).delete();},
  async kullaniciUidBulOgretmenId(ogretmenId){const type=`kullaniciDizin:${ogretmenId}`;if(!COL.kullanicilar)return{empty:true,docs:[]};SyncEngine.register(type,COL.kullanicilar,{query:q=>q.where('bagliOgretmenId','==',ogretmenId)});await SyncEngine.localHydrate([type]);let rows=arr(type);if(!rows.length&&navigator.onLine){await SyncEngine.pull([type]).catch(()=>{});rows=arr(type);}return{empty:!rows.length,docs:rows.slice(0,1).map(r=>({id:r.id,data:()=>r}))};}
};
global.MesajlasmaRepository=MesajlasmaRepository;
})(window);
