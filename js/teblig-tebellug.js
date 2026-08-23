/* =============================================
   js/teblig-tebellug.js
   TEBLİĞ-TEBELLÜĞ İMZA SİRKÜSÜ
   Resmi A4 çıktı formatı ve mevcut geçici state yapısı korunur.
   Mobilde form ve önizleme ayrı görünümler halinde sunulur.
   ============================================= */

(function() {
  'use strict';

  let _state = null;
  let _aktifGorunum = 'duzenle';

  function _bugunIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function _tarihIsoToTr(iso) {
    if (!iso) return '';
    const [y,m,d] = iso.split('-');
    if (!y||!m||!d) return '';
    return `${d}/${m}/${y}`;
  }

  function _bosSatir() {
    return { ogretmenId: '', ad: '', gorev: '' };
  }

  function _bosState() {
    return {
      tarihIso: _bugunIso(),
      sayi: '',
      konu: '',
      satirlar: []
    };
  }

  function _gorevMetni(o) {
    if (!o) return '';
    const unvan = o.unvan || 'Öğretmen';
    if (unvan === 'Öğretmen' && o.brans) return `${o.brans} Öğrt.`;
    return unvan;
  }

  function _ogretmenListesi() {
    return (typeof ogretmenler !== 'undefined' ? ogretmenler : []).slice()
      .sort((a,b)=>`${a.ad||''} ${a.soyad||''}`.localeCompare(`${b.ad||''} ${b.soyad||''}`,'tr'));
  }

  function _ogretmenSecenekleriHtml(state) {
    const secili = new Set((state.satirlar || []).map(s => s.ogretmenId).filter(Boolean));
    return '<option value="">— Öğretmen seçin —</option>' +
      _ogretmenListesi()
        .filter(o => !secili.has(o.id))
        .map(o => `<option value="${o.id}">${escapeHtml(`${o.ad||''} ${o.soyad||''}`.trim())}</option>`)
        .join('');
  }

  function _getOkulAdi() {
    return (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi)
      ? okulBilgileriAyari.okulAdi : 'KORUK İLK - ORTAOKULU';
  }

  function _sayfaHtml(state) {
    const okulAdi = _getOkulAdi().toLocaleUpperCase('tr');
    const tarihTr = _tarihIsoToTr(state.tarihIso);
    const doluSatirlar = (state.satirlar || []).filter(s => s.ad || s.ogretmenId);

    const satirlarHtml = doluSatirlar.map((s, i) => `
      <tr>
        <td style="text-align:center;">${i+1}</td>
        <td>${escapeHtml(s.ad||'')}</td>
        <td>${escapeHtml(s.gorev||'')}</td>
        <td>&nbsp;</td>
      </tr>`).join('');

    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(okulAdi)} — Tebliğ-Tebellüğ İmza Sirküsü</title>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  * { box-sizing: border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',Arial,sans-serif; font-size:11pt; color:#111; }
  table { width:100%; border-collapse:collapse; }
  td, th { border:1px solid #000; padding:5px 8px; vertical-align:middle; }
  .ts-baslik { text-align:center; font-weight:700; font-size:13pt; padding:8px; }
  .ts-bilgi-th { text-align:center; font-weight:700; background:#f3f3f3; }
  .ts-not { text-align:center; font-weight:700; padding:10px 6px; }
  .ts-tablo-th { font-weight:700; background:#f3f3f3; }
  .ts-imza-col { width:32%; }
  .ts-sno-col { width:8%; text-align:center; }
  @media print { body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
  <table>
    <tr><td colspan="3" class="ts-baslik">${escapeHtml(okulAdi)} TEBLİĞ-TEBELLÜĞ İMZA SİRKÜSÜ</td></tr>
    <tr>
      <th class="ts-bilgi-th" style="width:20%;">TARİH</th>
      <th class="ts-bilgi-th" style="width:35%;">SAYI</th>
      <th class="ts-bilgi-th">KONU</th>
    </tr>
    <tr>
      <td style="text-align:center;">${escapeHtml(tarihTr)}</td>
      <td style="text-align:center;">${escapeHtml(state.sayi||'')}</td>
      <td>${escapeHtml(state.konu||'')}</td>
    </tr>
  </table>

  <table style="margin-top:6mm;">
    <tr><td class="ts-not">TARİH, SAYI VE KONUSU BELİRTİLEN YAZIYI OKUDUM VE BİLGİ EDİNDİM.</td></tr>
  </table>

  <table style="margin-top:0;">
    <tr>
      <th class="ts-tablo-th ts-sno-col">S.NO</th>
      <th class="ts-tablo-th">ADI VE SOYADI</th>
      <th class="ts-tablo-th">GÖREVİ</th>
      <th class="ts-tablo-th ts-imza-col">İMZA</th>
    </tr>
    ${satirlarHtml}
  </table>
</body>
</html>`;
  }

  function _stilEkle() {
    if (document.getElementById('tsModernStyle')) return;
    const st = document.createElement('style');
    st.id = 'tsModernStyle';
    st.textContent = `
      body.ts-overlay-acik{overflow:hidden!important;overscroll-behavior:none!important;}
      #tsOverlay{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;z-index:99999!important;background:var(--bg-app,#eef4f1)!important;color:var(--ink,#17352c)!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;font-family:Manrope,Inter,'Segoe UI',Arial,sans-serif!important;}
      #tsOverlay .ts-toolbar{flex:0 0 auto;padding:12px 14px;background:linear-gradient(135deg,#0d6548,#1d8360);color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.16);}
      #tsOverlay .ts-toolbar-top{display:flex;align-items:center;justify-content:space-between;gap:10px;}
      #tsOverlay .ts-title{font-weight:800;font-size:15px;line-height:1.25;}
      #tsOverlay .ts-toolbar-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:10px;}
      #tsOverlay .ts-top-btn{min-height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.18);font-weight:800;font-size:12.5px;cursor:pointer;}
      #tsOverlay #tsEditBtn{background:#eef7f3;color:#176d50;}
      #tsOverlay #tsPreviewBtn,#tsOverlay #tsPrintBtn{background:#173b65;color:#c8ddff;border-color:#2a5788;}
      #tsOverlay #tsCloseBtn{width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.12);color:#fff;font-size:18px;}
      #tsOverlay .ts-content{flex:1 1 auto;min-height:0;overflow:hidden;position:relative;}
      #tsOverlay .ts-pane{position:absolute;inset:0;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;}
      #tsOverlay .ts-pane[hidden]{display:none!important;}
      #tsOverlay #tsEditPane{padding:12px;}
      #tsOverlay #tsFormPanel{width:min(100%,720px);margin:0 auto;background:transparent;color:inherit;}
      #tsOverlay .ts-card{background:var(--bg-card,#fff);border:1px solid var(--border,#d8e2dd);border-radius:18px;padding:14px;margin-bottom:12px;box-shadow:0 6px 20px rgba(15,23,42,.05);}
      #tsOverlay .ts-card-title{font-size:14px;font-weight:850;color:#176d50;margin:0 0 12px;}
      #tsOverlay .ts-field{margin-bottom:12px;}
      #tsOverlay .ts-field:last-child{margin-bottom:0;}
      #tsOverlay .ts-field label{display:block;font-size:11.5px;font-weight:800;color:var(--ink-muted,#64766f);margin-bottom:6px;}
      #tsOverlay input,#tsOverlay select{width:100%;min-height:48px;border:1px solid var(--border,#d2ddd8);border-radius:13px;background:var(--bg-app,#f5f8f6);color:var(--ink,#17352c);padding:0 12px;font-size:13px;box-sizing:border-box;}
      #tsOverlay .ts-add-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;}
      #tsOverlay #tsAddTeacherBtn{min-height:48px;border:1px solid #b7d8cc;border-radius:13px;background:#e8f4ef;color:#176d50;font-weight:850;padding:0 16px;}
      #tsOverlay .ts-empty{padding:14px;border:1px dashed var(--border,#cad8d2);border-radius:14px;color:var(--ink-muted,#6b7e76);font-size:12.5px;text-align:center;}
      #tsOverlay .ts-teacher-list{display:flex;flex-direction:column;gap:9px;margin-top:12px;}
      #tsOverlay .ts-teacher-card{border:1px solid var(--border,#d8e2dd);background:var(--bg-app,#f7faf8);border-radius:15px;padding:11px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:start;}
      #tsOverlay .ts-teacher-name{font-size:13px;font-weight:850;color:var(--ink,#17352c);margin-bottom:7px;}
      #tsOverlay .ts-role-input{min-height:42px!important;background:var(--bg-card,#fff)!important;}
      #tsOverlay .ts-remove{width:38px;height:38px;border-radius:11px;border:1px solid var(--border,#d8e2dd);background:transparent;color:var(--ink-muted,#677870);font-size:16px;}
      #tsOverlay #tsPreviewPane{background:#51565a;padding:10px;overflow:auto;}
      #tsOverlay .ts-frame-wrap{width:max-content;min-width:100%;display:flex;justify-content:center;align-items:flex-start;}
      #tsOverlay #tsFrame{display:block;width:210mm;min-width:210mm;height:297mm;border:none;background:#fff;box-shadow:0 4px 18px rgba(0,0,0,.35);}
      html[data-theme="dark"] #tsOverlay{background:#07100d!important;color:#eef6f2!important;}
      html[data-theme="dark"] #tsOverlay .ts-card{background:#0d2119;border-color:#28483c;}
      html[data-theme="dark"] #tsOverlay .ts-card-title{color:#58c798;}
      html[data-theme="dark"] #tsOverlay .ts-field label{color:#a9bbb4;}
      html[data-theme="dark"] #tsOverlay input,html[data-theme="dark"] #tsOverlay select{background:#0f1722;border-color:#2d394a;color:#eef4f1;}
      html[data-theme="dark"] #tsOverlay .ts-teacher-card{background:#0b1914;border-color:#28483c;}
      html[data-theme="dark"] #tsOverlay .ts-teacher-name{color:#f0f6f3;}
      html[data-theme="dark"] #tsOverlay .ts-role-input{background:#0f1722!important;}
      html[data-theme="dark"] #tsOverlay .ts-empty{border-color:#28483c;color:#9eafa8;}
      @media(min-width:760px){#tsOverlay .ts-toolbar{padding:12px 18px;}#tsOverlay .ts-toolbar-actions{grid-template-columns:auto auto auto;justify-content:end;}#tsOverlay #tsEditPane{padding:18px;}}
    `;
    document.head.appendChild(st);
  }

  function _overlayOlustur() {
    const mevcut = document.getElementById('tsOverlay');
    if (mevcut) return mevcut;
    _stilEkle();

    const ov = document.createElement('div');
    ov.id = 'tsOverlay';
    ov.innerHTML = `
      <div class="ts-toolbar">
        <div class="ts-toolbar-top">
          <span class="ts-title">📋 Tebliğ-Tebellüğ İmza Sirküsü</span>
          <button id="tsCloseBtn" aria-label="Kapat">✕</button>
        </div>
        <div class="ts-toolbar-actions">
          <button id="tsEditBtn" class="ts-top-btn">✎ Düzenle</button>
          <button id="tsPreviewBtn" class="ts-top-btn">▣ Önizleme</button>
          <button id="tsPrintBtn" class="ts-top-btn">🖨️ Yazdır / PDF</button>
        </div>
      </div>
      <div class="ts-content">
        <div id="tsEditPane" class="ts-pane"><div id="tsFormPanel"></div></div>
        <div id="tsPreviewPane" class="ts-pane" hidden><div class="ts-frame-wrap"><iframe id="tsFrame"></iframe></div></div>
      </div>`;

    document.body.appendChild(ov);
    document.body.classList.add('ts-overlay-acik');
    if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);
    document.documentElement.style.overscrollBehaviorY = 'contain';

    function kapat() {
      ov.remove();
      document.body.classList.remove('ts-overlay-acik');
      document.documentElement.style.overscrollBehaviorY = '';
      if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
      if (typeof _menuyeGeriDon === 'function') _menuyeGeriDon();
    }

    ov.querySelector('#tsCloseBtn').onclick = kapat;
    ov.querySelector('#tsEditBtn').onclick = () => _gorunumDegistir(ov, 'duzenle');
    ov.querySelector('#tsPreviewBtn').onclick = () => _gorunumDegistir(ov, 'onizleme');
    ov.querySelector('#tsPrintBtn').onclick = () => {
      const fr = ov.querySelector('#tsFrame');
      if (!fr || !fr.contentWindow) { toast('Belge henüz yüklenmedi, birkaç saniye sonra tekrar deneyin.'); return; }
      if (typeof uygulamaHtmlYazdir === 'function') {
        const dogFrame = fr.contentDocument;
        const html = dogFrame ? dogFrame.documentElement.outerHTML : null;
        if (!html) { toast('Belge içeriği okunamadı, birkaç saniye sonra tekrar deneyin.'); return; }
        uygulamaHtmlYazdir(html, 'Teblig_Tebellug_Imza_Sirkusu', 'dikey');
        return;
      }
      fr.contentWindow.focus();
      fr.contentWindow.print();
    };

    return ov;
  }

  function _gorunumDegistir(ov, gorunum) {
    _aktifGorunum = gorunum;
    const editPane = ov.querySelector('#tsEditPane');
    const previewPane = ov.querySelector('#tsPreviewPane');
    if (gorunum === 'onizleme') {
      editPane.hidden = true;
      previewPane.hidden = false;
      ov.querySelector('#tsPreviewBtn').setAttribute('aria-pressed','true');
      ov.querySelector('#tsEditBtn').setAttribute('aria-pressed','false');
    } else {
      previewPane.hidden = true;
      editPane.hidden = false;
      ov.querySelector('#tsEditBtn').setAttribute('aria-pressed','true');
      ov.querySelector('#tsPreviewBtn').setAttribute('aria-pressed','false');
    }
  }

  function _formPanelHtml(state) {
    const satirlar = state.satirlar || [];
    return `
      <section class="ts-card">
        <h3 class="ts-card-title">Tebliğ Bilgileri</h3>
        <div class="ts-field"><label>Tarih</label><input id="ts_tarih" type="date" value="${escapeHtml(state.tarihIso||'')}"></div>
        <div class="ts-field"><label>Sayı</label><input id="ts_sayi" value="${escapeHtml(state.sayi||'')}" placeholder="örn: E-79137285-730.06-141434214"></div>
        <div class="ts-field"><label>Konu</label><input id="ts_konu" value="${escapeHtml(state.konu||'')}" placeholder="örn: Milat Projesi"></div>
      </section>

      <section class="ts-card">
        <h3 class="ts-card-title">Tebellüğ Edecek Öğretmenler</h3>
        <div class="ts-add-row">
          <select id="ts_teacherPicker">${_ogretmenSecenekleriHtml(state)}</select>
          <button id="tsAddTeacherBtn" type="button">Ekle</button>
        </div>
        <div class="ts-teacher-list">
          ${satirlar.length ? satirlar.map((s,i)=>`
            <div class="ts-teacher-card" data-index="${i}">
              <div>
                <div class="ts-teacher-name">${escapeHtml(s.ad||'')}</div>
                <input class="ts-role-input" data-index="${i}" value="${escapeHtml(s.gorev||'')}" placeholder="Görevi">
              </div>
              <button class="ts-remove" data-index="${i}" type="button" aria-label="Listeden çıkar">✕</button>
            </div>`).join('') : '<div class="ts-empty">Henüz öğretmen eklenmedi. Açılır listeden öğretmen seçip “Ekle” düğmesine dokunun.</div>'}
        </div>
      </section>`;
  }

  function _overlayDoldur(ov) {
    _state = _bosState();
    _aktifGorunum = 'duzenle';
    const state = _state;
    const formPanel = ov.querySelector('#tsFormPanel');
    const frame = ov.querySelector('#tsFrame');

    function onizlemeGuncelle() {
      frame.srcdoc = _sayfaHtml(state);
    }

    function render() {
      formPanel.innerHTML = _formPanelHtml(state);
      onizlemeGuncelle();
      _bagla();
    }

    function _bagla() {
      formPanel.querySelector('#ts_tarih').onchange = (e) => {
        state.tarihIso = e.target.value;
        onizlemeGuncelle();
      };
      formPanel.querySelector('#ts_sayi').oninput = (e) => {
        state.sayi = e.target.value;
        onizlemeGuncelle();
      };
      formPanel.querySelector('#ts_konu').oninput = (e) => {
        state.konu = e.target.value;
        onizlemeGuncelle();
      };

      const picker = formPanel.querySelector('#ts_teacherPicker');
      const ekleBtn = formPanel.querySelector('#tsAddTeacherBtn');
      ekleBtn.onclick = () => {
        const oid = picker.value;
        if (!oid) return;
        if (state.satirlar.some(s => s.ogretmenId === oid)) return;
        const o = _ogretmenListesi().find(x => x.id === oid);
        if (!o) return;
        state.satirlar.push({
          ogretmenId: oid,
          ad: `${o.ad||''} ${o.soyad||''}`.trim(),
          gorev: _gorevMetni(o)
        });
        render();
      };
      picker.onchange = () => {
        if (picker.value) ekleBtn.focus();
      };

      formPanel.querySelectorAll('.ts-role-input').forEach(inp => {
        inp.oninput = (e) => {
          const i = parseInt(e.target.dataset.index,10);
          if (!state.satirlar[i]) return;
          state.satirlar[i].gorev = e.target.value;
          onizlemeGuncelle();
        };
      });
      formPanel.querySelectorAll('.ts-remove').forEach(btn => {
        btn.onclick = (e) => {
          const i = parseInt(e.currentTarget.dataset.index,10);
          state.satirlar.splice(i,1);
          render();
        };
      });
    }

    render();
    _gorunumDegistir(ov,'duzenle');
  }

  window.TebligTebellugSirkusu = {
    ac() {
      const ov = _overlayOlustur();
      _overlayDoldur(ov);
    }
  };

})();
