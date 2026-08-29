/* Koruk Asistan — Sınıflar legacy içe aktarma araçları
 * Eski Sınıflar UX'indeki Excel / e-Okul akışını yeni local-first SiniflarService'e bağlar.
 * Ayrı veri katmanı oluşturmaz; yalnız UI + dosya ayrıştırma adaptörüdür.
 */
(function(global){
'use strict';
if(global.PeopleImportUI)return;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const norm=v=>String(v??'').toLocaleUpperCase('tr').replace(/\./g,'').replace(/\s+/g,' ').trim();
let observer=null,busy=false;
function canImport(){return !global.PermissionService||global.PermissionService.can('people.students.edit','edit')}
function loadScript(src,test){if(test())return Promise.resolve();return new Promise((ok,no)=>{const old=[...document.scripts].find(s=>s.src===src);if(old){old.addEventListener('load',ok,{once:true});old.addEventListener('error',no,{once:true});return}const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
const ensureXlsx=()=>loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',()=>!!global.XLSX);
async function rows(file){await ensureXlsx();const wb=global.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true}),ws=wb.Sheets[wb.SheetNames[0]];return global.XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null})}
function headerIndex(data,test){return data.findIndex(r=>Array.isArray(r)&&test(r))}
function col(h,...names){for(const n of names){const i=h.indexOf(n);if(i>=0)return i}return-1}
function classByName(name){return arr('siniflar').find(s=>String(s.ad||'').localeCompare(String(name||''),'tr',{sensitivity:'base'})===0)||null}
function serviceByName(name){return arr('servisler').find(s=>String(s.servisAdi||s.guzergah||'').localeCompare(String(name||''),'tr',{sensitivity:'base'})===0)||null}
async function parseStudentExcel(file,targetClassId=''){
 const data=await rows(file),hi=headerIndex(data,r=>r.some(c=>['ÖĞRENCİ ADI','OGRENCI ADI','AD SOYAD','AD'].includes(norm(c))));
 if(hi<0)throw new Error('Başlık satırı bulunamadı. Öğrenci Adı / Ad Soyad sütunu gerekli.');
 const h=data[hi].map(norm),cO=col(h,'ÖĞRENCİ ADI','OGRENCI ADI','AD SOYAD','AD'),cN=col(h,'ÖĞRENCİ NO','OGRENCI NO','NO','NUMARA'),cC=col(h,'CİNSİYET','CINSIYET'),cV=col(h,'VELİ ADI','VELI ADI','VELİ AD SOYAD','VELI AD SOYAD','VELİ','VELI'),cY=col(h,'YAKINLIK','YAKINLIK DERECESİ','YAKINLIK DERECESI'),cT1=col(h,'TELEFON 1','TELEFON1','TEL 1','TEL1','TELEFON'),cT2=col(h,'TELEFON 2','TELEFON2','TEL 2','TEL2'),cT3=col(h,'TELEFON 3','TELEFON3','TEL 3','TEL3'),cA=col(h,'ADRES'),cS=col(h,'SINIF','SINIF ADI'),cSV=col(h,'SERVİS','SERVIS','SERVİS ADI','SERVIS ADI'),cNO=col(h,'NOTLAR','NOT'),out=[];
 for(let i=hi+1;i<data.length;i++){
  const r=data[i]||[],ogrenciAdi=String(r[cO]||'').trim();if(!ogrenciAdi)continue;
  let sinifId=targetClassId;if(!sinifId&&cS>=0)sinifId=classByName(String(r[cS]||'').trim())?.id||'';
  let servisId='',servisAdi='';if(cSV>=0){const sv=serviceByName(String(r[cSV]||'').trim());if(sv){servisId=sv.id;servisAdi=sv.servisAdi||sv.guzergah||''}}
  const tel1=cT1>=0?String(r[cT1]||'').trim():'';
  out.push({sinifId,ogrenciAdi,ogrenciNo:cN>=0?String(r[cN]||'').trim():'',cinsiyet:cC>=0?String(r[cC]||'').trim():'',veliAdi:cV>=0?String(r[cV]||'').trim():'',yakinlik:cY>=0?String(r[cY]||'').trim():'',telefon1:tel1,telefon:tel1,telefon2:cT2>=0?String(r[cT2]||'').trim():'',telefon3:cT3>=0?String(r[cT3]||'').trim():'',adres:cA>=0?String(r[cA]||'').trim():'',servisId,servisAdi,notlar:cNO>=0?String(r[cNO]||'').trim():''});
 }
 if(!out.length)throw new Error('Dosyada öğrenci satırı bulunamadı.');
 return out;
}
async function importStudents(file,targetClassId=''){
 if(!canImport())throw new Error('Bu işlem için yetkiniz yok.');
 const parsed=await parseStudentExcel(file,targetClassId),result=await global.SiniflarService.ogrenciVeliListesiIceAktar(parsed,arr('veliler'));
 global.toast?.(`Öğrenci listesi içe aktarıldı: ${result.eklenen||0} eklendi, ${result.guncellenen||0} güncellendi.`);
 return result;
}
async function parseEOkul(file){
 const data=await rows(file),hi=headerIndex(data,r=>r.some(c=>norm(c)==='ADI')&&r.some(c=>norm(c)==='SOYADI'));
 if(hi<0)throw new Error('“Adı” / “Soyadı” başlıkları bulunamadı. e-Okul Sınıf Listesi raporu seçilmelidir.');
 const h=data[hi].map(norm),cA=col(h,'ADI'),cS=col(h,'SOYADI'),cN=col(h,'ÖĞRENCİ NO','OGRENCI NO','NUMARA'),cC=col(h,'CİNSİYETİ','CINSIYETI','CİNSİYET','CINSIYET'),blocks=[];let block=[];
 for(let i=hi+1;i<data.length;i++){
  const r=data[i];if(!r||r.every(c=>c==null||c===''))continue;
  const text=r.map(c=>String(c==null?'':c)).join(' ').toLocaleUpperCase('tr'),ad=cA>=0?String(r[cA]||'').trim():'',no=cN>=0?r[cN]:null,validNo=no!=null&&String(no).trim()!==''&&!Number.isNaN(parseInt(no));
  if(text.includes('SAYISI')||!ad||!validNo){if(block.length){blocks.push(block);block=[]}continue}
  const soyad=cS>=0?String(r[cS]||'').trim():'',raw=cC>=0?r[cC]:'',cinsiyet=global.SiniflarService.eOkulCinsiyetNormallestir(raw);
  block.push({ogrenciAdi:`${ad} ${soyad}`.trim(),ogrenciNo:String(no).trim(),cinsiyet});
 }
 if(block.length)blocks.push(block);if(!blocks.length)throw new Error('Dosyada öğrenci bloğu bulunamadı.');return blocks;
}
function closeModal(){document.querySelector('[data-people-import-modal]')?.remove()}
function eOkulModal(blocks,targetClassId=''){
 closeModal();const classes=arr('siniflar').slice().sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr',{numeric:true})),ov=document.createElement('div');ov.className='ka-modal-backdrop';ov.dataset.peopleImportModal='';
 ov.innerHTML=`<section class="ka-modal"><div class="ka-modal__header"><div><h2>e-Okul Listesi</h2><p class="ka-muted">${blocks.length} sınıf bloğu bulundu. Her bloğun ait olduğu sınıfı seçin.</p></div><button class="ka-icon-button" type="button" data-close aria-label="Kapat">×</button></div><div class="ka-modal__body ka-stack">${blocks.map((b,i)=>`<label class="ka-field" data-eok-row><span class="ka-field__label">Blok ${i+1} · ${b.length} öğrenci</span><small class="ka-muted">${esc(b.slice(0,2).map(x=>x.ogrenciAdi).join(', '))}${b.length>2?'…':''}</small><select data-eok-class><option value="">Atla</option>${classes.map((s,si)=>`<option value="${esc(s.id)}" ${(targetClassId&&i===0?s.id===targetClassId:!targetClassId&&si===i)?'selected':''}>${esc(s.ad)}</option>`).join('')}</select></label>`).join('')}</div><div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-close>Vazgeç</button><button class="ka-btn" type="button" data-eok-apply>İçe Aktar</button></div></section>`;
 document.body.appendChild(ov);$$('[data-close]',ov).forEach(b=>b.onclick=closeModal);ov.addEventListener('click',e=>{if(e.target===ov)closeModal()});
 $('[data-eok-apply]',ov).onclick=async()=>{if(busy)return;const rows=$$('[data-eok-row]',ov),mapped=blocks.map((block,i)=>({block,sinifId:$('[data-eok-class]',rows[i])?.value||''})).filter(x=>x.sinifId);if(!mapped.length)return global.toast?.('En az bir blok için sınıf seçmelisiniz.');let add=0,update=0,remove=0;const plans=mapped.map(x=>{const existing=arr('veliler').filter(v=>v.sinifId===x.sinifId),matches=x.block.map(o=>({o,eslesen:global.SiniflarService.eOkulEslesenBul(existing,o.ogrenciNo,o.ogrenciAdi)}));add+=matches.filter(x=>!x.eslesen).length;update+=matches.filter(x=>x.eslesen).length;const ids=new Set(matches.filter(x=>x.eslesen).map(x=>x.eslesen.id)),deleted=existing.filter(v=>!ids.has(v.id));remove+=deleted.length;return{sinifId:x.sinifId,eslesmeler:matches,silinecekler:deleted}});if(!confirm(`${add} öğrenci eklenecek, ${update} güncellenecek, ${remove} öğrenci silinecek. Onaylıyor musunuz?`))return;busy=true;const apply=$('[data-eok-apply]',ov);apply.disabled=true;try{const r=await global.SiniflarService.eOkulPlanlariniUygula(plans);closeModal();global.toast?.(`İçe aktarıldı: ${r.eklenecek||0} eklendi, ${r.guncellenecek||0} güncellendi, ${r.silinecek||0} silindi.`)}catch(e){console.error('[PeopleImport/eOkul]',e);global.toast?.('İçe aktarma hatası: '+(e?.message||e))}finally{busy=false;if(apply.isConnected)apply.disabled=false}};
}
async function importEOkul(file,targetClassId=''){if(!canImport())throw new Error('Bu işlem için yetkiniz yok.');eOkulModal(await parseEOkul(file),targetClassId)}
function currentClassId(){const detail=$('.ka-class-detail');if(!detail)return'';const direct=$('[data-class-seating]',detail)?.dataset.classSeating||$('[data-class-student-add]',detail)?.dataset.classStudentAdd||$('[data-class-edit]',detail)?.dataset.classEdit||'';if(direct)return direct;const name=$('.ka-detail-topbar h2',detail)?.textContent?.trim()||'';return classByName(name)?.id||''}
function toolbar(target,targetClassId=''){
 if(!target||target.querySelector('[data-legacy-class-imports]')||!canImport())return;
 const box=document.createElement('div');box.className='ka-row ka-wrap';box.dataset.legacyClassImports='';box.innerHTML=`<label class="ka-btn ka-btn--secondary" type="button">📥 Excel'den Ekle<input type="file" accept=".xlsx,.xls" data-legacy-excel hidden></label><label class="ka-btn ka-btn--secondary" type="button">📋 e-Okul Aktar<input type="file" accept=".xlsx,.xls" data-legacy-eokul hidden></label>`;
 target.appendChild(box);$('[data-legacy-excel]',box).onchange=async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;try{await importStudents(f,targetClassId)}catch(err){console.error('[PeopleImport/excel]',err);global.toast?.('İçe aktarma hatası: '+(err?.message||err))}};$('[data-legacy-eokul]',box).onchange=async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;try{await importEOkul(f,targetClassId)}catch(err){console.error('[PeopleImport/eOkul-read]',err);global.toast?.('Dosya okunamadı: '+(err?.message||err))}};
}
function enhance(){if(global.AppStore?.get?.('ui.route')!=='people')return;const list=$('.ka-class-directory .ka-people-page-head');if(list)toolbar(list,'');const detail=$('.ka-class-detail');if(detail){const tab=$('.ka-detail-tabs',detail),studentsActive=$('[data-class-tab="students"].active',detail);if(tab&&studentsActive){let holder=tab.nextElementSibling;if(!holder||!holder.classList.contains('ka-class-actions')){holder=document.createElement('div');holder.className='ka-class-actions';tab.insertAdjacentElement('afterend',holder)}toolbar(holder,currentClassId())}}}
function init(){if(observer)return;observer=new MutationObserver(()=>requestAnimationFrame(enhance));observer.observe(document.getElementById('v2ModuleRoot')||document.body,{childList:true,subtree:true});window.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='people')requestAnimationFrame(enhance)});requestAnimationFrame(enhance)}
global.PeopleImportUI={init,importStudents,importEOkul,parseStudentExcel,parseEOkul};init();
})(window);