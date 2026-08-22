/* Koruk Asistan — ana navigasyon + mobil dashboard dogrudan bootstrap */
(function(){
  'use strict';
  function yukle(src, attr, sonra){
    var mevcut=document.querySelector('script['+attr+']');
    if(mevcut){ if(sonra){ if(mevcut.dataset.loaded==='1') sonra(); else mevcut.addEventListener('load',sonra,{once:true}); } return; }
    var s=document.createElement('script'); s.src=src; s.async=false; s.setAttribute(attr,'1');
    s.addEventListener('load',function(){ s.dataset.loaded='1'; if(sonra) sonra(); },{once:true}); document.head.appendChild(s);
  }
  function stilYukle(href,attr){if(document.querySelector('link['+attr+']'))return;var l=document.createElement('link');l.rel='stylesheet';l.href=href;l.setAttribute(attr,'1');document.head.appendChild(l);}
  stilYukle('css/alt-navigation-theme.css?v=11','data-alt-nav-theme');
  stilYukle('css/ogretmenler-modern.css?v=2','data-ogretmenler-modern-style');
  stilYukle('css/ogretmen-detay-modern.css?v=3','data-ogretmen-detay-modern-style');
  yukle('js/alt-navigasyon-core.js','data-alt-nav-core',function(){
    yukle('js/alt-navigation-list-theme.js?v=1','data-alt-nav-list-theme',function(){
      yukle('js/ui-stability-fixes.js','data-ui-stability');
      yukle('js/ogretmenler-modern.js?v=2','data-ogretmenler-modern');
      yukle('js/ogretmen-detay-modern.js?v=3','data-ogretmen-detay-modern');
    });
  });
})();