const fs=require('fs');
const assert=require('assert');

const source=fs.readFileSync('js/core/schedule-data-integrity.js','utf8');
const firebaseInit=fs.readFileSync('js/firebase-init.js','utf8');
new Function(source);

const runtimeVersion=firebaseInit.match(/js\/core\/schedule-data-integrity\.js\?v=(\d+)/);
assert(runtimeVersion&&Number(runtimeVersion[1])>=916,'Ders programı veri bütünlüğü koruması yüklenmiyor.');
assert(source.includes("const TYPE='dersProgrami'"),'Koruma doğru veri tipine bağlı değil.');
assert(source.includes('repairCache(fixed.rows)'),'Uzak eski snapshot engellendiğinde IndexedDB önbelleği onarılmıyor.');

(async()=>{
  const listeners=new Map();
  const data={dersProgrami:[
    {id:'old-1',ders:'Türkçe',ogretmenId:'t1'},
    {id:'old-2',ders:'Matematik',ogretmenId:'t2'}
  ]};
  const cached=[];

  global.window=global;
  global.document={
    readyState:'complete',
    visibilityState:'visible',
    addEventListener(){},
    getElementById(){return null},
    documentElement:{}
  };
  global.MutationObserver=class{observe(){} disconnect(){}};
  global.addEventListener=(name,fn)=>listeners.set(name,fn);
  global.AppStore={
    data:type=>data[type],
    setData(type,value){data[type]=value;return value;},
    setDataMany(next){Object.assign(data,next);return next;}
  };
  let seq=0;
  global.KorukLocalFirst={
    uid:()=> 'u1',
    cache:async(_uid,type,rows)=>{cached.push({type,rows:JSON.parse(JSON.stringify(rows))});return rows;}
  };
  global.DeviceData={
    newId:()=>`new-${++seq}`,
    async add(type,_collection,row,options={}){
      const id=options.id||this.newId();
      data[type]=[...(data[type]||[]),{id,...row}];
      return{id,...row};
    },
    async update(type,_collection,id,row){
      data[type]=(data[type]||[]).map(x=>x.id===id?{...x,...row}:x);
      return data[type].find(x=>x.id===id);
    },
    async set(type,_collection,id,row){
      const i=(data[type]||[]).findIndex(x=>x.id===id);
      if(i<0)data[type]=[...(data[type]||[]),{id,...row}];
      else data[type]=(data[type]||[]).map(x=>x.id===id?{id,...row}:x);
      return data[type].find(x=>x.id===id);
    },
    async remove(type,_collection,id){data[type]=(data[type]||[]).filter(x=>x.id!==id);return true;}
  };

  delete global.KorukScheduleDataIntegrity;
  new Function(source)();
  assert(global.KorukScheduleDataIntegrity?.installed,'Koruma katmanı AppStore/DeviceData hazırken kurulamadı.');

  const added=await global.DeviceData.add('dersProgrami','oy_dersProgrami',{ders:'Fen Bilimleri',ogretmenId:'t3'});
  assert.equal(added.id,'new-1');
  assert.equal(data.dersProgrami.length,3,'Yerel ders ekleme mevcut dersleri korumadı.');

  global.AppStore.setDataMany({dersProgrami:[
    {id:'old-1',ders:'Türkçe',ogretmenId:'t1'},
    {id:'old-2',ders:'Matematik',ogretmenId:'t2'}
  ]});
  assert.equal(data.dersProgrami.length,3,'Gecikmiş uzak snapshot yeni eklenen dersi listeden düşürdü.');
  assert(data.dersProgrami.some(x=>x.id==='new-1'&&x.ders==='Fen Bilimleri'),'Yeni ders uzak snapshot sonrasında korunmadı.');

  await global.DeviceData.update('dersProgrami','oy_dersProgrami','old-1',{ders:'Sosyal Bilgiler',ogretmenId:'t4'});
  global.AppStore.setDataMany({dersProgrami:[
    {id:'old-1',ders:'Türkçe',ogretmenId:'t1'},
    {id:'old-2',ders:'Matematik',ogretmenId:'t2'},
    {id:'new-1',ders:'Fen Bilimleri',ogretmenId:'t3'}
  ]});
  assert.equal(data.dersProgrami.find(x=>x.id==='old-1').ders,'Sosyal Bilgiler','Gecikmiş snapshot yerel ders güncellemesini geri aldı.');

  await global.DeviceData.remove('dersProgrami','oy_dersProgrami','old-2');
  global.AppStore.setDataMany({dersProgrami:[
    {id:'old-1',ders:'Türkçe',ogretmenId:'t1'},
    {id:'old-2',ders:'Matematik',ogretmenId:'t2'},
    {id:'new-1',ders:'Fen Bilimleri',ogretmenId:'t3'}
  ]});
  assert(!data.dersProgrami.some(x=>x.id==='old-2'),'Gecikmiş snapshot yerelde silinen dersi geri getirdi.');

  await new Promise(resolve=>setTimeout(resolve,0));
  assert(cached.length>=1,'Korunan ders listesi IndexedDB önbelleğine geri yazılmadı.');
  assert(cached.at(-1).rows.some(x=>x.id==='new-1'),'Onarılan önbellekte yeni ders kaydı yok.');

  console.log('Ders ekleme/güncelleme/silme sırasında gecikmiş snapshot veri bütünlüğü başarılı.');
})().catch(error=>{console.error(error);process.exit(1)});
