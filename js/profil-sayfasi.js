/* ====================================================================
   KORUK ASİSTAN — KENDİ PROFİLİM SAYFASI
   Mevcut öğretmen verilerini kullanır; yeni veri modeli oluşturmaz.
   ==================================================================== */
(function(){
'use strict';
if(window.__KORUK_PROFILE_PAGE__) return;
window.__KORUK_PROFILE_PAGE__ = true;

const $=(s,r=document)=>r.querySelector(s);
const esc=(v)=> typeof escapeHtml==='function' ? escapeHtml(v==null?'':String(v)) : String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function profilKapat(){
  const p=$('#korukProfilPage');
  if(p) p.remove();
  document.body.classList.remove('kp-profile-open');
  if(typeof _pullToRefreshAyarla==='function') _pullToRefreshAyarla(true);
}
window.profilSayfasiKapat=profilKapat;

function gunAdi(t){
  try{return new Date(t+'T12:00:00').toLocaleDateString('tr-TR',{weekday:'long'});}catch(_){return ''}
}
function tarihYaz(t){
  if(!t) return '—';
  try{return typeof formatTarih==='function'?formatTarih(t):new Date(t+'T12:00:00').toLocaleDateString('tr-TR');}catch(_){return t}
}
function initials(o){return (((o.ad||'')[0]||'')+((o.soyad||'')[0]||'')).toLocaleUpperCase('tr')||'👤'}
function rolAdi(){
  try{
    if(typeof AKTIF_KULLANICI!=='undefined'&&AKTIF_KULLANICI&&AKTIF_KULLANICI.admin===true) return 'Yönetici';
    if(typeof AKTIF_ROL!=='undefined'&&AKTIF_ROL&&AKTIF_ROL.ad) return AKTIF_ROL.ad;
  }catch(_){}
  return 'Kullanıcı';
}
function derslerim(o){return (typeof dersProgrami!=='undefined'?dersProgrami:[]).filter(d=>d.ogretmenId===o.id)}
function kuluplerim(o){return ((typeof cizelgeVerileri!=='undefined'&&cizelgeVerileri.sosyalKulupler)||[]).filter(k=>Array.isArray(k.ogretmenIdler)&&k.ogretmenIdler.includes(o.id))}
function nobetlerim(o){
  const adSoyad=((o.ad||'')+' '+(o.soyad||'')).trim().toLocaleLowerCase('tr');
  return (typeof nobetAtamalari!=='undefined'?nobetAtamalari:[]).filter(n=>n.ogretmenId===o.id || (n.ogretmenAdSoyad||'').toLocaleLowerCase('tr').includes(adSoyad)).sort((a,b)=>(a.tarih||'').localeCompare(b.tarih||''));
}
function sonrakiNobet(o){
  const bugun=typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10);
  return nobetlerim(o).find(n=>(n.tarih||'')>=bugun)||null;
}
function nobetYeri(n){
  if(!n) return '—';
  const y=(typeof nobetYerleri!=='undefined'?nobetYerleri:[]).find(x=>x.id===n.yerId);
  return y&&y.ad?y.ad:(n.yer||n.yerAdi||'—');
}
function fotoHtml(o){
  if(o.profilFotoUrl) return `<img class="kp-profile-photo" src="${esc(o.profilFotoUrl)}" alt="Profil fotoğrafı">`;
  return `<div class="kp-profile-initials">${esc(initials(o))}</div>`;
}
function bilgiSatir(label,value,html){return `<div class="kp-info-row"><div class="kp-info-label">${esc(label)}</div><div class="kp-info-value">${html?value:esc(value||'—')}</div></div>`}

function programAc(){
  profilKapat();
  try{
    if(typeof sekmeAc==='function') sekmeAc('dersNobetProgramim');
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(_){}
}
window.profilProgramimAc=programAc;

function bilgiGuncelle(){
  try{if(typeof profilimDuzenleAc==='function')profilimDuzenleAc();}
  catch(_){ }
}
window.profilBilgiGuncelle=bilgiGuncelle;

function raporAc(id){try{if(typeof ogretmenRaporOlustur==='function')ogretmenRaporOlustur(id);}catch(_){}}
window.profilRaporAc=raporAc;

function fotoSec(input,id){
  try{if(typeof profilFotoIsle==='function')profilFotoIsle(input,id);}catch(_){return}
  [900,1800,3000].forEach(ms=>setTimeout(()=>profilSayfasiAc(),ms));
}
window.profilSayfasiFotoSec=fotoSec;

function profilSayfasiAc(){
  const o=(typeof bagliOgretmenimGetir==='function')?bagliOgretmenimGetir():null;
  if(!o){
    if(window.__KORUK_PROFILE_OLD_OPEN__) return window.__KORUK_PROFILE_OLD_OPEN__();
    if(typeof toast==='function') toast('Hesabınıza bağlı bir öğretmen kaydı yok.');
    return;
  }
  profilKapat();
  const ders=derslerim(o), siniflar=[...new Set(ders.map(d=>d.sinif).filter(Boolean))], kulup=kuluplerim(o), nobet=sonrakiNobet(o);
  const role=rolAdi();
  const telefon=o.telefon||'';
  const eposta=o.eposta||'';
  const meslek=[o.unvan||'Öğretmen',o.brans].filter(Boolean).join(' · ');
  const okulKademesi=(typeof kademeHucresi==='function')?kademeHucresi(o):esc(o.kadroKademesi||o.gorevYeriKademesi||'—');
  const profile=document.createElement('section');
  profile.id='korukProfilPage';profile.className='kp-profile-page';
  profile.innerHTML=`<div class="kp-profile-shell">
    <div class="kp-profile-topline"><div class="kp-profile-kicker">Profilim</div><button class="kp-profile-close" type="button" onclick="profilSayfasiKapat()" aria-label="Kapat">×</button></div>
    <section class="kp-profile-hero">
      <div class="kp-profile-photo-wrap">${fotoHtml(o)}
        <label class="kp-photo-action" title="Profil fotoğrafını değiştir">📷<input type="file" accept="image/*" hidden onchange="profilSayfasiFotoSec(this,'${esc(o.id)}')"></label>
      </div>
      <div class="kp-profile-identity">
        <h1>${esc(((o.ad||'')+' '+(o.soyad||'')).trim())}</h1>
        <div class="kp-profile-roleline"><span>${esc(meslek||'Öğretmen')}</span><span class="kp-profile-badge">${esc(role)}</span>${o.sorumluSinif?`<span class="kp-profile-badge">${esc(o.sorumluSinif)}</span>`:''}</div>
      </div>
      <div class="kp-profile-actions">
        <button class="kp-btn kp-btn-primary" type="button" onclick="profilBilgiGuncelle()">✎ Bilgilerimi Güncelle</button>
        <button class="kp-btn" type="button" onclick="profilRaporAc('${esc(o.id)}')">▣ Profil Raporu</button>
      </div>
    </section>
    <section class="kp-stats">
      <div class="kp-stat"><strong>${ders.length}</strong><span>Haftalık ders</span></div>
      <div class="kp-stat"><strong>${siniflar.length}</strong><span>Sınıf</span></div>
      <div class="kp-stat"><strong>${kulup.length}</strong><span>Kulüp / görev</span></div>
      <div class="kp-stat"><strong>${nobet?'1':'—'}</strong><span>Yaklaşan nöbet</span></div>
    </section>
    <div class="kp-profile-grid">
      <section class="kp-card">
        <div class="kp-card-head"><h2>İletişim Bilgileri</h2></div>
        <div class="kp-card-body">
          ${bilgiSatir('Telefon',telefon,telefon?`<a href="tel:${esc(telefon)}">${esc(telefon)}</a>`:'—',true)}
          ${bilgiSatir('E-posta',eposta,eposta?`<a href="mailto:${esc(eposta)}">${esc(eposta)}</a>`:'—',true)}
          ${bilgiSatir('Sorumlu sınıf',o.sorumluSinif||'—')}
        </div>
      </section>
      <section class="kp-card">
        <div class="kp-card-head"><h2>Mesleki Bilgiler</h2></div>
        <div class="kp-card-body">
          ${bilgiSatir('Ünvan',o.unvan||'Öğretmen')}
          ${bilgiSatir('Branş',o.brans||'—')}
          ${bilgiSatir('Kariyer',o.kariyerBasamagi||'—')}
          ${bilgiSatir('Derece / Kademe',(o.derece||o.kademe)?`${o.derece||'—'} / ${o.kademe||'—'}`:'—')}
          ${bilgiSatir('Görev yeri',okulKademesi,'',true)}
        </div>
      </section>
      <section class="kp-card">
        <div class="kp-card-head"><h2>Yaklaşan Nöbet</h2></div>
        <div class="kp-card-body">
          ${nobet?`<div class="kp-next-duty"><div class="kp-next-duty-icon">🛡️</div><div><b>${esc(tarihYaz(nobet.tarih))} · ${esc(gunAdi(nobet.tarih))}</b><span>${esc(nobetYeri(nobet))}</span></div></div>`:`<div class="kp-next-duty"><div class="kp-next-duty-icon">✓</div><div><b>Yaklaşan nöbet görünmüyor</b><span>Nöbet programında yeni atama olduğunda burada gösterilir.</span></div></div>`}
          ${bilgiSatir('Toplam nöbet kaydı',String(nobetlerim(o).length))}
        </div>
      </section>
      <section class="kp-card">
        <div class="kp-card-head"><h2>Hızlı İşlemler</h2></div>
        <div class="kp-quick-actions">
          <button class="kp-quick" type="button" onclick="profilProgramimAc()"><i>📅</i><span><b>Programım</b><small>Ders ve nöbet</small></span></button>
          <button class="kp-quick" type="button" onclick="profilRaporAc('${esc(o.id)}')"><i>📄</i><span><b>Profil raporu</b><small>PDF / yazdır</small></span></button>
          ${telefon?`<button class="kp-quick" type="button" onclick="telefonAra('${esc(telefon).replace(/'/g,'')}')"><i>📞</i><span><b>Ara</b><small>${esc(telefon)}</small></span></button>`:''}
          ${telefon?`<button class="kp-quick" type="button" onclick="whatsappGonder('${esc(telefon).replace(/'/g,'')}','Merhaba')"><i>💬</i><span><b>WhatsApp</b><small>Mesaj gönder</small></span></button>`:''}
        </div>
      </section>
    </div>
    <div class="kp-note">Branş, ünvan, kariyer basamağı ve resmî personel bilgileri okul yönetimi tarafından güncellenir. Profilinizde telefon, e-posta ve profil fotoğrafınızı değiştirebilirsiniz.</div>
  </div>`;
  document.body.appendChild(profile);
  document.body.classList.add('kp-profile-open');
  if(typeof _pullToRefreshAyarla==='function') _pullToRefreshAyarla(false);
}
window.profilSayfasiAc=profilSayfasiAc;

function bagla(){
  if(typeof window.profilVeyaSecimAc!=='function') return false;
  if(window.profilVeyaSecimAc.__korukProfilePage) return true;
  window.__KORUK_PROFILE_OLD_OPEN__=window.profilVeyaSecimAc;
  const yeni=function(){
    const ben=(typeof bagliOgretmenimGetir==='function')?bagliOgretmenimGetir():null;
    if(ben) return profilSayfasiAc();
    return window.__KORUK_PROFILE_OLD_OPEN__.apply(this,arguments);
  };
  yeni.__korukProfilePage=true;
  window.profilVeyaSecimAc=yeni;
  return true;
}
let n=0;const t=setInterval(()=>{if(bagla()||++n>100)clearInterval(t)},100);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bagla,0));else bagla();
})();
