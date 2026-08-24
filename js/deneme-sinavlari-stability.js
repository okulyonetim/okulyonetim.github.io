/* Koruk Asistan — Deneme sınavları kararlılık / local-first paketi v1
 * - stop tombstone: eski snapshot aktif sayacı geri getiremez
 * - silme: mevcut KorukLocalFirst queue + tombstone üzerinden local-first
 * - modal silme: sonuç alınmadan kapanmaz
 * - sayaç detayı kapanınca açıldığı sekmede kalır
 */
(function(){
'use strict';
if(window.__KORUK_DENEME_STABILITY_V1__) return;
window.__KORUK_DENEME_STABILITY_V1__=true;

const deletedIds=new Set();
const stoppedIds=new Set();
let stopHydrated=false;
let counterSourceTab=null;
let deleteHydrated=false;
let applying=false;

function uid(){
  try{return window.KorukLocalFirst?.uid?.() || window.AKTIF_KULLANICI?.uid || ''}catch(_){return ''}
}
function collectionName(){
  try{return COL.denemeSinavlari || 'oy_denemeSinavlari'}catch(_){return 'oy_denemeSinavlari'}
}
function getList(){
  try{
    if(window.KorukRuntimeState?.get) return window.KorukRuntimeState.get('denemeSinavlari')||[];
    if(typeof denemeSinavlari!=='undefined' && Array.isArray(denemeSinavlari)) return denemeSinavlari;
  }catch(_){}
  return [];
}
function setList(arr){
  try{
    if(window.KorukRuntimeState?.set) window.KorukRuntimeState.set('denemeSinavlari',arr);
    else if(typeof denemeSinavlari!=='undefined') denemeSinavlari=arr;
  }catch(_){}
}
function isStopped(id){
  id=String(id||'');
  if(stoppedIds.has(id)) return true;
  try{return !!window.KorukExamStopState?.isStopped?.(id)}catch(_){return false}
}
function safeDateMs(v){
  if(!v) return 0;
  try{
    if(typeof v.toMillis==='function') return v.toMillis();
    if(typeof v.toDate==='function') return v.toDate().getTime();
    var n=new Date(v).getTime();
    return Number.isFinite(n)?n:0;
  }catch(_){return 0}
}
function sanitize(arr){
  var changed=false,out=[];
  (Array.isArray(arr)?arr:[]).forEach(function(d){
    if(!d?.id) {out.push(d);return;}
    var id=String(d.id);
    if(deletedIds.has(id)){changed=true;return;}
    if(isStopped(id) && d.sayacDurumu?.aktif){
      d={...d,sayacDurumu:{...(d.sayacDurumu||{}),aktif:false}};
      changed=true;
    }
    out.push(d);
  });
  return {changed:changed,list:out};
}
function applyState(){
  if(applying) return getList();
  applying=true;
  try{
    var s=sanitize(getList());
    if(s.changed) setList(s.list);
    return s.list;
  }finally{applying=false}
}
function hideDash(){
  var kart=document.getElementById('dashSayacKarti');
  if(kart){kart.style.display='none';kart.innerHTML='';}
  try{if(typeof _dashSayacAktifId!=='undefined') _dashSayacAktifId=null}catch(_){}
}
function refreshViews(){
  applyState();
  try{if(typeof renderDenemeSinavlari==='function') renderDenemeSinavlari();}catch(_){}
  try{if(typeof _anaSayfaSayacKartiGuncelle==='function') _anaSayfaSayacKartiGuncelle();}catch(_){}
  try{if(typeof _sayacOvGuncelle==='function') _sayacOvGuncelle();}catch(_){}
  try{window.KorukRuntimeState?.signal?.('deneme-stability');}catch(_){}
}
async function hydrateDeletes(){
  if(deleteHydrated || !window.KorukLocalFirst) return;
  var u=uid(); if(!u){deleteHydrated=true;return;}
  try{
    var tomb=await window.KorukLocalFirst.tombstones(u,'denemeSinavlari');
    Object.keys(tomb||{}).forEach(function(id){deletedIds.add(String(id));});
  }catch(_){}
  deleteHydrated=true;
  if(deletedIds.size) refreshViews();
}
async function hydrateStops(){
  if(!window.KorukLocalFirst){stopHydrated=true;return;}
  var u=uid(), arr=getList();
  if(!u){stopHydrated=true;return;}
  try{
    await Promise.all(arr.map(async function(d){
      if(!d?.id) return;
      var key='exam-stop:'+u+':'+d.id;
      var s=await window.KorukLocalFirst.get(key,null);
      if(!s || s.aktif!==false) return;
      var remoteActive=!!d.sayacDurumu?.aktif;
      var remoteStart=safeDateMs(d.sayacDurumu?.baslatmaTarihi);
      var localStop=Number(s.at||0);
      if(remoteActive && remoteStart>localStop){
        stoppedIds.delete(String(d.id));
        return;
      }
      stoppedIds.add(String(d.id));
    }));
  }catch(_){}
  stopHydrated=true;
  refreshViews();
}

function wrapRender(name, before){
  var old=window[name];
  if(typeof old!=='function' || old.__dnStableWrapped) return false;
  var fn=function(){
    if(before) before();
    else applyState();
    return old.apply(this,arguments);
  };
  fn.__dnStableWrapped=true;
  fn.__dnStableBase=old;
  window[name]=fn;
  return true;
}
function installRenderGuards(){
  wrapRender('renderDenemeSinavlari');
  wrapRender('_sayacOvGuncelle');
  wrapRender('_anaSayfaSayacKartiGuncelle',function(){
    if(!stopHydrated){hideDash();return;}
    applyState();
  });
}

function installDelete(){
  if(!window.SinavlarService || SinavlarService.__dnLocalDeleteV1) return false;
  var original=SinavlarService.denemeSil.bind(SinavlarService);
  SinavlarService.__dnLocalDeleteV1=true;
  SinavlarService.denemeSil=async function(id,kayit){
    if(!id) throw new Error('kayit-yok');
    if(typeof this._yetkiKontrol==='function' && !this._yetkiKontrol()) throw new Error('yetkisiz');
    if(typeof this.denemeDuzenlenebilirMi==='function' && !this.denemeDuzenlenebilirMi(kayit)) throw new Error('sahip-degil');

    if(!window.KorukLocalFirst || !uid()) return original(id,kayit);

    var sid=String(id), u=uid();
    deletedIds.add(sid);
    await window.KorukLocalFirst.tombstone(u,'denemeSinavlari',sid,true);

    var next=getList().filter(function(x){return String(x?.id||'')!==sid;});
    setList(next);
    if(document.getElementById('denemeSayacOv') && String(window._sayacOvId||'')===sid){
      try{if(typeof denemeSayacKapat==='function')denemeSayacKapat();}catch(_){}
    }
    refreshViews();

    await window.KorukLocalFirst.queue(u,{
      qid:'deneme-delete:'+sid,
      kind:'delete-doc',
      collection:collectionName(),
      id:sid,
      tombType:'denemeSinavlari',
      tombId:sid
    });
    window.KorukLocalFirst.flush();
    return true;
  };
  return true;
}

function activeTab(){
  var p=document.querySelector('.tab-panel.active');
  return p?.id?.startsWith('tab-') ? p.id.slice(4) : null;
}
function restoreTab(tab){
  if(!tab || typeof sekmeAc!=='function') return;
  var p=document.getElementById('tab-'+tab);
  if(!p) return;
  if(!p.classList.contains('active')) sekmeAc(tab);
}
function safeCounterClose(){
  var wanted=counterSourceTab || 'denemeSinavlari';
  var close=window.denemeSayacKapat;
  if(typeof close==='function') close();
  counterSourceTab=null;
  requestAnimationFrame(function(){restoreTab(wanted);});
  setTimeout(function(){restoreTab(wanted);},40);
}
function installCounterNavigation(){
  var ac=window.denemeSayacAc;
  if(typeof ac==='function' && !ac.__dnSourceWrapped){
    var fn=function(){
      counterSourceTab=activeTab();
      return ac.apply(this,arguments);
    };
    fn.__dnSourceWrapped=true; fn.__dnSourceBase=ac;
    window.denemeSayacAc=fn;
  }
  var back=window.denemeSayacGeriTusu;
  if(typeof back==='function' && !back.__dnSafeBack){
    var b=function(){
      if(!document.getElementById('denemeSayacOv')) return false;
      safeCounterClose();
      return true;
    };
    b.__dnSafeBack=true;b.__dnSafeBase=back;
    window.denemeSayacGeriTusu=b;
  }
}

function installModalDelete(){
  var open=window.denemeModalAc;
  if(typeof open!=='function' || open.__dnDeleteWrapped) return false;
  var fn=function(id){
    var source=activeTab();
    var r=open.apply(this,arguments);
    var d=id?getList().find(function(x){return String(x.id)===String(id);}):null;
    var btn=document.getElementById('modalSilBtn');
    if(id && d && btn && btn.style.display!=='none'){
      btn.onclick=async function(e){
        if(e){e.preventDefault();e.stopPropagation();}
        if(!confirm('Bu deneme sınavı kaydını silmek istiyor musunuz?')) return;
        var oldText=btn.textContent;
        btn.disabled=true;btn.textContent='Siliniyor…';
        try{
          await SinavlarService.denemeSil(d.id,d);
          if(typeof modalKapat==='function') modalKapat();
          restoreTab(source||'denemeSinavlari');
          if(typeof toast==='function') toast('Deneme sınavı silindi.');
        }catch(err){
          btn.disabled=false;btn.textContent=oldText;
          if(err?.message==='sahip-degil') toast('Bu deneme sınavı kaydını yalnızca ekleyen kişi silebilir.');
          else if(err?.message!=='yetkisiz') toast('Silme hatası: '+(err?.message||err));
        }
      };
    }
    return r;
  };
  fn.__dnDeleteWrapped=true;fn.__dnDeleteBase=open;
  window.denemeModalAc=fn;
  return true;
}

document.addEventListener('click',function(e){
  var back=e.target.closest?.('#denemeSayacOv .dn-ov-geri');
  if(back){
    e.preventDefault();
    e.stopImmediatePropagation();
    safeCounterClose();
    return;
  }
  if(e.target.closest?.('[onclick*="denemeModalAc"],#denemeSinavlariListesi .dn-kart')){
    installAll();
  }
},true);

window.addEventListener('koruk:exam-stop-state',function(e){
  var id=String(e.detail?.id||'');
  if(id){
    if(e.detail?.stopped===true) stoppedIds.add(id);
    if(e.detail?.stopped===false) stoppedIds.delete(id);
  }
  stopHydrated=true;
  refreshViews();
});
window.addEventListener('koruk:deneme-sayac-local',function(e){
  var id=String(e.detail?.id||'');
  if(id){
    if(e.detail?.aktif===false) stoppedIds.add(id);
    if(e.detail?.aktif===true) stoppedIds.delete(id);
  }
  stopHydrated=true;
  refreshViews();
});
let dataTimer=null;
window.addEventListener('koruk:data-updated',function(){
  clearTimeout(dataTimer);
  dataTimer=setTimeout(function(){
    installAll();
    applyState();
    hydrateDeletes();
    hydrateStops();
  },0);
});

function installAll(){
  installDelete();
  installRenderGuards();
  installCounterNavigation();
  installModalDelete();
}
function start(){
  installAll();
  hydrateDeletes();
  hydrateStops();
  [180,700,1800,4200].forEach(function(ms){setTimeout(installAll,ms);});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
