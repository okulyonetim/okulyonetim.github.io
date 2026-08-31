from pathlib import Path
import re

transport_path=Path('js/modules/transport.js')
parity_path=Path('js/modules/transport-service-parity.js')
loader_path=Path('js/app-loader.js')
build_path=Path('scripts/build-client-bundles.mjs')
sw_path=Path('service-worker.js')
test_path=Path('tests/transport-separate-pages.test.js')
css_path=Path('css/design-system.css')
src=transport_path.read_text(encoding='utf-8')
parity=parity_path.read_text(encoding='utf-8')
old="let active='services',query='',mounted=false,unsubs=[],editor=null;"
new="let active='services',query='',serviceFilter='all',serviceDetailId='',mounted=false,unsubs=[],editor=null;"
assert src.count(old)==1
src=src.replace(old,new,1)
marker="const canEditServices=()=>!window.PermissionService||PermissionService.can('transport.services.edit','edit');"
assert src.count(marker)==1
helpers="""const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const canEdit=()=>canEditServices();
const service=id=>arr('servisler').find(x=>String(x.id)===String(id))||null;
const className=id=>arr('siniflar').find(x=>String(x.id)===String(id))?.ad||id||'—';
const students=id=>arr('veliler').filter(v=>String(v.servisId||'')===String(id||'')).slice().sort((a,b)=>className(a.sinifId).localeCompare(className(b.sinifId),'tr',{numeric:true})||String(a.ogrenciAdi||'').localeCompare(String(b.ogrenciAdi||''),'tr'));
const phone=v=>v.telefon1||v.telefon||v.telefon2||v.telefon3||'';
const close=id=>document.getElementById(id)?.remove();
function presidentNames(s){const ids=new Set(Array.isArray(s?.baskanlar)?s.baskanlar.map(String):[]),names=students(s?.id).filter(v=>ids.has(String(v.id))).map(v=>v.ogrenciAdi||'Öğrenci');return names.length?names.join(', '):'Atanmadı'}
function serviceStatus(s){return String(s?.durum||'Aktif')}
"""
src=src.replace(marker,marker+'\n'+helpers,1)
start=parity.index('function detailStudentRow')
end=parity.index('function closeAll()')
block=parity[start:end].replace('global.','window.')
block,n=re.subn(r"function detailHtml\(s\)\{.*?\n\}\n\nfunction openDetail\(id\)\{.*?\n\}\n\n",'',block,count=1,flags=re.S)
assert n==1
block=block.replace('openDetail(', 'openServiceDetail(')
assert 'MutationObserver' not in block
services_pattern=re.compile(r"function services\(\)\{.*?\}\nfunction serviceModal",re.S)
services_replacement=r'''function services(){const all=arr('servisler').filter(s=>match([s.servisAdi,s.guzergah,s.plaka,s.soforAdi,s.soforTelefon])).sort((a,b)=>serviceName(a).localeCompare(serviceName(b),'tr')),list=all.filter(s=>serviceFilter==='all'||(serviceFilter==='active'?serviceStatus(s)!=='Pasif':serviceStatus(s)==='Pasif')),cards=list.map(s=>{const n=students(s.id).length;return `<article class="ka-card ka-transport-service-card" data-service-detail="${esc(s.id)}" tabindex="0" role="button"><div class="ka-card__body ka-row ka-row--between"><div class="ka-grow ka-transport-service-card__main"><div class="ka-row ka-wrap"><strong>${esc(serviceName(s))}</strong><span class="ka-badge ${serviceStatus(s)==='Pasif'?'ka-badge--muted':'ka-badge--success'}">${esc(serviceStatus(s))}</span></div><div class="ka-muted">${esc([s.soforAdi?`Şoför: ${s.soforAdi}`:'',s.plaka,s.guzergah].filter(Boolean).join(' · '))}</div></div><div class="ka-transport-service-card__side"><span class="ka-badge">${n} öğrenci</span>${canEditServices()?`<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-service-edit="${esc(s.id)}" data-ka-write="transport.services.edit">Düzenle</button>`:''}</div></div></article>`});return{count:list.length,html:`<div class="ka-row ka-row--between ka-wrap"><div><h3>Servis Listesi</h3><div class="ka-muted">Servise dokunarak ayrıntıları, öğrencileri ve raporları açın.</div></div>${canEditServices()?'<button class="ka-btn" type="button" data-service-add data-ka-write="transport.services.edit">+ Yeni Servis</button>':''}</div><div class="ka-row ka-wrap ka-transport-filters" role="group" aria-label="Servis filtresi"><button class="ka-btn ka-btn--sm ${serviceFilter==='all'?'':'ka-btn--secondary'}" type="button" data-service-filter="all">Tümü</button><button class="ka-btn ka-btn--sm ${serviceFilter==='active'?'':'ka-btn--secondary'}" type="button" data-service-filter="active">Aktif</button><button class="ka-btn ka-btn--sm ${serviceFilter==='passive'?'':'ka-btn--secondary'}" type="button" data-service-filter="passive">Pasif</button></div><div class="ka-stack ka-transport-service-list">${cards.length?cards.join(''):'<div class="ka-empty">Servis kaydı bulunamadı.</div>'}</div>`}}
function serviceDetailStudentRow(v,presidents){const isPresident=presidents.has(String(v.id));return `<article class="ka-transport-student-row"><div class="ka-grow"><div class="ka-row ka-wrap"><strong>${isPresident?'👑 ':''}${esc(v.ogrenciAdi||'Öğrenci')}</strong>${v.ogrenciNo?`<span class="ka-muted">No: ${esc(v.ogrenciNo)}</span>`:''}<span class="ka-badge">${esc(className(v.sinifId))}</span>${v.cinsiyet?`<span class="ka-badge ka-badge--muted">${esc(v.cinsiyet)}</span>`:''}${isPresident?'<span class="ka-badge ka-badge--warning">Servis Başkanı</span>':''}</div></div>${canEditServices()?`<button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-transport-remove-student="${esc(v.id)}">Çıkar</button>`:''}</article>`}
function serviceDetail(){const s=service(serviceDetailId);if(!s){serviceDetailId='';return services()}const list=students(s.id),presidents=new Set((Array.isArray(s.baskanlar)?s.baskanlar:[]).map(String));return{count:list.length,html:`<section class="ka-stack ka-transport-detail" data-transport-service-detail="${esc(s.id)}"><div class="ka-transport-detail__toolbar"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-transport-list>🖨️ Rapor</button>${canEditServices()?`<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-service-edit="${esc(s.id)}">✎ Düzenle</button>`:''}<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-transport-detail-close>× Kapat</button></div><header class="ka-transport-detail__head"><h2>${esc(serviceName(s))}</h2><p>${esc([s.guzergah,serviceStatus(s)].filter(Boolean).join(' · '))}</p></header><article class="ka-card"><div class="ka-card__body ka-stack"><h3>🚌 Servis Bilgileri</h3><div class="ka-transport-info-list"><div><span>👨‍✈️ Şoför</span><strong>${esc(s.soforAdi||'—')}</strong>${s.soforTelefon?`<a href="tel:${esc(s.soforTelefon)}">${esc(s.soforTelefon)}</a>`:''}</div><div><span>🚘 Plaka</span><strong>${esc(s.plaka||'—')}</strong></div><div><span>🗺️ Güzergâh</span><strong>${esc(s.guzergah||'—')}</strong></div><div><span>Durum</span><strong>${esc(serviceStatus(s))}</strong></div><div><span>👑 Servis Başkanı</span><strong>${esc(presidentNames(s))}</strong></div></div><div class="ka-transport-report-actions"><button class="ka-btn ka-btn--secondary" type="button" data-transport-detail-report="monthly">📋 Aylık Takip Çizelgesi</button><button class="ka-btn ka-btn--secondary" type="button" data-transport-detail-report="inspection">📄 Denetim Formu Yazdır</button></div></div></article><section class="ka-stack"><div class="ka-row ka-row--between ka-wrap"><div><h3>Servis Öğrenci Listesi (${list.length})</h3><div class="ka-muted">Sınıf, öğrenci no ve cinsiyet bilgileri cihazdaki öğrenci kayıtlarından gelir.</div></div></div><div class="ka-transport-detail-actions">${canEditServices()?'<button class="ka-btn ka-btn--secondary" type="button" data-transport-excel>📥 Excel\'den Ekle</button><button class="ka-btn" type="button" data-transport-add-student>+ Öğrenci Ekle</button>':''}<button class="ka-btn ka-btn--secondary" type="button" data-transport-list>📋 Liste Oluştur</button>${canEditServices()?'<button class="ka-btn ka-btn--secondary" type="button" data-transport-presidents>👑 Başkanlar</button>':''}</div><div class="ka-stack">${list.length?list.map(v=>serviceDetailStudentRow(v,presidents)).join(''):'<div class="ka-empty">Bu serviste kayıtlı öğrenci yok.</div>'}</div></section></section>`}}
function openServiceDetail(id){if(!service(id))return;serviceDetailId=id;query='';render();document.getElementById('transportContent')?.scrollIntoView?.({block:'start'})}
function closeServiceDetail(){if(!serviceDetailId)return false;serviceDetailId='';render();return true}

'''
src,n=services_pattern.subn(lambda m:services_replacement,src,count=1)
assert n==1
insert_marker='function currentPlan(servisId)'
assert src.count(insert_marker)==1
src=src.replace(insert_marker,block+'\n'+insert_marker,1)
render_pattern=re.compile(r"function render\(\)\{.*?\}\nfunction bind\(\)",re.S)
render_replacement=r'''function bindServiceDetail(out){if(!serviceDetailId)return;out.querySelector('[data-transport-detail-close]')?.addEventListener('click',closeServiceDetail);out.querySelectorAll('[data-service-edit]').forEach(b=>b.onclick=e=>{e.stopPropagation();const s=service(b.dataset.serviceEdit);if(s)openServiceModal(s)});out.querySelector('[data-transport-add-student]')?.addEventListener('click',()=>openAddStudents(serviceDetailId));out.querySelector('[data-transport-presidents]')?.addEventListener('click',()=>openPresidents(serviceDetailId));out.querySelector('[data-transport-excel]')?.addEventListener('click',()=>openExcel(serviceDetailId));out.querySelectorAll('[data-transport-list]').forEach(b=>b.addEventListener('click',()=>openListBuilder(serviceDetailId)));out.querySelectorAll('[data-transport-remove-student]').forEach(b=>b.addEventListener('click',()=>removeStudent(serviceDetailId,b.dataset.transportRemoveStudent)));out.querySelectorAll('[data-transport-detail-report]').forEach(b=>b.addEventListener('click',()=>b.dataset.transportDetailReport==='inspection'?denetimAc(serviceDetailId):takipAc(serviceDetailId)))}
function render(){if(!mounted)return;const r=active==='services'&&serviceDetailId?serviceDetail():active==='busSeats'?busSeats():active==='classSeats'?classSeats():services(),out=document.getElementById('transportContent'),c=document.getElementById('transportCount'),search=document.getElementById('transportSearch');if(out)out.innerHTML=r.html;if(c)c.textContent=serviceDetailId?`${r.count} öğrenci`:`${r.count} kayıt`;if(search)search.closest('.ka-field').hidden=!!serviceDetailId;if(serviceDetailId){bindServiceDetail(out);window.PermissionService?.apply?.(document.getElementById('v2ModuleRoot')||document);return}document.querySelector('[data-service-add]')?.addEventListener('click',()=>openServiceModal({}));document.querySelectorAll('[data-service-filter]').forEach(b=>b.onclick=()=>{serviceFilter=b.dataset.serviceFilter||'all';render()});document.querySelectorAll('[data-service-detail]').forEach(card=>{const open=()=>openServiceDetail(card.dataset.serviceDetail);card.onclick=e=>{if(e.target.closest('button,a,input,select,textarea'))return;open()};card.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button,a,input,select,textarea')){e.preventDefault();open()}}});document.querySelectorAll('[data-service-edit]').forEach(b=>b.onclick=e=>{e.stopPropagation();const s=service(b.dataset.serviceEdit);if(s)openServiceModal(s)});document.querySelectorAll('[data-service-delete]').forEach(b=>b.onclick=()=>deleteService(b.dataset.serviceDelete));document.querySelectorAll('[data-bus-edit]').forEach(b=>b.onclick=()=>openBusEditor(b.dataset.busEdit));document.querySelectorAll('[data-class-seat-open]').forEach(b=>b.onclick=()=>openClassSeating(b.dataset.classSeatOpen));document.querySelectorAll('[data-transport-denetim]').forEach(b=>b.onclick=()=>denetimAc(b.dataset.transportDenetim));document.querySelectorAll('[data-transport-takip]').forEach(b=>b.onclick=()=>takipAc(b.dataset.transportTakip));window.PermissionService?.apply?.(document.getElementById('v2ModuleRoot')||document)}
function bind()'''
src,n=render_pattern.subn(lambda m:render_replacement,src,count=1)
assert n==1
src=src.replace("function back(){if(document.getElementById('transportBusEditor')){closeEditor();return true}if(document.querySelector('[data-class-seating-overlay]')){window.SinifOturma?.kapat?.();return true}return false}","function back(){if(document.getElementById('transportBusEditor')){closeEditor();return true}if(document.querySelector('[data-class-seating-overlay]')){window.SinifOturma?.kapat?.();return true}if(serviceDetailId)return closeServiceDetail();return false}",1)
src=src.replace("function openPage(page,title=''){const allowed=['services','busSeats','classSeats'];if(!allowed.includes(page))return false;active=page;query='';", "function openPage(page,title=''){const allowed=['services','busSeats','classSeats'];if(!allowed.includes(page))return false;active=page;query='';serviceDetailId='';",1)
src=src.replace("function unmount(){mounted=false;closeEditor();document.querySelector('[data-service-modal]')?.remove();", "function unmount(){mounted=false;serviceDetailId='';closeEditor();document.querySelector('[data-service-modal]')?.remove();",1)
report_marker="if(global.TransportReportParity)return;"
ri=parity.index(report_marker)
rs=parity.rfind('(function(global){',0,ri)
report_block=parity[rs:].replace('TransportReportParity','TransportReportFidelity')
assert 'base.denetim=denetim;base.takip=takip;base.takipSec=takipSec' in report_block
src=src.rstrip()+"\n\n/* Canonical official transport report fidelity. */\n"+report_block.strip()+"\n"
transport_path.write_text(src,encoding='utf-8')
loader=loader_path.read_text(encoding='utf-8')
old_loader="define('transport',['js/modules/report-engine.js','js/modules/transport.js','js/modules/transport-service-parity.js']);"
assert loader.count(old_loader)==1
loader_path.write_text(loader.replace(old_loader,"define('transport',['js/modules/report-engine.js','js/modules/transport.js']);",1),encoding='utf-8')
build=build_path.read_text(encoding='utf-8')
old_build="'transport.js':['js/modules/report-engine.js','js/modules/transport.js','js/modules/transport-service-parity.js']"
assert build.count(old_build)==1
build_path.write_text(build.replace(old_build,"'transport.js':['js/modules/report-engine.js','js/modules/transport.js']",1),encoding='utf-8')
sw=sw_path.read_text(encoding='utf-8')
assert "'./js/modules/transport-service-parity.js'" in sw
sw=sw.replace(",'./js/modules/transport-service-parity.js'",'',1)
sw=re.sub(r"const CACHE_ADI='oy-cache-v(\d+)'",lambda m:f"const CACHE_ADI='oy-cache-v{int(m.group(1))+1}'",sw,count=1)
sw_path.write_text(sw,encoding='utf-8')
css=css_path.read_text(encoding='utf-8')
css_add='''\n/* Taşıma — canonical servis listesi ve tam sayfa detay */\n.ka-transport-service-list{gap:14px}.ka-transport-service-card{cursor:pointer;min-width:0}.ka-transport-service-card__main{min-width:0}.ka-transport-service-card__main .ka-muted{overflow-wrap:anywhere}.ka-transport-service-card__side{display:flex;align-items:center;gap:10px;flex:0 0 auto}.ka-transport-filters{gap:8px}.ka-transport-detail{width:100%;max-width:100%;min-width:0;overflow-x:hidden}.ka-transport-detail__toolbar{display:flex;flex-wrap:wrap;gap:8px}.ka-transport-detail__head{padding:18px 4px 4px}.ka-transport-detail__head h2{margin:0 0 6px}.ka-transport-detail__head p{margin:0;color:var(--ka-text-muted)}.ka-transport-info-list{display:grid;gap:0}.ka-transport-info-list>div{display:grid;grid-template-columns:minmax(110px,.7fr) minmax(0,1.3fr);gap:12px;padding:11px 0;border-bottom:1px solid var(--ka-border)}.ka-transport-info-list>div:last-child{border-bottom:0}.ka-transport-info-list span{color:var(--ka-text-muted)}.ka-transport-info-list strong,.ka-transport-info-list a{min-width:0;overflow-wrap:anywhere}.ka-transport-report-actions,.ka-transport-detail-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.ka-transport-report-actions .ka-btn,.ka-transport-detail-actions .ka-btn{width:100%;min-width:0;white-space:normal}.ka-transport-student-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 2px;border-bottom:1px solid var(--ka-border);min-width:0}.ka-transport-student-row:last-child{border-bottom:0}.ka-transport-student-row>.ka-grow{min-width:0}\n@media(max-width:560px){.ka-transport-service-card>.ka-card__body{align-items:flex-start}.ka-transport-service-card__side{flex-direction:column;align-items:stretch}.ka-transport-info-list>div{grid-template-columns:1fr;gap:4px}.ka-transport-detail{padding-inline:2px}.ka-transport-detail-actions,.ka-transport-report-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}\n@media(max-width:360px){.ka-transport-detail-actions,.ka-transport-report-actions{grid-template-columns:1fr}}\n'''
assert '.ka-transport-detail{' not in css
css_path.write_text(css.rstrip()+css_add,encoding='utf-8')
t=test_path.read_text(encoding='utf-8')
t=t.replace("const parity=fs.readFileSync('js/modules/transport-service-parity.js','utf8');\n",'')
start=t.index("for(const token of ['TransportServiceParity'")
end=t.index("assert(transport.includes(\"if(document.querySelector('[data-class-seating-overlay]'))")
new_contract=r'''for(const token of ['serviceDetailId','serviceFilter','data-service-detail','data-transport-detail-close','data-transport-add-student','data-transport-presidents','data-transport-excel','data-transport-list','data-transport-remove-student','presidentNames(s)','openAddStudents','openPresidents','openExcel','openListBuilder'])assert(transport.includes(token),`Canonical servis detay çalışma alanı eksik: ${token}`);
for(const token of ['TasimaService.ogrencileriServiseAta','TasimaService.servisKaydet','PeopleImportUI.parseStudentExcel','ReportEngine?.printReport'])assert(transport.includes(token),`Servis detay canonical servis davranışı eksik: ${token}`);
assert(!transport.includes('MutationObserver'),'Transport görünür UI ikinci DOM enhancer/MutationObserver kullanmamalı.');
assert(!loader.includes('transport-service-parity.js'),'Transport bundle ikinci UI sahibi yüklememeli.');
assert(!build.includes('transport-service-parity.js'),'Üretim Transport bundle ikinci UI sahibini içermemeli.');
assert(!sw.includes('transport-service-parity.js'),'Emekli Transport companion PWA cache içinde kalmamalı.');
for(const token of ['TransportReportFidelity','SABIT_LISTE_BOYU=30','DENETIM_MADDELERI','TAŞIMA YOLUYLA EĞİTİME ERİŞİM YÖNETMELİĞİ KAPSAMINDA HİZMET SUNAN','(TAŞIMA MERKEZİ OKUL/KURUM MÜDÜRLÜĞÜNCE KULLANILACAK)','ARACIN MODEL YILI','SÜRÜCÜ BELGESİ YIL / SINIFI','data-trp-duty-teacher','contenteditable="true"','global.ServisOturmaRepository?.planServisIdIleGetir','👑','trp-student-grid',"'<td>Hafta Sonu</td>'.repeat(8)","'<td>Resmî Tatil</td>'.repeat(8)",'ReportEngine.documentHtml','ReportEngine.previewHtml','ReportEngine.printHtml','cloneNode(true)','base.denetim=denetim;base.takip=takip;base.takipSec=takipSec',"requireReport('transport.report.inspection')","requireReport('transport.report.monthly')"])assert(transport.includes(token),`Taşıma resmî rapor fidelity sözleşmesi eksik: ${token}`);
assert(transport.includes("(t.unvan||'').trim()!=='Müdür Yardımcısı'"),'Nöbetçi öğretmen seçimi Müdür Yardımcısını dışlamalı.');
assert(transport.includes("t.id!==a.mudurId"),'Nöbetçi öğretmen seçimi okul müdürünü dışlamalı.');
assert(transport.includes('if(target%2)target++'),'30 kişiyi aşan öğrenci listesi iki sütun için çift sayıya tamamlanmalı.');
assert(transport.includes("select.replaceWith(span)"),'Denetim çıktısında seçilen nöbetçi öğretmen yazdırma HTML’ine düz metin olarak aktarılmalı.');
for(const forbidden of ['db.collection','firebase.firestore','localStorage.setItem','localStorage.removeItem'])assert(!transport.includes(forbidden),`Transport canonical modülü doğrudan yasaklı kalıcı katmana yazmamalı: ${forbidden}`);
assert(loader.includes("define('transport',['js/modules/report-engine.js','js/modules/transport.js'])"),'Transport yalnız canonical UI + ortak ReportEngine ile lazy yüklenmeli.');
assert(build.includes("'transport.js':['js/modules/report-engine.js','js/modules/transport.js']"),'Üretim Transport bundle tek canonical UI kaynağını içermeli.');
'''
t=t[:start]+new_contract+t[end:]
test_path.write_text(t,encoding='utf-8')
parity_path.unlink()
