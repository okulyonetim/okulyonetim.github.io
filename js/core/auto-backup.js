/* Koruk Asistan — Otomatik cihaz yedeği (Firestore/sunucu gerektirmez)
 * Uygulama açıldığında (günde en çok bir kez) cihazdaki yerel verinin (AppStore/IndexedDB) tam bir kopyası
 * bu cihazda ayrı bir IndexedDB deposuna yazılır; son 7 yedek saklanır. Yedek biçimi Ayarlar > Veriler'deki
 * elle JSON yedeğiyle aynıdır, bu yüzden "Yedekten Geri Yükle" ile geri yüklenir. Yalnız yönetici hesaplarında çalışır. */
(function(global){
'use strict';
if(global.KorukAutoBackup)return;
const DB_NAME='koruk-auto-backup',KEEP=7,DAY=86400000,PREF='ka-auto-backup',DELAY=20000;
const TYPES=['ogretmenler','dersProgrami','dersSaatleri','siniflar','ogrenciler','veliler','servisler','nobetAtamalari','nobetYerleri','sinavlar','denemeSinavlari','ogretmenIzinleri','notlar','yemekMenuleri','sosyalKulupler','belirliGunler','zumre','sokProgrami','bepPlani','dokumanlar','yoklama','konusmalar','mesajlar','anketler','akademikTakvim','kontrolListeleri','denemeSonuclari','testSonuclari','yillikPlanBasliklari','yillikPlanTanimlari','ogretmenYillikPlanSecimleri','toplantiCizelgesi','ogretmenListeSablon','ogretmenListeKayit','idariBilgiler','okulBilgileri','depolamaAyarlari','hatirlatmaAyarlari'];
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const isAdmin=()=>user().admin===true;
function prefs(){try{return JSON.parse(localStorage.getItem(PREF)||'{}')||{}}catch(_){return{}}}
function setPrefs(p){try{localStorage.setItem(PREF,JSON.stringify({...prefs(),...p}))}catch(_){}}
const enabled=()=>prefs().off!==true;
const setEnabled=on=>setPrefs({off:!on});

function open(){return new Promise((resolve,reject)=>{
  if(!global.indexedDB)return reject(new Error('indexeddb-yok'));
  const r=indexedDB.open(DB_NAME,1);
  r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta',{keyPath:'id'});if(!db.objectStoreNames.contains('data'))db.createObjectStore('data',{keyPath:'id'})};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('indexeddb-acilamadi'))})}
async function run(fn,stores,mode='readonly'){
  const db=await open();
  return new Promise((resolve,reject)=>{const tx=db.transaction(stores,mode);let out;
    tx.oncomplete=()=>{db.close();resolve(out)};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||new Error('indexeddb-hatasi'))};
    try{out=fn(...stores.map(s=>tx.objectStore(s)),tx)}catch(e){reject(e)}})}
const asPromise=req=>new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)});

function snapshot(){
  const veri={};let count=0;
  for(const t of TYPES){try{const rows=global.AppStore?.data?.(t);if(Array.isArray(rows)&&rows.length){veri[t]=rows;count+=rows.length}}catch(_){}}
  return{snapshot:{exportTarihi:new Date().toISOString(),versiyon:2,otomatik:true,veri},count}}

async function list(){
  const rows=await run(meta=>asPromise(meta.getAll()),['meta']);
  return(rows||[]).sort((a,b)=>b.ts-a.ts)}
async function get(id){
  const db=await open();
  try{return await new Promise((res,rej)=>{const r=db.transaction('data').objectStore('data').get(Number(id));r.onsuccess=()=>res(r.result?.json||'');r.onerror=()=>rej(r.error)})}finally{db.close()}}
async function remove(id){await run((meta,data)=>{meta.delete(Number(id));data.delete(Number(id))},['meta','data'],'readwrite')}

async function backupNow({manual=false}={}){
  if(!isAdmin())throw new Error('yonetici-gerekli');
  const{snapshot:snap,count}=snapshot();
  if(!count)throw new Error('veri-yok');
  const json=JSON.stringify(snap),ts=Date.now(),entry={id:ts,ts,count,bytes:json.length,manuel:!!manual};
  await run((meta,data)=>{meta.put(entry);data.put({id:ts,json})},['meta','data'],'readwrite');
  /* En eski yedekleri sil (son KEEP adet kalır). */
  const all=await list();
  for(const old of all.slice(KEEP))await remove(old.id);
  setPrefs({last:ts,error:''});
  return entry}

function due(now=Date.now()){return now-(Number(prefs().last)||0)>=DAY}
let timer=0;
async function check(){
  if(!enabled()||!isAdmin()||!due())return false;
  if(!global.AppStore?.state?.meta?.hydrated)return false;
  try{await backupNow();return true}catch(e){console.warn('[Otomatik yedek]',e?.message||e);setPrefs({error:String(e?.message||e)});return false}}
function schedule(){clearTimeout(timer);timer=setTimeout(check,DELAY)}
global.addEventListener('koruk:app-ready',schedule);
global.KorukAutoBackup={TYPES,enabled,setEnabled,list,get,remove,backupNow,check,due,snapshot,KEEP,lastError:()=>prefs().error||'',lastTime:()=>Number(prefs().last)||0};
})(window);
