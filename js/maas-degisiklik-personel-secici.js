/* Maaş Değişikliği — D-H bölümlerinde açılır personel seçici.
   Mevcut MaasDegisiklikFormu state/yazdırma mantığına dokunmaz;
   yalnız render edilen gizli roster satırlarını seçiciye dönüştürür. */
(function(){
  'use strict';

  let planli = false;

  function metin(el){ return (el && el.textContent || '').replace(/\s+/g,' ').trim(); }

  function bolumHarfi(bolum){
    const baslik = bolum && bolum.querySelector('.mdf-bolum-baslik');
    const t = metin(baslik);
    const m = t.match(/^([D-H])\)/i);
    return m ? m[1].toUpperCase() : '';
  }

  function kisiBilgisi(row){
    const kisi = row.querySelector('.mdf-roster-kisi');
    if(!kisi) return { ad:'', detay:'' };
    const ad = metin(kisi.querySelector('strong'));
    const detay = metin(kisi.querySelector('span'));
    return { ad, detay };
  }

  function bolumuDuzenle(bolum){
    const harf = bolumHarfi(bolum);
    if(!harf) return;

    const rows = Array.from(bolum.querySelectorAll('.mdf-roster-satir'));
    if(!rows.length) return;

    // Eski eklenmiş seçiciyi kaldırıp güncel roster'a göre yeniden kur.
    const eski = bolum.querySelector(':scope > .mdf-personel-secici-wrap');
    if(eski) eski.remove();

    const gizli = rows.filter(r => r.classList.contains('mdf-gizli-satir'));
    const acik = rows.filter(r => !r.classList.contains('mdf-gizli-satir'));

    // Gizli roster satırları artık ekranda kart olarak görünmez.
    gizli.forEach(r => { r.style.display = 'none'; });

    // Açık satırlar seçilmiş personeldir. Buton yalnız kaldırma işlemi olur.
    acik.forEach(r => {
      r.style.display = '';
      const btn = r.querySelector('.mdf-goster-gizle-btn');
      if(btn){
        btn.textContent = '✕ Çıkar';
        btn.classList.add('mdf-secim-cikar');
        btn.setAttribute('aria-label','Personeli bu bölümden çıkar');
      }
    });

    const wrap = document.createElement('div');
    wrap.className = 'mdf-personel-secici-wrap';

    const label = document.createElement('label');
    label.className = 'mdf-personel-secici-label';
    label.textContent = 'Personel seç';

    const select = document.createElement('select');
    select.className = 'mdf-personel-secici';
    select.setAttribute('aria-label', harf + ' bölümü için personel seç');

    const ilk = document.createElement('option');
    ilk.value = '';
    ilk.textContent = gizli.length ? '— Listeden personel seçin —' : 'Tüm uygun kişiler seçildi';
    select.appendChild(ilk);

    gizli.forEach((row, i) => {
      const k = kisiBilgisi(row);
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = k.ad + (k.detay ? ' · ' + k.detay : '');
      select.appendChild(opt);
    });

    select.disabled = gizli.length === 0;
    select.addEventListener('change', function(){
      if(this.value === '') return;
      const row = gizli[Number(this.value)];
      const btn = row && row.querySelector('.mdf-goster-gizle-btn');
      this.value = '';
      if(btn) btn.click(); // mevcut state/render mekanizmasını aynen kullan.
    });

    label.appendChild(select);
    wrap.appendChild(label);

    if(acik.length){
      const sayac = document.createElement('span');
      sayac.className = 'mdf-personel-secici-sayac';
      sayac.textContent = acik.length + ' kişi seçili';
      wrap.appendChild(sayac);
    }

    const baslik = bolum.querySelector('.mdf-bolum-baslik');
    if(baslik) baslik.insertAdjacentElement('afterend', wrap);
    else bolum.prepend(wrap);
  }

  function uygula(){
    planli = false;
    const panel = document.getElementById('mdfFormPanel');
    if(!panel) return;
    panel.querySelectorAll('.mdf-bolum').forEach(bolumuDuzenle);
  }

  function planla(){
    if(planli) return;
    planli = true;
    requestAnimationFrame(uygula);
  }

  const mo = new MutationObserver(function(mutations){
    for(const m of mutations){
      if(m.type === 'childList') { planla(); break; }
    }
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });

  document.addEventListener('DOMContentLoaded', planla);
  planla();
})();
