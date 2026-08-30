/* Koruk Asistan — Taşıma servis detay klasik çalışma alanı paritesi
 * Veri modeli oluşturmaz. Okumalar AppStore'dan; bütün kalıcı yazmalar
 * canonical TasimaService üzerinden; liste/rapor çıktıları ReportEngine üzerinden gider.
 */
(function(global){
'use strict';
if(global.TransportServiceParity)return;

const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const norm=v=>String(v??'').toLocaleUpperCase('tr').replace(/\s+/g,' ').trim();
let observer=null,installed=false,currentPage='services',activeServiceId='';

const canEdit=()=>!global.PermissionService||global.PermissionService.can('transport.services.edit','edit');
const service=id=>arr('servisler').find(x=>x.id===id)||null;
const serviceName=s=>s?.servisAdi||s?.guzergah||s?.plaka||'Servis';
const className=id=>arr('siniflar').find(x=>x.id===id)?.ad||id||'—';
const students=id=>arr('veliler').filter(v=>v.servisId===id).slice().sort((a,b)=>{
 const ca=className(a.sinifId),cb=className(b.sinifId),c=ca.localeCompare(cb,'tr',{numeric:true});
 return c||String(a.ogrenciAdi||'').localeCompare(String(b.ogrenciAdi||''),'tr');
});
const phone=v=>v.telefon1||v.telefon||v.telefon2||v.telefon3||'';
const close=id=>document.getElementById(id)?.remove();

function enhanceCards(){
 if(currentPage!=='services'||global.AppStore?.get?.('ui.route')!=='transport')return;
 const root=$('#transportContent');if(!root)return;
 $$('[data-transport-denetim]',root).forEach(btn=>{
   const id=btn.dataset.transportDenetim;if(!id)return;const card=btn.closest('.ka-list-card');if(!card)return;
   if(!card.querySelector(`[data-transport-detail="${CSS.escape(id)}"]`)){
     const detail=document.createElement('button');detail.type='button';detail.className='ka-btn ka-btn--secondary ka-btn--sm';detail.dataset.transportDetail=id;detail.textContent='Detay';detail.onclick=()=>openDetail(id);btn.parentElement?.prepend(detail);
   }
   const s=service(id),head=card.querySelector('.ka-card__body > .ka-row');
   if(s&&head&&!head.querySelector('[data-transport-status]')){
     const badge=document.createElement('span');badge.className='ka-badge';badge.dataset.transportStatus='';badge.textContent=s.durum||'Aktif';head.appendChild(badge);
   }
 });
}

function detailStudentRow(v,presidents){
 const isPresident=presidents.has(v.id),tel=phone(v);
 return `<article class="ka-card"><div class="ka-card__body ka-row ka-row--between" style="gap:12px"><div class="ka-grow"><strong>${isPresident?'👑 ':''}${esc(v.ogrenciAdi||'Öğrenci')}</strong>${v.ogrenciNo?` <span class="ka-muted">No: ${esc(v.ogrenciNo)}</span>`:''}<div class="ka-muted">${esc(className(v.sinifId))}${v.cinsiyet?` · ${esc(v.cinsiyet)}`:''}${v.veliAdi?` · Veli: ${esc(v.veliAdi)}`:''}</div>${tel?`<div class="ka-muted">📞 <a href="tel:${esc(tel)}">${esc(tel)}</a></div>`:''}</div>${canEdit()?`<button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-transport-remove-student="${esc(v.id)}">Çıkar</button>`:''}</div></article>`;
}

function detailHtml(s){
 const list=students(s.id),presidents=new Set(Array.isArray(s.baskanlar)?s.baskanlar:[]);
 return `<section class="ka-modal" style="width:min(920px,calc(100vw - 20px));max-height:92dvh"><div class="ka-modal__header"><div><h2>${esc(serviceName(s))}</h2><p class="ka-muted">${esc([s.plaka,s.guzergah,s.durum||'Aktif'].filter(Boolean).join(' · '))}</p></div><button class="ka-icon-button" type="button" data-transport-detail-close aria-label="Kapat">×</button></div><div class="ka-modal__body ka-stack">
 <section class="ka-grid"><article class="ka-card"><div class="ka-card__body"><div class="ka-muted">Sürücü</div><strong>${esc(s.soforAdi||'—')}</strong>${s.soforTelefon?`<div><a href="tel:${esc(s.soforTelefon)}">${esc(s.soforTelefon)}</a></div>`:''}</div></article><article class="ka-card"><div class="ka-card__body"><div class="ka-muted">Öğrenci</div><strong>${list.length}</strong></div></article><article class="ka-card"><div class="ka-card__body"><div class="ka-muted">Servis Başkanı</div><strong>${presidents.size}</strong></div></article></section>
 ${s.notlar?`<article class="ka-card"><div class="ka-card__body"><strong>Not</strong><div class="ka-muted">${esc(s.notlar)}</div></div></article>`:''}
 <div class="ka-row ka-wrap"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-transport-detail-report="monthly">📋 Aylık Takip</button><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-transport-detail-report="inspection">📄 Denetim Formu</button><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-transport-list>📋 Liste Oluştur</button>${canEdit()?`<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-transport-excel>📥 Excel'den Ekle</button><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-transport-presidents>👑 Başkanlar</button><button class="ka-btn" type="button" data-transport-add-student>+ Öğrenci Ekle</button>`:''}</div>
 ${canEdit()?`<details class="ka-card"><summary class="ka-card__body"><strong>Servis Ayarları</strong></summary><div class="ka-card__body ka-stack"><label class="ka-field"><span class="ka-field__label">Durum</span><select data-transport-status-edit><option value="Aktif" ${(s.durum||'Aktif')==='Aktif'?'selected':''}>Aktif</option><option value="Pasif" ${s.durum==='Pasif'?'selected':''}>Pasif</option></select></label><label class="ka-field"><span class="ka-field__label">Notlar</span><textarea rows="3" data-transport-notes>${esc(s.notlar||'')}</textarea></label><button class="ka-btn" type="button" data-transport-settings-save>Ayarları Kaydet</button></div></details>`:''}
 <section class="ka-stack"><div class="ka-row ka-row--between"><div><h3>Servis Öğrenci Listesi</h3><div class="ka-muted">Sınıf, veli ve telefon bilgileri cihazdaki öğrenci kayıtlarından gelir.</div></div><span class="ka-badge">${list.length}</span></div>${list.length?list.map(v=>detailStudentRow(v,presidents)).join(''):'<div class="ka-empty">Bu serviste kayıtlı öğrenci yok.</div>'}</section>
 </div></section>`;
}

function openDetail(id){
 const s=service(id);if(!s)return;close('transportServiceDetail');activeServiceId=id;
 const ov=document.createElement('div');ov.id='transportServiceDetail';ov.className='ka-modal-backdrop';ov.innerHTML=detailHtml(s);document.body.appendChild(ov);global.PermissionService?.apply?.(ov);
 $$('[data-transport-detail-close]',ov).forEach(b=>b.onclick=()=>{ov.remove();activeServiceId=''});ov.addEventListener('click',e=>{if(e.target===ov){ov.remove();activeServiceId=''}});
 $('[data-transport-add-student]',ov)?.addEventListener('click',()=>openAddStudents(id));
 $('[data-transport-presidents]',ov)?.addEventListener('click',()=>openPresidents(id));
 $('[data-transport-excel]',ov)?.addEventListener('click',()=>openExcel(id));
 $('[data-transport-list]',ov)?.addEventListener('click',()=>openListBuilder(id));
 $('[data-transport-settings-save]',ov)?.addEventListener('click',async()=>{const btn=$('[data-transport-settings-save]',ov);btn.disabled=true;try{await global.TasimaService.servisKaydet(id,{durum:$('[data-transport-status-edit]',ov)?.value||'Aktif',notlar:String($('[data-transport-notes]',ov)?.value||'').trim()});global.toast?.('Servis ayarları kaydedildi.');openDetail(id)}catch(e){global.toast?.('Ayarlar kaydedilemedi: '+(e?.message||e));btn.disabled=false}});
 $$('[data-transport-remove-student]',ov).forEach(b=>b.onclick=()=>removeStudent(id,b.dataset.transportRemoveStudent));
 $$('[data-transport-detail-report]',ov).forEach(b=>b.onclick=async()=>{try{if(b.dataset.transportDetailReport==='inspection')await global.TransportReports?.denetim?.(id);else global.TransportReports?.takipSec?.(id)}catch(e){global.toast?.('Rapor açılamadı: '+(e?.message||e))}});
}

async function removeStudent(servisId,studentId){
 const v=arr('veliler').find(x=>x.id===studentId);if(!v||!confirm(`“${v.ogrenciAdi||'Öğrenci'}” bu servisten çıkarılsın mı?`))return;
 try{await global.TasimaService.ogrencileriServiseAta([studentId],'','');const s=service(servisId),next=(Array.isArray(s?.baskanlar)?s.baskanlar:[]).filter(x=>x!==studentId);if((s?.baskanlar||[]).length!==next.length)await global.TasimaService.servisKaydet(servisId,{baskanlar:next});global.toast?.('Öğrenci servisten çıkarıldı.');requestAnimationFrame(()=>openDetail(servisId))}catch(e){global.toast?.('Öğrenci çıkarılamadı: '+(e?.message||e))}
}

function classOptions(){return arr('siniflar').slice().sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr',{numeric:true})).map(s=>`<option value="${esc(s.id)}">${esc(s.ad||'Sınıf')}</option>`).join('')}
function openAddStudents(id){
 const s=service(id);if(!s)return;close('transportAddStudents');const ov=document.createElement('div');ov.id='transportAddStudents';ov.className='ka-modal-backdrop';ov.innerHTML=`<section class="ka-modal"><div class="ka-modal__header"><div><h2>Öğrenci Ekle</h2><p class="ka-muted">${esc(serviceName(s))}</p></div><button class="ka-icon-button" data-close type="button">×</button></div><div class="ka-modal__body ka-stack"><label class="ka-field"><span class="ka-field__label">Sınıf</span><select data-class><option value="">Sınıf seçin</option>${classOptions()}</select></label><div data-student-list class="ka-stack"><div class="ka-empty">Önce sınıf seçin.</div></div></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" data-close type="button">Vazgeç</button><button class="ka-btn" data-apply type="button">Seçilenleri Servise Ata</button></div></section>`;document.body.appendChild(ov);
 $$('[data-close]',ov).forEach(b=>b.onclick=()=>ov.remove());const list=$('[data-student-list]',ov),sel=$('[data-class]',ov);sel.onchange=()=>{const rs=arr('veliler').filter(v=>v.sinifId===sel.value).sort((a,b)=>String(a.ogrenciAdi||'').localeCompare(String(b.ogrenciAdi||''),'tr'));list.innerHTML=rs.length?rs.map(v=>{const here=v.servisId===id,other=v.servisId&&v.servisId!==id;return `<label class="ka-card"><div class="ka-card__body ka-row"><input type="checkbox" value="${esc(v.id)}" data-student-check ${here?'checked disabled':''}><div class="ka-grow"><strong>${esc(v.ogrenciAdi||'')}</strong><div class="ka-muted">${v.ogrenciNo?`No: ${esc(v.ogrenciNo)} · `:''}${here?'Bu serviste':other?`Başka serviste: ${esc(v.servisAdi||'Servis')}`:'Servis atanmamış'}</div></div></div></label>`}).join(''):'<div class="ka-empty">Bu sınıfta öğrenci bulunamadı.</div>'};
 $('[data-apply]',ov).onclick=async()=>{const ids=$$('[data-student-check]:checked:not(:disabled)',ov).map(x=>x.value);if(!ids.length)return global.toast?.('En az bir öğrenci seçin.');if(ids.some(sid=>{const v=arr('veliler').find(x=>x.id===sid);return v?.servisId&&v.servisId!==id})&&!confirm('Seçilen öğrencilerden bazıları başka serviste. Yeni servise taşınsın mı?'))return;const b=$('[data-apply]',ov);b.disabled=true;try{await global.TasimaService.ogrencileriServiseAta(ids,id,serviceName(s));global.toast?.(`${ids.length} öğrenci servise atandı.`);ov.remove();openDetail(id)}catch(e){global.toast?.('Öğrenciler atanamadı: '+(e?.message||e));b.disabled=false}};
}

function openPresidents(id){
 const s=service(id),list=students(id);if(!s)return;close('transportPresidents');const selected=new Set(Array.isArray(s.baskanlar)?s.baskanlar:[]),ov=document.createElement('div');ov.id='transportPresidents';ov.className='ka-modal-backdrop';ov.innerHTML=`<section class="ka-modal"><div class="ka-modal__header"><div><h2>Servis Başkanları</h2><p class="ka-muted">Bir veya birden fazla öğrenci seçilebilir.</p></div><button class="ka-icon-button" data-close type="button">×</button></div><div class="ka-modal__body ka-stack">${list.length?list.map(v=>`<label class="ka-card"><div class="ka-card__body ka-row"><input type="checkbox" data-president value="${esc(v.id)}" ${selected.has(v.id)?'checked':''}><span>${esc(v.ogrenciAdi||'')} · ${esc(className(v.sinifId))}</span></div></label>`).join(''):'<div class="ka-empty">Serviste öğrenci yok.</div>'}</div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" data-close type="button">Vazgeç</button><button class="ka-btn" data-save type="button">Kaydet</button></div></section>`;document.body.appendChild(ov);$$('[data-close]',ov).forEach(b=>b.onclick=()=>ov.remove());$('[data-save]',ov).onclick=async()=>{const ids=$$('[data-president]:checked',ov).map(x=>x.value),b=$('[data-save]',ov);b.disabled=true;try{await global.TasimaService.servisKaydet(id,{baskanlar:ids});global.toast?.('Servis başkanları güncellendi.');ov.remove();openDetail(id)}catch(e){global.toast?.('Başkanlar kaydedilemedi: '+(e?.message||e));b.disabled=false}};
}

async function ensureStudentParser(){
 if(global.PeopleImportUI?.parseStudentExcel)return true;
 await global.AppLoader?.loadScript?.('js/modules/people-import.js');
 if(!global.PeopleImportUI?.parseStudentExcel)throw new Error('Excel öğrenci ayrıştırıcısı yüklenemedi.');return true;
}
function findExistingStudent(r){const all=arr('veliler'),no=String(r.ogrenciNo||'').trim();if(no){const byNo=all.find(v=>String(v.ogrenciNo||'').trim()===no);if(byNo)return byNo}return all.find(v=>norm(v.ogrenciAdi)===norm(r.ogrenciAdi)&&(!r.sinifId||v.sinifId===r.sinifId))||null}
function openExcel(id){
 const s=service(id);if(!s)return;close('transportExcelImport');const ov=document.createElement('div');ov.id='transportExcelImport';ov.className='ka-modal-backdrop';ov.innerHTML=`<section class="ka-modal"><div class="ka-modal__header"><div><h2>Excel'den Servise Ekle</h2><p class="ka-muted">Mevcut öğrenci kayıtlarını öğrenci no/ad ile eşleştirir; yeni öğrenci kaydı üretmez.</p></div><button class="ka-icon-button" data-close type="button">×</button></div><div class="ka-modal__body"><label class="ka-field"><span class="ka-field__label">Excel Dosyası (.xlsx / .xls)</span><input type="file" accept=".xlsx,.xls" data-file></label><div class="ka-muted" data-result></div></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" data-close type="button">Vazgeç</button><button class="ka-btn" data-import type="button">Eşleştir ve Ata</button></div></section>`;document.body.appendChild(ov);$$('[data-close]',ov).forEach(b=>b.onclick=()=>ov.remove());$('[data-import]',ov).onclick=async()=>{const file=$('[data-file]',ov)?.files?.[0];if(!file)return global.toast?.('Excel dosyası seçin.');const b=$('[data-import]',ov),out=$('[data-result]',ov);b.disabled=true;try{await ensureStudentParser();const parsed=await global.PeopleImportUI.parseStudentExcel(file),matched=[],unmatched=[];for(const r of parsed){const v=findExistingStudent(r);v?matched.push(v.id):unmatched.push(r.ogrenciAdi||r.ogrenciNo||'Bilinmeyen')}const ids=[...new Set(matched)];if(!ids.length)throw new Error('Dosyadaki öğrenciler mevcut kayıtlarla eşleşmedi.');await global.TasimaService.ogrencileriServiseAta(ids,id,serviceName(s));out.textContent=`${ids.length} öğrenci eşleşti ve atandı${unmatched.length?`, ${unmatched.length} satır eşleşmedi`:''}.`;global.toast?.(`${ids.length} öğrenci servise atandı.`);setTimeout(()=>{ov.remove();openDetail(id)},250)}catch(e){out.textContent='İçe aktarma hatası: '+(e?.message||e);b.disabled=false}};
}

const LIST_COLS=[['sira','Sıra'],['ogrenciAdi','Ad Soyad'],['ogrenciNo','Öğrenci No'],['sinif','Sınıf'],['cinsiyet','Cinsiyet'],['baskan','Servis Başkanı'],['veliAdi','Veli Adı'],['yakinlik','Yakınlık'],['telefon1','Telefon 1'],['telefon2','Telefon 2']];
function listValue(k,v,i,s){if(k==='sira')return i+1;if(k==='sinif')return className(v.sinifId);if(k==='baskan')return(Array.isArray(s.baskanlar)&&s.baskanlar.includes(v.id))?'Evet':'';if(k==='yakinlik')return v.yakinlik1||v.yakinlik||'';if(k==='telefon1')return v.telefon1||v.telefon||'';return v[k]||''}
function openListBuilder(id){
 const s=service(id);if(!s)return;close('transportListBuilder');const year=new Date().getFullYear(),ov=document.createElement('div');ov.id='transportListBuilder';ov.className='ka-modal-backdrop';ov.innerHTML=`<section class="ka-modal"><div class="ka-modal__header"><div><h2>Servis Listesi Oluştur</h2><p class="ka-muted">${esc(serviceName(s))}</p></div><button class="ka-icon-button" data-close type="button">×</button></div><div class="ka-modal__body ka-stack"><label class="ka-field"><span class="ka-field__label">Başlık</span><input data-title value="${esc(serviceName(s))} ÖĞRENCİ LİSTESİ"></label><label class="ka-field"><span class="ka-field__label">Alt Başlık</span><input data-subtitle value="${year}-${year+1} Eğitim Öğretim Yılı"></label><div class="ka-grid">${LIST_COLS.map(([k,l])=>`<label class="ka-check"><input type="checkbox" data-col value="${k}" ${['sira','ogrenciAdi','ogrenciNo','sinif','baskan','veliAdi','telefon1'].includes(k)?'checked':''}> ${esc(l)}</label>`).join('')}</div><label class="ka-field"><span class="ka-field__label">Sayfa Yönü</span><select data-orientation><option value="dikey">Dikey</option><option value="yatay">Yatay</option></select></label></div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" data-close type="button">Vazgeç</button><button class="ka-btn" data-print type="button">Önizle / Yazdır</button></div></section>`;document.body.appendChild(ov);$$('[data-close]',ov).forEach(b=>b.onclick=()=>ov.remove());$('[data-print]',ov).onclick=()=>{const keys=$$('[data-col]:checked',ov).map(x=>x.value);if(!keys.length)return global.toast?.('En az bir sütun seçin.');const list=students(id),school=arr('okulBilgileri')[0]||{},head=`<h1>${esc(school.okulAdi||'KORUK İLK-ORTAOKULU')}</h1><h2>${esc($('[data-title]',ov).value||'SERVİS ÖĞRENCİ LİSTESİ')}</h2><p style="text-align:center">${esc($('[data-subtitle]',ov).value||'')}</p>`,table=`<table><thead><tr>${keys.map(k=>`<th>${esc(LIST_COLS.find(x=>x[0]===k)?.[1]||k)}</th>`).join('')}</tr></thead><tbody>${list.map((v,i)=>`<tr>${keys.map(k=>`<td>${esc(listValue(k,v,i,s))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;global.ReportEngine?.printReport?.('Servis Öğrenci Listesi',head+table,{fileName:`${s.plaka||serviceName(s)}_Ogrenci_Listesi`,yon:$('[data-orientation]',ov).value||'dikey'});};
}

function closeAll(){['transportServiceDetail','transportAddStudents','transportPresidents','transportExcelImport','transportListBuilder'].forEach(close);activeServiceId=''}
function install(){
 if(installed)return true;const mod=global.TransportModule;if(!mod?.mount||!mod?.openPage)return false;
 const mount=mod.mount.bind(mod),openPage=mod.openPage.bind(mod),unmount=mod.unmount?.bind(mod);
 mod.mount=async function(...args){const r=await mount(...args);currentPage='services';startObserver();requestAnimationFrame(enhanceCards);return r};
 mod.openPage=function(page,title=''){currentPage=page;const r=openPage(page,title);if(page!=='services')closeAll();requestAnimationFrame(enhanceCards);return r};
 if(unmount)mod.unmount=function(){stopObserver();closeAll();return unmount()};
 mod.openServiceDetail=openDetail;installed=true;startObserver();requestAnimationFrame(enhanceCards);return true;
}
function startObserver(){if(observer)return;const root=document.getElementById('v2ModuleRoot');if(!root)return;observer=new MutationObserver(()=>requestAnimationFrame(enhanceCards));observer.observe(root,{childList:true,subtree:true})}
function stopObserver(){observer?.disconnect();observer=null}
if(!install())global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='transport')install()});
global.TransportServiceParity={install,openDetail,openAddStudents,openPresidents,openExcel,openListBuilder,enhanceCards,close:closeAll,get activeServiceId(){return activeServiceId}};
})(window);
