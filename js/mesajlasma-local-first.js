/* Koruk Asistan - Mesajlasma Local First v1 */
(function(){
'use strict';
if(window.__KORUK_MSG_LOCAL_FIRST__)return;window.__KORUK_MSG_LOCAL_FIRST__=true;
function ready(){return window.KorukLocalFirst&&window.MesajlasmaRepository&&window.MesajlasmaService}
function u(){return KorukLocalFirst.uid()}
function col(n){try{return COL[n]}catch(_){return n==='konusmalar'?'konusmalar':'mesajlar'}}
async function filter(type,arr){const t=await KorukLocalFirst.tombstones(u(),type);return (arr||[]).filter(x=>!t[x.id])}
function install(){if(!ready())return false;if(MesajlasmaRepository.__localFirst)return true;MesajlasmaRepository.__localFirst=true;
 const kd=MesajlasmaRepository.konusmalariDinle.bind(MesajlasmaRepository);MesajlasmaRepository.konusmalariDinle=function(uid,cb,err){KorukLocalFirst.cached(uid,'konusmalar',[]).then(v=>filter('konusma',v)).then(v=>{if(v.length)cb(v)});return kd(uid,async v=>{await KorukLocalFirst.cache(uid,'konusmalar',v);cb(await filter('konusma',v))},err)};
 const md=MesajlasmaRepository.mesajlariDinle.bind(MesajlasmaRepository);MesajlasmaRepository.mesajlariDinle=function(id,cb,err){const uid=u();KorukLocalFirst.cached(uid,'mesajlar:'+id,[]).then(v=>filter('mesaj',v)).then(v=>{if(v.length)cb(v)});return md(id,async v=>{await KorukLocalFirst.cache(uid,'mesajlar:'+id,v);cb(await filter('mesaj',v))},err)};
 MesajlasmaService.mesajSil=async function(m){if(!this.mesajSilinebilirMi(m))throw new Error('sahip-degil');const uid=u();await KorukLocalFirst.tombstone(uid,'mesaj',m.id,true);try{window.mesajlar=(window.mesajlar||[]).filter(x=>x.id!==m.id);if(typeof _mesajlariRenderEt==='function')_mesajlariRenderEt()}catch(_){}await KorukLocalFirst.queue(uid,{kind:'delete-doc',collection:col('mesajlar'),id:m.id,tombType:'mesaj',tombId:m.id});KorukLocalFirst.flush();return true};
 MesajlasmaService.konusmaSil=async function(id,k){if(!this._yetkiKontrol())throw new Error('yetkisiz');const ben=this._kendiKimlik(),ok=k&&(k.katilimciUidler||[]).includes(ben.uid),admin=!!window.AKTIF_KULLANICI?.admin;if(!ok&&!admin)throw new Error('sahip-degil');const uid=u();await KorukLocalFirst.tombstone(uid,'konusma',id,true);try{window.konusmalar=(window.konusmalar||[]).filter(x=>x.id!==id);if(typeof renderKonusmaListesi==='function')renderKonusmaListesi();if(typeof renderMesajRozeti==='function')renderMesajRozeti()}catch(_){}await KorukLocalFirst.queue(uid,{kind:'delete-query',collection:col('mesajlar'),field:'konusmaId',value:id});await KorukLocalFirst.queue(uid,{kind:'delete-doc',collection:col('konusmalar'),id,tombType:'konusma',tombId:id});KorukLocalFirst.flush();return true};
 return true}
let n=0,t=setInterval(()=>{if(install()||++n>80)clearInterval(t)},100);if(document.readyState!=='loading')install();else document.addEventListener('DOMContentLoaded',install,{once:true});
})();