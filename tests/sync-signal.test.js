'use strict';
/* Cihazlar arası anlık eşitleme (oy_senkron/degisim işareti) — gerçek core.js, iki "cihaz": ayrı sahte IndexedDB, ortak sahte Firestore, sahte saat. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const CORE=fs.readFileSync('js/core/core.js','utf8');
const DAY=24*60*60*1000,T0=Date.parse('2026-10-27T08:00:00Z');
const COL={ogretmenler:'oy_ogretmenler',duyurular:'oy_duyurular',gorevler:'oy_gorevler',yemekMenuleri:'oy_yemekMenuleri',hatirlaticilar:'oy_hatirlaticilar'};
const SIGNAL_PATH='oy_senkron/degisim';
const world={now:T0,timers:[],id:1,io:0,errors:[],devices:[]};
process.on('unhandledRejection',e=>{world.errors.push(e)});

/* ── zaman ve eşzamansız boşalma ── */
function io(fn){world.io++;setImmediate(()=>{try{fn()}catch(e){world.errors.push(e)}finally{world.io--}})}
async function settle(){let idle=0;for(let i=0;i<4000&&idle<3;i++){await new Promise(r=>setImmediate(r));idle=world.io===0?idle+1:0}}
async function advance(ms){
  await settle();                      /* bekleyen eşzamansız işler zamanlayıcılarını şimdiki saatte kursun */
  const end=world.now+ms;
  for(;;){
    const due=world.timers.filter(t=>t.at<=end).sort((a,b)=>a.at-b.at||a.id-b.id)[0];
    if(!due)break;
    world.now=Math.max(world.now,due.at);
    if(due.every)due.at+=due.every;else world.timers.splice(world.timers.indexOf(due),1);
    try{due.fn()}catch(e){world.errors.push(e)}
    await settle();
  }
  world.now=end;await settle();
}
function jump(ms){world.now+=ms;world.timers.forEach(t=>{t.at+=ms})}

/* ── sahte Firestore (ortak sunucu) ── */
const isPlain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.prototype.toString.call(v)==='[object Object]'&&!('__ts' in v)&&!('__inc' in v)&&!('__del' in v);
function hostClone(v){
  if(v===null||typeof v!=='object')return v;
  if(Object.prototype.toString.call(v)==='[object Date]')return new Date(v.getTime());
  if(Array.isArray(v))return v.map(hostClone);
  const o={};for(const k of Object.keys(v))o[k]=hostClone(v[k]);return o;
}
const ms=v=>{if(v==null)return 0;if(typeof v==='number')return v;if(typeof v==='object'&&'__ts' in v)return v.__ts;if(Object.prototype.toString.call(v)==='[object Date]')return v.getTime();return 0};
function mergeInto(target,patch){
  for(const[k,v]of Object.entries(patch)){
    if(v&&typeof v==='object'&&'__del' in v){delete target[k];continue}
    if(v&&typeof v==='object'&&'__inc' in v){target[k]=(Number(target[k])||0)+v.__inc;continue}
    if(isPlain(v)){if(!isPlain(target[k]))target[k]={};mergeInto(target[k],v);continue}
    target[k]=hostClone(v);
  }
}
function makeServer(){
  const server={docs:new Map(),deny:new Set(),reads:0,log:[],listeners:[],
    seed(col,id,data){server.docs.set(`${col}/${id}`,hostClone(data))},
    rows(col){return[...server.docs].filter(([k])=>k.startsWith(col+'/')).map(([k,v])=>({id:k.slice(col.length+1),...v}))},
    denied(col){return server.deny.has(col)},
    notify(path,writer){
      const data=server.docs.get(path);
      for(const l of server.listeners.filter(x=>x.path===path)){
        if(l.dev.online===false)continue;
        if(l.dev===writer)io(()=>l.deliver(data,{fromCache:false,hasPendingWrites:true}));
        io(()=>{if(l.dev!==writer)server.reads++;l.deliver(server.docs.get(path),{fromCache:false,hasPendingWrites:false})});
      }
    }};
  return server;
}
function permissionError(){return Object.assign(new Error('Missing or insufficient permissions.'),{code:'permission-denied'})}
function makeDb(server,dev){
  const docRef=(col,id)=>({id,path:`${col}/${id}`,
    get(){return new Promise((res,rej)=>io(()=>{if(server.denied(col))return rej(permissionError());const d=server.docs.get(`${col}/${id}`);server.reads++;res({id,exists:!!d,data:()=>dev.clone(d)})}))},
    set(data,opts){return new Promise((res,rej)=>io(()=>{
      if(server.denied(col))return rej(permissionError());
      const path=`${col}/${id}`,cur=opts?.merge?server.docs.get(path)||{}:{};
      mergeInto(cur,data);server.docs.set(path,cur);server.log.push({dev:dev.name,op:'set',col,id});res();server.notify(path,dev);
    }))},
    delete(){return new Promise((res,rej)=>io(()=>{if(server.denied(col))return rej(permissionError());server.docs.delete(`${col}/${id}`);server.log.push({dev:dev.name,op:'delete',col,id});res()}))},
    onSnapshot(opts,next,err){
      if(typeof opts==='function'){err=next;next=opts}
      if(server.denied(col)){io(()=>err&&err(permissionError()));return()=>{}}
      const path=`${col}/${id}`,l={dev,path,deliver(d,metadata){next({id,exists:!!d,data:()=>dev.clone(d),metadata})}};
      server.listeners.push(l);
      io(()=>{if(dev.online!==false){server.reads++;l.deliver(server.docs.get(path),{fromCache:false,hasPendingWrites:false})}});
      return()=>{const i=server.listeners.indexOf(l);if(i>=0)server.listeners.splice(i,1)};
    }});
  const query=(col,where)=>({
    where(field,op,value){return query(col,[...where,{field,op,value}])},
    get(){return new Promise((res,rej)=>io(()=>{
      if(server.denied(col))return rej(permissionError());
      let rows=server.rows(col);
      for(const w of where){
        if(w.op==='==')rows=rows.filter(r=>r[w.field]===w.value);
        else if(w.op==='>')rows=rows.filter(r=>ms(r[w.field])>ms(w.value));
        else throw new Error('sahte-sorgu-op:'+w.op);
      }
      server.reads+=Math.max(1,rows.length);
      server.log.push({dev:dev.name,op:'query',col,where:where.map(w=>w.op),n:rows.length});
      const docs=rows.map(r=>{const{id:rid,...rest}=r;return{id:rid,data:()=>dev.clone(rest),ref:docRef(col,rid)}});
      res({empty:!docs.length,docs,size:docs.length});
    }))}});
  return{
    collection(col){return{doc:id=>docRef(col,id),where:(f,o,v)=>query(col,[{field:f,op:o,value:v}]),get:()=>query(col,[]).get()}},
    batch(){const ops=[];return{delete(ref){ops.push(ref)},commit(){return Promise.all(ops.map(r=>r.delete()))}}}
  };
}

/* ── sahte IndexedDB (cihaz başına; yeniden başlatmada aynı örnek verilebilir) ── */
function makeIdb(){
  const dbs=new Map(),api={clone:v=>v};
  api.open=name=>{
    const req={};
    io(()=>{
      let map=dbs.get(name);const fresh=!map;if(fresh){map=new Map();dbs.set(name,map)}
      req.result={objectStoreNames:{contains:()=>!fresh},createObjectStore(){},transaction(){return tx(map)}};
      if(fresh&&req.onupgradeneeded)req.onupgradeneeded();
      req.onsuccess&&req.onsuccess();
    });
    return req;
  };
  function tx(map){
    const t={},ops=[];
    const request=fn=>{const r={};ops.push(()=>fn(r));return r};
    const store={
      get:k=>request(r=>{r.result=map.has(k)?api.clone(map.get(k)):undefined;r.onsuccess&&r.onsuccess()}),
      put:(v,k)=>request(r=>{map.set(k,api.clone(v));r.onsuccess&&r.onsuccess()}),
      delete:k=>request(r=>{map.delete(k);r.onsuccess&&r.onsuccess()}),
      openCursor:()=>request(r=>{const entries=[...map];let i=0;const step=()=>{if(i>=entries.length){r.result=null;r.onsuccess&&r.onsuccess();return}const[k,v]=entries[i++];r.result={key:k,value:api.clone(v),continue:step};r.onsuccess&&r.onsuccess()};step()})
    };
    t.objectStore=()=>store;
    io(()=>{for(const op of ops)op();t.oncomplete&&t.oncomplete()});
    return t;
  }
  return api;
}

/* ── cihaz: kendi bağlamı, olayları, zamanlayıcıları ── */
function makeDevice(server,name,{uid='u-1',idb=makeIdb(),cols=COL}={}){
  const handlers={},docHandlers={},win={};
  win.window=win;
  const dev={name,win,server,idb,online:true,warns:[],errs:[],stopped:false,uid};
  const add=(map,t,fn)=>{(map[t]||(map[t]=[])).push(fn)};
  const fire=(map,t,ev)=>{for(const fn of [...(map[t]||[])])try{fn(ev)}catch(e){world.errors.push(e)}};
  win.addEventListener=(t,fn)=>add(handlers,t,fn);win.removeEventListener=()=>{};
  win.dispatchEvent=ev=>{fire(handlers,ev.type,ev);return true};
  win.CustomEvent=class{constructor(type,init){this.type=type;this.detail=init?.detail}};
  win.document={hidden:false,readyState:'complete',addEventListener:(t,fn)=>add(docHandlers,t,fn),removeEventListener(){}};
  win.navigator={onLine:true};
  win.console={log(){},info(){},debug(){},warn:(...a)=>dev.warns.push(a.join(' ')),error:(...a)=>dev.errs.push(a.join(' '))};
  win.setTimeout=(fn,delay=0)=>{const id=world.id++;world.timers.push({id,at:world.now+Math.max(0,Number(delay)||0),fn,dev});return id};
  win.setInterval=(fn,every)=>{const id=world.id++;world.timers.push({id,at:world.now+every,every,fn,dev});return id};
  win.clearTimeout=win.clearInterval=id=>{const i=world.timers.findIndex(t=>t.id===id);if(i>=0)world.timers.splice(i,1)};
  win.crypto={randomUUID:()=>`id-${name}-${world.id++}`};
  win.indexedDB=idb;
  win.COL={...cols};
  win.AKTIF_KULLANICI={uid,admin:true};
  win.auth={currentUser:{uid}};
  win.firebase={firestore:{FieldValue:{increment:n=>({__inc:n}),delete:()=>({__del:true}),serverTimestamp:()=>({__ts:world.now})},Timestamp:{fromMillis:n=>({__ts:n,toDate:()=>new Date(n)})}}};
  win.db=makeDb(server,dev);
  const ctx=vm.createContext(win);
  /* Context içi: saat ve derin kopya (nesneler cihaz bölgesinde kalsın) */
  win.Date=vm.runInContext(`(function(Real,world){class D extends Real{constructor(...a){if(a.length===0)super(world.now);else super(...a)}static now(){return world.now}}return D})`,ctx)(Date,world);
  dev.clone=vm.runInContext(`(function c(v){if(v===null||typeof v!=='object')return v;if(Object.prototype.toString.call(v)==='[object Date]')return new Date(v.getTime());if(Array.isArray(v))return v.map(c);const o={};for(const k of Object.keys(v))o[k]=c(v[k]);return o})`,ctx);
  idb.clone=dev.clone;
  win.structuredClone=dev.clone;
  dev.ctx=ctx;dev.handlers=handlers;
  dev.emit=(t,ev={})=>fire(handlers,t,{type:t,...ev});
  dev.emitDoc=(t)=>fire(docHandlers,t,{type:t});
  vm.runInContext(CORE,ctx,{filename:'core.js'});
  world.devices.push(dev);
  dev.data=type=>win.AppStore.data(type)||[];
  dev.cached=type=>win.KorukLocalFirst.cached(uid,type,[]);
  dev.meta=n=>win.KorukLocalFirst.meta(uid,n);
  dev.pending=()=>win.KorukLocalFirst.pending(uid);
  dev.state=()=>win.SyncEngine.signalState();
  dev.hide=()=>{win.document.hidden=true;dev.emitDoc('visibilitychange')};
  dev.show=()=>{win.document.hidden=false;dev.emitDoc('visibilitychange')};
  dev.goOffline=()=>{dev.online=false;win.navigator.onLine=false;dev.emit('offline')};
  dev.goOnline=()=>{dev.online=true;win.navigator.onLine=true;dev.emit('online');for(const l of server.listeners.filter(x=>x.dev===dev))io(()=>l.deliver(server.docs.get(l.path),{fromCache:false,hasPendingWrites:false}))};
  dev.stop=()=>{dev.stopped=true;world.timers=world.timers.filter(t=>t.dev!==dev);for(const l of server.listeners.filter(x=>x.dev===dev))server.listeners.splice(server.listeners.indexOf(l),1)};
  dev.add=(type,data,id)=>win.DeviceData.add(type,COL[type],data,id?{id}:{});
  dev.remove=(type,id)=>win.DeviceData.remove(type,COL[type],id);
  dev.queries=(col,since=0)=>server.log.slice(since).filter(l=>l.dev===name&&l.op==='query'&&l.col===col);
  return dev;
}
async function boot(server,name,opts){const d=makeDevice(server,name,opts);await settle();return d}
const ids=rows=>JSON.stringify(Array.from(rows||[],r=>r.id).sort());
const old=T0-3*DAY;
function seedBasic(server){
  server.seed(COL.ogretmenler,'t1',{ad:'Ali',guncellenmeTarihi:new Date(old)});
  server.seed(COL.ogretmenler,'t2',{ad:'Veli',guncellenmeTarihi:new Date(old)});
  server.seed(COL.duyurular,'d1',{baslik:'Eski',guncellenmeTarihi:new Date(old)});
  server.seed(COL.gorevler,'g1',{ad:'Bir',guncellenmeTarihi:new Date(old)});
  server.seed(COL.gorevler,'g2',{ad:'İki',guncellenmeTarihi:new Date(old)});
}
async function twoDevices(server,opts={}){
  const A=await boot(server,'A',opts.a),B=await boot(server,'B',opts.b);
  await advance(4000);
  return{A,B};
}

/* ── senaryolar ── */
const tests=[];
const test=(name,fn)=>tests.push({name,fn});

test('ekleme: A ekler, B yalnız değişen tipi çeker, A kendi yazısını geri çekmez',async()=>{
  const server=makeServer();seedBasic(server);
  const{A,B}=await twoDevices(server);
  assert.strictEqual(ids(B.data('duyurular')),JSON.stringify(['d1']),'açılış çekmesi');
  const mark=server.log.length,readsBefore=server.reads;
  await A.add('duyurular',{baslik:'Yeni'},'d2');
  await advance(6000);
  const sig=server.docs.get(SIGNAL_PATH);
  assert.strictEqual(sig.r.duyurular,1,'sayaç artmalı');
  assert.deepStrictEqual(Object.keys(sig).sort(),['r','s'],'belge yalnız kuralın izin verdiği alanları içermeli');
  assert.strictEqual(ids(B.data('duyurular')),JSON.stringify(['d1','d2']),'B yeni duyuruyu almalı');
  assert.strictEqual(ids(await B.cached('duyurular')),JSON.stringify(['d1','d2']),'B önbelleği de güncellenmeli');
  assert.strictEqual(B.queries(COL.ogretmenler,mark).length,0,'değişmeyen tip çekilmemeli');
  assert.strictEqual(B.queries(COL.gorevler,mark).length,0,'değişmeyen tip çekilmemeli');
  assert.strictEqual(A.queries(COL.duyurular,mark).length,0,'yazan cihaz kendi yankısını çekmemeli');
  assert.ok(B.queries(COL.duyurular,mark).every(q=>q.where.includes('>')),'çekme delta olmalı');
  assert.ok(server.reads-readsBefore<=4,'okuma sayısı küçük kalmalı: '+(server.reads-readsBefore));
  assert.strictEqual(world.errors.length,0,String(world.errors[0]?.stack||''));
});

test('düzenleme: A düzenler, B yeni değeri görür',async()=>{
  const server=makeServer();seedBasic(server);
  const{A,B}=await twoDevices(server);
  await A.win.DeviceData.update('ogretmenler',COL.ogretmenler,'t1',{ad:'Ali Yeni'});
  await advance(6000);
  assert.strictEqual(B.data('ogretmenler').find(x=>x.id==='t1').ad,'Ali Yeni');
});

test('silme: A siler, B yerelden kaldırır (tam çekme olmadan)',async()=>{
  const server=makeServer();seedBasic(server);
  const{A,B}=await twoDevices(server);
  assert.strictEqual(ids(B.data('gorevler')),JSON.stringify(['g1','g2']));
  const mark=server.log.length;
  await A.remove('gorevler','g1');
  await advance(6000);
  assert.strictEqual(typeof server.docs.get(SIGNAL_PATH).d.gorevler.g1,'number','silme kaydı işaretlenmeli');
  assert.strictEqual(ids(B.data('gorevler')),JSON.stringify(['g2']),'B silineni göstermemeli');
  assert.strictEqual(ids(await B.cached('gorevler')),JSON.stringify(['g2']),'B önbelleği de temizlenmeli');
  assert.ok(B.queries(COL.gorevler,mark).every(q=>q.where.includes('>')),'silme için tam çekme gerekmemeli');
  assert.strictEqual(world.errors.length,0,String(world.errors[0]?.stack||''));
});

test('toplu silme (delete-query): B tam çekme yapar ve boşalır',async()=>{
  const server=makeServer();
  server.seed(COL.gorevler,'g1',{ad:'Bir',sinifId:'s1',guncellenmeTarihi:new Date(old)});
  server.seed(COL.gorevler,'g2',{ad:'İki',sinifId:'s1',guncellenmeTarihi:new Date(old)});
  server.seed(COL.gorevler,'g3',{ad:'Üç',sinifId:'s2',guncellenmeTarihi:new Date(old)});
  const{A,B}=await twoDevices(server);
  assert.strictEqual(ids(B.data('gorevler')),JSON.stringify(['g1','g2','g3']));
  const mark=server.log.length;
  await A.win.KorukLocalFirst.queue('u-1',{kind:'delete-query',collection:COL.gorevler,field:'sinifId',value:'s1',dataType:'gorevler'});
  await advance(8000);
  assert.strictEqual(typeof server.docs.get(SIGNAL_PATH).d.gorevler.__tam__,'number');
  assert.strictEqual(ids(B.data('gorevler')),JSON.stringify(['g3']),'toplu silinenler B\'den kalkmalı');
  assert.ok(B.queries(COL.gorevler,mark).some(q=>q.where.length===0),'toplu silmede tam çekme yapılmalı');
});

test('arka plan: B gizliyken çekme ertelenir, öne gelince yapılır',async()=>{
  const server=makeServer();seedBasic(server);
  const{A,B}=await twoDevices(server);
  B.hide();
  const mark=server.log.length;
  await A.add('duyurular',{baslik:'Yeni'},'d2');
  await advance(8000);
  assert.strictEqual(B.queries(COL.duyurular,mark).length,0,'arka planda çekme olmamalı');
  assert.strictEqual(ids(B.data('duyurular')),JSON.stringify(['d1']));
  B.show();
  await advance(4000);
  assert.strictEqual(ids(B.data('duyurular')),JSON.stringify(['d1','d2']),'öne gelince eşitlenmeli');
});

test('çevrimdışı kaçırma: B ağa dönünce kaçırdığı değişiklikleri alır',async()=>{
  const server=makeServer();seedBasic(server);
  const{A,B}=await twoDevices(server);
  B.goOffline();
  await A.add('duyurular',{baslik:'Yeni'},'d2');
  await A.add('gorevler',{ad:'Üç'},'g3');
  await advance(8000);
  assert.strictEqual(ids(B.data('duyurular')),JSON.stringify(['d1']),'çevrimdışıyken değişmemeli');
  B.goOnline();
  await advance(6000);
  assert.strictEqual(ids(B.data('duyurular')),JSON.stringify(['d1','d2']));
  assert.strictEqual(ids(B.data('gorevler')),JSON.stringify(['g1','g2','g3']));
});

test('uygulama kapalıyken kaçırma: yeniden açılan cihaz revizyon farkıyla yalnız değişeni çeker',async()=>{
  const server=makeServer();seedBasic(server);
  const A=await boot(server,'A'),B=await boot(server,'B');
  await advance(4000);
  await A.add('duyurular',{baslik:'Bir'},'d2');          /* B bunu duyar (taban) */
  await advance(6000);
  const idb=B.idb;B.stop();
  await A.add('duyurular',{baslik:'İki'},'d3');          /* B kapalıyken */
  await advance(6000);
  const mark=server.log.length;
  const B2=await boot(server,'B2',{idb});
  await advance(6000);
  assert.strictEqual(ids(B2.data('duyurular')),JSON.stringify(['d1','d2','d3']),'yeniden açılan cihaz güncel olmalı');
  assert.strictEqual(B2.queries(COL.ogretmenler,mark).length,0,'değişmeyen tip çekilmemeli');
  assert.strictEqual(world.errors.length,0,String(world.errors[0]?.stack||''));
});

test('izin yok (kural yayınlanmamış): sessizce eski davranışa döner, yazma bozulmaz',async()=>{
  const server=makeServer();seedBasic(server);server.deny.add('oy_senkron');
  const{A,B}=await twoDevices(server);
  assert.strictEqual(A.state(),'reddedildi');assert.strictEqual(B.state(),'reddedildi');
  await A.add('duyurular',{baslik:'Yeni'},'d2');
  await advance(8000);
  assert.ok(server.docs.has(`${COL.duyurular}/d2`),'veri yazması etkilenmemeli');
  assert.strictEqual((await A.pending()).length,0,'yazma kuyruğu boşalmalı');
  assert.strictEqual(A.warns.filter(w=>w.includes('SyncSignal')).length,1,'tek uyarı verilmeli');
  assert.strictEqual(ids(B.data('duyurular')),JSON.stringify(['d1']),'anlık eşitleme yok');
  jump(25*60*60*1000);B.show();
  await advance(6000);
  assert.strictEqual(ids(B.data('duyurular')),JSON.stringify(['d1','d2']),'24 saatlik eski eşitleme sürmeli');
  assert.strictEqual(world.errors.length,0,String(world.errors[0]?.stack||''));
});

test('sonradan kaydolan tip: bayatsa kayıtta çekilir',async()=>{
  const server=makeServer();seedBasic(server);
  const{A,B}=await twoDevices(server);
  await A.win.DeviceData.add('notlar','oy_notlar',{baslik:'Not'},{id:'n1'});
  await advance(8000);
  assert.strictEqual(B.data('notlar').length,0,'kayıtsız tip çekilmez');
  B.win.SyncEngine.register('notlar','oy_notlar');
  await advance(4000);
  assert.strictEqual(ids(B.data('notlar')),JSON.stringify(['n1']),'kayıt anında bayat tip çekilmeli');
});

test('yemek menüsü: silinen menü geri gelmez, son menü de kalkar, bekleyen yerel menü korunur',async()=>{
  const server=makeServer();
  server.seed(COL.yemekMenuleri,'m1',{ay:'10',menu:{},guncellenmeTarihi:new Date(old)});
  server.seed(COL.yemekMenuleri,'m2',{ay:'11',menu:{},guncellenmeTarihi:new Date(old)});
  const{A,B}=await twoDevices(server);
  B.goOffline();
  await B.add('yemekMenuleri',{ay:'12',menu:{}},'m3');   /* B'de bekleyen yerel menü */
  await A.remove('yemekMenuleri','m1');
  await advance(6000);
  B.goOnline();
  await advance(8000);
  assert.strictEqual(ids(B.data('yemekMenuleri')),JSON.stringify(['m2','m3']),'silinen dirilmemeli, bekleyen korunmalı');
  assert.ok(server.docs.has(`${COL.yemekMenuleri}/m3`),'bekleyen menü sunucuya gitmeli');
  /* tam çekmede de silinen geri gelmemeli; sunucu boşalınca yerel de boşalmalı */
  await B.win.SyncEngine.pull(['yemekMenuleri'],{force:true,full:true});
  assert.strictEqual(ids(B.data('yemekMenuleri')),JSON.stringify(['m2','m3']));
  server.docs.delete(`${COL.yemekMenuleri}/m2`);server.docs.delete(`${COL.yemekMenuleri}/m3`);
  await B.win.SyncEngine.pull(['yemekMenuleri'],{force:true,full:true});
  assert.strictEqual(B.data('yemekMenuleri').length,0,'sunucuda hiç menü yoksa yerel de boş olmalı');
});

test('zorla çekme gerçekten uygular (pull force)',async()=>{
  const server=makeServer();seedBasic(server);
  const{B}=await twoDevices(server);
  server.seed(COL.hatirlaticilar,'h1',{ad:'Hatırlat',guncellenmeTarihi:new Date(world.now)});
  await B.win.SyncEngine.pull(['hatirlaticilar'],{force:true});
  assert.strictEqual(ids(B.data('hatirlaticilar')),JSON.stringify(['h1']),'force çekme veriyi uygulamalı');
});

test('sürmekte olan eşitleme istenen tipi kapsamıyorsa: istek beklenir ve kendi tipini yine çeker (başkasının sonucu dönmez)',async()=>{
  const server=makeServer();seedBasic(server);
  const{B}=await twoDevices(server);
  server.seed(COL.hatirlaticilar,'h2',{ad:'Hatırlat 2',guncellenmeTarihi:new Date(world.now)});
  const p1=B.win.SyncEngine.sync(['ogretmenler'],{force:true});          /* sürüyor */
  const p2=B.win.SyncEngine.sync(['hatirlaticilar'],{force:true});       /* kapsanmıyor */
  await advance(2000);
  const r1=await p1,r2=await p2;
  assert.ok(r1.fetched.includes('ogretmenler')&&!r1.fetched.includes('hatirlaticilar'),'ilk istek yalnız kendi tipini çeker');
  assert.ok(r2.fetched.includes('hatirlaticilar'),'ikinci istek kendi tipini çekmiş olmalı');
  assert.strictEqual(ids(B.data('hatirlaticilar')),JSON.stringify(['h2']),'veri uygulanmalı');
  /* kapsanan istek aynı eşitlemeyi paylaşır (ikinci ağ çekimi yok) */
  const before=B.server.log.length;
  const q1=B.win.SyncEngine.sync(['ogretmenler','duyurular'],{force:true}),q2=B.win.SyncEngine.sync(['ogretmenler'],{force:true});
  await advance(2000);await q1;await q2;
  const q=B.server.log.slice(before).filter(l=>l.dev==='B'&&l.op==='query'&&l.col===COL.ogretmenler);
  assert.strictEqual(q.length,1,'kapsanan istek ayrı sorgu açmamalı');
});

test('hız sınırı: art arda değişiklikler birleşir, tip başına en çok 20 sn\'de bir çekilir, sonunda hepsi gelir',async()=>{
  const server=makeServer();seedBasic(server);
  const{A,B}=await twoDevices(server);
  const mark=server.log.length;
  for(let i=1;i<=6;i++){await A.add('duyurular',{baslik:'N'+i},'x'+i);await advance(3000)}
  await advance(45000);
  assert.strictEqual(ids(B.data('duyurular')),JSON.stringify(['d1','x1','x2','x3','x4','x5','x6']),'hepsi gelmeli');
  const n=B.queries(COL.duyurular,mark).length;
  assert.ok(n>=1&&n<=3,'çekme sayısı sınırlı olmalı: '+n);
});

test('eski silme kayıtları (14 gün) bir sonraki gönderimde temizlenir',async()=>{
  const server=makeServer();seedBasic(server);
  server.seed('oy_senkron','degisim',{r:{gorevler:3},s:{},d:{gorevler:{eski:T0-15*DAY,yeni:T0-1000}}});
  const{A}=await twoDevices(server);
  await A.add('duyurular',{baslik:'Yeni'},'d2');
  await advance(6000);
  const d=server.docs.get(SIGNAL_PATH).d.gorevler;
  assert.ok(!('eski' in d),'14 günden eski kayıt silinmeli');
  assert.ok('yeni' in d,'yeni kayıt korunmalı');
});

test('ilk duyuş taban sayılır; sonradan ilk kez değişen tip kaçırılmaz',async()=>{
  const server=makeServer();seedBasic(server);
  server.seed('oy_senkron','degisim',{r:{duyurular:7},s:{},d:{}});
  const{A,B}=await twoDevices(server);
  assert.strictEqual(await B.meta('heardRev:duyurular'),7);
  assert.strictEqual(await B.meta('pulledRev:duyurular'),7,'ilk duyuşta gereksiz çekme yok');
  await A.add('gorevler',{ad:'Üç'},'g3');                /* belgede ilk kez görünen tip */
  await advance(6000);
  assert.strictEqual(ids(B.data('gorevler')),JSON.stringify(['g1','g2','g3']));
});

test('uzun süre çevrimdışı yazılan kayıt: gönderilirken damgası yenilenir, B delta ile kaçırmaz',async()=>{
  const server=makeServer();seedBasic(server);
  const{A,B}=await twoDevices(server);
  A.goOffline();
  await A.add('duyurular',{baslik:'Çevrimdışı'},'d2');
  await advance(2000);
  await B.win.SyncEngine.pull(['duyurular'],{force:true});   /* B'nin son çekmesi kaydın damgasından sonra */
  jump(60*60*1000);
  A.goOnline();
  await advance(10000);
  assert.ok(ms(server.docs.get(`${COL.duyurular}/d2`).guncellenmeTarihi)>=world.now-60*1000,'sunucudaki damga gönderim anına yakın olmalı');
  assert.strictEqual(ids(B.data('duyurular')),JSON.stringify(['d1','d2']),'B kaydı delta çekmesiyle almalı');
});

test('hesap tercihleri: KaPrefs.remoteListen başka cihazdaki değişikliği getirir',async()=>{
  const server=makeServer();
  const{A,B}=await twoDevices(server);
  const gotA=[],gotB=[];
  A.win.KaPrefs.remoteListen(x=>gotA.push(x));B.win.KaPrefs.remoteListen(x=>gotB.push(x));
  await advance(500);
  await A.win.KaPrefs.remoteSet({menuDuzeniT_ogretmen:5});
  await advance(500);
  assert.ok(gotB.some(x=>x&&x.menuDuzeniT_ogretmen===5),'B değişikliği almalı');
  assert.strictEqual(gotA.filter(x=>x&&x.menuDuzeniT_ogretmen===5).length,1,'yazan cihaz yerel yankıyı yok saymalı, onaylıyı bir kez almalı');
});

(async()=>{
  let failed=0;
  for(const t of tests){
    world.now=T0;world.timers=[];world.io=0;world.errors=[];world.devices=[];
    try{await t.fn();console.log('✓',t.name)}
    catch(e){failed++;console.error('✗',t.name,'\n ',e&&e.stack||e)}
    world.devices.forEach(d=>d.stop());
  }
  if(failed){console.error(`${failed}/${tests.length} senaryo başarısız`);process.exit(1)}
  console.log(`Anlık eşitleme (${tests.length} senaryo) başarılı.`);
  process.exit(0);
})();
