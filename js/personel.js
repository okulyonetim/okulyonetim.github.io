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
#tab-personel.personel-v2{padding-bottom:calc(106px + env(safe-area-inset-bottom,0px));}
#tab-personel.personel-v2 .page-header{align-items:center;margin-bottom:15px;padding:2px 1px;gap:12px;}
#tab-personel.personel-v2 .page-title{font-size:24px;line-height:1.15;font-weight:850;letter-spacing:-.45px;color:var(--ink);}
#tab-personel.personel-v2 .page-sub{margin-top:5px;font-size:12.5px;line-height:1.45;color:var(--ink-muted);max-width:560px;}
#tab-personel.personel-v2 .page-header-actions .btn{min-height:44px;border-radius:14px!important;padding:0 15px!important;border:1px solid color-mix(in srgb,var(--accent,#0f7a57) 72%,transparent)!important;background:linear-gradient(135deg,color-mix(in srgb,var(--accent,#0f7a57) 90%,#0b4f3a),var(--accent,#0f7a57))!important;color:#fff!important;font-size:12.5px!important;font-weight:800!important;box-shadow:0 8px 22px color-mix(in srgb,var(--accent,#0f7a57) 20%,transparent)!important;}
#tab-personel.personel-v2 .personel-search-shell{position:relative!important;margin-bottom:15px!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;}
#tab-personel.personel-v2 .personel-search-shell::before{content:'';position:absolute;left:14px;top:50%;width:18px;height:18px;transform:translateY(-50%);z-index:2;pointer-events:none;opacity:.78;background:currentColor;color:var(--ink-muted);mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-3.7-3.7'/%3E%3C/svg%3E") center/contain no-repeat;}
#tab-personel.personel-v2 #personelArama{height:48px!important;width:100%!important;box-sizing:border-box!important;padding:0 15px 0 44px!important;border-radius:15px!important;border:1px solid var(--border)!important;background:var(--card)!important;color:var(--ink)!important;font-size:13px!important;box-shadow:0 5px 18px rgba(15,23,42,.035)!important;outline:none!important;}
#tab-personel.personel-v2 #personelArama::placeholder{color:var(--ink-muted)!important;opacity:.88;}
#tab-personel.personel-v2 #personelArama:focus{border-color:var(--accent,#0f7a57)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--accent,#0f7a57) 13%,transparent)!important;}
#tab-personel.personel-v2 #personelListesi{display:flex;flex-direction:column;gap:10px;}
#tab-personel.personel-v2 .personel-v2-card{display:grid;grid-template-columns:46px minmax(0,1fr) 38px;gap:12px;align-items:center;padding:13px;border:1px solid var(--border);border-radius:18px;background:var(--card);box-shadow:0 7px 22px rgba(15,23,42,.035);cursor:pointer;transition:transform .14s ease,border-color .14s ease,box-shadow .14s ease;}
#tab-personel.personel-v2 .personel-v2-card:active{transform:scale(.993);}
#tab-personel.personel-v2 .personel-v2-avatar{width:46px;height:46px;border-radius:15px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--accent,#0f7a57) 12%,var(--card));border:1px solid color-mix(in srgb,var(--accent,#0f7a57) 20%,var(--border));color:var(--accent,#0f7a57);font-size:14px;font-weight:900;letter-spacing:.2px;}
#tab-personel.personel-v2 .personel-v2-body{min-width:0;}
#tab-personel.personel-v2 .personel-v2-top{display:flex;align-items:center;gap:7px;min-width:0;}
#tab-personel.personel-v2 .personel-v2-name{font-size:14.5px;font-weight:850;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
#tab-personel.personel-v2 .personel-v2-role{display:inline-flex;align-items:center;max-width:48%;padding:3px 7px;border-radius:999px;background:color-mix(in srgb,var(--accent,#0f7a57) 10%,transparent);color:var(--accent,#0f7a57);font-size:10px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
#tab-personel.personel-v2 .personel-v2-meta{display:flex;gap:6px 10px;align-items:center;flex-wrap:wrap;margin-top:6px;color:var(--ink-muted);font-size:11.5px;line-height:1.3;}
#tab-personel.personel-v2 .personel-v2-meta span{display:inline-flex;align-items:center;gap:5px;}
#tab-personel.personel-v2 .personel-v2-open{width:38px;height:38px;border-radius:12px;border:1px solid var(--border);background:color-mix(in srgb,var(--card) 90%,var(--accent,#0f7a57) 10%);color:var(--ink-muted);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;}
#tab-personel.personel-v2 .personel-v2-open svg{width:16px;height:16px;}
#tab-personel.personel-v2 .personel-v2-empty{padding:32px 18px;text-align:center;border-radius:18px;border:1px dashed var(--border);background:var(--card);color:var(--ink-muted);font-size:12.5px;}
#tab-personel.personel-v2 .personel-v2-empty strong{display:block;color:var(--ink);font-size:14.5px;margin-bottom:5px;}

/* Personel detay paneli: yalnız içerik görünümü */
#detayOverlay .personel-v2-detail{padding:14px 15px 28px;display:flex;flex-direction:column;gap:12px;}
#detayOverlay .personel-v2-hero{border:1px solid color-mix(in srgb,var(--accent,#0f7a57) 22%,var(--border));background:linear-gradient(145deg,color-mix(in srgb,var(--accent,#0f7a57) 10%,var(--card)),var(--card));border-radius:20px;padding:15px;}
#detayOverlay .personel-v2-hero-title{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
#detayOverlay .personel-v2-hero-icon{width:39px;height:39px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--accent,#0f7a57) 14%,transparent);color:var(--accent,#0f7a57);font-size:18px;}
#detayOverlay .personel-v2-hero-title strong{font-size:13.5px;color:var(--ink);}
#detayOverlay .personel-v2-info{display:flex;flex-direction:column;}
#detayOverlay .personel-v2-row{display:grid;grid-template-columns:125px minmax(0,1fr);gap:12px;padding:10px 0;border-top:1px solid color-mix(in srgb,var(--border) 72%,transparent);align-items:start;}
#detayOverlay .personel-v2-row:first-child{border-top:0;}
#detayOverlay .personel-v2-label{font-size:11.5px;font-weight:700;color:var(--ink-muted);}
#detayOverlay .personel-v2-value{font-size:12.5px;font-weight:750;color:var(--ink);text-align:right;overflow-wrap:anywhere;}
#detayOverlay .personel-v2-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
#detayOverlay .personel-v2-action{min-height:48px;border-radius:15px;border:1px solid var(--border);background:var(--card);font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;padding:8px 10px;}
#detayOverlay .personel-v2-action.dilekce{color:var(--accent,#0f7a57);border-color:color-mix(in srgb,var(--accent,#0f7a57) 30%,var(--border));background:color-mix(in srgb,var(--accent,#0f7a57) 7%,var(--card));}
#detayOverlay .personel-v2-action.puantaj{color:#3b6fbd;border-color:color-mix(in srgb,#3b82f6 28%,var(--border));background:color-mix(in srgb,#3b82f6 7%,var(--card));}
#detayOverlay .personel-v2-section{border:1px solid var(--border);border-radius:20px;background:var(--card);padding:14px;}
#detayOverlay .personel-v2-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;}
#detayOverlay .personel-v2-section-head strong{font-size:13.5px;color:var(--ink);}
#detayOverlay .personel-v2-section-head .btn{border-radius:12px!important;background:color-mix(in srgb,var(--accent,#0f7a57) 9%,var(--card))!important;border:1px solid color-mix(in srgb,var(--accent,#0f7a57) 30%,var(--border))!important;color:var(--accent,#0f7a57)!important;font-weight:800!important;}
#detayOverlay .personel-v2-section #pIzinListesi{display:flex;flex-direction:column;gap:8px;}
#detayOverlay .personel-v2-section #pIzinListesi .evrak-row{margin:0!important;padding:11px 12px!important;border-radius:14px!important;border:1px solid var(--border)!important;background:color-mix(in srgb,var(--card) 94%,var(--accent,#0f7a57) 6%)!important;box-shadow:none!important;}
#detayOverlay .personel-v2-section #pIzinListesi .evrak-title{font-size:12.5px!important;color:var(--ink)!important;}
#detayOverlay .personel-v2-section #pIzinListesi .evrak-meta{font-size:11px!important;color:var(--ink-muted)!important;margin-top:4px!important;}
#detayOverlay .personel-v2-section #pIzinListesi .btn{border-radius:11px!important;}

/* Mevcut modalAc() korunur; yalnız personel alanları varsa görünüm uygulanır. */
#modalOverlay:has(#f_pAd) .modal,#modalOverlay:has(#f_izinTur) .modal{width:min(94vw,560px)!important;max-height:min(88dvh,760px)!important;overflow:auto!important;overscroll-behavior:contain;border-radius:22px!important;border:1px solid var(--border)!important;background:var(--card)!important;box-shadow:0 24px 70px rgba(2,6,23,.28)!important;}
#modalOverlay:has(#f_pAd) #modalTitle,#modalOverlay:has(#f_izinTur) #modalTitle{font-size:18px!important;font-weight:850!important;letter-spacing:-.25px;color:var(--ink)!important;margin-bottom:16px!important;}
#modalOverlay:has(#f_pAd) .form-group,#modalOverlay:has(#f_izinTur) .form-group{margin-bottom:13px!important;}
#modalOverlay:has(#f_pAd) .form-group label,#modalOverlay:has(#f_izinTur) .form-group label{display:block!important;margin-bottom:6px!important;font-size:11.5px!important;font-weight:800!important;color:var(--ink-muted)!important;}
#modalOverlay:has(#f_pAd) input,#modalOverlay:has(#f_pAd) select,#modalOverlay:has(#f_pAd) textarea,#modalOverlay:has(#f_izinTur) input,#modalOverlay:has(#f_izinTur) select,#modalOverlay:has(#f_izinTur) textarea{width:100%!important;box-sizing:border-box!important;min-height:44px!important;border-radius:13px!important;border:1px solid var(--border)!important;background:var(--bg)!important;color:var(--ink)!important;padding:10px 12px!important;font-size:13px!important;outline:none!important;}
#modalOverlay:has(#f_pAd) textarea{min-height:76px!important;resize:vertical;}
#modalOverlay:has(#f_pAd) input:focus,#modalOverlay:has(#f_pAd) select:focus,#modalOverlay:has(#f_pAd) textarea:focus,#modalOverlay:has(#f_izinTur) input:focus,#modalOverlay:has(#f_izinTur) select:focus,#modalOverlay:has(#f_izinTur) textarea:focus{border-color:var(--accent,#0f7a57)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--accent,#0f7a57) 12%,transparent)!important;}
#modalOverlay:has(#f_pAd) .modal-actions,#modalOverlay:has(#f_izinTur) .modal-actions{position:sticky!important;bottom:-1px!important;background:linear-gradient(to top,var(--card) 82%,transparent)!important;padding-top:14px!important;margin-top:6px!important;z-index:3!important;}
#modalOverlay:has(#f_pAd) #modalKaydetBtn,#modalOverlay:has(#f_izinTur) #modalKaydetBtn{border-radius:13px!important;background:var(--accent,#0f7a57)!important;border-color:var(--accent,#0f7a57)!important;color:#fff!important;font-weight:800!important;}
#modalOverlay:has(#f_pAd) #modalKapatBtn,#modalOverlay:has(#f_izinTur) #modalKapatBtn{border-radius:13px!important;}

/* Dilekçe ve Puantaj: işleyiş aynı, yalnız tam ekran görünüm */
#dlkOverlay,#ptOverlay{background:var(--bg)!important;color:var(--ink)!important;}
#dlkOverlay #dlkToolbar,#ptOverlay #ptToolbar{background:color-mix(in srgb,var(--card) 96%,var(--accent,#0f7a57) 4%)!important;color:var(--ink)!important;border-bottom:1px solid var(--border)!important;padding:12px 14px!important;box-shadow:0 4px 18px rgba(15,23,42,.05)!important;}
#dlkOverlay #dlkToolbar>span,#ptOverlay #ptToolbar>span{font-size:14px!important;font-weight:850!important;color:var(--ink)!important;}
#dlkOverlay #dlkToolbar button,#ptOverlay #ptToolbar button{min-height:38px!important;border-radius:11px!important;border:1px solid var(--border)!important;background:var(--card)!important;color:var(--ink)!important;padding:7px 11px!important;font-size:11.5px!important;font-weight:800!important;}
#dlkOverlay #dlkCloseBtn,#ptOverlay #ptCloseBtn{color:#b4232f!important;border-color:color-mix(in srgb,#b4232f 30%,var(--border))!important;background:color-mix(in srgb,#b4232f 7%,var(--card))!important;}
#dlkOverlay #dlkFormPanel,#ptOverlay #ptFormPanel{background:var(--card)!important;color:var(--ink)!important;border:1px solid var(--border)!important;border-radius:18px!important;box-shadow:0 12px 32px rgba(15,23,42,.08)!important;}
#dlkOverlay #dlkFormPanel input,#dlkOverlay #dlkFormPanel select,#dlkOverlay #dlkFormPanel textarea,#ptOverlay #ptFormPanel input,#ptOverlay #ptFormPanel select,#ptOverlay #ptFormPanel textarea{background:var(--bg)!important;color:var(--ink)!important;border-color:var(--border)!important;border-radius:11px!important;}
#dlkOverlay #dlkFrame,#ptOverlay #ptFrame{border-radius:12px!important;box-shadow:0 10px 34px rgba(15,23,42,.16)!important;}

html[data-theme="dark"] #tab-personel.personel-v2 .personel-v2-card,html[data-theme="dark"] #detayOverlay .personel-v2-hero,html[data-theme="dark"] #detayOverlay .personel-v2-section{box-shadow:0 10px 30px rgba(0,0,0,.14);}
html[data-theme="dark"] #dlkOverlay #dlkFrame,html[data-theme="dark"] #ptOverlay #ptFrame{outline:1px solid rgba(255,255,255,.08);}

@media(max-width:640px){
  #tab-personel.personel-v2{padding-left:14px!important;padding-right:14px!important;}
  #tab-personel.personel-v2 .page-title{font-size:21px;}
  #tab-personel.personel-v2 .page-sub{font-size:11.5px;}
  #tab-personel.personel-v2 .page-header-actions .btn{width:44px!important;min-width:44px!important;padding:0!important;font-size:0!important;}
  #tab-personel.personel-v2 .page-header-actions .btn::before{content:'+';font-size:24px;line-height:1;}
  #detayOverlay .personel-v2-row{grid-template-columns:108px minmax(0,1fr);}
  #detayOverlay .personel-v2-actions{grid-template-columns:1fr;}
  #modalOverlay:has(#f_pAd) .form-row,#modalOverlay:has(#f_izinTur) .form-row{grid-template-columns:1fr!important;}
  #dlkOverlay #dlkToolbar,#ptOverlay #ptToolbar{align-items:flex-start!important;}
  #dlkOverlay #dlkToolbar>div,#ptOverlay #ptToolbar>div{width:100%;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px!important;}
  #dlkOverlay #dlkToolbar button,#ptOverlay #ptToolbar button{width:100%;padding:7px 8px!important;}
  #dlkOverlay>div:nth-child(2),#ptOverlay>div:nth-child(2){padding:10px!important;gap:10px!important;}
  #dlkOverlay #dlkFormPanel,#ptOverlay #ptFormPanel{width:100%!important;max-width:none!important;box-sizing:border-box!important;}
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
  if(panel) panel.classList.add('personel-v2');
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
        <div class="personel-v2-hero-title"><div class="personel-v2-hero-icon">♙</div><strong>Personel Bilgileri</strong></div>
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
