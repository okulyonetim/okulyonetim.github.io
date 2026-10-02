/* Koruk Asistan — Read Optimized Sync v2
 * Okuma-ağırlıklı okul kullanımında IndexedDB birincil okuma kaynağıdır.
 * Firestore yalnızca ilk veri yoksa, uzak önbellek süresi dolduysa veya
 * kullanıcı açıkça senkronizasyon istediğinde kullanılır.
 * Yazma kuyruğuna ve Firestore Rules'a dokunmaz.
 */
(function(global){
  'use strict';
  if(global.__KA_READ_OPTIMIZED_SYNC__) return;
  global.__KA_READ_OPTIMIZED_SYNC__ = true;

  const REMOTE_TTL = 6 * 60 * 60 * 1000;
  const MISSING = '__ka_missing__';
  let patched = false;
  let forceRemote = false;

  const uid = () => String(global.AKTIF_KULLANICI?.uid || global.AppStore?.get?.('session.user')?.uid || '');
  const now = () => Date.now();
  const cacheKey = (u, type) => `u:${u}:cache:${type}`;

  async function meta(name, value){
    const u = uid();
    if(!u || !global.KorukLocalFirst?.meta) return null;
    if(arguments.length > 1) return global.KorukLocalFirst.meta(u, name, value);
    return global.KorukLocalFirst.meta(u, name);
  }

  async function hasLocalCache(type){
    const u = uid();
    if(!u || !type || !global.KorukLocalFirst?.get) return false;
    const value = await global.KorukLocalFirst.get(cacheKey(u, type), MISSING);
    return value !== MISSING;
  }

  async function localRows(type){
    const u = uid();
    if(!u || !type || !global.KorukLocalFirst?.cached) return null;
    if(!(await hasLocalCache(type))) return null;
    const rows = await global.KorukLocalFirst.cached(u, type, []);
    return Array.isArray(rows) ? rows : [];
  }

  async function localIsFresh(type){
    if(forceRemote) return false;
    const rows = await localRows(type);
    if(rows === null) return false;
    const last = Number(await meta(`lastRemotePullAt:${type}`) || 0);
    return !!last && now() - last < REMOTE_TTL;
  }

  async function markRemote(types){
    const list = Array.isArray(types) && types.length ? types : Object.keys(global.COL || {});
    const t = now();
    await Promise.all(list.map(type => meta(`lastRemotePullAt:${type}`, t).catch(()=>{})));
    await meta('lastRemotePullAt', t).catch(()=>{});
  }

  async function allLocalFresh(types){
    const list = Array.isArray(types) && types.length ? types : [];
    if(!list.length) return false;
    const states = await Promise.all(list.map(type => localIsFresh(type)));
    return states.every(Boolean);
  }

  async function hydrateLocal(types){
    if(!global.SyncEngine?.localHydrate) return false;
    await global.SyncEngine.localHydrate(types);
    return true;
  }

  async function patchSyncEngine(){
    if(patched || !global.SyncEngine) return false;
    const sync = global.SyncEngine;
    const originalSync = typeof sync.sync === 'function' ? sync.sync : null;
    const originalPull = typeof sync.pull === 'function' ? sync.pull : null;
    if(!originalSync && !originalPull) return false;
    patched = true;

    /* sync(types) normalde tam Firestore pull yapıyor. Yerel cache tazeyse
       yalnızca IndexedDB hydrate edilir. Böylece modül açılışları read üretmez. */
    if(originalSync){
      sync.sync = async function(types, ...rest){
        const requested = Array.isArray(types) ? types.filter(Boolean) : [];
        if(!forceRemote && requested.length && await allLocalFresh(requested)){
          await hydrateLocal(requested);
          return {source:'local',types:requested,skippedRemote:true};
        }
        forceRemote = true;
        try{
          const result = await originalSync.apply(this,[types,...rest]);
          await markRemote(requested);
          return result;
        } finally { forceRemote = false; }
      };
    }

    if(originalPull){
      sync.pull = async function(types, ...rest){
        const requested = Array.isArray(types) ? types.filter(Boolean) : [];
        if(!forceRemote && requested.length && await allLocalFresh(requested)){
          await hydrateLocal(requested);
          return {source:'local',types:requested,skippedRemote:true};
        }
        forceRemote = true;
        try{
          const result = await originalPull.apply(this,[types,...rest]);
          await markRemote(requested);
          return result;
        } finally { forceRemote = false; }
      };
    }

    sync.__kaReadOptimizedWrapped = true;
    return true;
  }

  async function install(){
    if(!global.SyncEngine || !global.KorukLocalFirst) return false;
    return patchSyncEngine();
  }

  function boot(){
    if(global.SyncEngine && global.KorukLocalFirst){
      install().catch(e=>console.warn('[ReadOptimizedSync]',e?.message||e));
      return;
    }
    setTimeout(boot,100);
  }

  global.KorukReadOptimized={
    remoteTTL:REMOTE_TTL,
    async forceSync(types){
      forceRemote = true;
      try{return await global.SyncEngine?.sync?.(types)}
      finally{forceRemote = false;}
    },
    async status(){
      return {
        localFirst:true,
        realtime:false,
        remoteTTL:REMOTE_TTL,
        lastRemotePullAt:Number(await meta('lastRemotePullAt')||0)
      };
    }
  };
  boot();
})(window);
