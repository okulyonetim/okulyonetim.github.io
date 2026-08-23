/* Koruk Asistan — Öğrenci Listesi Oluşturucu modern UI katmanı
 * Veri/kayıt/PDF/Excel akışına dokunmaz; mevcut ogretmen-liste-olusturucu.js
 * fonksiyonlarını görsel olarak sarar.
 */
(function(){
'use strict';
if(window.__KH_OL_MODERN_V1__)return;window.__KH_OL_MODERN_V1__=true;

const svg={
 list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1.5 1.5L7 5m-4 7 1.5 1.5L7 11m-4 7 1.5 1.5L7 17"/></svg>',
 users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6"/><path d="M16 5a3 3 0 0 1 0 6M17 14c2.5.5 4 2.3 4 5"/></svg>',
 columns:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/></svg>'
};
function hero(){return `<section class="ol-modern-hero"><small>ÖĞRENCİ LİSTESİ OLUŞTURUCU</small><h2>İhtiyacınıza göre çizelge hazırlayın</h2><p>Sınıfınızı seçin, kullanacağınız sütunları belirleyin, tabloyu doğrudan düzenleyin ve mevcut yazdırma, PDF veya Excel araçlarıyla dışa aktarın.</p></section>`}
function decorate(){
 const root=document.getElementById('olIcerik');if(!root)return;
 if(!root.querySelector('.ol-modern-hero'))root.insertAdjacentHTML('afterbegin',hero());
 const first=[...root.children].find(x=>x.classList&&x.classList.contains('card')&&!x.classList.contains('ol-modern-hero'));
 if(first)first.classList.add('ol-class-card');
 const area=document.getElementById('olCalismaAlani');if(!area)return;
 area.querySelectorAll('.card').forEach((c,i)=>{c.classList.add('ol-work-card');if(i===0)c.classList.add('ol-work-card-primary')});
 area.querySelectorAll('table').forEach(t=>{const p=t.parentElement;if(p)p.classList.add('ol-table-shell')});
 area.querySelectorAll('button').forEach(b=>{
   const tx=(b.textContent||'').trim().toLocaleLowerCase('tr');
   if(/pdf|excel|yazdır|yazdir/.test(tx))b.classList.add('ol-export-btn');
   if(/kaydet|güncelle|guncelle/.test(tx))b.classList.add('ol-save-btn');
 });
 area.querySelectorAll('h3,h4,strong').forEach(h=>{const tx=(h.textContent||'').trim();if(tx.length>2&&tx.length<60)h.classList.add('ol-section-title')});
 updateSummary();
}
function updateSummary(){
 const area=document.getElementById('olCalismaAlani');if(!area||!window._olSeciliSinif)return;
 let bar=area.querySelector('.ol-modern-summary');
 const rows=Array.isArray(window._olSatirlar)?window._olSatirlar.length:0;
 const checks=document.querySelectorAll('#tab-ogretmenListe .ol-sutun-check:checked').length;
 if(!bar){bar=document.createElement('div');bar.className='ol-modern-summary';area.prepend(bar)}
 bar.innerHTML=`<div><span class="ico">${svg.users}</span><span><small>Sınıf</small><b>${String(window._olSeciliSinif||'')}</b></span></div><div><span class="ico blue">${svg.list}</span><span><small>Öğrenci</small><b>${rows}</b></span></div><div><span class="ico amber">${svg.columns}</span><span><small>Seçili sütun</small><b>${checks}</b></span></div>`;
}
function bindObserver(){
 const root=document.getElementById('olIcerik');if(!root||root.dataset.olModernBound==='1')return;
 root.dataset.olModernBound='1';let q=false;
 new MutationObserver(()=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;decorate()})}).observe(root,{childList:true,subtree:true});
 root.addEventListener('change',e=>{if(e.target.matches('.ol-sutun-check,#olSinifSecici'))requestAnimationFrame(updateSummary)});
}
function install(){
 if(typeof window.ogretmenListeSekmesiAc==='function'&&!window.ogretmenListeSekmesiAc.__modern){
  const old=window.ogretmenListeSekmesiAc;
  const fn=function(){const r=old.apply(this,arguments);requestAnimationFrame(()=>{decorate();bindObserver()});return r};fn.__modern=true;window.ogretmenListeSekmesiAc=fn;
 }
 if(typeof window.olCalismaAlaniOlustur==='function'&&!window.olCalismaAlaniOlustur.__modern){
  const old=window.olCalismaAlaniOlustur;
  const fn=async function(){const r=await old.apply(this,arguments);requestAnimationFrame(decorate);return r};fn.__modern=true;window.olCalismaAlaniOlustur=fn;
 }
 requestAnimationFrame(()=>{decorate();bindObserver()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,700);
})();