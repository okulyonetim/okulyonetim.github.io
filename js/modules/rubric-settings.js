/* Koruk Asistan — Rubric Settings V2
 * Kriter/Proje araçlarının ayar kapısı.
 * Kişisel ayar: KorukLocalFirst IndexedDB meta.
 * Okul varsayılanı: mevcut oy_okulBilgileri/ayarlar, DeviceData üzerinden queue/sync.
 */
(function(global){
'use strict';
if(global.RubricSettingsService)return;
const KINDS={rubric:{local:'krtDagitimAyarlari',field:'kriterDagitimAyari'},project:{local:'projeDagitimAyarlari',field:'projeDegerlendirmeAyari'}};
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const uid=()=>global.AKTIF_KULLANICI?.uid||global.AppStore?.get?.('session.user')?.uid||'';
function def(kind){const d=KINDS[kind];if(!d)throw new Error('rubric-kind-gecersiz:'+kind);return d;}
function schoolDoc(){
 const rows=global.AppStore?.data?.('okulBilgileri');
 const row=Array.isArray(rows)?rows.find(x=>x?.id==='ayarlar'):null;
 if(row)return row;
 return global.okulBilgileriAyari&&typeof global.okulBilgileriAyari==='object'?global.okulBilgileriAyari:{};
}
async function personalGet(kind){
 const d=def(kind),u=uid();if(!u)return null;
 const key='rubric-settings:'+kind;
 const saved=await global.KorukLocalFirst?.meta?.(u,key);
 if(saved)return clone(saved);
 // Tek seferlik legacy localStorage migration. Bundan sonra kaynak IndexedDB'dir.
 try{
   const raw=global.localStorage?.getItem?.(d.local);
   if(raw){const value=JSON.parse(raw);await global.KorukLocalFirst?.meta?.(u,key,value);return clone(value);}
 }catch(e){console.warn('[RubricSettings/migrate]',kind,e?.message||e);}
 return null;
}
async function personalSet(kind,value){
 const u=uid();if(!u)throw new Error('girissiz');def(kind);
 await global.KorukLocalFirst.meta(u,'rubric-settings:'+kind,clone(value));
 global.dispatchEvent(new CustomEvent('koruk:rubric-settings-changed',{detail:{kind,scope:'personal'}}));
 return clone(value);
}
function schoolGet(kind){const d=def(kind);return clone(schoolDoc()?.[d.field]||null);}
async function schoolSet(kind,value){
 const d=def(kind),u=global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
 if(u.admin!==true)throw Object.assign(new Error('yetkisiz'),{code:'permission-denied'});
 if(!global.DeviceData||!global.COL?.okulBilgileri)throw new Error('DeviceData/okulBilgileri hazır değil.');
 const current=schoolDoc();
 const next={...current,[d.field]:clone(value),id:'ayarlar',guncellenmeTarihi:new Date().toISOString()};
 await global.DeviceData.set('okulBilgileri',global.COL.okulBilgileri,'ayarlar',next,{merge:true});
 global.okulBilgileriAyari=next;
 global.dispatchEvent(new CustomEvent('koruk:rubric-settings-changed',{detail:{kind,scope:'school'}}));
 return clone(value);
}
async function resolve(kind,fallback){return clone((await personalGet(kind))||schoolGet(kind)||fallback);}
async function clearPersonal(kind){const u=uid();if(!u)return;def(kind);await global.KorukLocalFirst.meta(u,'rubric-settings:'+kind,null);global.dispatchEvent(new CustomEvent('koruk:rubric-settings-changed',{detail:{kind,scope:'personal-clear'}}));}
global.RubricSettingsService={KINDS:Object.freeze(clone(KINDS)),personalGet,personalSet,schoolGet,schoolSet,resolve,clearPersonal};
})(window);
