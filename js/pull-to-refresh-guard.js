/* Koruk Asistan — global pull-to-refresh gesture guard
   Amaç: yalnız gerçekten sayfanın/aktif iç panelin en üstündeyken aşağı çekme
   jestine izin vermek; normal dikey gezinme, yatay swipe, alt navigasyon,
   form alanları, harita ve modal etkileşimlerinde native yenilemeyi engellemek. */
(function(){
'use strict';
if(window.__KORUK_PTR_GUARD__) return;
window.__KORUK_PTR_GUARD__ = true;

const bridge = () => window.AndroidPullToRefreshKopru;
let basX = 0, basY = 0, aktifScroller = null, bloklu = false, aktif = false;
let sonBildirilen = null;

function bildir(kaydirilmisMi){
  const v = !!kaydirilmisMi;
  if(v === sonBildirilen) return;
  sonBildirilen = v;
  try{
    const b = bridge();
    if(b && typeof b.innerScrollBildir === 'function') b.innerScrollBildir(v);
  }catch(_){ }
}

function gorunurMu(el){
  if(!el || !el.isConnected) return false;
  const s = getComputedStyle(el);
  return s.display !== 'none' && s.visibility !== 'hidden' && s.pointerEvents !== 'none';
}

function dikeyScrollerBul(el){
  let n = el && el.nodeType === 1 ? el : el?.parentElement;
  while(n && n !== document.body && n !== document.documentElement){
    const s = getComputedStyle(n);
    const oy = s.overflowY;
    const kayabilir = (oy === 'auto' || oy === 'scroll' || oy === 'overlay') && n.scrollHeight > n.clientHeight + 3;
    if(kayabilir && gorunurMu(n)) return n;
    n = n.parentElement;
  }
  return null;
}

function yatayScrollerVarMi(el){
  let n = el && el.nodeType === 1 ? el : el?.parentElement;
  while(n && n !== document.body && n !== document.documentElement){
    const s = getComputedStyle(n);
    const ox = s.overflowX;
    if((ox === 'auto' || ox === 'scroll' || ox === 'overlay') && n.scrollWidth > n.clientWidth + 6) return true;
    n = n.parentElement;
  }
  return false;
}

function etkilesimliBolgeMi(el){
  if(!el || !el.closest) return false;
  return !!el.closest([
    'input','textarea','select','option','button','a','label',
    '[contenteditable="true"]','[contenteditable=""]','[role="button"]',
    '.leaflet-container','.map-container','canvas','iframe','video','audio',
    '[data-ptr-ignore]','.ptr-ignore',
    'nav','.bottom-nav','.bottom-navigation','.mobile-bottom-nav',
    '#altNav','#altNavBar','#altNavAlt','#anAltNav','#anBottomNav'
  ].join(','));
}

function gercekModalIcindeMi(el){
  if(!el || !el.closest) return false;
  const m = el.closest('#modalOverlay,.modal-overlay,.modal,[role="dialog"],.bottom-sheet,.sheet-modal');
  if(!m) return false;
  if(m.id === 'modalOverlay') return m.classList.contains('active') || gorunurMu(m);
  return gorunurMu(m);
}

function sayfaEnUstteMi(){
  const y = Math.max(window.scrollY || 0, document.documentElement.scrollTop || 0, document.body.scrollTop || 0);
  return y <= 1;
}

function durumuTemizle(){
  aktif = false;
  bloklu = false;
  aktifScroller = null;
  // Bir sonraki dokunuşta gerçek durum yeniden hesaplanacak.
  setTimeout(()=>bildir(false), 90);
}

document.addEventListener('touchstart', function(e){
  if(!e.touches || e.touches.length !== 1){ aktif = false; bildir(true); return; }
  const t = e.touches[0];
  basX = t.clientX; basY = t.clientY;
  aktif = true;
  aktifScroller = dikeyScrollerBul(e.target);

  const yasak = etkilesimliBolgeMi(e.target) || gercekModalIcindeMi(e.target) || yatayScrollerVarMi(e.target);
  if(yasak){
    bloklu = true;
    bildir(true);
    return;
  }

  const icKaymis = !!(aktifScroller && aktifScroller.scrollTop > 1);
  const sayfaKaymis = !aktifScroller && !sayfaEnUstteMi();
  bloklu = icKaymis || sayfaKaymis;
  bildir(bloklu);
}, {passive:true, capture:true});

document.addEventListener('touchmove', function(e){
  if(!aktif || !e.touches || e.touches.length !== 1) return;
  const t = e.touches[0];
  const dx = t.clientX - basX;
  const dy = t.clientY - basY;

  if(bloklu){ bildir(true); return; }

  // Yatay hareket belirginse menü/carousel swipe'ına bırak.
  if(Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 0.82){
    bloklu = true;
    bildir(true);
    return;
  }

  // Parmak yukarı gidiyorsa kullanıcı içerikte aşağı doğru geziniyor.
  // Native PTR'nin bu hareketi sonradan ters yönde yakalamasına izin verme.
  if(dy < -6){
    bloklu = true;
    bildir(true);
    return;
  }

  if(aktifScroller){
    bildir(aktifScroller.scrollTop > 1);
  }else{
    bildir(!sayfaEnUstteMi());
  }
}, {passive:true, capture:true});

document.addEventListener('touchend', durumuTemizle, {passive:true, capture:true});
document.addEventListener('touchcancel', durumuTemizle, {passive:true, capture:true});

// İç scroll alanı parmak hareketinden bağımsız (momentum/programatik) kayarsa
// native katmanın durumu da güncel kalsın.
document.addEventListener('scroll', function(e){
  if(!aktif) return;
  const hedef = e.target;
  if(aktifScroller && hedef === aktifScroller) bildir(aktifScroller.scrollTop > 1);
}, {passive:true, capture:true});

// Sekme/alt navigasyon geçişinden sonra önceki iç panel durumu taşınmasın.
window.addEventListener('koruk:data-updated', ()=>{ if(!aktif) bildir(false); }, {passive:true});
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) durumuTemizle(); }, {passive:true});
})();
