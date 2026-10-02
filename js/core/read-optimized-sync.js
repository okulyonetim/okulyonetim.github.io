/* Koruk Asistan — Read Optimized Sync v1
 * Okuma-ağırlıklı okul kullanımında IndexedDB'yi birincil okuma kaynağı yapar.
 * Firestore yalnız: ilk veri yoksa, TTL dolmuşsa veya kullanıcı açıkça yenileme
 * istediğinde uzak senkronizasyon için kullanılır. Yazma kuyruğu korunur.
 */
(function(global){
  'use strict';
  if(global.__KA_READ_OPTIMIZED_SYNC__) return;
  global.__KA_READ_OPTIMIZED_SYNC__ = true;

  const REMOTE_TTL = 6 * 60 * 60 * 1000;
  const REMOTE_WINDOW = 45 * 1000;
  const MISSING = '__ka_missing__';
  let remoteUntil = 0;
  let forceRemoteUntil = 0;
  let patched = false;

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
    if(!u || !global.KorukLocalFirst?.get) return false;
    const value = await global.KorukLocalFirst.get(cacheKey(u, type), MISSING);
    return value !== MISSING;
  }

  function collectionName(query){
    const candidates = [
      query?._delegate?._query?.path?.segments,
      query?._delegate?._queryOptions?.path?.segments,
      query?._query?.path?.segments,
      query?._queryOptions?.path?.segments,
      query?._delegate?._query?.path?.canonicalString?.(),
      query?._delegate?._queryOptions?.path?.canonicalString?.(),
      query?._query?.path?.canonicalString?.(),
      query?._queryOptions?.path?.canonicalString?.(),
      query?._delegate?._query?.path?.lastSegment?.(),
      query?._delegate?._queryOptions?.path?.lastSegment?.(),
      query?._query?.path?.lastSegment?.(),
      query?._queryOptions?.path?.lastSegment?.()
    ];
    for(const candidate of candidates){
      if(Array.isArray(candidate) && candidate.length) return String(candidate[candidate.length-1]);
      if(typeof candidate === 'string' && candidate) return candidate.split('/').filter(Boolean).pop() || '';
    }
    return '';
  }

  function typeForCollection(collection){
    if(!collection || !global.SyncEngine?.definitions) return '';
    const def = global.SyncEngine.definitions().find(x => String(x?.collection||'') === collection);
    return def?.type || '';
  }

  function stripId(row){
    if(!row || typeof row !== 'object') return {};
    const out = {...row};
    delete out.id;
    return out;
  }

  function makeDoc(row){
    const id = String(row?.id ?? '');
    return {
      id,
      exists: true,
      data: () => stripId(row),
      ref: {id, path:id},
      get: field => stripId(row)[field]
    };
  }

  function makeSnapshot(rows){
    const safe = Array.isArray(rows) ? rows : [];
    const docs = safe.map(makeDoc);
    return {
      docs,
      size: docs.length,
      empty: docs.length === 0,
      metadata: {fromCache:true, hasPendingWrites:false},
      forEach(fn, thisArg){docs.forEach((doc,i)=>fn.call(thisArg,doc,i));},
      docChanges(){return [];}
    };
  }

  async function localRows(type){
    const u = uid();
    if(!u || !type || !global.KorukLocalFirst?.cached) return null;
    const exists = await hasLocalCache(type);
    if(!exists) return null;
    const rows = await global.KorukLocalFirst.cached(u, type, []);
    return Array.isArray(rows) ? rows : [];
  }

  async function shouldUseLocal(type){
    if(!type) return false;
    if(forceRemoteUntil > now()) return false;
    if(remoteUntil > now()) return false;
    const cachedRows = await localRows(type);
    if(cachedRows === null) return false;
    const last = Number(await meta('lastRemotePullAt') || 0);
    if(!last) return false;
    return now() - last < REMOTE_TTL;
  }

  function beginRemoteWindow(){
    remoteUntil = now() + REMOTE_WINDOW;
  }

  async function patchFirestore(){
    if(patched || !global.db?.collection) return false;
    patched = true;
    const db = global.db;
    let sample;
    try{ sample = db.collection('__ka_read_probe__'); }catch(_){sample=null;}
    const proto = sample && Object.getPrototypeOf(sample);
    if(!proto || typeof proto.get !== 'function') return false;
    if(proto.__kaReadOptimized) return true;

    const originalGet = proto.get;
    proto.get = async function(...args){
      const col = collectionName(this);
      const type = typeForCollection(col);
      if(type && await shouldUseLocal(type)){
        const rows = await localRows(type);
        if(rows !== null) return makeSnapshot(rows);
      }
      if(type) beginRemoteWindow();
      const result = await originalGet.apply(this,args);
      if(type) await meta('lastRemotePullAt', now());
      return result;
    };

    if(typeof proto.onSnapshot === 'function'){
      const originalSnapshot = proto.onSnapshot;
      proto.onSnapshot = function(...args){
        const callback = typeof args[0] === 'function' ? args[0] : args[1];
        if(typeof callback === 'function'){
          const col = collectionName(this);
          const type = typeForCollection(col);
          localRows(type).then(rows=>{
            if(rows !== null) callback(makeSnapshot(rows));
          }).catch(()=>{});
        }
        return function unsubscribeReadOptimized(){};
      };
      proto.__kaOriginalOnSnapshot = originalSnapshot;
    }
    proto.__kaReadOptimized = true;
    proto.__kaOriginalGet = originalGet;
    return true;
  }

  async function install(){
    if(!global.SyncEngine || !global.KorukLocalFirst) return false;
    await patchFirestore();
    const sync = global.SyncEngine;
    if(!sync.__kaReadOptimizedWrapped){
      const originalSync = sync.sync;
      const originalPull = sync.pull;
      const originalSchedule = sync.schedule;
      sync.sync = async function(...args){
        forceRemoteUntil = now() + REMOTE_WINDOW;
        try{return await originalSync.apply(this,args)}
        finally{forceRemoteUntil = 0;}
      };
      sync.pull = async function(...args){
        forceRemoteUntil = now() + REMOTE_WINDOW;
        try{return await originalPull.apply(this,args)}
        finally{forceRemoteUntil = 0;}
      };
      sync.schedule = function(ms=1200){ return originalSchedule.call(this,ms); };
      sync.__kaReadOptimizedWrapped = true;
    }
    return true;
  }

  function boot(){
    if(global.SyncEngine && global.KorukLocalFirst && global.db){
      install().catch(e=>console.warn('[ReadOptimizedSync]',e?.message||e));
      return;
    }
    setTimeout(boot,100);
  }

  global.KorukReadOptimized={
    remoteTTL: REMOTE_TTL,
    async forceSync(){
      forceRemoteUntil = now() + REMOTE_WINDOW;
      return global.SyncEngine?.sync?.();
    },
    async status(){
      return {lastRemotePullAt:Number(await meta('lastRemotePullAt')||0),remoteTTL:REMOTE_TTL,localFirst:true,realtime:false};
    }
  };
  boot();
})(window);
