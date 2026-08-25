/* Geçici uyumluluk köprüsü. EventBus artık js/core/core.js içindedir. */
(function(){
'use strict';
if(window.EventBus)return;
if(document.querySelector('script[data-koruk-unified-core]'))return;
const s=document.createElement('script');
s.src='js/core/core.js';
s.async=false;
s.dataset.korukUnifiedCore='1';
document.head.appendChild(s);
})();
