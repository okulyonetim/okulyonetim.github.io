/* Koruk Asistan — V3 Merkezi Geri Yığını (pencere/panel katmanı)
 * Sorun: her modül kendi pencere/panelini açıyor, geri tuşu ve Esc her yerde farklı davranıyordu.
 * Çözüm: ortak pencere/panel sınıfları (ka-modal-backdrop, ka-sheet-backdrop) DOM'a eklendiğinde otomatik yığına girer;
 *        tarayıcı/telefon geri tuşu, Esc ve KorukNav.back() hep EN ÜSTTEKİNİ kapatır. Modüllerde değişiklik gerekmez.
 * Modül kendi kapatırsa (X düğmesi) yığın ve geçmiş kaydı otomatik eşitlenir. Veri katmanına dokunmaz. */
(function(g){
'use strict';
if(g.KorukNav)return;
var D=document,stack=[],uid=0,skip=0,SEL='.ka-modal-backdrop,.ka-sheet-backdrop',CLOSE='[data-ka-close],[data-close],.ka-modal__close,[aria-label="Kapat"],[aria-label="Close"]';
function find(el){for(var i=0;i<stack.length;i++)if(stack[i].el===el)return i;return -1}
function add(el){if(find(el)>-1)return;var id=++uid;stack.push({id:id,el:el});try{g.history.pushState({kaNav:id},'')}catch(e){}}
function drop(el){var i=find(el);if(i<0)return;stack.splice(i,1);skip++;try{g.history.back()}catch(e){skip--}}   // modül kendisi kapattı: geçmiş kaydını tüket
function closeTop(){var s=stack.pop();if(!s)return false;var b=s.el.querySelector(CLOSE);try{if(b&&s.el.isConnected)b.click()}catch(e){}if(s.el.isConnected)s.el.remove();return true}
function scan(n){if(n.nodeType!==1)return;if(n.matches&&n.matches(SEL))add(n);if(n.querySelectorAll)[].forEach.call(n.querySelectorAll(SEL),add)}
function unscan(n){if(n.nodeType!==1)return;stack.slice().forEach(function(s){if(s.el===n||n.contains(s.el))if(!s.el.isConnected)drop(s.el)})}
g.addEventListener('popstate',function(){if(skip>0){skip--;return}closeTop()});
D.addEventListener('keydown',function(e){if(e.key==='Escape'&&stack.length){e.preventDefault();g.history.back()}},true);
function start(){scan(D.body);try{new MutationObserver(function(ms){ms.forEach(function(m){[].forEach.call(m.addedNodes,scan);[].forEach.call(m.removedNodes,unscan)})}).observe(D.body,{childList:true,subtree:true})}catch(e){}}
g.KorukNav={back:function(){if(stack.length){g.history.back();return true}return false},depth:function(){return stack.length},selectors:SEL};
if(D.body)start();else D.addEventListener('DOMContentLoaded',start,{once:true});
})(window);
