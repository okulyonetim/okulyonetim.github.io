/* Koruk Asistan — Ödev Takip + Not Çizelgesi modern UI v1 */
(function(){
'use strict';
if(window.__ONC_MODERN_V1__)return;window.__ONC_MODERN_V1__=true;
function esc(v){try{return typeof window.escapeHtml==='function'?window.escapeHtml(String(v??'')):String(v??'')}catch(_){return String(v??'')}}
function list(t){try{return typeof _oncListesi==='function'?_oncListesi(t):[]}catch(_){return[]}}
function className(id){try{return typeof _oncSinifAdi==='function'?_oncSinifAdi(id):'—'}catch(_){return'—'}}
function label(t){try{return typeof ONC_BASLIK!=='undefined'?ONC_BASLIK[t]:(t==='odevTakip'?'Ödev Takip Çizelgesi':'Not Çizelgesi')}catch(_){return t}}
function host(t){return document.getElementById(t==='odevTakip'?'odevTakipListesi':'notCizelgesiListesi')}
function ensureHero(t){const h=host(t);if(!h)return;const tab=h.closest('.tab-panel');if(!tab||tab.querySelector('.onc-modern-hero'))return;const hero=document.createElement('section');hero.className='onc-modern-hero';hero.innerHTML=t==='odevTakip'?'<small>ÖĞRENCİ TAKİBİ</small><h2>Ödev Takip Çizelgesi</h2><p>Ödevleri sınıf bazında takip edin; öğrenci durumlarını hızlıca işaretleyin ve çizelgenizi tek seferde kaydedin.</p>':'<small>ÖLÇME VE TAKİP</small><h2>Not Çizelgesi</h2><p>Artı/eksi veya sayısal puan modu ile öğrencilerin performansını düzenli ve tek ekranda yönetin.</p>';const ph=tab.querySelector('.page-header');ph?ph.after(hero):tab.prepend(hero)}
function render(t){const h=host(t);if(!h)return;ensureHero(t);const rows=list(t);const cards=rows.map(k=>`<article class="card onc-kart"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div style="min-width:0"><div style="font-weight:800;font-size:16px;line-height:1.3">${esc(k.ad||'(isimsiz)')}</div><div class="onc-card-meta"><span>${esc(className(k.sinifId))}</span><span>${(k.ogrenciler||[]).length} öğrenci</span><span>${(k.sutunlar||[]).length} sütun</span></div></div><button class="btn btn-ghost btn-sm" data-onc-del="${esc(k.id)}" title="Sil">🗑️</button></div><div style="display:flex;gap:8px;margin-top:auto"><button class="btn btn-primary btn-sm" style="flex:1" data-onc-open="${esc(k.id)}">Aç</button><button class="btn btn-ghost btn-sm" data-onc-pdf="${esc(k.id)}">PDF</button></div></article>`).join('');h.innerHTML=`<div class="onc-modern-list-head"><div><b style="font-size:17px;color:var(--onc-text)">${esc(label(t))}</b><div style="font-size:12px;color:var(--onc-muted);margin-top:3px">${rows.length} kayıt</div></div><button class="btn onc-new-btn" data-onc-new="${t}">+ Yeni Çizelge</button></div>${cards?`<div class="onc-modern-grid">${cards}</div>`:`<div class="onc-empty-modern"><b>Henüz çizelge yok</b><span>İlk çizelgenizi oluşturmak için “Yeni Çizelge” butonunu kullanın.</span></div>`}`;h.querySelector('[data-onc-new]')?.addEventListener('click',()=>window.oncYeniModalAc&&window.oncYeniModalAc(t));h.querySelectorAll('[data-onc-open]').forEach(b=>b.onclick=()=>window.oncDetayAc&&window.oncDetayAc(t,b.dataset.oncOpen));h.querySelectorAll('[data-onc-pdf]').forEach(b=>b.onclick=()=>window.oncPdfIndir&&window.oncPdfIndir(t,b.dataset.oncPdf));h.querySelectorAll('[data-onc-del]').forEach(b=>b.onclick=()=>window.oncSil&&window.oncSil(t,b.dataset.oncDel))}
function decorateModal(id){const el=document.getElementById(id);if(!el)return;el.classList.add('onc-modernized');document.body.classList.add('onc-modal-open')}
function clearModalFlag(){if(!document.getElementById('oncModal')&&!document.getElementById('oncMiniModal'))document.body.classList.remove('onc-modal-open')}
function wrap(name,after){const old=window[name];if(typeof old!=='function'||old.__oncModern)return;const f=function(){const r=old.apply(this,arguments);try{after&&after.apply(this,arguments)}catch(e){console.warn('[onc-modern]',name,e)}return r};f.__oncModern=true;window[name]=f}
function install(){
 wrap('renderOncListesi',t=>render(t));
 wrap('oncYeniModalAc',()=>requestAnimationFrame(()=>decorateModal('oncModal')));
 wrap('oncSutunEkleModalAc',()=>requestAnimationFrame(()=>decorateModal('oncMiniModal')));
 wrap('oncOgrenciEkleModalAc',()=>requestAnimationFrame(()=>decorateModal('oncMiniModal')));
 wrap('oncDetayAc',()=>requestAnimationFrame(()=>{document.body.classList.add('onc-detail-open');const ov=document.getElementById('oncDetayOverlay');if(ov)ov.classList.add('onc-modern-detail')}));
 wrap('oncDetayKapat',()=>{document.body.classList.remove('onc-detail-open');clearModalFlag()});
 wrap('oncSutunEkleOnayla',()=>requestAnimationFrame(clearModalFlag));wrap('oncOgrenciEkleOnayla',()=>requestAnimationFrame(clearModalFlag));
 ensureHero('odevTakip');ensureHero('notCizelgesi');render('odevTakip');render('notCizelgesi');
}
let tries=0,t=setInterval(()=>{install();if(++tries>80)clearInterval(t)},100);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
const mo=new MutationObserver(()=>{if(!document.getElementById('oncModal')&&!document.getElementById('oncMiniModal'))clearModalFlag();if(!document.getElementById('oncDetayOverlay'))document.body.classList.remove('onc-detail-open')});mo.observe(document.body,{childList:true});
})();
