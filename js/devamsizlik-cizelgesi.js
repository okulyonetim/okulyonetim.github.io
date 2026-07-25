/* ====================================================================
   js/devamsizlik-cizelgesi.js
   DEVAMSIZLIK ÇİZELGESİ MODÜLÜ — UI KATMANI
   (Excel benzeri aylık ızgara: hücre tıklama popup, Excel içe aktarma,
    A4 yatay yazdırma)

   Bu dosya SADECE render + DOM olayları içerir. İş kuralları
   DevamsizlikCizelgesiService'te, Firestore erişimi
   DevamsizlikCizelgesiRepository'de (bkz. js/core/).
   ==================================================================== */

let devamsizlikYil = new Date().getFullYear();
let devamsizlikAy = new Date().getMonth() + 1; // 1-12
let devamsizlikAyDokumani = null; // { yil, ay, ogretmenler:{...} } | null
let _devamsizlikDinleyici = null;

const DEVAMSIZLIK_KOD_BILGI = {
  'D': { etiket: 'Devamsız', renk: '#FF6B6B' },
  'İ': { etiket: 'İzinli',   renk: '#4D96FF' },
  'Y': { etiket: 'Yarım Gün',renk: '#FFD93D' },
  'R': { etiket: 'Raporlu',  renk: '#B983FF' },
  'T': { etiket: 'Tatil',    renk: '#FFFF99' },
  '+': { etiket: 'Görevlendirme (+)', renk: '#92D050' }
};
const DEVAMSIZLIK_DEVAM_RENK = '#C6EFCE';
const DEVAMSIZLIK_HAFTASONU_RENK = '#D9D9D9';
const AY_ADLARI_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

/* ---------------- Firestore bağlantısı ---------------- */

function devamsizlikBaglantilariKur(){
  _devamsizlikAyDinle();
}

function _devamsizlikAyDinle(){
  if(_devamsizlikDinleyici) _devamsizlikDinleyici();
  _devamsizlikDinleyici = DevamsizlikCizelgesiRepository.ayDinle(devamsizlikYil, devamsizlikAy, doc => {
    devamsizlikAyDokumani = doc;
    renderDevamsizlikCizelgesi();
  }, hataGoster);
}

function devamsizlikDonemDegistir(yil, ay){
  devamsizlikYil = Number(yil);
  devamsizlikAy = Number(ay);
  devamsizlikAyDokumani = null;
  renderDevamsizlikCizelgesi(); // yükleniyor durumu göster
  _devamsizlikAyDinle();
}

/* ---------------- Render ---------------- */

function renderDevamsizlikCizelgesi(){
  const hedef = document.getElementById('devamsizlikCizelgesiIcerik');
  if(!hedef) return;

  hedef.innerHTML = `
    ${_devamsizlikToolbarHtml()}
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--border);border-radius:10px;">
      ${devamsizlikAyDokumani ? _devamsizlikGridHtml() : _devamsizlikBosDurumHtml()}
    </div>
    ${devamsizlikAyDokumani ? _devamsizlikLegendHtml() : ''}
  `;
}

function _devamsizlikToolbarHtml(){
  const yilSecenekleri = [];
  const simdikiYil = new Date().getFullYear();
  for(let y = simdikiYil - 1; y <= simdikiYil + 1; y++) yilSecenekleri.push(y);

  return `
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px;">
      <select id="devamsizlik_yilSecici" style="padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--ink);"
        onchange="devamsizlikDonemDegistir(this.value, document.getElementById('devamsizlik_aySecici').value)">
        ${yilSecenekleri.map(y => `<option value="${y}" ${y===devamsizlikYil?'selected':''}>${y}</option>`).join('')}
      </select>
      <select id="devamsizlik_aySecici" style="padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--ink);"
        onchange="devamsizlikDonemDegistir(document.getElementById('devamsizlik_yilSecici').value, this.value)">
        ${AY_ADLARI_TR.map((ad,i) => `<option value="${i+1}" ${i+1===devamsizlikAy?'selected':''}>${ad}</option>`).join('')}
      </select>
      <button class="btn" onclick="document.getElementById('devamsizlikExcelInput').click()"><i data-lucide="upload"></i> Excel'den İçe Aktar</button>
      <input type="file" id="devamsizlikExcelInput" accept=".xlsx,.xlsm,.xls" style="display:none;" onchange="devamsizlikExceldenIceAktar(this.files[0]); this.value='';">
      ${devamsizlikAyDokumani ? `<button class="btn" onclick="devamsizlikYazdir()"><i data-lucide="printer"></i> Yazdır</button>` : ''}
      ${devamsizlikAyDokumani ? `<button class="btn" onclick="devamsizlikOtomatikTazele()"><i data-lucide="refresh-cw"></i> Otomatik Doldur/Tazele</button>` : ''}
    </div>
  `;
}

function _devamsizlikBosDurumHtml(){
  return `
    <div style="padding:40px 20px;text-align:center;color:var(--ink-muted);">
      <p>${AY_ADLARI_TR[devamsizlikAy-1]} ${devamsizlikYil} için henüz çizelge oluşturulmamış.</p>
      <button class="btn btn-primary" onclick="devamsizlikYeniAyOlustur()" style="margin-top:8px;">
        <i data-lucide="plus"></i> Öğretmen Listesinden Oluştur
      </button>
      <p style="font-size:12px;margin-top:10px;">veya yukarıdan bir Excel dosyası içe aktarabilirsiniz.</p>
    </div>
  `;
}

/* Okul Müdürü ve Müdür Yardımcısı her zaman listenin başında yer alır;
   geri kalanlar alfabetik sıralanır. */
function _devamsizlikRolOncelik(gorev){
  const g = (gorev || '').trim().toLocaleUpperCase('tr-TR');
  if(g === 'OKUL MÜDÜRÜ') return 0;
  if(g === 'MÜDÜR YARDIMCISI') return 1;
  return 2;
}

function _devamsizlikGridHtml(){
  const gunSayisi = DevamsizlikCizelgesiService.gunSayisi(devamsizlikYil, devamsizlikAy);
  const gunler = Array.from({length: gunSayisi}, (_, i) => i + 1);
  const ogretmenler = Object.values(devamsizlikAyDokumani.ogretmenler || {})
    .sort((a,b) => {
      const oncelikFarki = _devamsizlikRolOncelik(a.gorev) - _devamsizlikRolOncelik(b.gorev);
      if(oncelikFarki !== 0) return oncelikFarki;
      return (a.adSoyad||'').localeCompare(b.adSoyad||'', 'tr');
    });

  const gunAdlari = gunler.map(g => DevamsizlikCizelgesiService.GUN_KISA_ADLARI[DevamsizlikCizelgesiService.haftaGunu(devamsizlikYil, devamsizlikAy, g)]);

  const basligTr = `
    <tr>
      <th class="dc-col-no">No</th>
      <th class="dc-th-sabit dc-col-ad" style="text-align:left;">Adı Soyadı</th>
      <th class="dc-col-gorev" style="text-align:left;">Görevi</th>
      ${gunler.map(g => `<th style="min-width:26px;${DevamsizlikCizelgesiService.haftaSonuMu(devamsizlikYil,devamsizlikAy,g)?`background:${DEVAMSIZLIK_HAFTASONU_RENK};`:''}">${g}</th>`).join('')}
      <th class="dc-col-toplam-ilk" style="min-width:34px;">Toplam<br>Saat</th>
      <th style="min-width:40px;">Toplam<br>Devam</th>
      <th style="min-width:40px;">Toplam<br>Devamsız</th>
      <th class="dc-col-aciklama" style="text-align:left;">Açıklama</th>
    </tr>
    <tr>
      <th class="dc-col-no"></th>
      <th class="dc-th-sabit dc-col-ad"></th>
      <th class="dc-col-gorev"></th>
      ${gunAdlari.map((ad,i) => `<th style="font-size:10px;font-weight:500;${DevamsizlikCizelgesiService.haftaSonuMu(devamsizlikYil,devamsizlikAy,gunler[i])?`background:${DEVAMSIZLIK_HAFTASONU_RENK};`:''}">${ad}</th>`).join('')}
      <th class="dc-col-toplam-ilk"></th>
      <th></th>
      <th></th>
      <th class="dc-col-aciklama"></th>
    </tr>
  `;

  const satirlarHtml = ogretmenler.map((o, idx) => {
    const hucreler = gunler.map(g => {
      const haftasonu = DevamsizlikCizelgesiService.haftaSonuMu(devamsizlikYil, devamsizlikAy, g);
      const kod = (o.gunler || {})[g];
      let renk = 'transparent', metin = '';
      if(haftasonu && (kod === undefined || kod === null)){ renk = DEVAMSIZLIK_HAFTASONU_RENK; }
      else if(DEVAMSIZLIK_KOD_BILGI[kod]){ renk = DEVAMSIZLIK_KOD_BILGI[kod].renk; metin = kod; }
      else if(kod !== undefined && kod !== null && kod !== ''){ renk = DEVAMSIZLIK_DEVAM_RENK; metin = kod; }
      return `<td class="dc-hucre" style="background:${renk};" onclick="devamsizlikHucreTikla('${o.ogretmenId}', ${g})" title="${o.adSoyad} — Gün ${g}">${metin}</td>`;
    }).join('');
    const { toplamSaat, toplamDevam, toplamDevamsiz } = _devamsizlikSatirToplamlari(o, gunSayisi);
    return `
      <tr>
        <td class="dc-col-no">${idx+1}</td>
        <td class="dc-th-sabit dc-col-ad dc-ad-tikla" style="text-align:left;white-space:nowrap;" onclick="devamsizlikHaftalikSaatDuzenle('${o.ogretmenId}')" title="Haftalık ders saatlerini düzenlemek için tıklayın — ${escapeHtml(o.adSoyad||'')}">${escapeHtml(o.adSoyad||'')}</td>
        <td class="dc-col-gorev" style="text-align:left;white-space:nowrap;font-size:11px;color:var(--ink-muted);" title="${escapeHtml(o.gorev||'')}">${escapeHtml(o.gorev||'')}</td>
        ${hucreler}
        <td class="dc-col-toplam-ilk" style="font-weight:700;">${toplamSaat}</td>
        <td style="font-weight:700;">${toplamDevam}</td>
        <td style="font-weight:700;">${toplamDevamsiz}</td>
        <td class="dc-hucre dc-col-aciklama" style="text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" onclick="devamsizlikAciklamaDuzenle('${o.ogretmenId}')" title="${escapeHtml(o.aciklama||'Açıklama eklemek için tıklayın')}">${escapeHtml(o.aciklama||'')}</td>
      </tr>
    `;
  }).join('');

  return `
    <table id="devamsizlikGridTablo" style="border-collapse:collapse;width:100%;font-size:12px;text-align:center;">
      <thead>${basligTr}</thead>
      <tbody>${satirlarHtml || `<tr><td colspan="${gunSayisi+7}" style="padding:20px;color:var(--ink-muted);">Bu ayda henüz öğretmen yok.</td></tr>`}</tbody>
    </table>
  `;
}

/* ---------------- Satır toplamları (Excel şablonundaki AI/AJ/AK mantığıyla aynı) ----------------
   Toplam Saat   = sayısal (Devam) hücrelerin toplamı
   Toplam Devam  = sayısal (Devam) hücre SAYISI
   Toplam Devamsız = D (Devamsız) + R (Raporlu) + İ (İzinli) hücre SAYISI
   Not: Y (Yarım Gün), T (Tatil) ve + (Görevlendirme) hiçbirine dahil edilmez —
   orijinal Excel şablonundaki COUNTIF(...,"D")+COUNTIF(...,"R")+COUNTIF(...,"İ")
   formülüyle birebir aynı davranış. */
function _devamsizlikSatirToplamlari(o, gunSayisi){
  let toplamSaat = 0, toplamDevam = 0, toplamDevamsiz = 0;
  for(let g = 1; g <= gunSayisi; g++){
    const kod = (o.gunler || {})[g];
    if(kod === undefined || kod === null || kod === '') continue;
    if(kod === 'D' || kod === 'İ' || kod === 'R'){ toplamDevamsiz++; continue; }
    if(DEVAMSIZLIK_KOD_BILGI[kod]) continue; // Y, T, + — ne devam ne devamsız
    const saat = Number(kod);
    if(!isNaN(saat)){ toplamSaat += saat; toplamDevam++; }
  }
  return { toplamSaat, toplamDevam, toplamDevamsiz };
}

function _devamsizlikLegendHtml(){
  const ogeler = [
    { etiket: 'Devam (ders saati)', renk: DEVAMSIZLIK_DEVAM_RENK },
    ...Object.entries(DEVAMSIZLIK_KOD_BILGI).map(([kod, b]) => ({ etiket: `${kod} — ${b.etiket}`, renk: b.renk })),
    { etiket: 'Hafta Sonu', renk: DEVAMSIZLIK_HAFTASONU_RENK }
  ];
  return `
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;font-size:11.5px;">
      ${ogeler.map(o => `
        <span style="display:inline-flex;align-items:center;gap:4px;">
          <span style="width:14px;height:14px;border-radius:3px;border:1px solid var(--border);background:${o.renk};display:inline-block;"></span>
          ${o.etiket}
        </span>
      `).join('')}
    </div>
  `;
}

/* ---------------- Haftalık ders saatleri (öğretmen adına tıklayınca) ----------------
   o.haftalikSaatler = { pzt, sal, car, per, cum } — bu ayki otomatik "Devam" saatlerinin
   hesaplanmasında kullanılır (bkz. DevamsizlikCizelgesiService._haftaIciSaat).
   Kaynağı: kayıtlı bir değer varsa o kullanılır; yoksa ders programından otomatik
   çekilir. Her durumda elle düzenlenebilir, "Ders Programından Çek" ile de
   istenildiğinde tazelenebilir. */

const DEVAMSIZLIK_HAFTA_GUNLERI = [
  { anahtar: 'pzt', etiket: 'Pazartesi' },
  { anahtar: 'sal', etiket: 'Salı' },
  { anahtar: 'car', etiket: 'Çarşamba' },
  { anahtar: 'per', etiket: 'Perşembe' },
  { anahtar: 'cum', etiket: 'Cuma' }
];

function devamsizlikHaftalikSaatDuzenle(ogretmenId){
  if(!duzenleyebilir('personel')){ toast('Bu işlem için yetkiniz yok.'); return; }
  const o = devamsizlikAyDokumani.ogretmenler[ogretmenId];
  if(!o) return;
  const kayitliVarMi = o.haftalikSaatler && Object.values(o.haftalikSaatler).some(v => Number(v) > 0);
  const baslangic = kayitliVarMi ? o.haftalikSaatler : _devamsizlikDersProgramindanHaftalikSaat(ogretmenId);

  const body = `
    <p style="margin:0 0 10px;font-size:13px;"><b>${escapeHtml(o.adSoyad)}</b> — Haftalık Ders Saatleri</p>
    <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
      <button type="button" class="btn" style="font-size:12px;padding:6px 10px;" onclick="devamsizlikDersProgramindanCek('${ogretmenId}')">
        <i data-lucide="refresh-cw"></i> Ders Programından Çek
      </button>
    </div>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;min-width:340px;">
        <thead>
          <tr>${DEVAMSIZLIK_HAFTA_GUNLERI.map(g => `<th style="border:1px solid var(--border);padding:6px 4px;">${g.etiket}</th>`).join('')}</tr>
        </thead>
        <tbody>
          <tr>${DEVAMSIZLIK_HAFTA_GUNLERI.map(g => `
            <td style="border:1px solid var(--border);padding:4px;text-align:center;">
              <input type="number" min="0" max="12" id="dcSaat_${g.anahtar}" value="${Number(baslangic[g.anahtar]) || 0}"
                style="width:44px;text-align:center;padding:5px 2px;border-radius:6px;border:1px solid var(--border);background:var(--bg-card);color:var(--ink);">
            </td>
          `).join('')}</tr>
        </tbody>
      </table>
    </div>
    <p style="font-size:11px;color:var(--ink-muted);margin-top:10px;">
      Bu değerler, ayın otomatik "Devam" saatlerini hesaplamak için kullanılır. Kaydedince
      bu aydaki elle değiştirilmemiş günler yeni saatlere göre otomatik güncellenir; elle
      girdiğiniz kodlar (D/İ/Y/R/T/+) korunur.
    </p>
  `;
  modalAc('Haftalık Ders Saatleri', body, () => devamsizlikHaftalikSaatKaydet(ogretmenId), null, 'Kaydet');
}

/* Ders Programı modülünün gerçek veri yapısı (js/alt-navigasyon.js
   dersProgramimGoster fonksiyonundan doğrulandı): global `dersProgrami`
   düz bir dizi, her öge bir ders saati kaydı: { ogretmenId, gun, saat,
   sinif, ders } — `gun` Türkçe gün adı string'i (GUNLER: 'Pazartesi'..'Cuma').
   O gün o öğretmene ait kaç kayıt varsa, o gün kaç ders saati var demektir. */
const DEVAMSIZLIK_GUN_ESLESTIRME = { 'Pazartesi':'pzt', 'Salı':'sal', 'Çarşamba':'car', 'Perşembe':'per', 'Cuma':'cum' };

function _devamsizlikDersProgramindanHaftalikSaat(ogretmenId){
  const bos = { pzt: 0, sal: 0, car: 0, per: 0, cum: 0 };
  if(typeof dersProgrami === 'undefined' || !Array.isArray(dersProgrami)) return bos;
  const sonuc = { ...bos };
  dersProgrami.filter(d => d.ogretmenId === ogretmenId).forEach(d => {
    const anahtar = DEVAMSIZLIK_GUN_ESLESTIRME[d.gun];
    if(anahtar) sonuc[anahtar]++;
  });
  return sonuc;
}

function devamsizlikDersProgramindanCek(ogretmenId){
  const saatler = _devamsizlikDersProgramindanHaftalikSaat(ogretmenId);
  DEVAMSIZLIK_HAFTA_GUNLERI.forEach(g => {
    const alan = document.getElementById(`dcSaat_${g.anahtar}`);
    if(alan) alan.value = saatler[g.anahtar] || 0;
  });
  toast('Ders programından çekildi. Kaydetmeyi unutmayın.');
}

async function devamsizlikHaftalikSaatKaydet(ogretmenId){
  const o = devamsizlikAyDokumani.ogretmenler[ogretmenId];
  if(!o) return;
  const yeniHaftalikSaatler = {};
  DEVAMSIZLIK_HAFTA_GUNLERI.forEach(g => {
    const alan = document.getElementById(`dcSaat_${g.anahtar}`);
    const deger = alan ? Number(alan.value) : 0;
    yeniHaftalikSaatler[g.anahtar] = (isNaN(deger) || deger < 0) ? 0 : deger;
  });
  try{
    o.haftalikSaatler = yeniHaftalikSaatler;
    // Bu ay için otomatik (elle değiştirilmemiş) günleri yeni saatlere göre tazele —
    // elle girilmiş kodlar (D/İ/Y/R/T/+) KORUNUR (devamsizlikOtomatikTazele ile aynı mantık,
    // sadece bu tek öğretmene uygulanır).
    const yeniGunler = DevamsizlikCizelgesiService.ogretmenAyiniOtomatikUret(o, devamsizlikYil, devamsizlikAy, resmiTatiller, ogretmenIzinleri);
    const birlesikGunler = { ...o.gunler };
    Object.keys(yeniGunler).forEach(gun => {
      const mevcut = (o.gunler || {})[gun];
      const elleMi = mevcut !== undefined && isNaN(Number(mevcut));
      if(!elleMi) birlesikGunler[gun] = yeniGunler[gun];
    });
    o.gunler = birlesikGunler;
    await DevamsizlikCizelgesiRepository.ogretmenVerisiSetle(devamsizlikYil, devamsizlikAy, ogretmenId, o);
    toast('Haftalık ders saatleri kaydedildi, bu ayın günleri güncellendi.');
    modalKapat();
  }catch(err){
    if(err.message !== 'yetkisiz') toast('Hata: ' + err.message);
  }
}

/* ---------------- Hücre tıklama popup ---------------- */

function devamsizlikHucreTikla(ogretmenId, gun){
  if(!duzenleyebilir('personel')){ toast('Bu işlem için yetkiniz yok.'); return; }
  const o = devamsizlikAyDokumani.ogretmenler[ogretmenId];
  if(!o) return;
  const haftasonu = DevamsizlikCizelgesiService.haftaSonuMu(devamsizlikYil, devamsizlikAy, gun);
  const otomatikSaat = DevamsizlikCizelgesiService['_haftaIciSaat'](o.haftalikSaatler, devamsizlikYil, devamsizlikAy, gun);
  const mevcutKod = (o.gunler || {})[gun];

  const secenekler = [
    { kod: String(otomatikSaat || 0), etiket: `Devam (${otomatikSaat || 0} saat)`, renk: DEVAMSIZLIK_DEVAM_RENK },
    ...Object.entries(DEVAMSIZLIK_KOD_BILGI).map(([kod, b]) => ({ kod, etiket: `${kod} — ${b.etiket}`, renk: b.renk }))
  ];

  const body = `
    <p style="margin:0 0 10px;font-size:13px;"><b>${escapeHtml(o.adSoyad)}</b> — ${AY_ADLARI_TR[devamsizlikAy-1]} ${gun}, ${devamsizlikYil} (${DevamsizlikCizelgesiService.GUN_KISA_ADLARI[DevamsizlikCizelgesiService.haftaGunu(devamsizlikYil,devamsizlikAy,gun)]})</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      ${secenekler.map(s => `
        <button class="btn dc-modal-btn" style="background:${s.renk};border:1px solid var(--border);${mevcutKod==s.kod?'outline:2px solid var(--ink);':''}"
          onclick="devamsizlikKodSec('${ogretmenId}', ${gun}, '${s.kod}')">${s.etiket}</button>
      `).join('')}
    </div>
    ${haftasonu ? `<p style="font-size:11px;color:var(--ink-muted);margin-top:10px;">Not: Bu gün hafta sonuna denk geliyor. Manuel seçim yine de geçerli olur.</p>` : ''}
  `;
  modalAc(`Gün ${gun} — Kod Seç`, body, null, null, 'Kapat');
  document.getElementById('modalKaydetBtn').style.display = 'none';
}

async function devamsizlikKodSec(ogretmenId, gun, kod){
  try{
    await DevamsizlikCizelgesiService.gunGuncelle(devamsizlikYil, devamsizlikAy, ogretmenId, gun, kod);
    toast('Kaydedildi.');
    modalKapat();
  }catch(err){
    if(err.message !== 'yetkisiz') toast('Hata: ' + err.message);
  }
}

/* ---------------- Açıklama düzenleme popup ---------------- */

function devamsizlikAciklamaDuzenle(ogretmenId){
  if(!duzenleyebilir('personel')){ toast('Bu işlem için yetkiniz yok.'); return; }
  const o = devamsizlikAyDokumani.ogretmenler[ogretmenId];
  if(!o) return;
  const body = `
    <p style="margin:0 0 10px;font-size:13px;"><b>${escapeHtml(o.adSoyad)}</b> — Açıklama</p>
    <textarea id="dcAciklamaAlani" rows="4" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--ink);resize:vertical;box-sizing:border-box;">${escapeHtml(o.aciklama||'')}</textarea>
  `;
  modalAc('Açıklama Düzenle', body, () => devamsizlikAciklamaKaydet(ogretmenId), null, 'Kaydet');
}

async function devamsizlikAciklamaKaydet(ogretmenId){
  const o = devamsizlikAyDokumani.ogretmenler[ogretmenId];
  if(!o) return;
  const alan = document.getElementById('dcAciklamaAlani');
  const deger = alan ? alan.value.trim() : '';
  try{
    o.aciklama = deger;
    await DevamsizlikCizelgesiRepository.ogretmenVerisiSetle(devamsizlikYil, devamsizlikAy, ogretmenId, o);
    toast('Kaydedildi.');
    modalKapat();
  }catch(err){
    if(err.message !== 'yetkisiz') toast('Hata: ' + err.message);
  }
}

/* ---------------- Yeni ay oluştur (öğretmen listesinden, otomatik) ---------------- */

async function devamsizlikYeniAyOlustur(){
  if(!duzenleyebilir('personel')){ toast('Bu işlem için yetkiniz yok.'); return; }
  const satirlar = (ogretmenler || []).map(o => {
    const saatler = _devamsizlikDersProgramindanHaftalikSaat(o.id);
    return {
      ogretmenId: o.id,
      adSoyad: `${o.ad} ${o.soyad}`.trim(),
      gorev: o.unvan || '',
      // Haftalık ders saati artık ders programından otomatik çekiliyor
      // (bkz. _devamsizlikDersProgramindanHaftalikSaat); bulunamazsa 0 ile
      // başlar ve öğretmen adına tıklanarak elle girilebilir.
      pzt: saatler.pzt, sal: saatler.sal, car: saatler.car, per: saatler.per, cum: saatler.cum
    };
  });
  const map = DevamsizlikCizelgesiService.excelSatirlarindanAyOlustur(satirlar, devamsizlikYil, devamsizlikAy, ogretmenler, resmiTatiller, ogretmenIzinleri);
  try{
    await DevamsizlikCizelgesiService.ayOlustur(devamsizlikYil, devamsizlikAy, map);
    toast('Çizelge oluşturuldu. Haftalık ders saatlerini öğretmen adına tıklayarak veya Excel içe aktararak düzenleyebilirsiniz.');
  }catch(err){ if(err.message!=='yetkisiz') toast('Hata: '+err.message); }
}

async function devamsizlikOtomatikTazele(){
  if(!devamsizlikAyDokumani) return;
  if(!confirm('Tüm öğretmenlerin ELLE değiştirilmemiş günleri, güncel izin/resmi tatil verisine göre yeniden hesaplanacak. Elle girilmiş kodlar (D/İ/Y/R/T/+) KORUNUR. Devam edilsin mi?')) return;
  const ogretmenler_ = Object.values(devamsizlikAyDokumani.ogretmenler || {});
  for(const o of ogretmenler_){
    const yeniGunler = DevamsizlikCizelgesiService.ogretmenAyiniOtomatikUret(o, devamsizlikYil, devamsizlikAy, resmiTatiller, ogretmenIzinleri);
    // Elle girilmiş (harf) kodları koru: sadece sayısal (otomatik) hücreleri güncelle.
    const birlesikGunler = { ...o.gunler };
    Object.keys(yeniGunler).forEach(gun => {
      const mevcut = (o.gunler || {})[gun];
      const elleMi = mevcut !== undefined && isNaN(Number(mevcut));
      if(!elleMi) birlesikGunler[gun] = yeniGunler[gun];
    });
    o.gunler = birlesikGunler;
    await DevamsizlikCizelgesiRepository.ogretmenVerisiSetle(devamsizlikYil, devamsizlikAy, o.ogretmenId, o);
  }
  toast('Otomatik günler tazelendi.');
}

/* ---------------- Excel İçe Aktarma ----------------
   İki farklı sayfa biçimini destekler:
   1) TAM AY IZGARASI (ör. "MAYIS 2026" sayfası): A2=NO, B2=ADI SOYADI,
      C2=GÖREVİ, D2..=gün numaraları (1,2,3...) — hücreler zaten D/İ/Y/R/T/+
      veya sayı olarak dolu. Kodlar OLDUĞU GİBİ kopyalanır (elle girilmiş
      geçmiş veri korunur).
   2) ÖĞRETMEN LİSTESİ (ör. "Öğretmenler" sayfası): ADI SOYADI, GÖREVİ,
      Pzt, Sal, Çar, Per, Cum (haftalık ders saati) — bu durumda günler
      DevamsizlikCizelgesiService ile OTOMATİK üretilir.
*/

async function devamsizlikExceldenIceAktar(file){
  if(!file) return;
  if(!duzenleyebilir('personel')){ toast('Bu işlem için yetkiniz yok.'); return; }
  try{
    const wb = await workbookOku(file);
    // Ayarlar sayfası varsa yıl/ay oradan okunur (kullanıcı elle seçtiği dönemi ezmesin diye sorulur).
    let hedefYil = devamsizlikYil, hedefAy = devamsizlikAy;
    const ayarlarAoa = sayfayiDiziyeCevir(wb, 'Ayarlar');
    if(ayarlarAoa){
      const yilSatiri = ayarlarAoa.find(r => normBaslik(r[0]) === 'YIL:');
      const aySatiri = ayarlarAoa.find(r => normBaslik(r[0]) === 'AY:');
      if(yilSatiri && yilSatiri[1]) hedefYil = Number(yilSatiri[1]);
      if(aySatiri && aySatiri[1]) hedefAy = Number(aySatiri[1]);
    }

    // Ay ızgarası içeren bir sayfa var mı? (D2 hücresi sayısal '1' olan sayfa aranır)
    let ayIzgaraSayfasi = null;
    for(const ad of wb.SheetNames){
      const aoa = sayfayiDiziyeCevir(wb, ad);
      if(!aoa || !aoa[1]) continue;
      if(normBaslik(aoa[1][0]) === 'NO' && Number(aoa[1][3]) === 1){ ayIzgaraSayfasi = ad; break; }
    }

    let map;
    if(ayIzgaraSayfasi){
      map = _devamsizlikAyIzgarasindanOku(wb, ayIzgaraSayfasi, hedefYil, hedefAy);
      toast(`"${ayIzgaraSayfasi}" sayfasından ${Object.keys(map).length} öğretmenin çizelgesi okundu.`);
    } else {
      const rosterSayfasi = wb.SheetNames.find(ad => {
        const aoa = sayfayiDiziyeCevir(wb, ad);
        return aoa && aoa.some(r => r.some(c => normBaslik(c) === 'ADI SOYADI') && r.some(c => normBaslik(c) === 'GÖREVİ'));
      });
      if(!rosterSayfasi){ toast('Tanınan bir sayfa biçimi bulunamadı (Öğretmenler listesi veya ay ızgarası bekleniyor).'); return; }
      const satirlar = _devamsizlikRosterdenOku(wb, rosterSayfasi);
      map = DevamsizlikCizelgesiService.excelSatirlarindanAyOlustur(satirlar, hedefYil, hedefAy, ogretmenler, resmiTatiller, ogretmenIzinleri);
      toast(`"${rosterSayfasi}" sayfasından ${satirlar.length} öğretmen okundu, günler otomatik oluşturuldu.`);
    }

    if(hedefYil !== devamsizlikYil || hedefAy !== devamsizlikAy){
      devamsizlikYil = hedefYil; devamsizlikAy = hedefAy;
      document.getElementById('devamsizlik_yilSecici') && (document.getElementById('devamsizlik_yilSecici').value = hedefYil);
      document.getElementById('devamsizlik_aySecici') && (document.getElementById('devamsizlik_aySecici').value = hedefAy);
    }
    await DevamsizlikCizelgesiService.ayOlustur(hedefYil, hedefAy, map);
    _devamsizlikAyDinle();
  }catch(err){ console.error(err); toast('İçe aktarma hatası: ' + err.message); }
}

function _devamsizlikAyIzgarasindanOku(wb, sheetName, yil, ay){
  const aoa = sayfayiDiziyeCevir(wb, sheetName);
  const basliklar = aoa[1]; // A2..: NO, ADI SOYADI, GÖREVİ, 1, 2, 3..., Toplam Saat, Toplam Devam, Toplam Devamsız, Açıklama
  // Toplam sütunları JS tarafında yeniden hesaplanır (bkz. _devamsizlikSatirToplamlari),
  // bu yüzden sadece Açıklama'nın hangi sütunda olduğu bulunur.
  const aciklamaSutunu = basliklar.findIndex(b => normBaslik(b) === 'AÇIKLAMA');
  const map = {};
  for(let r = 4; r < aoa.length; r++){ // 5. satırdan (index 4) itibaren öğretmen satırları
    const row = aoa[r];
    if(!row || !row[1]) continue; // B sütunu (ADI SOYADI) boşsa satır bitmiştir
    const adSoyad = String(row[1]).trim();
    if(!adSoyad || normBaslik(adSoyad) === 'AÇIKLAMA:') break;
    const gorev = row[2] ? String(row[2]).trim() : '';
    const eslesen = DevamsizlikCizelgesiService['_adaGoreOgretmenBul'](ogretmenler, adSoyad);
    const ogretmenId = eslesen ? eslesen.id : `disaridan_${DevamsizlikCizelgesiService['_slug'](adSoyad)}`;
    const gunler = {};
    for(let c = 3; c < row.length; c++){
      if(c === aciklamaSutunu) continue; // günlerle karışmasın
      const gunNo = Number(basliklar[c]);
      if(!gunNo || gunNo < 1 || gunNo > 31) continue;
      const deger = row[c];
      if(deger === null || deger === undefined || deger === '') continue;
      gunler[gunNo] = typeof deger === 'number' ? deger : String(deger).trim();
    }
    const aciklama = aciklamaSutunu !== -1 && row[aciklamaSutunu] ? String(row[aciklamaSutunu]).trim() : '';
    map[ogretmenId] = { ogretmenId, adSoyad, gorev, haftalikSaatler: (map[ogretmenId] && map[ogretmenId].haftalikSaatler) || {}, gunler, aciklama };
  }
  return map;
}

function _devamsizlikRosterdenOku(wb, sheetName){
  const aoa = sayfayiDiziyeCevir(wb, sheetName);
  const headerIdx = aoa.findIndex(r => r.some(c => normBaslik(c) === 'ADI SOYADI') && r.some(c => normBaslik(c) === 'GÖREVİ'));
  if(headerIdx === -1) return [];
  const header = aoa[headerIdx].map(normBaslik);
  const col = (...adlar) => { for(const a of adlar){ const i = header.indexOf(a); if(i !== -1) return i; } return -1; };
  const cAd = col('ADI SOYADI'), cGorev = col('GÖREVİ'), cPzt = col('PZT'), cSal = col('SAL'), cCar = col('ÇAR','CAR'), cPer = col('PER'), cCum = col('CUM');
  const satirlar = [];
  for(let i = headerIdx + 1; i < aoa.length; i++){
    const row = aoa[i]; if(!row || cAd === -1 || !row[cAd]) continue;
    satirlar.push({
      adSoyad: String(row[cAd]).trim(),
      gorev: cGorev !== -1 ? String(row[cGorev] || '').trim() : '',
      pzt: cPzt !== -1 ? row[cPzt] : 0, sal: cSal !== -1 ? row[cSal] : 0,
      car: cCar !== -1 ? row[cCar] : 0, per: cPer !== -1 ? row[cPer] : 0, cum: cCum !== -1 ? row[cCum] : 0
    });
  }
  return satirlar;
}

/* ---------------- Yazdırma (A4 yatay) ---------------- */

function devamsizlikYazdir(){
  const okul = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari) || {};
  const okulAdi = okul.okulAdi || '';
  const gridHtml = _devamsizlikGridHtml();
  const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
    <title>Devamsızlık Çizelgesi ${AY_ADLARI_TR[devamsizlikAy-1]} ${devamsizlikYil}</title>
    <style>
      @page { size: A4 landscape; margin: 8mm; }
      * { box-sizing:border-box; }
      body { font-family:Arial,Helvetica,sans-serif; font-size:8pt; color:#000; }
      h1 { text-align:center; font-size:13pt; margin:0 0 8px; }
      table { border-collapse:collapse; width:100%; }
      th, td { border:1px solid #666; padding:2px 3px; text-align:center; }
      .dc-th-sabit { position:static; text-align:left; }
      @media print { body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
    </style></head><body>
    <h1>${escapeHtml(okulAdi)} — ${AY_ADLARI_TR[devamsizlikAy-1].toUpperCase()} ${devamsizlikYil} DEVAM-DEVAMSIZLIK ÇİZELGESİ</h1>
    ${gridHtml}
    ${_devamsizlikLegendHtml()}
    </body></html>`;

  if(typeof uygulamaHtmlYazdir === 'function'){
    uygulamaHtmlYazdir(html, `Devamsizlik_${AY_ADLARI_TR[devamsizlikAy-1]}_${devamsizlikYil}`, 'yatay');
  } else {
    const pencere = window.open('', '_blank');
    pencere.document.write(html);
    pencere.document.close();
    setTimeout(() => pencere.print(), 300);
  }
}
