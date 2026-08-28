/* Koruk Asistan — legacy akademik sayfa uyarlamaları
 * Eski yazılı/deneme kullanıcı davranışını mevcut local-first AcademicModule üzerine taşır.
 * Veri yazmaz; yalnız mevcut AppStore verisini ve AcademicModule render çıktısını düzenler.
 */
(function(global){
'use strict';
if(global.AcademicLegacyUI)return;
let observer=null,scheduled=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const exams=()=>Array.isArray(global.AppStore?.data?.('sinavlar'))?global.AppStore.data('sinavlar'):[];
function dayDiff(iso){if(!iso)return null;const now=new Date();now.setHours(0,0,0,0);const d=new Date(String(iso).slice(0,10)+'T00:00:00');if(Number.isNaN(d.getTime()))return null;return Math.round((d-now)/86400000)}
function writtenActive(root){return !!root?.querySelector?.('[data-written-new],[data-written-edit]')||root?.querySelector?.('.ka-row strong')?.textContent?.trim()==='Yazılı Sınavlar'}
function decorateWritten(){const root=document.getElementById('academicContent');if(!root||!writtenActive(root))return false;const list=exams();let upcoming=0,today=0;list.forEach(x=>{const d=dayDiff(x.tarih);if(d===0)today++;if(d!==null&&d>=0&&d<=7)upcoming++});
  root.classList.add('ka-legacy-written-page');
  const head=root.firstElementChild;
  if(head){head.classList.add('ka-people-page-head');const title=head.querySelector('strong');if(title){title.outerHTML='<div><small class="ka-people-kicker">SINAV YÖNETİMİ</small><h1>Yazılı Sınavlar</h1><p class="ka-muted">Sınav takvimini, sınıfları ve sınav ayrıntılarını tek ekrandan yönetin.</p></div>'}}
  let summary=root.querySelector('[data-written-summary]');if(!summary){summary=document.createElement('div');summary.dataset.writtenSummary='';summary.className='ka-people-summary-grid';if(head?.nextSibling)root.insertBefore(summary,head.nextSibling);else root.appendChild(summary)}
  summary.innerHTML=`<article class="ka-card"><small>TOPLAM SINAV</small><b>${list.length}</b></article><article class="ka-card"><small>7 GÜN İÇİNDE</small><b>${upcoming}</b></article><article class="ka-card"><small>BUGÜN</small><b>${today}</b></article>`;
  root.querySelectorAll('.ka-list-card').forEach(card=>{const badge=card.querySelector('.ka-badge'),iso=[...list].find(s=>badge&&badge.textContent.trim()===new Date(String(s.tarih||'')+'T00:00:00').toLocaleDateString('tr-TR'))?.tarih;if(!iso)return;const d=dayDiff(iso);card.classList.toggle('is-today',d===0);card.classList.toggle('is-upcoming',d!==null&&d>0&&d<=7)});
  return true;
}
function decorateWrittenModal(){const ov=document.getElementById('kaAcademicScheduleModal');if(!ov||!ov.querySelector('[data-w-period]'))return false;const body=ov.querySelector('.ka-modal__body');if(!body||body.querySelector('[data-written-modal-intro]'))return true;const editing=!!ov.querySelector('[data-delete]');const intro=document.createElement('div');intro.dataset.writtenModalIntro='';intro.className='ka-card';intro.innerHTML=`<div class="ka-card__body ka-row"><span class="ka-badge">✓</span><div><strong>${editing?'Sınav kaydını güncelle':'Yeni yazılı sınav oluştur'}</strong><div class="ka-muted">Sınıf, ders, tarih ve sınav ayrıntılarını düzenli biçimde tamamlayın.</div></div></div>`;body.prepend(intro);return true}
function run(){scheduled=false;try{decorateWritten();decorateWrittenModal()}catch(e){console.warn('[AcademicLegacyUI]',e?.message||e)}}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(run)}
function start(){if(observer)return;const target=document.getElementById('v2ModuleRoot')||document.body;observer=new MutationObserver(schedule);observer.observe(target,{childList:true,subtree:true});global.AppStore?.subscribe?.('data.sinavlar',schedule);schedule()}
function stop(){observer?.disconnect?.();observer=null;scheduled=false}
global.AcademicLegacyUI={start,stop,decorateWritten,decorateWrittenModal};
window.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='academic')start()});
if(global.AcademicModule)start();
})(window);
