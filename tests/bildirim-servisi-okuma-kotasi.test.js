/* Bildirim servisi (functions-free/check-and-notify.js) Firestore okuma kotasını tüketmemeli.
 * /kontrol her 5 dakikada çağrılır (günde 288 kez); ücretsiz günlük kota 50 bin okumadır. Aşılınca tüm Firestore okumaları
 * `8 RESOURCE_EXHAUSTED: Quota exceeded` ile düşer (uygulamanın kendisi dahil).
 *   • Hatırlatıcı, görev ve aylık iş taramaları geriye doğru sınırlıdır; tamamlanmış eski kayıtlar her seferinde okunmaz.
 *   • Aylık iş üretimi (şablon + ay kayıtları) her kontrolde değil, saatte en fazla bir kez çalışır.
 * Sunucu gerçek express / firebase-admin olmadan, sahte bir Firestore ile çalıştırılır. */
const assert=require('assert');
const path=require('path');
const Module=require('module');

const calls=[];
const query=col=>({
  col,w:[],l:null,
  where(f,o,v){this.w.push([f,o,v]);return this},
  orderBy(){return this},
  limit(n){this.l=n;return this},
  async get(){calls.push({col:this.col,w:this.w,l:this.l});return{docs:[],forEach(){}}},
  doc(id){return{async get(){calls.push({col:col,doc:id});return{exists:false,data:()=>({})}},async set(){}}}
});
const db={collection:query};
const admin={credential:{cert:x=>x},initializeApp(){},firestore:Object.assign(()=>db,{FieldValue:{serverTimestamp:()=>0}}),messaging(){return{}},auth(){return{}}};
const routes={};
const app={use(){},get(p,h){routes[`GET ${p}`]=h},post(p,h){routes[`POST ${p}`]=h},listen(){}};
const express=Object.assign(()=>app,{json:()=>()=>{}});

const load=Module._load;
Module._load=function(request,...rest){
  if(request==='firebase-admin')return admin;
  if(request==='express')return express;
  return load.call(this,request,...rest);
};
process.env.FIREBASE_SERVICE_ACCOUNT='{}';
delete process.env.CRON_SECRET;
const log=console.log;console.log=()=>{};
require(path.resolve(__dirname,'../functions-free/check-and-notify.js'));
console.log=log;
Module._load=load;

async function kontrol(){
  calls.length=0;
  const res={code:0,body:null,status(c){this.code=c;return this},json(b){this.body=b;return this},send(){return this}};
  const orig=console.log;console.log=()=>{};
  try{await routes['GET /kontrol']({headers:{}},res)}finally{console.log=orig}
  assert.strictEqual(res.code,200,`/kontrol başarılı dönmeli: ${JSON.stringify(res.body)}`);
  return calls.slice();
}
const sinir=(q,alan)=>({alt:q.w.find(x=>x[0]===alan&&x[1]==='>='),ust:q.w.find(x=>x[0]===alan&&x[1]==='<=')});

(async()=>{
  const ilk=await kontrol();

  /* ── taramalar geriye doğru sınırlı ── */
  const tarama=[['oy_hatirlaticilar','tarih'],['oy_gorevler','sonTarih'],['oy_periyodikIsler','bitis']];
  for(const [koleksiyon,alan] of tarama){
    const q=ilk.find(x=>x.col===koleksiyon&&x.w.some(w=>w[0]===alan&&w[1]==='>='));
    assert(q,`${koleksiyon}: ${alan} için alt sınır olmalı; tamamlanmış eski kayıtlar her kontrolde okunmamalı.`);
    const {alt,ust}=sinir(q,alan);
    assert(ust,`${koleksiyon}: üst sınır olmalı.`);
    const gun=(new Date(ust[2]+'T00:00:00Z')-new Date(alt[2]+'T00:00:00Z'))/86400000;
    assert(gun<=40,`${koleksiyon}: tarama aralığı en çok 40 gün olmalı (şimdi ${gun}).`);
  }

  /* ── aylık iş üretimi ikinci kontrolde yeniden okunmaz ── */
  assert(ilk.some(x=>x.col==='oy_periyodikSablon'),'İlk kontrolde aylık iş şablonu okunur.');
  const ikinci=await kontrol();
  assert(!ikinci.some(x=>x.col==='oy_periyodikSablon'),'Aylık iş şablonu her kontrolde okunmamalı; saatte en fazla bir kez.');
  assert(ikinci.length<ilk.length,'İkinci kontrol daha az sorgu yapmalı.');
  tarama.forEach(([koleksiyon])=>assert(ikinci.some(x=>x.col===koleksiyon),`${koleksiyon}: vadesi gelen kayıtlar her kontrolde taranmaya devam eder.`));

  console.log('Bildirim servisi okuma kotası sözleşmesi geçti.');
})().catch(e=>{console.error(e);process.exit(1)});
