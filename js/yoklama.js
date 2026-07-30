/* =============================================================
   js/yoklama.js
   ÖĞRENCİ YOKLAMA — UI. Aynı desende (bkz. js/sinav-sonuclari.js):
   dinamik tam ekran overlay, z-index:9400 (AltNav menüsünün z-index:9500
   ALTINDA kalır — menü üstüne binebilsin), açılışta/kapanışta
   _pullToRefreshAyarla(false/true), var(--bg-app)/var(--bg-sidebar)/
   var(--ink-on-dark) ile açık/koyu temada kontrast garanti.
   ============================================================= */
let _yokAcikSinifId = null;
let _yokAcikTarih = null;
let _yokDinleyici = null;
let _yokAktifBelge = null;

/* ---------- Yoklama Gir ekranı ---------- */
function yoklamaAc(){
  if(typeof gorebilir === 'function' && !gorebilir('yoklama')){ toast('Bu işlem için yetkiniz yok.'); return; }
  const ov = document.createElement('div');
  ov.id = 'yokOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9400;background:var(--bg-app);overflow-y:auto;overscroll-behavior:contain;';
  document.body.appendChild(ov);
  document.body.classList.add('modal-open');
  if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

  const adminMi = typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin === true;
  const sinifSecenekleri = (typeof siniflar !== 'undefined' ? siniflar : [])
    .slice().sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr'))
    .map(s => `<option value="${s.id}">${escapeHtml(s.ad||'')}</option>`).join('');

  ov.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg-sidebar);color:var(--ink-on-dark);position:sticky;top:0;z-index:2;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-ghost btn-sm" onclick="yoklamaKapat()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">← Kapat</button>
      <div style="font-weight:700;font-size:14px;">📋 Öğrenci Yoklama</div>
      ${adminMi ? `<button class="btn btn-ghost btn-sm" onclick="yoklamaDevamsizlarAc()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">📵 Bugünün Devamsızları</button>` : '<span></span>'}
    </div>
    <div style="padding:14px 16px 90px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
        <div class="form-group" style="flex:1;min-width:160px;margin:0;">
          <label>Sınıf</label>
          <select id="yokSinifSec" style="width:100%;" onchange="_yokSinifTarihDegisti()">
            <option value="">Sınıf seçin…</option>
            ${sinifSecenekleri}
          </select>
        </div>
        <div class="form-group" style="flex:1;min-width:140px;margin:0;">
          <label>Tarih</label>
          <input type="date" id="yokTarihSec" style="width:100%;" onchange="_yokSinifTarihDegisti()">
        </div>
      </div>
      <div id="yokOgrenciListesi"></div>
    </div>
  `;
  document.getElementById('yokTarihSec').value = (typeof YoklamaService !== 'undefined') ? YoklamaService.bugununTarihi() : '';
  _yokSinifTarihDegisti();
}

function yoklamaKapat(){
  _yokDinleyiciKaldir();
  const ov = document.getElementById('yokOverlay');
  if(ov) ov.remove();
  _yokAcikSinifId = null;
  _yokAcikTarih = null;
  document.body.classList.remove('modal-open');
  if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
}

function _yokDinleyiciKaldir(){
  if(_yokDinleyici){ _yokDinleyici(); _yokDinleyici = null; }
}

function _yokSinifTarihDegisti(){
  const sinifId = document.getElementById('yokSinifSec').value;
  const tarih = document.getElementById('yokTarihSec').value;
  _yokDinleyiciKaldir();
  _yokAktifBelge = null;
  const govde = document.getElementById('yokOgrenciListesi');
  if(!sinifId || !tarih){
    govde.innerHTML = '<p class="empty-state">Sınıf ve tarih seçin.</p>';
    return;
  }
  _yokAcikSinifId = sinifId;
  _yokAcikTarih = tarih;
  govde.innerHTML = '<p class="empty-state">Yükleniyor…</p>';
  _yokDinleyici = YoklamaService.dinle(sinifId, tarih, belge => {
    _yokAktifBelge = belge;
    _yokListesiCiz();
  }, () => { govde.innerHTML = '<p class="empty-state">Yüklenemedi.</p>'; });
}

function _yokListesiCiz(){
  const govde = document.getElementById('yokOgrenciListesi');
  if(!govde || !_yokAcikSinifId) return;
  const ogrenciler = (typeof veliler !== 'undefined' ? veliler : [])
    .filter(v => v.sinifId === _yokAcikSinifId)
    .slice().sort((a,b)=>(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));
  if(!ogrenciler.length){
    govde.innerHTML = '<p class="empty-state">Bu sınıfta kayıtlı öğrenci bulunamadı.</p>';
    return;
  }
  const kayitlar = (_yokAktifBelge && _yokAktifBelge.kayitlar) || {};
  govde.innerHTML = ogrenciler.map(o => {
    const durum = kayitlar[o.id];
    const butonlar = YoklamaService.DURUMLAR.map(d => {
      const secili = durum === d;
      const renk = YoklamaService.DURUM_RENKLERI[d];
      // DÜZELTME (kontrast): seçili buton dolu renk + beyaz metin; seçili
      // OLMAYAN buton ise sadece ince renkli kenarlık + kendi rengi metin
      // (koyu modda da okunaklı kalsın diye sabit koyu/açık arka plan
      // yerine tema değişkenlerine bağlı var(--bg-card) kullanılıyor).
      const stil = secili
        ? `background:${renk};color:#fff;border:1px solid ${renk};font-weight:700;`
        : `background:var(--bg-card);color:${renk};border:1px solid ${renk};font-weight:600;`;
      return `<button type="button" style="${stil}padding:6px 10px;border-radius:8px;font-size:12.5px;flex:1;min-width:56px;" onclick="_yokDurumIsaretle('${o.id}','${d}')">${YoklamaService.DURUM_ADLARI[d]}</button>`;
    }).join('');
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;font-size:13.5px;font-weight:600;color:var(--ink);">${escapeHtml(o.ogrenciAdi||'')}</div>
        <div style="display:flex;gap:6px;flex:2;min-width:220px;">${butonlar}</div>
      </div>`;
  }).join('');
}

function _yokDurumIsaretle(ogrenciId, durum){
  if(!_yokAcikSinifId || !_yokAcikTarih) return;
  YoklamaService.ogrenciDurumKaydet(_yokAcikSinifId, _yokAcikTarih, ogrenciId, durum)
    .catch(e => { if(e.message !== 'yetkisiz') toast('Hata: ' + e.message); });
  // Not: ekranı ayrıca elle güncellemiyoruz — dinle() zaten canlı dinleyici,
  // Firestore'dan yazma onaylanır onaylanmaz _yokListesiCiz() tekrar çağrılır.
}

/* ---------- Bugünün Devamsızları (admin, WhatsApp) ---------- */
async function yoklamaDevamsizlarAc(){
  const ov = document.createElement('div');
  ov.id = 'yokDevamsizOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9410;background:var(--bg-app);overflow-y:auto;overscroll-behavior:contain;';
  document.body.appendChild(ov);
  if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

  ov.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg-sidebar);color:var(--ink-on-dark);position:sticky;top:0;z-index:2;">
      <button class="btn btn-ghost btn-sm" onclick="yoklamaDevamsizlarKapat()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">← Kapat</button>
      <div style="font-weight:700;font-size:14px;">📵 Bugünün Devamsızları</div>
      <span></span>
    </div>
    <div id="yokDevamsizGovde" style="padding:14px 16px 90px;"><p class="empty-state">Yükleniyor…</p></div>
  `;
  try{
    const tarih = YoklamaService.bugununTarihi();
    const satirlar = await YoklamaService.gununDevamsizlariGetir(tarih);
    _yokDevamsizListesiCiz(satirlar);
  }catch(e){
    document.getElementById('yokDevamsizGovde').innerHTML = `<p class="empty-state">${e.message==='yetkisiz'?'Bu ekranı görüntüleme yetkiniz yok.':'Yüklenemedi: '+e.message}</p>`;
  }
}
function yoklamaDevamsizlarKapat(){
  const ov = document.getElementById('yokDevamsizOverlay');
  if(ov) ov.remove();
  if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
}
function _yokDevamsizListesiCiz(satirlar){
  const govde = document.getElementById('yokDevamsizGovde');
  if(!govde) return;
  if(!satirlar.length){
    govde.innerHTML = '<p class="empty-state">Bugün için Yok/Geç işaretlenen öğrenci yok.</p>';
    return;
  }
  govde.innerHTML = satirlar.map((s, i) => {
    const link = YoklamaService.whatsappLinkOlustur(s);
    const renk = YoklamaService.DURUM_RENKLERI[s.durum];
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);${s.gonderildi?'opacity:0.55;':''}">
        <span style="width:10px;height:10px;border-radius:50%;background:${renk};flex-shrink:0;"></span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13.5px;font-weight:700;color:var(--ink);">${escapeHtml(s.ogrenciAdi)} <span style="font-weight:400;color:var(--ink-muted);">— ${escapeHtml(s.sinifAdi)} · ${YoklamaService.DURUM_ADLARI[s.durum]}</span></div>
          <div style="font-size:12px;color:var(--ink-muted);">${escapeHtml(s.veliAdi || 'Veli bilgisi yok')}${s.telefon ? ' · ' + escapeHtml(s.telefon) : ''}</div>
        </div>
        ${link
          ? `<button class="btn btn-ghost btn-sm" onclick="_yokWhatsappAc(${i},'${s.sinifId}','${s.tarih}','${s.ogrenciId}')" style="background:#25D366;color:#fff;border:1px solid #25D366;font-weight:700;flex-shrink:0;">📱 WhatsApp'ta Aç</button>`
          : `<span style="font-size:12px;color:var(--ink-muted);flex-shrink:0;">Telefon yok/hatalı</span>`}
      </div>`;
  }).join('');
  window._yokDevamsizSatirlari = satirlar; // _yokWhatsappAc erişebilsin diye
}
function _yokWhatsappAc(i, sinifId, tarih, ogrenciId){
  const satirlar = window._yokDevamsizSatirlari || [];
  const s = satirlar[i];
  if(!s) return;
  const link = YoklamaService.whatsappLinkOlustur(s);
  if(!link) return;
  window.open(link, '_blank');
  YoklamaService.mesajGonderildiIsaretle(sinifId, tarih, ogrenciId)
    .then(() => { s.gonderildi = true; _yokDevamsizListesiCiz(satirlar); })
    .catch(() => {});
}
