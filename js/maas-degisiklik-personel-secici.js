/* Maaş Değişikliği — D-H bölümlerinde açılır personel seçici.
   Mevcut MaasDegisiklikFormu state/yazdırma mantığına dokunmaz.
   ÖNEMLİ: MutationObserver kullanılmaz; aksi halde native select açılırken
   DOM sürekli yeniden kurulur ve mobilde liste açılamaz. */
(function(){
  'use strict';

  /* Ortak shell tarafından zaten yüklenen bu küçük runtime dosyası,
     Puantaj mobil v2 stilini ve Devamsızlık local-first düzeltmesini de
     güvenli biçimde ekler. */
  if(!document.querySelector('link[data-puantaj-mobile-v2]')){
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/puantaj-mobile-v2.css?v=2';
    link.setAttribute('data-puantaj-mobile-v2','1');
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-devamsizlik-runtime-fix]')){
    const script = document.createElement('script');
    script.src = 'js/devamsizlik-runtime-fix.js?v=1';
    script.defer = true;
    script.setAttribute('data-devamsizlik-runtime-fix','1');
    document.head.appendChild(script);
  }

  let sarildi = false;

  function metin(el){ return (el && el.textContent || '').replace(/\s+/g,' ').trim(); }

  function bolumHarfi(bolum){
    const t = metin(bolum && bolum.querySelector('.mdf-bolum-baslik'));
    const m = t.match(/^([D-H])\)/i);
    return m ? m[1].toUpperCase() : '';
  }

  function kisiBilgisi(row){
    const kisi = row.querySelector('.mdf-roster-kisi');
    return {
      ad: metin(kisi && kisi.querySelector('strong')),
      detay: metin(kisi && kisi.querySelector('span'))
    };
  }

  function bolumuDuzenle(bolum){
    const harf = bolumHarfi(bolum);
    if(!harf) return;

    const rows = Array.from(bolum.querySelectorAll('.mdf-roster-satir'));
    if(!rows.length) return;

    bolum.querySelectorAll(':scope > .mdf-personel-secici-wrap').forEach(el => el.remove());

    const gizli = [];
    const acik = [];
    rows.forEach((row, index) => {
      row.dataset.mdfRosterIndex = String(index);
      if(row.classList.contains('mdf-gizli-satir')) gizli.push(row);
      else acik.push(row);
    });

    gizli.forEach(row => { row.style.display = 'none'; });
    acik.forEach(row => {
      row.style.display = '';
      const btn = row.querySelector('.mdf-goster-gizle-btn');
      if(btn){
        btn.textContent = '✕ Çıkar';
        btn.classList.add('mdf-secim-cikar');
        btn.setAttribute('aria-label','Personeli bu bölümden çıkar');
      }
    });

    const wrap = document.createElement('div');
    wrap.className = 'mdf-personel-secici-wrap';
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:7px;margin:10px 0 12px;';

    const label = document.createElement('label');
    label.className = 'mdf-personel-secici-label';
    label.textContent = 'Personel seç';
    label.style.cssText = 'font-size:12px;font-weight:800;color:inherit;';

    const select = document.createElement('select');
    select.className = 'mdf-personel-secici';
    select.setAttribute('aria-label', harf + ' bölümü için personel seç');
    select.style.cssText = 'display:block;position:relative;z-index:3;width:100%;min-height:48px;padding:0 12px;border-radius:12px;font-size:14px;pointer-events:auto;touch-action:manipulation;';

    const ilk = document.createElement('option');
    ilk.value = '';
    ilk.textContent = gizli.length ? '— Listeden personel seçin —' : 'Tüm uygun kişiler seçildi';
    select.appendChild(ilk);

    gizli.forEach(row => {
      const k = kisiBilgisi(row);
      const opt = document.createElement('option');
      opt.value = row.dataset.mdfRosterIndex;
      opt.textContent = k.ad + (k.detay ? ' · ' + k.detay : '');
      select.appendChild(opt);
    });

    select.disabled = gizli.length === 0;
    select.addEventListener('change', function(){
      if(this.value === '') return;
      const index = Number(this.value);
      this.value = '';
      if(window.MaasDegisiklikFormu && typeof window.MaasDegisiklikFormu._satirGizleAcTikla === 'function'){
        window.MaasDegisiklikFormu._satirGizleAcTikla(harf, index);
      }
    });

    label.appendChild(select);
    wrap.appendChild(label);

    if(acik.length){
      const sayac = document.createElement('span');
      sayac.className = 'mdf-personel-secici-sayac';
      sayac.textContent = acik.length + ' kişi seçili';
      sayac.style.cssText = 'font-size:11px;opacity:.7;';
      wrap.appendChild(sayac);
    }

    const baslik = bolum.querySelector('.mdf-bolum-baslik');
    if(baslik) baslik.insertAdjacentElement('afterend', wrap);
    else bolum.prepend(wrap);
  }

  function uygula(){
    const panel = document.getElementById('mdfFormPanel');
    if(!panel) return;
    panel.querySelectorAll('.mdf-bolum').forEach(bolumuDuzenle);
  }

  function renderSonrasi(fn){
    return function(){
      const sonuc = fn.apply(this, arguments);
      requestAnimationFrame(uygula);
      return sonuc;
    };
  }

  function sar(){
    if(sarildi || !window.MaasDegisiklikFormu) return false;
    sarildi = true;
    const api = window.MaasDegisiklikFormu;

    ['ac','_satirGizleAcTikla','_satirEkleBCTikla','_satirSilBCTikla','_personelSecBC'].forEach(ad => {
      if(typeof api[ad] === 'function') api[ad] = renderSonrasi(api[ad]);
    });

    if(document.getElementById('mdfFormPanel')) requestAnimationFrame(uygula);
    return true;
  }

  if(!sar()){
    const timer = setInterval(function(){
      if(sar()) clearInterval(timer);
    },100);
  }
})();
