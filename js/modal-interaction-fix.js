/* Koruk Asistan — modal-interaction-fix v5 (KESİN ÇÖZÜM)
   ==========================================================
   Strateji: body.classList / body.style DEĞİŞTİRME.
   modal-open class'ı ve body kilitleme tüm donma sorunlarının kaynağı.
   Modal açıkken body'ye HİÇBİR inline style veya class eklemiyoruz.
   Scroll-through'u overscroll-behavior:contain ile modal kutusunun
   KENDİSİNDE önlüyoruz — body'ye dokunmak yerine.
   ========================================================== */
(function(){
'use strict';
if(window.__MODAL_FIX_V5__) return;
window.__MODAL_FIX_V5__ = true;

/* ── body.classList.add/remove('modal-open') çağrılarını no-op yap ── */
const _orijinalAdd = DOMTokenList.prototype.add;
const _orijinalRemove = DOMTokenList.prototype.remove;

DOMTokenList.prototype.add = function(...args){
  if(this === document.body.classList){
    const temizArgs = args.filter(a => a !== 'modal-open');
    if(temizArgs.length) _orijinalAdd.apply(this, temizArgs);
    return;
  }
  return _orijinalAdd.apply(this, args);
};

DOMTokenList.prototype.remove = function(...args){
  if(this === document.body.classList){
    const temizArgs = args.filter(a => a !== 'modal-open');
    if(temizArgs.length) _orijinalRemove.apply(this, temizArgs);
    return;
  }
  return _orijinalRemove.apply(this, args);
};

/* ── body.style.position='fixed' kalıntısı varsa temizle ── */
function bodyTemizle(){
  const b = document.body;
  if(b.style.position === 'fixed'){
    b.style.position = '';
    b.style.top = '';
    b.style.left = '';
    b.style.right = '';
  }
  b.style.removeProperty('touch-action');
  b.style.removeProperty('overflow');
  /* DÜZELTME (kök sebep — "herhangi bir modal açıkken bir butona basılınca
     uygulama tamamen donuyor"): burada _pullToRefreshZorlaSifirla() ÇAĞRILMAMALI.
     Bu fonksiyon HER tıklamadan 30ms sonra (modal hâlâ açık olsa bile) native
     pull-to-refresh'i koşulsuz TEKRAR ETKİNLEŞTİRİYORDU — js/app.js'teki
     _pullToRefreshDerinlik sayacının (modalAc/modalKapat ile dengelenen) üzerine
     binerek onu geçersiz kılıyordu. Sonuç: modal içinde bir butona basıldıktan
     hemen sonra parmakta ufak bir aşağı hareket olursa (çok sık rastlanan bir
     durum), native taraf bunu "aşağı çek" jesti sanıp yakalıyor ve
     MainActivity.java:setOnRefreshListener → webView.reload() tetikleniyordu —
     yani TÜM JS durumu silinip sayfa sıfırdan yükleniyordu (kullanıcıya "tam
     donma" olarak görünüyor). Bu zorla sıfırlama zaten doğru yerde,
     js/alt-navigasyon.js:_ustPanelleriKapat() içinde yapılıyor (bkz. o
     fonksiyonun sonundaki _pullToRefreshZorlaSifirla() çağrısı) — o nokta
     gerçekten "tüm üst panelleri kapat" niyetinde olduğu için güvenli; burada
     (her tıklamada, modal açık/kapalı ayrımı yapmadan) DEĞİL. */
}

/* ── Sayfa yüklenince ve her tıklamadan sonra temizle ── */
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', bodyTemizle, {once:true});
} else {
  bodyTemizle();
}
document.addEventListener('click', function(){ setTimeout(bodyTemizle, 30); }, false);
})();
