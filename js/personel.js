/* ====================================================================
   js/personel.js
   PERSONEL İŞLERİ MODÜLÜ — UI KATMANI — sürekli işçi, hizmetli, memur vb.
   öğretmen kadrosu dışındaki personelin kayıtları. Dilekçe Sistemi bu
   kayıtları kullanır. Veri modeli (bkz. firebase-init.js COL.personel):
     personel : {adSoyad, tc, telefon, adres, gorev, notlar}

   Katmanlı mimari: bkz. docs/Pragmatik-Mimari-Tasarimi.md §2
     UI (bu dosya)          → sadece DOM + PersonelService çağrısı, db bilmez
     js/core/services/personel.service.js    → iş kuralı + yetki kontrolü
     js/core/repositories/personel.repository.js → TEK Firestore erişim noktası
   ==================================================================== */

let personelListesi = [];

const PERSONEL_GOREV_SECENEKLERI = [
  'Sürekli İşçi', 'Hizmetli', 'Memur', 'Güvenlik Görevlisi',
  'Aşçı', 'Kaloriferci', 'Temizlik Görevlisi', 'Diğer'
];

/* --------------------------------------------------------------------
   PERSONELLER — SADECE GÖRSEL KATMAN
   Veri, service/repository, modal aç/kapa ve bağlantı akışlarına dokunmaz.
   -------------------------------------------------------------------- */
const PERSONEL_GORUNUM_CSS = `
#tab-personel.personel-v2{padding-bottom:calc(112px + env(safe-area-inset-bottom,0px));}
#tab-personel.personel-v2 .page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:14px;padding:0;}
#tab-personel.personel-v2 .page-title{font-size:26px;line-height:1.08;font-weight:850;letter-spacing:-.65px;color:var(--ink);}
#tab-personel.personel-v2 .page-sub{margin-top:6px;font-size:12.5px;line-height:1.45;color:var(--ink-muted);max-width:520px;}
#tab-personel.personel-v2 .page-header-actions{flex:0 0 auto;}
#tab-personel.personel-v2 .page-header-actions .btn{min-height:46px;border-radius:15px!important;padding:0 15px!important;border:1px solid #176d50!important;background:linear-gradient(145deg,#1d8360,#0e6548)!important;color:#fff!important;font-size:12.5px!important;font-weight:800!important;box-shadow:0 9px 24px rgba(14,101,72,.2)!important;}
#tab-personel.personel-v2 .personel-search-shell{position:relative!important;margin-bottom:14px!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;}
#tab-personel.personel-v2 .personel-search-shell::before{content:'';position:absolute;left:16px;top:50%;width:20px;height:20px;transform:translateY(-50%);z-index:2;pointer-events:none;opacity:.78;background:currentColor;color:var(--ink-muted);mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-3.7-3.7'/%3E%3C/svg%3E") center/contain no-repeat;}
#tab-personel.personel-v2 #personelArama{height:52px!important;width:100%!important;box-sizing:border-box!important;padding:0 16px 0 48px!important;border-radius:17px!important;border:1px solid var(--border)!important;background:var(--card)!important;color:var(--ink)!important;font-size:14px!important;box-shadow:0 5px 18px rgba(15,23,42,.035)!important;outline:none!important;}
#tab-personel.personel-v2 #personelArama::placeholder{color:var(--ink-muted)!important;opacity:.88;}
#tab-personel.personel-v2 #personelArama:focus{border-color:#1c7b5a!important;box-shadow:0 0 0 3px rgba(28,123,90,.13)!important;}
#tab-personel.personel-v2 #personelListesi{display:flex;flex-direction:column;gap:11px;}
#tab-personel.personel-v2 .personel-v2-card{display:grid;grid-template-columns:54px minmax(0,1fr) 42px;gap:13px;align-items:center;padding:14px 13px;border:1px solid var(--border);border-radius:20px;background:var(--card);box-shadow:0 7px 22px rgba(15,23,42,.04);cursor:pointer;transition:transform .14s ease,border-color .14s ease,box-shadow .14s ease;min-width:0;}
#tab-personel.personel-v2 .personel-v2-card:active{transform:scale(.992);}
#tab-personel.personel-v2 .personel-v2-avatar{width:54px;height:54px;border-radius:18px;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#1f8a65,#0d6548);border:1px solid rgba(255,255,255,.08);color:#fff;font-size:17px;font-weight:900;letter-spacing:.15px;box-shadow:0 7px 18px rgba(13,101,72,.17);}
#tab-personel.personel-v2 .personel-v2-body{min-width:0;}
#tab-personel.personel-v2 .personel-v2-top{display:flex;align-items:center;gap:7px;min-width:0;flex-wrap:wrap;}
#tab-personel.personel-v2 .personel-v2-name{font-size:15.5px;font-weight:850;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}
#tab-personel.personel-v2 .personel-v2-role{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:#e7f5ef;color:#176b4f;font-size:10.5px;font-weight:800;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;}
#tab-personel.personel-v2 .personel-v2-meta{display:flex;gap:7px 12px;align-items:center;flex-wrap:wrap;margin-top:7px;color:var(--ink-muted);font-size:11.5px;line-height:1.35;}
#tab-personel.personel-v2 .personel-v2-meta span{display:inline-flex;align-items:center;gap:5px;min-width:0;}
#tab-personel.personel-v2 .personel-v2-open{width:42px;height:42px;border-radius:14px;border:1px solid #cfe4db;background:#edf7f3;color:#175d47;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;}
#tab-personel.personel-v2 .personel-v2-open svg{width:17px;height:17px;}
#tab-personel.personel-v2 .personel-v2-empty{padding:36px 18px;text-align:center;border-radius:20px;border:1px dashed var(--border);background:var(--card);color:var(--ink-muted);font-size:12.5px;}
#tab-personel.personel-v2 .personel-v2-empty strong{display:block;color:var(--ink);font-size:15px;margin-bottom:5px;}

/* Personel detay paneli */
#detayOverlay .personel-v2-detail{padding:14px 14px calc(32px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:12px;}
#detayOverlay .personel-v2-hero{border:1px solid var(--border);background:var(--card);border-radius:21px;padding:15px;box-shadow:0 8px 26px rgba(15,23,42,.04);}
#detayOverlay .personel-v2-hero-title{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
#detayOverlay .personel-v2-hero-icon{width:40px;height:40px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#dff3ea,#edf8f3);color:#176d50;font-size:18px;font-weight:900;}
#detayOverlay .personel-v2-hero-title strong{font-size:14px;color:var(--ink);}
#detayOverlay .personel-v2-info{display:flex;flex-direction:column;}
#detayOverlay .personel-v2-row{display:grid;grid-template-columns:116px minmax(0,1fr);gap:12px;padding:11px 0;border-top:1px solid color-mix(in srgb,var(--border) 72%,transparent);align-items:start;}
#detayOverlay .personel-v2-row:first-child{border-top:0;}
#detayOverlay .personel-v2-label{font-size:11.5px;font-weight:750;color:var(--ink-muted);}
#detayOverlay .personel-v2-value{font-size:12.5px;font-weight:750;color:var(--ink);text-align:right;overflow-wrap:anywhere;}
#detayOverlay .personel-v2-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
#detayOverlay .personel-v2-action{min-height:56px;border-radius:17px;border:1px solid var(--border);font-size:12.5px;font-weight:850;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 12px;line-height:1.2;}
#detayOverlay .personel-v2-action.dilekce{color:#176d50;border-color:#c9e2d8;background:#edf7f3;}
#detayOverlay .personel-v2-action.puantaj{color:#4f8de8;border-color:#274464;background:#132f4f;}
#detayOverlay .personel-v2-section{border:1px solid var(--border);border-radius:21px;background:var(--card);padding:14px;box-shadow:0 8px 26px rgba(15,23,42,.035);}
#detayOverlay .personel-v2-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;}
#detayOverlay .personel-v2-section-head strong{font-size:14px;color:var(--ink);}
#detayOverlay .personel-v2-section-head .btn{min-height:40px!important;border-radius:13px!important;background:#edf7f3!important;border:1px solid #c9e2d8!important;color:#176d50!important;font-weight:800!important;padding:0 11px!important;}
#detayOverlay .personel-v2-section #pIzinListesi{display:flex;flex-direction:column;gap:8px;}
#detayOverlay .personel-v2-section #pIzinListesi .evrak-row{margin:0!important;padding:12px!important;border-radius:15px!important;border:1px solid var(--border)!important;background:var(--card)!important;box-shadow:none!important;}
#detayOverlay .personel-v2-section #pIzinListesi .evrak-title{font-size:12.5px!important;color:var(--ink)!important;}
#detayOverlay .personel-v2-section #pIzinListesi .evrak-meta{font-size:11px!important;color:var(--ink-muted)!important;margin-top:4px!important;line-height:1.45!important;}
#detayOverlay .personel-v2-section #pIzinListesi .btn{border-radius:11px!important;min-height:38px!important;}

/* Mevcut modalAc() korunur; personel ve izin formları telefonda bottom-sheet görünür. */
#modalOverlay:has(#f_pAd),#modalOverlay:has(#f_izinTur){align-items:flex-end!important;padding:0!important;}
#modalOverlay:has(#f_pAd) .modal,#modalOverlay:has(#f_izinTur) .modal{width:100%!important;max-width:680px!important;max-height:min(90dvh,820px)!important;margin:0 auto!important;overflow:auto!important;overscroll-behavior:contain;border-radius:24px 24px 0 0!important;border:1px solid var(--border)!important;border-bottom:0!important;background:var(--card)!important;box-shadow:0 -18px 60px rgba(2,6,23,.24)!important;padding-bottom:calc(10px + env(safe-area-inset-bottom,0px))!important;}
#modalOverlay:has(#f_pAd) .modal::before,#modalOverlay:has(#f_izinTur) .modal::before{content:'';display:block;width:42px;height:4px;border-radius:99px;background:color-mix(in srgb,var(--ink-muted) 42%,transparent);margin:-2px auto 14px;}
#modalOverlay:has(#f_pAd) #modalTitle,#modalOverlay:has(#f_izinTur) #modalTitle{font-size:19px!important;font-weight:850!important;letter-spacing:-.3px;color:var(--ink)!important;margin-bottom:17px!important;}
#modalOverlay:has(#f_pAd) .form-group,#modalOverlay:has(#f_izinTur) .form-group{margin-bottom:14px!important;}
#modalOverlay:has(#f_pAd) .form-row,#modalOverlay:has(#f_izinTur) .form-row{gap:10px!important;}
#modalOverlay:has(#f_pAd) .form-group label,#modalOverlay:has(#f_izinTur) .form-group label{display:block!important;margin-bottom:6px!important;font-size:11.5px!important;font-weight:800!important;color:var(--ink-muted)!important;}
#modalOverlay:has(#f_pAd) input,#modalOverlay:has(#f_pAd) select,#modalOverlay:has(#f_pAd) textarea,#modalOverlay:has(#f_izinTur) input,#modalOverlay:has(#f_izinTur) select,#modalOverlay:has(#f_izinTur) textarea{width:100%!important;box-sizing:border-box!important;min-height:48px!important;border-radius:14px!important;border:1px solid var(--border)!important;background:var(--bg)!important;color:var(--ink)!important;padding:11px 12px!important;font-size:13.5px!important;outline:none!important;}
#modalOverlay:has(#f_pAd) textarea{min-height:82px!important;resize:vertical;}
#modalOverlay:has(#f_pAd) input:focus,#modalOverlay:has(#f_pAd) select:focus,#modalOverlay:has(#f_pAd) textarea:focus,#modalOverlay:has(#f_izinTur) input:focus,#modalOverlay:has(#f_izinTur) select:focus,#modalOverlay:has(#f_izinTur) textarea:focus{border-color:#1c7b5a!important;box-shadow:0 0 0 3px rgba(28,123,90,.12)!important;}
#modalOverlay:has(#f_pAd) .modal-actions,#modalOverlay:has(#f_izinTur) .modal-actions{position:sticky!important;bottom:-1px!important;background:linear-gradient(to top,var(--card) 86%,transparent)!important;padding-top:15px!important;margin-top:7px!important;z-index:3!important;gap:9px!important;}
#modalOverlay:has(#f_pAd) #modalKaydetBtn,#modalOverlay:has(#f_izinTur) #modalKaydetBtn{min-height:48px!important;border-radius:14px!important;background:linear-gradient(145deg,#1d8360,#0e6548)!important;border-color:#176d50!important;color:#fff!important;font-weight:850!important;}
#modalOverlay:has(#f_pAd) #modalKapatBtn,#modalOverlay:has(#f_izinTur) #modalKapatBtn{min-height:48px!important;border-radius:14px!important;background:var(--card)!important;border:1px solid var(--border)!important;color:var(--ink)!important;}

/* Dilekçe ve Puantaj: işleyiş değişmez; yalnız mobil görünüm */
#dlkOverlay,#ptOverlay{background:var(--bg)!important;color:var(--ink)!important;}
#dlkOverlay #dlkToolbar,#ptOverlay #ptToolbar{background:var(--card)!important;color:var(--ink)!important;border-bottom:1px solid var(--border)!important;padding:10px 12px!important;box-shadow:0 4px 16px rgba(15,23,42,.05)!important;}
#dlkOverlay #dlkToolbar>span,#ptOverlay #ptToolbar>span{font-size:14px!important;font-weight:850!important;color:var(--ink)!important;}
#dlkOverlay #dlkToolbar button,#ptOverlay #ptToolbar button{min-height:40px!important;border-radius:12px!important;border:1px solid var(--border)!important;background:var(--card)!important;color:var(--ink)!important;padding:7px 10px!important;font-size:11.5px!important;font-weight:800!important;}
#dlkOverlay #dlkCloseBtn,#ptOverlay #ptCloseBtn{color:var(--ink)!important;border-color:var(--border)!important;background:var(--card)!important;}
#dlkOverlay #dlkFormPanel,#ptOverlay #ptFormPanel{background:var(--card)!important;color:var(--ink)!important;border:1px solid var(--border)!important;border-radius:18px!important;box-shadow:0 10px 28px rgba(15,23,42,.07)!important;}
#dlkOverlay #dlkFormPanel input,#dlkOverlay #dlkFormPanel select,#dlkOverlay #dlkFormPanel textarea,#ptOverlay #ptFormPanel input,#ptOverlay #ptFormPanel select,#ptOverlay #ptFormPanel textarea{background:var(--bg)!important;color:var(--ink)!important;border-color:var(--border)!important;border-radius:12px!important;min-height:44px!important;}
#dlkOverlay #dlkFrame,#ptOverlay #ptFrame{border-radius:12px!important;box-shadow:0 10px 30px rgba(15,23,42,.14)!important;}

/* Koyu tema — öğretmen ekranındaki koyu yeşil + mavi vurgu dili */
html[data-theme="dark"] #tab-personel.personel-v2 .personel-v2-card,
html[data-theme="dark"] #detayOverlay .personel-v2-hero,
html[data-theme="dark"] #detayOverlay .personel-v2-section{background:#0d2119!important;border-color:#28483c!important;box-shadow:0 10px 30px rgba(0,0,0,.17);}
html[data-theme="dark"] #tab-personel.personel-v2 #personelArama{background:#0f1722!important;border-color:#2d394a!important;}
html[data-theme="dark"] #tab-personel.personel-v2 .personel-v2-role{background:#123b2d;color:#58c798;}
html[data-theme="dark"] #tab-personel.personel-v2 .personel-v2-open{background:#123458;border-color:#24476b;color:#74aef7;}
html[data-theme="dark"] #detayOverlay .personel-v2-hero-icon{background:#123b2d;color:#58c798;}
html[data-theme="dark"] #detayOverlay .personel-v2-action.dilekce{background:#123b2d;border-color:#285846;color:#5ed09f;}
html[data-theme="dark"] #detayOverlay .personel-v2-action.puantaj{background:#123458;border-color:#24476b;color:#74aef7;}
html[data-theme="dark"] #detayOverlay .personel-v2-section-head .btn{background:#123b2d!important;border-color:#285846!important;color:#5ed09f!important;}
html[data-theme="dark"] #modalOverlay:has(#f_pAd) .modal,html[data-theme="dark"] #modalOverlay:has(#f_izinTur) .modal{background:#0c141c!important;border-color:#293746!important;}
html[data-theme="dark"] #modalOverlay:has(#f_pAd) input,html[data-theme="dark"] #modalOverlay:has(#f_pAd) select,html[data-theme="dark"] #modalOverlay:has(#f_pAd) textarea,html[data-theme="dark"] #modalOverlay:has(#f_izinTur) input,html[data-theme="dark"] #modalOverlay:has(#f_izinTur) select,html[data-theme="dark"] #modalOverlay:has(#f_izinTur) textarea{background:#0f1722!important;border-color:#2d394a!important;}
html[data-theme="dark"] #dlkOverlay #dlkToolbar,html[data-theme="dark"] #ptOverlay #ptToolbar,html[data-theme="dark"] #dlkOverlay #dlkFormPanel,html[data-theme="dark"] #ptOverlay #ptFormPanel{background:#0d2119!important;border-color:#28483c!important;}
html[data-theme="dark"] #dlkOverlay #dlkToolbar button,html[data-theme="dark"] #ptOverlay #ptToolbar button{background:#123458!important;border-color:#24476b!important;color:#9fc7ff!important;}
html[data-theme="dark"] #dlkOverlay #dlkFrame,html[data-theme="dark"] #ptOverlay #ptFrame{outline:1px solid rgba(255,255,255,.07);}

@media(max-width:640px){
  #tab-personel.personel-v2{padding-left:14px!important;padding-right:14px!important;}
  #tab-personel.personel-v2 .page-header{align-items:center;}
  #tab-personel.personel-v2 .page-title{font-size:23px;}
  #tab-personel.personel-v2 .page-sub{font-size:11.5px;max-width:240px;}
  #tab-personel.personel-v2 .page-header-actions .btn{width:46px!important;min-width:46px!important;height:46px!important;padding:0!important;font-size:0!important;}
  #tab-personel.personel-v2 .page-header-actions .btn::before{content:'+';font-size:25px;line-height:1;font-weight:500;}
  #tab-personel.personel-v2 .personel-v2-card{grid-template-columns:52px minmax(0,1fr) 40px;padding:13px 12px;gap:11px;}
  #tab-personel.personel-v2 .personel-v2-avatar{width:52px;height:52px;border-radius:17px;}
  #tab-personel.personel-v2 .personel-v2-name{font-size:15px;}
  #tab-personel.personel-v2 .personel-v2-role{font-size:10px;}
  #tab-personel.personel-v2 .personel-v2-meta{font-size:11px;gap:5px 9px;}
  #detayOverlay .personel-v2-row{grid-template-columns:104px minmax(0,1fr);}
  #detayOverlay .personel-v2-actions{grid-template-columns:1fr;}
  #modalOverlay:has(#f_pAd) .form-row,#modalOverlay:has(#f_izinTur) .form-row{grid-template-columns:1fr!important;}
  #dlkOverlay,#ptOverlay{display:flex!important;flex-direction:column!important;}
  #dlkOverlay #dlkToolbar,#ptOverlay #ptToolbar{align-items:flex-start!important;flex:0 0 auto!important;}
  #dlkOverlay #dlkToolbar>div,#ptOverlay #ptToolbar>div{width:100%;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px!important;}
  #dlkOverlay #dlkToolbar button,#ptOverlay #ptToolbar button{width:100%;padding:7px 7px!important;}
  #dlkOverlay>div:nth-child(2),#ptOverlay>div:nth-child(2){padding:9px!important;gap:9px!important;display:block!important;overflow:auto!important;}
  #dlkOverlay #dlkFormPanel,#ptOverlay #ptFormPanel{width:100%!important;max-width:none!important;box-sizing:border-box!important;margin-bottom:10px!important;border-radius:16px!important;}
  #dlkOverlay #dlkFrame,#ptOverlay #ptFrame{width:210mm!important;min-width:210mm!important;transform-origin:top left;}
}

@media(max-width:380px){
  #tab-personel.personel-v2 .page-sub{display:none;}
  #tab-personel.personel-v2 .personel-v2-card{grid-template-columns:48px minmax(0,1fr) 38px;gap:9px;padding:12px 10px;}
  #tab-personel.personel-v2 .personel-v2-avatar{width:48px;height:48px;}
  #tab-personel.personel-v2 .personel-v2-top{gap:5px;}
}
`;

function personelGorunumuHazirla(){
  if(!document.getElementById('personelGorunumV2Style')){
    const st=document.createElement('style');
    st.id='personelGorunumV2Style';
    st.textContent=PERSONEL_GORUNUM_CSS;
    document.head.appendChild(st);
  }
  const panel=document.getElementById('tab-personel');
  if(panel){
    panel.classList.add('personel-v2');
    const baslik=panel.querySelector('.page-title');
    const alt=panel.querySelector('.page-sub');
    if(baslik) baslik.textContent='Personeller';
    if(alt) alt.textContent='Hizmetli, sürekli işçi ve diğer okul personeli kayıtları';
  }
  const arama=document.getElementById('personelArama');
  if(arama){
    arama.placeholder='Ad, TC veya görev ile ara…';
    const kabuk=arama.parentElement;
    if(kabuk) kabuk.classList.add('personel-search-shell');
  }
}

function personelBasHarfler(ad){
  const p=String(ad||'').trim().split(/\s+/).filter(Boolean);
  if(!p.length) return 'P';
  return (p[0][0]+(p.length>1?p[p.length-1][0]:'')).toLocaleUpperCase('tr');
}

function personelGorevSecenekleriHtml(seciliGorev){
  return PERSONEL_GOREV_SECENEKLERI.map(g =>
    `<option value="${escapeHtml(g)}" ${seciliGorev===g?'selected':''}>${escapeHtml(g)}</option>`
  ).join('');
}

function renderPersonelListesi(){
  personelGorunumuHazirla();
  const hedef = document.getElementById('personelListesi');
  if(!hedef) return;
  const aramaEl = document.getElementById('personelArama');
  const arama = (aramaEl ? aramaEl.value : '').toLocaleLowerCase('tr');

  let liste = [...personelListesi];
  if (arama) {
    liste = liste.filter(p =>
      (p.adSoyad||'').toLocaleLowerCase('tr').includes(arama) ||
      (p.tc||'').includes(arama) ||
      (p.gorev||'').toLocaleLowerCase('tr').includes(arama)
    );
  }
  liste.sort((a,b)=>(a.adSoyad||'').localeCompare(b.adSoyad||'','tr'));

  hedef.innerHTML = liste.length ? liste.map(p=>`
    <article class="personel-v2-card" onclick="personelDetayAc('${p.id}')">
      <div class="personel-v2-avatar">${escapeHtml(personelBasHarfler(p.adSoyad))}</div>
      <div class="personel-v2-body">
        <div class="personel-v2-top">
          <div class="personel-v2-name">${escapeHtml(p.adSoyad||'İsimsiz Personel')}</div>
          <span class="personel-v2-role">${escapeHtml(p.gorev||'Personel')}</span>
        </div>
        <div class="personel-v2-meta">
          <span>${p.tc ? 'TC '+escapeHtml(p.tc) : 'TC kaydı yok'}</span>
          ${p.telefon ? `<span>☎ ${escapeHtml(p.telefon)}</span>` : ''}
        </div>
      </div>
      <button type="button" class="personel-v2-open" aria-label="Personel detayını aç" onclick="event.stopPropagation();personelDetayAc('${p.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </article>
  `).join('') : '<div class="personel-v2-empty"><strong>Personel bulunamadı</strong>Arama ölçütünü değiştirin veya yeni personel ekleyin.</div>';
}

function personelAramaGuncelle(){ renderPersonelListesi(); }

function personelDetaySatir(etiket,deger){
  return `<div class="personel-v2-row"><div class="personel-v2-label">${escapeHtml(etiket)}</div><div class="personel-v2-value">${deger||'—'}</div></div>`;
}

/* ---------- personel detay paneli ---------- */
function personelDetayAc(id){
  const p = personelListesi.find(x=>x.id===id);
  if(!p) return;
  window._acikPersonelDetayId = id;

  document.getElementById('detayBaslik').textContent = p.adSoyad || 'Personel';
  document.getElementById('detayAltBaslik').textContent = p.gorev || 'Personel';
  document.getElementById('detayDuzenleBtn').onclick = ()=>{ detayPanelKapat(); personelModalAc(id); };
  const _raporBtn = document.getElementById('detayRaporBtn');
  if (_raporBtn) {
    _raporBtn.onclick = () => {
      detayPanelKapat();
      if (typeof DilekceSistemi !== 'undefined' && DilekceSistemi.ac) {
        DilekceSistemi.ac(id);
      } else {
        alert('Dilekçe modülü yüklenemedi (js/dilekce.js eksik olabilir). Sayfayı yenileyip tekrar deneyin.');
      }
    };
  }

  document.getElementById('detayBody').innerHTML = `
    <div class="personel-v2-detail">
      <section class="personel-v2-hero">
        <div class="personel-v2-hero-title"><div class="personel-v2-hero-icon">P</div><strong>Personel Bilgileri</strong></div>
        <div class="personel-v2-info">
          ${personelDetaySatir('Görev',escapeHtml(p.gorev||'—'))}
          ${(p.kadroKademesi||(p.gorevYeriKademeleri&&p.gorevYeriKademeleri.length))?personelDetaySatir('Kadrosu / Okul',kademeHucresi(p)):''}
          ${personelDetaySatir('TC Kimlik No',escapeHtml(p.tc||'—'))}
          ${personelDetaySatir('Telefon',escapeHtml(p.telefon||'—'))}
          ${personelDetaySatir('Adres',escapeHtml(p.adres||'—'))}
          ${p.notlar ? personelDetaySatir('Notlar',escapeHtml(p.notlar)) : ''}
        </div>
      </section>

      <div class="personel-v2-actions">
        <button class="personel-v2-action dilekce" onclick="detayPanelKapat(); if(typeof DilekceSistemi!=='undefined') DilekceSistemi.ac('${p.id}'); else alert('Dilekçe modülü yüklenemedi.');">▤ Dilekçe Oluştur</button>
        <button class="personel-v2-action puantaj" onclick="detayPanelKapat(); if(typeof PuantajSistemi!=='undefined') PuantajSistemi.ac('${p.id}'); else alert('Puantaj modülü yüklenemedi.');">◷ Puantaj / İmza Sirküsü</button>
      </div>

      <section class="personel-v2-section">
        <div class="personel-v2-section-head">
          <strong>İzin / Rapor Kayıtları</strong>
          <button class="btn btn-sm" onclick="personelIzinModalAc('${p.id}')">+ Kayıt Ekle</button>
        </div>
        <div id="pIzinListesi"></div>
      </section>
    </div>
  `;
  if (typeof renderPersonelIzinListesi === 'function') renderPersonelIzinListesi(id);

  document.getElementById('detayOverlay').classList.add('active'); document.body.classList.add('modal-open');
  if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);
  if(typeof saltOkumaDetayUygula === 'function') saltOkumaDetayUygula('personel');
}

/* ---------- modal ---------- */
function personelModalAc(id){
  const p = id ? personelListesi.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Ad Soyad</label><input id="f_pAd" value="${p?escapeHtml(p.adSoyad||''):''}" placeholder="Ad soyad"></div>
    <div class="form-row">
      <div class="form-group"><label>TC Kimlik No</label><input id="f_pTc" value="${p?escapeHtml(p.tc||''):''}" maxlength="11" inputmode="numeric" placeholder="11 haneli TC kimlik no"></div>
      <div class="form-group"><label>Telefon</label><input id="f_pTel" value="${p?escapeHtml(p.telefon||''):''}" placeholder="05xx xxx xx xx"></div>
    </div>
    <div class="form-group"><label>Görev</label>
      <select id="f_pGorev">${personelGorevSecenekleriHtml(p?p.gorev:'')}</select>
    </div>
    ${kademeAlanlariHtml(p, 'fp')}
    <div class="form-group"><label>Adres</label><textarea id="f_pAdres" rows="2" placeholder="Adres bilgisi">${p?escapeHtml(p.adres||''):''}</textarea></div>
    <div class="form-group"><label>Notlar</label><textarea id="f_pNotlar" rows="2" placeholder="İsteğe bağlı not">${p?escapeHtml(p.notlar||''):''}</textarea></div>
  `;
  modalAc(p?'Personel Düzenle':'Yeni Personel', body, ()=>{
    const adSoyad = document.getElementById('f_pAd').value.trim();
    if(!adSoyad){ toast('Ad Soyad zorunludur.'); return; }
    const tc = document.getElementById('f_pTc').value.trim();
    if(!PersonelService.tcGecerliMi(tc)){ toast('TC Kimlik No 11 haneli rakamlardan oluşmalıdır.'); return; }
    const _kademeAlanlari = kademeAlanlariniOku('fp');
    PersonelService.personelKaydet(p?p.id:null, {
      adSoyad,
      tc,
      telefon: document.getElementById('f_pTel').value.trim(),
      gorev: document.getElementById('f_pGorev').value,
      kadroKademesi: _kademeAlanlari.kadroKademesi,
      gorevYeriKademeleri: _kademeAlanlari.gorevYeriKademeleri,
      adres: document.getElementById('f_pAdres').value.trim(),
      notlar: document.getElementById('f_pNotlar').value.trim(),
    }).then(()=>toast('Kaydedildi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  }, p ? ()=>{ if(confirm('Bu personel kaydını silmek istediğinize emin misiniz?')){ PersonelService.personelSil(p.id).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); }); modalKapat(); } } : null);
}

/* ---------- FIRESTORE BAĞLANTISI ----------
   Artık doğrudan db.collection() çağrılmıyor — PersonelRepository üzerinden dinleniyor. */
function personelBaglantilariKur(){
  personelGorunumuHazirla();
  PersonelRepository.personelDinle(s=>{
    personelListesi = s;
    renderPersonelListesi();
    if(typeof globalAramaYap === 'function') globalAramaYap();
    if(typeof onbellekKaydet === 'function') onbellekKaydet();
    if(typeof _ilkAcilistaKullaniciSor === 'function') _ilkAcilistaKullaniciSor();
  });
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',personelGorunumuHazirla,{once:true});
else personelGorunumuHazirla();
