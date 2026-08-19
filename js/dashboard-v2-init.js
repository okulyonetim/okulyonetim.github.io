/* ================================================================
   DASHBOARD v2 INIT — js/dashboard-v2-init.js
   index.html'de en sona (diğer tüm scriptlerden sonra) ekle:
     <script src="js/dashboard-v2-init.js"></script>

   Bu dosya:
   1) Web shell kurulumu (sidebar collapse toggle butonu inject)
   2) #tab-panel.dash-modern içindeki HTML'i saran .dash-inner wrapper
   3) İki sütun layoutu için kartları .dash-col-main / .dash-col-side'a taşı
   4) Rol bazlı hero class'ı (admin / öğretmen)
   5) Sidebar profil kutusunu güncelle
   6) Topbar'da aktif sekme adını göster
   ================================================================ */

(function(){
  'use strict';

  /* ---- 0. Utils ---- */
  function el(id){ return document.getElementById(id); }
  function isWeb(){ return window.innerWidth >= 1024; }

  /* ================================================================
     1. WEB SHELL — Sidebar collapse toggle butonu (topbar'a inject)
     ================================================================ */
  function _kurSidebarToggle(){
    if(!isWeb()) return;
    if(el('wsSidebarToggle')) return; // zaten var

    const topbar = document.querySelector('.topbar');
    if(!topbar) return;

    const btn = document.createElement('button');
    btn.id = 'wsSidebarToggle';
    btn.title = 'Menüyü küçült / büyüt';
    btn.setAttribute('aria-label', 'Menüyü küçült / büyüt');
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>`;

    btn.addEventListener('click', function(){
      document.body.classList.toggle('nav-collapsed');
      try{ localStorage.setItem('navCollapsed', document.body.classList.contains('nav-collapsed') ? '1' : '0'); }catch(e){}
    });

    // Hamburger'ın yerine ya da topbar başına ekle
    const hamburger = el('topbarHamburger');
    if(hamburger){
      topbar.insertBefore(btn, hamburger);
    } else {
      topbar.insertBefore(btn, topbar.firstChild);
    }
  }

  /* Sayfa yüklenirken önceki tercihi uygula */
  function _navCollapsedBaslangic(){
    try{
      if(localStorage.getItem('navCollapsed') === '1'){
        document.body.classList.add('nav-collapsed');
      }
    }catch(e){}
  }

  /* ================================================================
     2. DASHBOARD HTML WRAPPER
     Mevcut #tab-panel.dash-modern içindeki tüm kartları
     .dash-inner > .dash-col-main + .dash-col-side wrapper'ına sar.
     Bu işlem DOM hazır olduktan sonra bir kez yapılır.
     ================================================================ */

  /*
    Sağ sütun (side) kartları — bu ID'ler ≥1100px'de sağa alınır.
    Sıra önemli değil; CSS grid ile istediğin sıraya order ile müdahale edebilirsin.
  */
  var SIDE_KART_IDS = [
    'bugunIzinliKart',
    'duyuruPanosuKart',
    'dashMiniTakvim',       // <div data-kart-id="miniTakvim"> — wrapper
    'dashAjanda',           // ajanda içerik div
    'dashHatirlaticilar',   // div (card içinde)
    'haberKaruselKart',
    'okulSitesiKart',
    'dashSayacKarti',
  ];
  /* Sağ sütuna taşınacak kartları bulmak için data-kart-id değerleri */
  var SIDE_KART_ATTRS = [
    'miniTakvim','ajanda','etkinlikGorev','duyuruPanosu',
    'haberKarusel','okulSitesiKart','haberTicker'
  ];

  function _wrapDashboard(){
    var panel = document.getElementById('tab-panel');
    if(!panel) return;
    if(panel.querySelector('.dash-inner')) return; // zaten sarılmış

    /* Mevcut çocukları al (page-header dahil) */
    var children = Array.from(panel.children);

    /* Wrapper oluştur */
    var inner  = document.createElement('div');
    inner.className = 'dash-inner';
    var colMain = document.createElement('div');
    colMain.className = 'dash-col-main';
    var colSide = document.createElement('div');
    colSide.className = 'dash-col-side';
    inner.appendChild(colMain);
    inner.appendChild(colSide);

    /* page-header her zaman main'in en üstünde */
    children.forEach(function(child){
      var kId = child.dataset && child.dataset.kartId;
      if(SIDE_KART_ATTRS.indexOf(kId) !== -1){
        colSide.appendChild(child);
      } else {
        colMain.appendChild(child);
      }
    });

    panel.appendChild(inner);
  }

  /* ================================================================
     3. ROL BAZLI HERO CLASS
     ================================================================ */
  function _rolHeroUygula(){
    var hero = document.querySelector('#tab-panel.dash-modern .dash-hero');
    if(!hero) return;

    // Önce temizle
    hero.classList.remove('rol-admin','rol-ogretmen');

    if(typeof AKTIF_KULLANICI === 'undefined' || !AKTIF_KULLANICI) return;

    var benOgretmen = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;

    if(AKTIF_KULLANICI.admin === true){
      hero.classList.add('rol-admin');
    } else if(benOgretmen){
      hero.classList.add('rol-ogretmen');
    }
  }

  /* ================================================================
     4. SIDEBAR PROFİL KUTUSU GÜNCELLE
     Sidebar'ın altında (.sidebar-hesap) zaten varsa bilgileri doldur.
     Yoksa oluştur (sidebar nav'ın hemen sonrasına ekle).
     ================================================================ */
  function _sidebarProfilGuncelle(){
    if(!isWeb()) return;

    var sidebar = document.querySelector('.sidebar');
    if(!sidebar) return;

    var kutu = sidebar.querySelector('.sidebar-hesap');
    if(!kutu){
      kutu = document.createElement('div');
      kutu.className = 'sidebar-hesap';
      kutu.innerHTML = `
        <div class="sidebar-hesap-avatar" id="wsHesapAvatar">👤</div>
        <div class="sidebar-hesap-bilgi">
          <div class="sidebar-hesap-ad" id="wsHesapAd">—</div>
          <div class="sidebar-hesap-rol" id="wsHesapRol">—</div>
        </div>`;
      /* Nav cikis butonundan önce ekle */
      var cikisBtn = sidebar.querySelector('.nav-cikis-btn');
      if(cikisBtn){
        sidebar.insertBefore(kutu, cikisBtn);
      } else {
        sidebar.appendChild(kutu);
      }
    }

    if(typeof AKTIF_KULLANICI === 'undefined' || !AKTIF_KULLANICI) return;

    var adEl  = el('wsHesapAd');
    var rolEl = el('wsHesapRol');
    var avEl  = el('wsHesapAvatar');

    if(adEl){
      // İsim: sidebar'daki #sidebarAd'dan oku, yoksa kullanıcı adı
      var sideAd = el('sidebarAd');
      adEl.textContent = (sideAd && sideAd.textContent.trim()) ? sideAd.textContent.trim() : (AKTIF_KULLANICI.kullaniciAdi || '—');
    }
    if(rolEl){
      var benOg = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;
      var rolAd = AKTIF_KULLANICI.admin ? 'Süper Admin' : (typeof AKTIF_ROL !== 'undefined' && AKTIF_ROL && AKTIF_ROL.ad ? AKTIF_ROL.ad : (benOg ? 'Öğretmen' : 'Kullanıcı'));
      rolEl.textContent = rolAd;
    }
    if(avEl){
      avEl.textContent = AKTIF_KULLANICI.admin ? '🛡️' : ((typeof bagliOgretmenimGetir === 'function' && bagliOgretmenimGetir()) ? '👩‍🏫' : '👤');
    }
  }

  /* ================================================================
     5. TOPBAR — Aktif sekme adını göster
     ================================================================ */
  function _topbarSekmeAdiGuncelle(){
    if(!isWeb()) return;
    var topbar = document.querySelector('.topbar');
    if(!topbar) return;

    var span = el('wsTopbarSekmeAdi');
    if(!span){
      span = document.createElement('span');
      span.id = 'wsTopbarSekmeAdi';
      span.className = 'topbar-sekme-adi';
      /* Topbar brand'den sonra ekle */
      var brand = topbar.querySelector('.topbar-brand');
      if(brand && brand.nextSibling){
        topbar.insertBefore(span, brand.nextSibling);
      } else {
        topbar.appendChild(span);
      }
    }

    /* Aktif nav tab label'ını bul */
    var aktifTab = document.querySelector('.nav-tab.active');
    if(aktifTab){
      var lbl = aktifTab.querySelector('.nt-label');
      span.textContent = lbl ? lbl.textContent : '';
    }
  }

  /* sekmeAc patch: sekme değiştiğinde span güncelle */
  function _patchSekmeAc(){
    if(typeof sekmeAc !== 'function') return;
    var _orig = sekmeAc;
    window.sekmeAc = function(id){
      _orig.apply(this, arguments);
      setTimeout(_topbarSekmeAdiGuncelle, 80);
    };
  }

  /* ================================================================
     6. BOOTSTRAP — DOMContentLoaded + auth sonrası
     ================================================================ */
  function _boot(){
    _navCollapsedBaslangic();
    _kurSidebarToggle();
    _wrapDashboard();
    _patchSekmeAc();
    _topbarSekmeAdiGuncelle();

    /* Auth yüklenince (AKTIF_KULLANICI set edilince) rol/profil güncelle */
    _bekleVeUygula();
  }

  var _authBeklemeSayaci = 0;
  function _bekleVeUygula(){
    if(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI){
      _rolHeroUygula();
      _sidebarProfilGuncelle();
    } else if(_authBeklemeSayaci < 30){
      _authBeklemeSayaci++;
      setTimeout(_bekleVeUygula, 400);
    }
  }

  /* renderDashboard patch: her render'da rol class + profil güncelle */
  function _patchRenderDashboard(){
    if(typeof renderDashboard !== 'function') return;
    var _orig = renderDashboard;
    window.renderDashboard = function(){
      _orig.apply(this, arguments);
      setTimeout(function(){
        _rolHeroUygula();
        _sidebarProfilGuncelle();
      }, 50);
    };
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      _boot();
      /* renderDashboard mevcut olana kadar biraz bekle */
      setTimeout(_patchRenderDashboard, 800);
    });
  } else {
    _boot();
    setTimeout(_patchRenderDashboard, 800);
  }

  /* Pencere boyutu değişince toggle butonunu yeniden kur */
  window.addEventListener('resize', function(){
    _kurSidebarToggle();
    _topbarSekmeAdiGuncelle();
    _sidebarProfilGuncelle();
  }, {passive:true});

})();
