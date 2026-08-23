/* Koruk Asistan — Öğrenci Yoklama UI v2
 * Mevcut YoklamaService / YoklamaRepository veri akışını korur.
 */
let _yokAcikSinifId=null,_yokAcikTarih=null,_yokDinleyici=null,_yokAktifBelge=null;
(function(){
  if(document.querySelector('link[data-yok-modern]'))return;
  const l=document.createElement('link');l.rel='stylesheet';l.href='css/yoklama-modern.css?v=2';l.setAttribute('data-yok-modern','1');document.head.appendChild(l);
})();
const _YI={
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>',
  alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/></svg>'
};
function _yEsc(v){return typeof escapeHtml==='function'?escapeHtml(v||''):String(v||'').replace(/[&<>"']/g,'')}
function _ySinif(){try{return (siniflar||[]).find(s=>s.id===_yokAcikSinifId)}catch(_){return null}}
function _yOgrenciler(){try{return (veliler||[]).filter(v=>v.sinifId===_yokAcikSinifId).slice().sort((a,b)=>(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'))}catch(_){return[]}}
function _yBos(mesaj){return `<div class="yok-empty"><div class="icon">${_YI.users}</div><b>${_yEsc(mesaj)}</b><span>Sınıf ve tarih bilgilerini kontrol edin.</span></div>`}
function yoklamaAc(){
  if(typeof gorebilir==='function'&&!gorebilir('yoklama')){toast('Bu işlem için yetkiniz yok.');return}
  yoklamaKapat();
  const adminMi=!!(typeof AKTIF_KULLANICI!=='undefined'&&AKTIF_KULLANICI?.admin===true);
  const secenekler=(typeof siniflar!=='undefined'?siniflar:[]).slice().sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr')).map(s=>`<option value="${_yEsc(s.id)}">${_yEsc(s.ad)}</option>`).join('');
  const ov=document.createElement('div');ov.id='yokOverlay';ov.className='yok-modern';ov.innerHTML=`
    <header class="yok-top"><button class="back" type="button" onclick="yoklamaKapat()" aria-label="Geri">${_YI.back}</button><h1>Öğrenci Yoklama</h1>${adminMi?`<button class="absent" type="button" onclick="yoklamaDevamsizlarAc()">${_YI.alert}<span>Devamsızlar</span></button>`:'<span></span>'}</header>
    <main class="yok-body">
      <section class="yok-hero"><small>GÜNLÜK YOKLAMA</small><h2>Öğrenci Yoklama</h2><p>Sınıfı ve tarihi seçin, öğrencilerin günlük durumunu tek dokunuşla işaretleyin.</p></section>
      <section class="yok-selectors"><div class="yok-field"><label>Sınıf</label><select id="yokSinifSec"><option value="">Sınıf seçin…</option>${secenekler}</select></div><div class="yok-field"><label>Tarih</label><input id="yokTarihSec" type="date"></div></section>
      <div id="yokOgrenciListesi">${_yBos('Sınıf seçin')}</div>
    </main>`;
  document.body.appendChild(ov);document.body.classList.add('modal-open','yok-modern-open');
  if(typeof _pullToRefreshAyarla==='function')_pullToRefreshAyarla(false);
  const tarih=document.getElementById('yokTarihSec');tarih.value=typeof YoklamaService!=='undefined'?YoklamaService.bugununTarihi():'';
  document.getElementById('yokSinifSec').addEventListener('change',_yokSinifTarihDegisti);tarih.addEventListener('change',_yokSinifTarihDegisti);
}
function yoklamaKapat(){
  _yokDinleyiciKaldir();document.getElementById('yokDevamsizOverlay')?.remove();document.getElementById('yokOverlay')?.remove();
  _yokAcikSinifId=null;_yokAcikTarih=null;_yokAktifBelge=null;document.body.classList.remove('modal-open','yok-modern-open');
  if(typeof _pullToRefreshAyarla==='function')_pullToRefreshAyarla(true);
}
function _yokDinleyiciKaldir(){if(_yokDinleyici){try{_yokDinleyici()}catch(_){}_yokDinleyici=null}}
function _yokSinifTarihDegisti(){
  const s=document.getElementById('yokSinifSec'),t=document.getElementById('yokTarihSec'),govde=document.getElementById('yokOgrenciListesi');if(!s||!t||!govde)return;
  const sinifId=s.value,tarih=t.value;_yokDinleyiciKaldir();_yokAktifBelge=null;
  if(!sinifId||!tarih){_yokAcikSinifId=null;_yokAcikTarih=tarih||null;govde.innerHTML=_yBos('Sınıf ve tarih seçin');return}
  _yokAcikSinifId=sinifId;_yokAcikTarih=tarih;govde.innerHTML=_yBos('Yoklama yükleniyor…');
  _yokDinleyici=YoklamaService.dinle(sinifId,tarih,belge=>{_yokAktifBelge=belge;_yokListesiCiz()},()=>{govde.innerHTML=_yBos('Yoklama yüklenemedi')});
}
function _yokListesiCiz(){
  const govde=document.getElementById('yokOgrenciListesi');if(!govde||!_yokAcikSinifId)return;
  const ogr=_yOgrenciler();if(!ogr.length){govde.innerHTML=_yBos('Bu sınıfta kayıtlı öğrenci yok');return}
  const kayitlar=_yokAktifBelge?.kayitlar||{},say={var:0,yok:0,gec:0,izinli:0,bos:0};ogr.forEach(o=>{const d=kayitlar[o.id];if(say[d]!==undefined)say[d]++;else say.bos++});
  const sinif=_ySinif();govde.innerHTML=`<div class="yok-summary"><div class="yok-stat var"><small>Var</small><b>${say.var}</b></div><div class="yok-stat yok"><small>Yok</small><b>${say.yok}</b></div><div class="yok-stat gec"><small>Geç</small><b>${say.gec}</b></div><div class="yok-stat izinli"><small>İzinli</small><b>${say.izinli}</b></div></div><div class="yok-toolbar"><b>${_yEsc(sinif?.ad||'Öğrenciler')}</b><span>${ogr.length} öğrenci · ${say.bos} işaretlenmemiş</span></div><div class="yok-list">${ogr.map(o=>_yokOgrenciKart(o,kayitlar[o.id])).join('')}</div>`;
}
function _yokOgrenciKart(o,durum){
  const no=o.ogrenciNo?`No: ${_yEsc(o.ogrenciNo)}`:'Numara yok',ad=_yEsc(o.ogrenciAdi||'Öğrenci'),ilk=_yEsc((o.ogrenciAdi||'?').trim().charAt(0).toLocaleUpperCase('tr'));
  return `<article class="yok-student"><div class="yok-student-head"><div class="yok-avatar">${ilk}</div><div class="yok-student-main"><b>${ad}</b><small>${no}</small></div><span class="yok-current ${durum||''}">${durum?YoklamaService.DURUM_ADLARI[durum]:'İşaretlenmedi'}</span></div><div class="yok-statuses">${YoklamaService.DURUMLAR.map(d=>`<button type="button" class="yok-status ${d} ${durum===d?'active':''}" onclick="_yokDurumIsaretle('${_yEsc(o.id)}','${d}')">${YoklamaService.DURUM_ADLARI[d]}</button>`).join('')}</div></article>`;
}
function _yokDurumIsaretle(ogrenciId,durum){
  if(!_yokAcikSinifId||!_yokAcikTarih)return;const btn=document.querySelector(`.yok-status[onclick*="'${ogrenciId}'"][onclick*="'${durum}'"]`);if(btn)btn.disabled=true;
  YoklamaService.ogrenciDurumKaydet(_yokAcikSinifId,_yokAcikTarih,ogrenciId,durum).catch(e=>{if(e.message!=='yetkisiz')toast('Hata: '+e.message)}).finally(()=>{if(btn)btn.disabled=false});
}
async function yoklamaDevamsizlarAc(){
  if(document.getElementById('yokDevamsizOverlay'))return;const ov=document.createElement('div');ov.id='yokDevamsizOverlay';ov.className='yok-modern';ov.style.zIndex='9740';ov.innerHTML=`<header class="yok-top"><button class="back" type="button" onclick="yoklamaDevamsizlarKapat()">${_YI.back}</button><h1>Bugünün Devamsızları</h1><span></span></header><main class="yok-abs-body"><section class="yok-abs-head"><small>VELİ BİLGİLENDİRME</small><b>Bugünün Devamsızları</b></section><div id="yokDevamsizGovde">${_yBos('Liste yükleniyor…')}</div></main>`;document.body.appendChild(ov);document.body.classList.add('yok-modern-open');if(typeof _pullToRefreshAyarla==='function')_pullToRefreshAyarla(false);
  try{const tarih=YoklamaService.bugununTarihi(),satirlar=await YoklamaService.gununDevamsizlariGetir(tarih);_yokDevamsizListesiCiz(satirlar)}catch(e){const g=document.getElementById('yokDevamsizGovde');if(g)g.innerHTML=_yBos(e.message==='yetkisiz'?'Bu ekranı görüntüleme yetkiniz yok':'Liste yüklenemedi')}
}
function yoklamaDevamsizlarKapat(){document.getElementById('yokDevamsizOverlay')?.remove();if(!document.getElementById('yokOverlay'))document.body.classList.remove('yok-modern-open');if(typeof _pullToRefreshAyarla==='function')_pullToRefreshAyarla(false)}
function _yokDevamsizListesiCiz(satirlar){
  const g=document.getElementById('yokDevamsizGovde');if(!g)return;if(!satirlar.length){g.innerHTML=_yBos('Bugün Yok/Geç işaretlenen öğrenci yok');return}
  window._yokDevamsizSatirlari=satirlar;g.innerHTML=`<div class="yok-abs-list">${satirlar.map((s,i)=>{const link=YoklamaService.whatsappLinkOlustur(s);return `<article class="yok-abs-row ${s.gonderildi?'sent':''}"><div class="yok-abs-icon ${s.durum}">${YoklamaService.DURUM_ADLARI[s.durum]}</div><div class="yok-abs-main"><b>${_yEsc(s.ogrenciAdi)} · ${_yEsc(s.sinifAdi)}</b><small>${_yEsc(s.veliAdi||'Veli bilgisi yok')}${s.telefon?' · '+_yEsc(s.telefon):''}</small></div>${link?`<button class="yok-wa" type="button" onclick="_yokWhatsappAc(${i},'${_yEsc(s.sinifId)}','${_yEsc(s.tarih)}','${_yEsc(s.ogrenciId)}')">WhatsApp</button>`:'<span class="yok-no-phone">Telefon yok</span>'}</article>`}).join('')}</div>`;
}
function _yokWhatsappAc(i,sinifId,tarih,ogrenciId){const s=(window._yokDevamsizSatirlari||[])[i];if(!s)return;const link=YoklamaService.whatsappLinkOlustur(s);if(!link)return;window.open(link,'_blank');YoklamaService.mesajGonderildiIsaretle(sinifId,tarih,ogrenciId).then(()=>{s.gonderildi=true;_yokDevamsizListesiCiz(window._yokDevamsizSatirlari||[])}).catch(()=>{})}
