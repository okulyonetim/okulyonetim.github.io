/* ============================================================
   NAVİGASYON DÜZENİ EDİTÖRÜ (sadece admin)
   ============================================================
   Alt navigasyon menüsündeki TÜM grupları (built-in + özel) ve
   öğelerini yönetir: sıralama, gizleme, ad/renk (built-in gruplar
   için), gruplar arası öğe taşıma, yeni öğe ekleme.

   Veri kaynağı: js/alt-navigasyon.js tarafından yönetilen
   oy_navDuzeni/ayarlar dokümanı (bkz. js/firebase-init.js COL.navDuzeni
   yorumundaki şema). Bu dosya sadece o dokümanı okuyup/yazıyor;
   gerçek birleştirme mantığı alt-navigasyon.js'de.

   ÖNEMLİ (tasarım kararı): Bir bölüm (grup içindeki ana liste ya da
   altGrup) yeniden sıralandığında, o bölümdeki TÜM öğeler için sira
   yeniden yazılır — sadece taşınan öğe için değil. Böylece dokunulmamış
   öğelerin "asıl sıra"sıyla çakışma ihtimali ortadan kalkar.

   Bu ekran YALNIZCA AKTIF_KULLANICI.admin === true olan gerçek admin
   hesabına görünür (rol bazlı 'duzenle' yetkisi YETERLİ DEĞİL) —
   çünkü bu ekran built-in menü yapısını TÜM kullanıcılar için
   değiştirir. Kişisel renk özelleştirmesi (mevcut _menuKartDuzenle,
   sadece cihaza özel) bu ekrandan bağımsız, herkes için çalışmaya
   devam eder.
   ============================================================ */

function renderNavDuzeniYonetim(){
  const bolum = document.getElementById('navDuzeniYonetimBolumu');
  if(!bolum) return;
  const adminMi = typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin === true;
  bolum.style.display = adminMi ? '' : 'none';
  if(!adminMi) return;
  _ndListesiCiz();
}

/* ---- Firestore okuma/yazma yardımcıları ---- */
function _ndVerisiOku(){
  const kaynak = (typeof window._navDuzeniVerisiGetir === 'function') ? (window._navDuzeniVerisiGetir() || {}) : {};
  return {
    grupSirasi: (kaynak.grupSirasi || []).slice(),
    grupGizli: Object.assign({}, kaynak.grupGizli || {}),
    grupOverride: JSON.parse(JSON.stringify(kaynak.grupOverride || {})),
    ogeYerlesimi: JSON.parse(JSON.stringify(kaynak.ogeYerlesimi || {})),
    ogeGizli: Object.assign({}, kaynak.ogeGizli || {}),
    ekOgeler: JSON.parse(JSON.stringify(kaynak.ekOgeler || [])),
  };
}
function _ndKaydet(nd, basariMesaji){
  if(typeof db === 'undefined' || typeof COL === 'undefined' || !COL.navDuzeni){
    toast('Firestore bağlantısı bulunamadı.');
    return;
  }
  nd.guncellemeTarihi = new Date().toISOString();
  db.collection(COL.navDuzeni).doc('ayarlar').set(nd).then(() => {
    if(typeof window._navDuzeniYukle === 'function') window._navDuzeniYukle();
    _ndListesiCiz();
    if(basariMesaji) toast(basariMesaji);
  }).catch(e => toast('Kaydetme hatası: ' + e.message));
}

function _ndTumListeyiGetir(){
  return (typeof window._navDuzeniTumGruplarGetir === 'function') ? window._navDuzeniTumGruplarGetir() : [];
}

/* ---- Ana liste (grup kartları) ---- */
function _ndListesiCiz(){
  const kap = document.getElementById('navDuzeniGrupListesi');
  if(!kap) return;
  const liste = _ndTumListeyiGetir();
  kap.innerHTML = '';
  if(!liste.length){
    kap.innerHTML = '<p class="empty-state">Grup bulunamadı.</p>';
    return;
  }
  liste.forEach((g, idx) => {
    const kart = document.createElement('div');
    kart.style.cssText = 'border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-bottom:8px;background:var(--bg-card);' +
      (g._gizliMi ? 'opacity:0.55;' : '');

    const ust = document.createElement('div');
    ust.style.cssText = 'display:flex;align-items:center;gap:8px;';

    const renkNokta = document.createElement('span');
    renkNokta.style.cssText = 'width:14px;height:14px;border-radius:50%;flex-shrink:0;display:inline-block;background:' + escapeHtml(g.renk || '#607D8B') + ';';

    const adText = document.createElement('strong');
    adText.style.cssText = 'flex:1;font-size:13.5px;';
    const toplamOge = (g.ogeler||[]).length + (g.altGrup ? (g.altGrup.ogeler||[]).length : 0);
    adText.textContent = g.ad + (g._gizliMi ? ' (gizli)' : '') + '  ·  ' + toplamOge + ' öğe';

    ust.appendChild(renkNokta);
    ust.appendChild(adText);
    kart.appendChild(ust);

    const butonlar = document.createElement('div');
    butonlar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;';

    const yukselBtn = _ndMiniBtn('⬆', idx === 0);
    yukselBtn.onclick = () => _ndGrupTasi(liste, idx, -1);
    const inBtn = _ndMiniBtn('⬇', idx === liste.length - 1);
    inBtn.onclick = () => _ndGrupTasi(liste, idx, 1);

    const gizleBtn = _ndMiniBtn(g._gizliMi ? '👁 Göster' : '🙈 Gizle');
    gizleBtn.onclick = () => _ndGrupGizleDegistir(g.anahtar, !g._gizliMi);

    const duzenleBtn = _ndMiniBtn('✏️ Ad/Renk');
    duzenleBtn.onclick = () => {
      if(g._ozelId){ if(typeof ozelMenuGrupDuzenle === 'function') ozelMenuGrupDuzenle(g._ozelId); }
      else _ndGrupAdRenkModalAc(g);
    };

    const ogelerBtn = _ndMiniBtn('📋 Öğeleri Yönet (' + toplamOge + ')');
    ogelerBtn.onclick = () => _ndOgeleriYonetAc(g.anahtar);

    [yukselBtn, inBtn, gizleBtn, duzenleBtn, ogelerBtn].forEach(b => butonlar.appendChild(b));
    kart.appendChild(butonlar);
    kap.appendChild(kart);
  });
}

function _ndMiniBtn(metin, devreDisi){
  const b = document.createElement('button');
  b.className = 'btn btn-ghost btn-sm';
  b.textContent = metin;
  b.style.cssText = 'font-size:12px;padding:4px 8px;';
  if(devreDisi){ b.disabled = true; b.style.opacity = '0.35'; }
  return b;
}

/* ---- Grup sırasını değiştir (yukarı/aşağı) ----
   Tüm mevcut sırayı (gizli gruplar dahil, göründükleri konumda) alıp
   iki komşuyu yer değiştirir, tamamını grupSirasi olarak kaydeder. */
function _ndGrupTasi(liste, idx, yon){
  const hedef = idx + yon;
  if(hedef < 0 || hedef >= liste.length) return;
  const siraliAnahtarlar = liste.map(g => g.anahtar);
  const tmp = siraliAnahtarlar[idx];
  siraliAnahtarlar[idx] = siraliAnahtarlar[hedef];
  siraliAnahtarlar[hedef] = tmp;
  const nd = _ndVerisiOku();
  nd.grupSirasi = siraliAnahtarlar;
  _ndKaydet(nd);
}

function _ndGrupGizleDegistir(anahtar, gizliOlacak){
  const nd = _ndVerisiOku();
  if(gizliOlacak) nd.grupGizli[anahtar] = true;
  else delete nd.grupGizli[anahtar];
  _ndKaydet(nd, gizliOlacak ? 'Grup gizlendi.' : 'Grup tekrar görünür.');
}

/* ---- Built-in grup ad/renk düzenleme ---- */
function _ndGrupAdRenkModalAc(g){
  const html = `
    <div class="form-group">
      <label>Grup Adı</label>
      <input type="text" id="ndGrupAdInput" value="${escapeHtml(g.ad)}" style="width:100%;">
    </div>
    <div class="form-group">
      <label>Renk</label>
      <div style="display:flex;gap:10px;align-items:center;">
        <input type="color" id="ndGrupRenkInput" value="${escapeHtml(g.renk || '#607D8B')}">
        <input type="text" id="ndGrupRenkMetin" value="${escapeHtml(g.renk || '#607D8B')}" style="flex:1;">
      </div>
    </div>
  `;
  modalAc('Grubu Düzenle', html, () => {
    const yeniAd = document.getElementById('ndGrupAdInput').value.trim();
    const yeniRenk = document.getElementById('ndGrupRenkMetin').value.trim() || document.getElementById('ndGrupRenkInput').value;
    if(!yeniAd){ toast('Grup adı boş olamaz.'); return; }
    const nd = _ndVerisiOku();
    const varsayilan = (typeof window._navDuzeniKatalogGetir === 'function')
      ? window._navDuzeniKatalogGetir().find(k => k.anahtar === g.anahtar)
      : null;
    if(varsayilan && varsayilan.ad === yeniAd && varsayilan.renk.toLowerCase() === yeniRenk.toLowerCase()){
      delete nd.grupOverride[g.anahtar]; // varsayılana döndüyse override'ı temizle
    } else {
      nd.grupOverride[g.anahtar] = { ad: yeniAd, renk: yeniRenk };
    }
    _ndKaydet(nd, 'Grup güncellendi.');
    modalKapat();
  }, null, 'Kaydet');
  // Renk seçici ile metin kutusunu senkronize et
  setTimeout(() => {
    const renkInput = document.getElementById('ndGrupRenkInput');
    const renkMetin = document.getElementById('ndGrupRenkMetin');
    if(renkInput && renkMetin){
      renkInput.addEventListener('input', () => { renkMetin.value = renkInput.value; });
    }
  }, 0);
}

/* ---- Öğeleri Yönet modalı (tek bir grup için) ---- */
function _ndOgeleriYonetAc(grupAnahtari){
  const liste = _ndTumListeyiGetir();
  const g = liste.find(x => x.anahtar === grupAnahtari);
  if(!g) return;

  const html = `
    <p style="color:var(--ink-muted);font-size:12.5px;margin-bottom:10px;">
      "${escapeHtml(g.ad)}" grubundaki öğeleri sıralayın, gizleyin, başka gruba taşıyın ya da yeni öğe ekleyin.
    </p>
    <div id="ndOgeAnaListe" style="margin-bottom:14px;"></div>
    ${g.altGrup ? `<h4 style="font-size:13px;margin:10px 0 6px;">${escapeHtml(g.altGrup.ad)}</h4><div id="ndOgeAltListe" style="margin-bottom:14px;"></div>` : ''}
    <button class="btn btn-amber btn-sm" id="ndYeniOgeEkleBtn" style="margin-top:6px;">➕ Yeni Öğe Ekle</button>
  `;
  modalAc('Öğeleri Yönet', html, null, null, 'Kaydet');
  document.getElementById('modalKaydetBtn').style.display = 'none'; // bu modalda anlık kaydetme var, ayrı "Kaydet" gerekmiyor

  _ndOgeAltListeCiz(grupAnahtari, 'ana');
  if(g.altGrup) _ndOgeAltListeCiz(grupAnahtari, 'alt');

  document.getElementById('ndYeniOgeEkleBtn').onclick = () => _ndYeniOgeModalAc(g);
}

function _ndOgeAltListeCiz(grupAnahtari, bolum){
  const kapId = bolum === 'alt' ? 'ndOgeAltListe' : 'ndOgeAnaListe';
  const kap = document.getElementById(kapId);
  if(!kap) return;
  const liste = _ndTumListeyiGetir();
  const g = liste.find(x => x.anahtar === grupAnahtari);
  if(!g) return;
  const ogeler = bolum === 'alt' ? (g.altGrup ? g.altGrup.ogeler : []) : g.ogeler;

  kap.innerHTML = '';
  if(!ogeler.length){
    kap.innerHTML = '<p class="empty-state" style="font-size:12px;">Öğe yok.</p>';
    return;
  }
  ogeler.forEach((o, idx) => {
    const satir = document.createElement('div');
    satir.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid var(--border);' +
      (o._gizliMi ? 'opacity:0.5;' : '');

    const ad = document.createElement('span');
    ad.style.cssText = 'flex:1;font-size:13px;';
    ad.textContent = o.ad + (o._gizliMi ? ' (gizli)' : '');
    satir.appendChild(ad);

    const yukselBtn = _ndMiniBtn('⬆', idx === 0);
    yukselBtn.onclick = () => _ndOgeSiraDegistir(liste, grupAnahtari, bolum, idx, -1);
    const inBtn = _ndMiniBtn('⬇', idx === ogeler.length - 1);
    inBtn.onclick = () => _ndOgeSiraDegistir(liste, grupAnahtari, bolum, idx, 1);
    const gizleBtn = _ndMiniBtn(o._gizliMi ? '👁' : '🙈');
    gizleBtn.onclick = () => _ndOgeGizleDegistir(o.anahtar, !o._gizliMi, grupAnahtari, bolum);

    const tasiSel = document.createElement('select');
    tasiSel.style.cssText = 'font-size:11px;max-width:110px;';
    tasiSel.appendChild(new Option('Taşı...', ''));
    liste.forEach(hedefG => {
      tasiSel.appendChild(new Option(hedefG.ad, hedefG.anahtar));
    });
    tasiSel.onchange = () => {
      if(!tasiSel.value) return;
      _ndOgeTasi(o.anahtar, tasiSel.value, grupAnahtari, bolum);
    };

    [yukselBtn, inBtn, gizleBtn, tasiSel].forEach(el => satir.appendChild(el));
    kap.appendChild(satir);
  });
}

/* Bir bölümdeki (ana ya da alt) TÜM öğeler için sira'yı yeniden yazar
   (yalnızca yer değiştiren ikili için değil) — asilSira çakışmasını
   önlemek için bkz. dosya başındaki not. */
function _ndOgeSiraDegistir(liste, grupAnahtari, bolum, idx, yon){
  const g = liste.find(x => x.anahtar === grupAnahtari);
  const ogeler = bolum === 'alt' ? g.altGrup.ogeler : g.ogeler;
  const hedef = idx + yon;
  if(hedef < 0 || hedef >= ogeler.length) return;
  const siraliAnahtarlar = ogeler.map(o => o.anahtar);
  const tmp = siraliAnahtarlar[idx];
  siraliAnahtarlar[idx] = siraliAnahtarlar[hedef];
  siraliAnahtarlar[hedef] = tmp;

  const nd = _ndVerisiOku();
  siraliAnahtarlar.forEach((anahtar, i) => {
    nd.ogeYerlesimi[anahtar] = { grup: grupAnahtari, altGrupMu: bolum === 'alt', sira: i };
  });
  _ndKaydetSessiz(nd, () => { _ndOgeAltListeCiz(grupAnahtari, bolum); });
}

function _ndOgeGizleDegistir(anahtar, gizliOlacak, grupAnahtari, bolum){
  const nd = _ndVerisiOku();
  if(gizliOlacak) nd.ogeGizli[anahtar] = true;
  else delete nd.ogeGizli[anahtar];
  _ndKaydetSessiz(nd, () => { _ndOgeAltListeCiz(grupAnahtari, bolum); });
}

/* Öğeyi başka bir gruba taşır — hedef grubun ana listesinin SONUNA ekler
   (mevcut hedef öğe sayısı kadar sira vererek), kaynak bölümdeki diğer
   öğelere dokunmaz. */
function _ndOgeTasi(anahtar, hedefGrupAnahtari, kaynakGrupAnahtari, kaynakBolum){
  const liste = _ndTumListeyiGetir();
  const hedefG = liste.find(x => x.anahtar === hedefGrupAnahtari);
  if(!hedefG) return;
  const mevcutSayi = (hedefG.ogeler || []).length;
  const nd = _ndVerisiOku();
  nd.ogeYerlesimi[anahtar] = { grup: hedefGrupAnahtari, altGrupMu: false, sira: mevcutSayi };
  _ndKaydetSessiz(nd, () => {
    toast('Öğe taşındı: ' + hedefG.ad);
    _ndOgeAltListeCiz(kaynakGrupAnahtari, kaynakBolum);
    _ndOgeAltListeCiz(hedefGrupAnahtari, 'ana');
    _ndListesiCiz();
  });
}

/* Modal açık kalırken (Öğeleri Yönet penceresi) sessizce kaydet — her
   tıklamada modalı kapatıp açmamak için _ndKaydet'ten ayrı, ama aynı
   Firestore yazma + global yeniden-yükleme mantığını kullanır. */
function _ndKaydetSessiz(nd, sonrasi){
  if(typeof db === 'undefined' || typeof COL === 'undefined' || !COL.navDuzeni) return;
  nd.guncellemeTarihi = new Date().toISOString();
  db.collection(COL.navDuzeni).doc('ayarlar').set(nd).then(() => {
    if(typeof window._navDuzeniYukle === 'function') window._navDuzeniYukle();
    if(sonrasi) setTimeout(sonrasi, 250); // _navDuzeniYukle Firestore'dan tekrar okuduğu için kısa gecikme
    _ndListesiCiz();
  }).catch(e => toast('Kaydetme hatası: ' + e.message));
}

/* ---- Yeni öğe ekleme ----
   Built-in gruba: nd.ekOgeler'e yeni bir kayıt ekler (bkz. şema notu,
   js/firebase-init.js). Özel gruba: mevcut "Özel Menü Grupları" akışı
   zaten kendi öğe ekleme arayüzüne sahip — oraya yönlendirilir. */
function _ndYeniOgeModalAc(g){
  if(g._ozelId){
    modalKapat();
    if(typeof ozelMenuGrupDuzenle === 'function') ozelMenuGrupDuzenle(g._ozelId);
    toast('Bu özel gruba öğe eklemek için "Öğeler" bölümünü kullanın.');
    return;
  }
  const sekmeSecici = (typeof _sekmeSeciciOlustur === 'function') ? _sekmeSeciciOlustur('') : null;
  const html = `
    <div class="form-group">
      <label>Öğe Adı</label>
      <input type="text" id="ndYeniOgeAd" style="width:100%;" placeholder="Örn: Kulüp Formu">
    </div>
    <div class="form-group">
      <label>Sekme</label>
      <div id="ndYeniOgeSekmeYer"></div>
    </div>
  `;
  modalAc('Yeni Öğe Ekle — ' + g.ad, html, () => {
    const ad = document.getElementById('ndYeniOgeAd').value.trim();
    const sekmeAd = (typeof _omSekmeDegeriAl === 'function')
      ? _omSekmeDegeriAl(document.getElementById('ndYeniOgeSekmeYer'))
      : '';
    if(!ad){ toast('Öğe adı gerekli.'); return; }
    if(!sekmeAd){ toast('Bir sekme seçin.'); return; }
    const nd = _ndVerisiOku();
    const anahtar = 'ek_' + Date.now().toString(36) + Math.floor(Math.random()*1000);
    nd.ekOgeler.push({ anahtar, ad, sekmeAd, grup: g.anahtar, altGrupMu: false });
    _ndKaydet(nd, 'Öğe eklendi.');
    modalKapat();
  }, null, 'Ekle');
  if(sekmeSecici){
    const yer = document.getElementById('ndYeniOgeSekmeYer');
    if(yer) yer.appendChild(sekmeSecici);
  }
}

/* ---- "Öğeleri Yönet" modalını kapatınca ana listeyi (toplam öğe
   sayıları değişmiş olabilir) tazele. Global modalKapat() zaten var;
   burada sadece bu ekrana özel ek bir davranış gerekmiyor çünkü her
   işlem zaten anlık kaydediyor ve _ndListesiCiz()'i tetikliyor. ---- */
