/* Koruk Asistan — Taşıma Modern v2 */
(function(){
'use strict';
const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const yetkili=()=>typeof tasimaDuzenlemeYetkiliMi==='function'?tasimaDuzenlemeYetkiliMi():(typeof duzenleyebilir==='function'&&duzenleyebilir('tasima'));
function legacyHeroGizle(tab){
  [...tab.children].forEach(el=>{const t=(el.textContent||'').replace(/\s+/g,' ').trim();if(t.includes('Servis araçları, şoför ve güzergah bilgileri')&&t.includes('Oturma Planı Raporu'))el.classList.add('tm-legacy-hero');});
}
function shellKur(){
  const tab=document.getElementById('tab-tasima');if(!tab)return;
  legacyHeroGizle(tab);
  let sh=document.getElementById('tmModernShell');
  if(!sh){sh=document.createElement('section');sh.id='tmModernShell';sh.className='tm-shell';tab.insertBefore(sh,tab.firstChild);}
  const list=Array.isArray(window.servisler)?window.servisler:[];
  const aktif=list.filter(x=>(x.durum||'Aktif')!=='Pasif').length;
  const ogr=list.reduce((n,x)=>n+(Number(x.ogrenciSayisi)||0),0);
  const admin=!!yetkili();
  sh.innerHTML=`<div class="tm-hero"><div class="tm-hero-top"><span class="tm-hero-icon">🚌</span><div><h2>Taşıma</h2><p>Servisler, öğrenciler ve oturma planları</p></div></div><div class="tm-stats"><div><strong>${list.length}</strong><span>Servis</span></div><div><strong>${aktif}</strong><span>Aktif</span></div><div><strong>${ogr}</strong><span>Öğrenci</span></div></div>${admin?`<div class="tm-actions"><button onclick="servisModalAc()">＋ Yeni Servis</button></div>`:`<div class="tm-readonly-note">👁️ Görüntüleme modu</div>`}</div>`;
  tab.classList.toggle('tasima-readonly',!admin);tab.classList.add('tasima-v2-ready');
  tab.querySelectorAll('button').forEach(b=>{const t=(b.textContent||'').trim();if(t.includes('Servis Listesi')||t.includes('Oturma Planları'))b.classList.add('tm-segment');});
}
function kartlariRender(){
  const hedef=document.getElementById('servislerListesi');if(!hedef)return;
  const all=Array.isArray(window.servisler)?window.servisler:[];
  let liste=(window.servisFiltre==='tumu'||!window.servisFiltre)?all:all.filter(s=>s.durum===window.servisFiltre);
  liste=[...liste].sort((a,b)=>(a.servisAdi||'').localeCompare(b.servisAdi||'','tr'));
  const admin=!!yetkili();
  hedef.innerHTML=liste.length?liste.map(s=>`<article class="tm-servis-card" onclick="servisDetayAc('${s.id}')"><div class="tm-bus">🚌</div><div class="tm-card-main"><div class="tm-card-head"><strong>${esc(s.servisAdi||'Servis')}</strong><span class="tm-status ${(s.durum||'Aktif')==='Pasif'?'pasif':'aktif'}">${esc(s.durum||'Aktif')}</span></div><div class="tm-card-line">${s.plaka?`<span>🚘 ${esc(s.plaka)}</span>`:''}${s.soforAdi?`<span>👨‍✈️ ${esc(s.soforAdi)}</span>`:'<span>👨‍✈️ Şoför bilgisi yok</span>'}</div>${s.guzergah?`<div class="tm-route">📍 ${esc(s.guzergah)}</div>`:''}<div class="tm-card-foot">${s.ogrenciSayisi?`<span>👥 ${Number(s.ogrenciSayisi)} öğrenci</span>`:'<span>👥 Öğrenci bilgisi yok</span>'}<span class="tm-open">Detay ›</span></div></div>${admin?`<button class="tm-edit" onclick="event.stopPropagation();servisModalAc('${s.id}')" aria-label="Servisi düzenle">✎</button>`:''}</article>`).join(''):'<div class="tm-empty"><span>🚌</span><strong>Servis kaydı bulunamadı</strong><small>${admin?'Yeni servis ekleyerek başlayabilirsiniz.':'Henüz görüntülenecek servis yok.'}</small></div>';
  shellKur();
}
function oturmaGuvenligi(){
  if(yetkili())return;
  ['soSablonSec','soDuzenlemeToggle','soDuzenlemeKaydet','soDuzenlemeVazgec','soTumunuTemizle','soYuvaAktifEt','soKoltukTikla','soKaydet','sozelSiraEkle','sozelSonSiraSil','sozelTumunuSil'].forEach(ad=>{const fn=window[ad];if(typeof fn==='function'&&!fn.__tmReadonly){const g=function(){return;};g.__tmReadonly=true;window[ad]=g;}});
}
function kur(){shellKur();window.renderServisler=kartlariRender;kartlariRender();oturmaGuvenligi();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',kur,{once:true});else kur();
window.addEventListener('load',()=>requestAnimationFrame(()=>{shellKur();oturmaGuvenligi();}),{once:true});
})();
