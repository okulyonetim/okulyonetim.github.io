/* Koruk Asistan — Read Optimized Sync compatibility facade
 * Remote-sync kararları artık js/core/core.js içindeki SyncEngine tarafından verilir.
 * Bu dosya geriye dönük API uyumluluğu için yalnızca mevcut çekirdeği görünür kılar.
 * Monkey-patch, ikinci TTL, periyodik tam okuma ve realtime engelleme burada yapılmaz.
 */
(function(global){
'use strict';
if(global.__KA_READ_OPTIMIZED_SYNC__)return;
global.__KA_READ_OPTIMIZED_SYNC__=true;
function status(){
  const ttl=Number(global.SyncEngine?.remoteTTL||24*60*60*1000);
  return Promise.resolve({
    localFirst:true,
    realtime:false,
    remoteTTL:ttl,
    periodicSyncMs:null,
    policyOwner:'core.js',
    lastRemotePullAt:Number(global.AppStore?.get?.('meta.lastRemoteSyncAt')||0)
  });
}
global.KorukReadOptimized={
  remoteTTL:Number(global.SyncEngine?.remoteTTL||24*60*60*1000),
  periodicSyncMs:null,
  periodicTypes:[],
  forceSync:async function(types){return global.SyncEngine?.sync?.(types,{force:true})},
  status
};
})(window);