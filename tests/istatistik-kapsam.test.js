/* Kullanıcı istatistikleri: kapsam (kendi kaydım / tüm kullanıcılar) geçişleri.
   Yönetici, diğer kullanıcıların giriş sayısı ve konumunu görebilmeli: kapsam genişleyince sunucudan zorunlu tam çekim yapılır,
   sonraki yazımlar (giriş, sayfa ziyareti, süre) kapsamı daraltıp yerel kopyayı yalnız kendi belgeme düşürmez. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('js/auth.js','utf8');
const iife=src.slice(src.indexOf('(function(global){'),src.indexOf('})(window);')+'})(window);'.length);

function kur({admin=true,online=true,syncSonuclari=[]}={}){
  const log={register:[],pull:[],sync:[],set:[]};const store=new Map();
  const ctx={console,setTimeout,Promise,Date,Math,Number,Object,Array,String,JSON,Map};
  ctx.window=ctx;ctx.document={hidden:false,addEventListener(){}};
  ctx.addEventListener=()=>{};
  ctx.navigator={onLine:online};
  ctx.firebase={firestore:{FieldPath:{documentId:()=>'__name__'}}};
  ctx.COL={kullaniciIstatistikleri:'oy_kullaniciIstatistikleri'};
  ctx.AKTIF_KULLANICI={uid:'u1',ad:'Müdür',admin};
  let n=0;
  ctx.SyncEngine={
    register:(t,c,o)=>log.register.push({t,sorgu:typeof o?.query==='function'}),
    localHydrate:async()=>({}),
    pull:async(types,opts)=>{log.pull.push({types,opts});return{updated:0}},
    sync:async(types,opts)=>{log.sync.push({types,opts});return syncSonuclari[n++]||{updated:5,skippedLocal:0}}
  };
  ctx.DeviceData={get:(t,id)=>store.get(id),set:async(t,c,id,v)=>{store.set(id,v);log.set.push(id);return v}};
  vm.createContext(ctx);vm.runInContext(iife,ctx);
  return{svc:ctx.IstatistikService,log};
}

(async()=>{
  /* yönetici: giriş kaydı (self) -> istatistik sayfası (all) -> sonraki yazımlar kapsamı daraltmaz */
  let t=kur();
  await t.svc.girisKaydet();
  assert.deepStrictEqual(t.log.register.map(r=>r.sorgu),[true],'giriş kaydı kendi belgemle sınırlı kaydolmalı');
  assert.strictEqual(t.log.sync.length,0,'self kapsamında zorunlu tam çekim olmamalı');
  assert.strictEqual(t.log.pull.length,1);
  await t.svc.prepare(true);
  assert.deepStrictEqual(t.log.register.map(r=>r.sorgu),[true,false],"all kapsamı sorgusuz kaydolmalı");
  assert.strictEqual(t.log.sync.length,1);
  assert.strictEqual(JSON.stringify(t.log.sync[0].opts),'{"force":true,"full":true}','kapsam genişleyince zorunlu tam çekim');
  await t.svc.sayfaZiyaretiKaydet('ayarlar');await t.svc.sureEkle(30);await t.svc.girisKaydet();
  assert.strictEqual(t.log.register.length,2,"all kapsamı varken yazımlar kapsamı self'e daraltmamalı");
  assert.strictEqual(t.log.sync.length,1,'ek tam çekim olmamalı');

  /* çekim sırasında yerel yazım olursa sonuç düşer: yeniden denenir (en çok 3 kez) */
  t=kur({syncSonuclari:[{updated:0,skippedLocal:1},{updated:0,skippedLocal:1},{updated:4,skippedLocal:0}]});
  await t.svc.prepare(true);
  assert.strictEqual(t.log.sync.length,3,'düşürülen çekim yeniden denenmeli');
  t=kur({syncSonuclari:[{updated:0,skippedLocal:1},{updated:0,skippedLocal:1},{updated:0,skippedLocal:1},{updated:9}]});
  await t.svc.prepare(true);
  assert.strictEqual(t.log.sync.length,3,'deneme sayısı 3 ile sınırlı');

  /* normal kullanıcı: yalnız kendi kaydı, tam çekim yok */
  t=kur({admin:false});
  await t.svc.girisKaydet();await t.svc.sureEkle(5);
  assert.strictEqual(t.log.sync.length,0);assert.strictEqual(t.log.register.length,1);

  /* çevrimdışı: sunucuya gidilmez ama kapsam yine de ayarlanır */
  t=kur({online:false});
  await t.svc.prepare(true);
  assert.strictEqual(t.log.sync.length+t.log.pull.length,0);
  await t.svc.girisKaydet();
  assert.strictEqual(t.log.register.length,1,'çevrimdışıyken de kapsam daralmamalı');
  console.log('İstatistik kapsam geçişleri başarılı.');
})().catch(e=>{console.error(e);process.exit(1)});
