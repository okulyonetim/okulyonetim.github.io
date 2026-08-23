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

  function altNavAktifDurumunuKur(){
    var nav=document.getElementById('bottomNav');
    if(!nav || nav.dataset.activeStateBound==='1') return;
    nav.dataset.activeStateBound='1';
    function aktifYap(item){
      nav.querySelectorAll('.bn-item').forEach(function(btn){btn.classList.remove('active');btn.removeAttribute('aria-current');});
      if(item){item.classList.add('active');item.setAttribute('aria-current','page');}
    }
    nav.addEventListener('click',function(e){var item=e.target.closest('.bn-item');if(!item||!nav.contains(item))return;aktifYap(item);},true);
    requestAnimationFrame(function(){var secili=nav.querySelector('.bn-item.active,[aria-current="page"]');if(secili)aktifYap(secili);});
    window.KorukAltNavAktifYap=function(hedef){var item=typeof hedef==='string'?nav.querySelector(hedef):hedef;if(item&&item.classList&&item.classList.contains('bn-item'))aktifYap(item);};
  }

  stilYukle('css/alt-navigation-theme.css?v=13','data-alt-nav-theme');
  stilYukle('css/ogretmenler-modern.css?v=2','data-ogretmenler-modern-style');
  stilYukle('css/ogretmen-detay-modern.css?v=3','data-ogretmen-detay-modern-style');
  stilYukle('css/dark-theme-soft.css?v=4','data-dark-theme-soft');
  stilYukle('css/ayarlar-modern.css?v=3','data-ayarlar-modern-style');
  stilYukle('css/yazili-sinavlar-modern.css?v=2','data-yazili-sinavlar-modern-style');
  stilYukle('css/yazili-rapor-modern.css?v=1','data-yazili-rapor-modern-style');
  stilYukle('css/deneme-sinavlari-modern.css?v=1','data-deneme-sinavlari-modern-style');
  stilYukle('css/deneme-sayac-modern-v4.css?v=1','data-deneme-sayac-modern-v4-style');
  stilYukle('css/dashboard-live-exam.css?v=1','data-dashboard-live-exam-style');
  stilYukle('css/mesajlasma-modern.css?v=4','data-mesajlasma-modern-style');
  yukle('js/alt-navigasyon-core.js','data-alt-nav-core',function(){
    altNavAktifDurumunuKur();
    yukle('js/alt-navigation-list-theme.js?v=1','data-alt-nav-list-theme',function(){
      yukle('js/ui-stability-fixes.js','data-ui-stability');
      yukle('js/ogretmenler-modern.js?v=2','data-ogretmenler-modern');
      yukle('js/ogretmen-detay-modern.js?v=3','data-ogretmen-detay-modern');
      yukle('js/ayarlar-modern.js?v=2','data-ayarlar-modern');
      yukle('js/yazili-sinavlar-modern.js?v=4','data-yazili-sinavlar-modern');
      yukle('js/yazili-sinav-live-sync.js?v=1','data-yazili-sinav-live-sync');
      yukle('js/mesajlasma-modern.js?v=4','data-mesajlasma-modern');
      /* Android rapor akışı: gerçek A4 önizleme -> native PrintPlugin */
      yukle('js/native-report-preview.js?v=2','data-native-report-preview',function(){
        yukle('js/yazili-rapor-modern.js?v=1','data-yazili-rapor-modern');
      });
      yukle('js/deneme-sayac-tarih-fix.js?v=2','data-deneme-sayac-tarih-fix',function(){
        yukle('js/deneme-sayac-runtime-v2.js?v=2','data-deneme-sayac-runtime-v2',function(){
          yukle('js/deneme-sinavlari-modern.js?v=3','data-deneme-sinavlari-modern',function(){
            yukle('js/deneme-sayac-modern-v4.js?v=3','data-deneme-sayac-modern-v4',function(){
              yukle('js/dashboard-live-exam.js?v=1','data-dashboard-live-exam');
            });
          });
        });
      });
    });
  });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',altNavAktifDurumunuKur,{once:true}); else altNavAktifDurumunuKur();
})();