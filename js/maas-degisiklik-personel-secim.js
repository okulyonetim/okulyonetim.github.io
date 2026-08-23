/* Maaş Değişikliği — D-H personel seçimini sadeleştir.
   Mevcut state, A-H çıktı formatı ve MaasDegisiklikFormu işlevleri korunur.
   Yalnız D-H bölümlerindeki tüm roster satırlarını gizleyip açılır seçici sunar. */
(function(){
  'use strict';

  const BOLUM_HARFLERI = new Set(['D','E','F','G','H']);
  let sarildi = false;

  function stilEkle(){
    if(document.getElementById('mdfPersonelSecimStyle')) return;
    const style = document.createElement('style');
    style.id = 'mdfPersonelSecimStyle';
    style.textContent = `
      #mdfOverlay .mdf-personel-secim-kutusu{
        display:flex; flex-direction:column; gap:6px;
        margin:0 0 10px; padding:10px;
        border:1px solid var(--border,#d8e2dd);
        border-radius:14px;
        background:rgba(23,109,80,.06);
      }
      #mdfOverlay .mdf-personel-secim-kutusu label{
        font-size:11.5px; font-weight:800; color:#176d50;
      }
      #mdfOverlay .mdf-personel-secim-kutusu select{
        width:100%; min-height:46px; padding:0 38px 0 12px;
        border-radius:12px; border:1px solid var(--border,#c9ddd5);
        background:var(--bg-card,#fff); color:var(--ink,#17352c);
        font-size:13px; font-weight:700; box-sizing:border-box;
      }
      #mdfOverlay .mdf-roster-satir.mdf-gizli-satir{ display:none !important; }
      #mdfOverlay .mdf-roster-satir:not(.mdf-gizli-satir){
        padding:12px !important; margin-top:8px !important;
      }
      #mdfOverlay .mdf-roster-satir:not(.mdf-gizli-satir) .mdf-goster-gizle-btn{
        order:3; margin-left:auto; min-height:34px !important;
        background:transparent !important; color:var(--ink-muted,#64748b) !important;
        border-color:var(--border,#d8e2dd) !important;
      }
      html[data-theme="dark"] #mdfOverlay .mdf-personel-secim-kutusu{
        background:#102c22; border-color:#28483c;
      }
      html[data-theme="dark"] #mdfOverlay .mdf-personel-secim-kutusu label{ color:#58c798; }
      html[data-theme="dark"] #mdfOverlay .mdf-personel-secim-kutusu select{
        background:#0f1722; border-color:#2d394a; color:#eef4f1;
      }
    `;
    document.head.appendChild(style);
  }

  function bolumHarfi(bolum){
    const baslik = bolum.querySelector('.mdf-bolum-baslik');
    const m = (baslik?.textContent || '').trim().match(/^([A-H])\)/);
    return m ? m[1] : '';
  }

  function satirIndexi(row){
    const btn = row.querySelector('.mdf-goster-gizle-btn');
    const kod = btn?.getAttribute('onclick') || '';
    const m = kod.match(/_satirGizleAcTikla\('([D-H])',\s*(\d+)\)/);
    return m ? Number(m[2]) : -1;
  }

  function kisiEtiketi(row){
    const ad = (row.querySelector('.mdf-roster-kisi strong')?.textContent || '').trim();
    const bilgi = (row.querySelector('.mdf-roster-kisi span')?.textContent || '').trim();
    return bilgi ? `${ad} — ${bilgi}` : ad;
  }

  function secimKutusuOlustur(bolum, harf, gizliSatirlar){
    const kutu = document.createElement('div');
    kutu.className = 'mdf-personel-secim-kutusu';

    const label = document.createElement('label');
    label.textContent = 'Personel seç';

    const select = document.createElement('select');
    select.setAttribute('aria-label', `${harf} bölümü personel seçimi`);

    const varsayilan = document.createElement('option');
    varsayilan.value = '';
    varsayilan.textContent = gizliSatirlar.length ? '— Listeden personel seçin —' : 'Tüm uygun personel eklendi';
    select.appendChild(varsayilan);

    gizliSatirlar.forEach(row => {
      const idx = satirIndexi(row);
      if(idx < 0) return;
      const option = document.createElement('option');
      option.value = String(idx);
      option.textContent = kisiEtiketi(row);
      select.appendChild(option);
    });

    if(!gizliSatirlar.length) select.disabled = true;

    select.addEventListener('change', function(){
      if(this.value === '') return;
      const idx = Number(this.value);
      const hedef = gizliSatirlar.find(r => satirIndexi(r) === idx);
      const btn = hedef?.querySelector('.mdf-goster-gizle-btn');
      if(btn){
        btn.click();
        requestAnimationFrame(uygula);
      }
    });

    kutu.append(label, select);
    return kutu;
  }

  function uygula(){
    const panel = document.getElementById('mdfFormPanel');
    if(!panel) return;
    stilEkle();

    panel.querySelectorAll('.mdf-personel-secim-kutusu').forEach(el => el.remove());

    panel.querySelectorAll('.mdf-bolum').forEach(bolum => {
      const harf = bolumHarfi(bolum);
      if(!BOLUM_HARFLERI.has(harf)) return;

      const satirlar = Array.from(bolum.querySelectorAll('.mdf-roster-satir'));
      const gizli = satirlar.filter(row => row.classList.contains('mdf-gizli-satir'));
      const aktif = satirlar.filter(row => !row.classList.contains('mdf-gizli-satir'));

      aktif.forEach(row => {
        const btn = row.querySelector('.mdf-goster-gizle-btn');
        if(btn){
          btn.textContent = 'Çıkar';
          btn.title = 'Bu personeli bölümden çıkar';
        }
      });

      const kutu = secimKutusuOlustur(bolum, harf, gizli);
      const baslik = bolum.querySelector('.mdf-bolum-baslik');
      const ilkSatir = satirlar[0];
      if(ilkSatir) bolum.insertBefore(kutu, ilkSatir);
      else if(baslik) baslik.insertAdjacentElement('afterend', kutu);
    });
  }

  function sar(){
    if(sarildi || !window.MaasDegisiklikFormu) return false;
    sarildi = true;

    const api = window.MaasDegisiklikFormu;
    const orijinalAc = api.ac;
    api.ac = function(){
      const sonuc = orijinalAc.apply(this, arguments);
      requestAnimationFrame(uygula);
      return sonuc;
    };

    const orijinalGizle = api._satirGizleAcTikla;
    api._satirGizleAcTikla = function(){
      const sonuc = orijinalGizle.apply(this, arguments);
      requestAnimationFrame(uygula);
      return sonuc;
    };

    return true;
  }

  if(!sar()){
    let deneme = 0;
    const timer = setInterval(() => {
      deneme++;
      if(sar() || deneme > 80) clearInterval(timer);
    }, 100);
  }
})();
