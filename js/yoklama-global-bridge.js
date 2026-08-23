/* Yoklama service/repository klasik script global köprüsü */
(function(){
'use strict';
try{if(typeof YoklamaRepository!=='undefined')window.YoklamaRepository=YoklamaRepository}catch(e){console.warn('[yoklama] repository bridge',e)}
try{if(typeof YoklamaService!=='undefined')window.YoklamaService=YoklamaService}catch(e){console.warn('[yoklama] service bridge',e)}
})();
