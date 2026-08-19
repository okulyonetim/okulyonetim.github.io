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

/* ================================================================
   EK — 3 BUG DÜZELTMESİ
   1) Bilgi Kartları kayboluyor  → Firebase tercih yükleme
   2) Hızlı İşlemler 3'e düşüyor → tercih koruma + Düzenle inject
   3) Takvim ilk açılışta boş   → sekmeAc patch
   ================================================================ */
(function(){
  'use strict';

  var LS_INFO    = 'oyDashboardMobilBilgiKartlariV3';
  var LS_QUICK   = 'oyDashboardMobilHizliIslemlerV3';
  var LS_INFO_OLD  = 'oyDashboardV4KartDuzeni_v2';
  var LS_QUICK_OLD = 'oyDashboardHizliIslemlerV2';
  var FIRE_COL   = 'oy_kullaniciTercihleri';
  var FIRE_INFO  = 'dashboardMobilBilgiKartlariV3';
  var FIRE_QUICK = 'dashboardMobilHizliIslemlerV3';

  var VALID_INFO  = ['personel','ogrenci','sinif','servis','dokuman','hatirlatici','not','sinav','duyuru','mesaj','nobet'];
  var VALID_QUICK = ['evrak','dokumanlar','ogrenciler','nobet','takvim','arama','mesajlasma','mevzuat','siniflar','haberler','duyurular','programim'];
  var DEF_INFO    = ['personel','ogrenci','sinif','servis','dokuman','not'];
  var DEF_QUICK   = ['evrak','dokumanlar','ogrenciler','nobet'];
  var QUICK_LABELS = {
    evrak:'📄 Evraklarım',dokumanlar:'📁 Dökümanlar',ogrenciler:'👥 Öğrenciler',
    nobet:'🛡️ Nöbetler',takvim:'📅 Takvim',arama:'🔎 Arama',
    mesajlasma:'💬 Mesajlar',mevzuat:'⚖️ Mevzuat',siniflar:'🏫 Sınıflar',
    haberler:'📰 Haberler',duyurular:'📢 Duyurular',programim:'🗓️ Programım'
  };

  function gv(n){try{return window[n]!==undefined?window[n]:eval(n)}catch(_){return null}}
  function lsGet(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}}
  function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}

  function normInfo(v){
    var out=(Array.isArray(v)?v:[]).filter(function(id){return VALID_INFO.indexOf(id)!==-1});
    return out.length?out:DEF_INFO;
  }
  function normQuick(v){
    var out=(Array.isArray(v)?v:[]).filter(function(id){return VALID_QUICK.indexOf(id)!==-1}).slice(0,4);
    DEF_QUICK.forEach(function(d){if(out.length<4&&out.indexOf(d)===-1)out.push(d);});
    return out;
  }
  function readInfo(){
    var v=lsGet(LS_INFO);if(Array.isArray(v)&&v.length)return normInfo(v);
    var o=lsGet(LS_INFO_OLD);if(o&&Array.isArray(o.info)&&o.info.length)return normInfo(o.info);
    return DEF_INFO;
  }
  function readQuick(){
    var v=lsGet(LS_QUICK);if(Array.isArray(v)&&v.length)return normQuick(v);
    var o=lsGet(LS_QUICK_OLD);if(Array.isArray(o)&&o.length)return normQuick(o);
    return DEF_QUICK;
  }

  /* Firebase'den oku */
  async function firebaseOku(uid){
    var db=gv('db');if(!db||!uid)return;
    try{
      var snap=await db.collection(FIRE_COL).doc(uid).get();
      if(!snap.exists)return;
      var d=snap.data()||{};
      if(Array.isArray(d[FIRE_INFO])&&d[FIRE_INFO].length)lsSet(LS_INFO,d[FIRE_INFO]);
      if(Array.isArray(d[FIRE_QUICK])&&d[FIRE_QUICK].length)lsSet(LS_QUICK,d[FIRE_QUICK]);
      if(Array.isArray(d.dashboardBilgiKartlari)&&!lsGet(LS_INFO))lsSet(LS_INFO,d.dashboardBilgiKartlari);
    }catch(e){console.warn('[fix] Firebase okuma:',e);}
  }

  /* Firebase'e kaydet */
  async function firebaseKaydet(uid,info,quick){
    var db=gv('db');if(!db||!uid)return;
    try{
      await db.collection(FIRE_COL).doc(uid).set({
        [FIRE_INFO]:info,[FIRE_QUICK]:quick,
        dashboardBilgiKartlari:info,dashboardHizliIslemler:quick,
        fixGuncelleme:new Date().toISOString()
      },{merge:true});
    }catch(e){console.warn('[fix] Firebase yazma:',e);}
  }

  var _loaded=false;
  async function init(){
    if(_loaded)return;
    var uid=gv('auth')?.currentUser?.uid;
    if(uid)await firebaseOku(uid);
    lsSet(LS_INFO,readInfo());lsSet(LS_QUICK,readQuick());
    if(window.__dashboardStateV3){window.DashboardMobilStateV3?.yenile?.();_loaded=true;return;}
    gv('dashboardBilgiKartlariYenile')?.();
    if(uid)firebaseKaydet(uid,readInfo(),readQuick());
    _loaded=true;
  }

  /* ---- DÜZELTME 2: Hızlı İşlemler Düzenle butonu ---- */
  function duzenleEkle(){
    if(window.__dashboardStateV3)return;
    var quick=document.querySelector('.db4 .db4-quick');
    if(!quick)return;
    var head=quick.closest('.db4-section')?.querySelector('.db4-section-head');
    if(!head||head.querySelector('.fix-quick-edit'))return;
    var btn=document.createElement('button');
    btn.type='button';btn.className='db4-more-btn fix-quick-edit';
    btn.textContent='✏️ Düzenle';
    btn.style.cssText='font-size:12px;padding:4px 10px;border:1px solid var(--border);border-radius:8px;background:transparent;color:var(--ink-muted);cursor:pointer;';
    btn.onclick=function(){
      var f=gv('modalAc');if(typeof f!=='function')return;
      var cur=readQuick();
      var body='<div style="font-size:12px;color:var(--ink-muted);margin-bottom:12px">En fazla 4 kart seçebilirsiniz.</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
        +VALID_QUICK.map(function(id){return '<label style="display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:13px;padding:11px;cursor:pointer;">'
          +'<input type="checkbox" value="'+id+'" '+(cur.indexOf(id)!==-1?'checked':'')+'>'
          +'<span>'+(QUICK_LABELS[id]||id)+'</span></label>';}).join('')+'</div>';
      f('⚡ Hızlı İşlemleri Düzenle',body,async function(){
        var ids=Array.from(document.querySelectorAll('#modalBody input:checked')).map(function(x){return x.value;});
        if(!ids.length){gv('toast')?.('En az bir kart seçin.');return;}
        if(ids.length>4){gv('toast')?.('En fazla 4 kart seçebilirsiniz.');return;}
        var q=normQuick(ids);lsSet(LS_QUICK,q);lsSet(LS_QUICK_OLD,q);
        var uid=gv('auth')?.currentUser?.uid;
        if(uid)firebaseKaydet(uid,readInfo(),q);
        gv('modalKapat')?.();gv('toast')?.('Hızlı işlemler kaydedildi.');
        gv('dashboardBilgiKartlariYenile')?.();
      },null,'💾 Kaydet');
    };
    head.appendChild(btn);
  }

  /* ---- DÜZELTME 3: Takvim patch ---- */
  function takvimPatch(){
    var orig=gv('sekmeAc');
    if(typeof orig!=='function'||orig.__takvimFixed)return;
    window.sekmeAc=function(tab){
      orig.apply(this,arguments);
      if(tab==='takvim'){
        setTimeout(function(){
          if(typeof takvimGridRender==='function')takvimGridRender();
          if(typeof takvimAjandaRender==='function')takvimAjandaRender();
        },40);
      }
    };
    window.sekmeAc.__takvimFixed=true;
  }

  /* ---- Boot ---- */
  function boot(){
    takvimPatch();
    var auth=gv('auth');
    if(auth?.onAuthStateChanged)auth.onAuthStateChanged(function(u){if(u)setTimeout(init,200);});
    [300,900,2000,4000].forEach(function(ms){setTimeout(function(){
      takvimPatch();
      if(gv('AKTIF_KULLANICI')&&gv('auth')?.currentUser)init();
      duzenleEkle();
    },ms);});

    /* renderDashboard sonrası tercihleri koru */
    setTimeout(function(){
      var rd=gv('renderDashboard');
      if(typeof rd==='function'&&!rd.__fixPatched){
        window.renderDashboard=function(){rd.apply(this,arguments);setTimeout(function(){lsSet(LS_INFO,readInfo());lsSet(LS_QUICK,readQuick());duzenleEkle();},60);};
        window.renderDashboard.__fixPatched=true;
      }
    },600);
  }

  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',boot,{once:true});}
  else{boot();}

  document.addEventListener('visibilitychange',function(){if(!document.hidden){setTimeout(init,200);takvimPatch();}});
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-tab],.nav-tab,.bn-item'))setTimeout(duzenleEkle,120);
  },true);
})();
