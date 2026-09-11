/* Okul Yönetim — ders programı rapor düzeni v1
 * Mevcut Academic rapor seçimi korunur; yalnız rapor seçenekleri ve çıktı üretimi geliştirilir.
 * - Tek sınıf / tek öğretmen: tekli=yatay A4, ikili=dikey A4 (kesilebilir iki bağımsız başlık+logo)
 * - Tüm çarşaflar: yalnız yatay A4
 * - Öğretmen çarşafı: isteğe bağlı imza sütunu + geçerlilik tarihi + müdür onayı
 * - Toner dostu: beyaz zemin, çok açık dolgu, ince çizgiler.
 */
(function(global){
'use strict';
if(global.ScheduleReportRedesign)return;

const DAYS=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'];
const PERIODS=[1,2,3,4,5,6,7];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=k=>{const v=global.AppStore?.data?.(k);return Array.isArray(v)?v:[]};
const normalize=s=>String(s||'').trim();
const logoUrl=()=>{try{return new URL('assets/logo.png',global.location.href).href}catch(_){return'assets/logo.png'}};

function teacherName(id){
  const o=arr('ogretmenler').find(x=>String(x.id)===String(id));
  return o?normalize(o.adSoyad||`${o.ad||''} ${o.soyad||''}`):'—';
}
function teacherBranch(id){
  const o=arr('ogretmenler').find(x=>String(x.id)===String(id))||{};
  return normalize(o.brans||o.branş||o.bransi||o.gorev||'');
}
function schoolInfo(){
  const rows=arr('okulBilgileri'),x=rows.find(r=>r.id==='ayarlar')||rows[0]||{};
  return{school:normalize(x.okulAdi||x.ad||'Koruk İlkokulu - Ortaokulu')};
}
function academicYear(){const d=new Date(),y=d.getFullYear(),s=d.getMonth()>=7?y:y-1;return`${s}-${s+1}`}
function lessonTimes(){
  const settings=arr('dersSaatleri').find(x=>x.id==='ayarlar')||arr('dersSaatleri')[0]||{};
  const fallback=[['08:30','09:10'],['09:20','10:00'],['10:10','10:50'],['11:00','11:40'],['12:30','13:10'],['13:20','14:00'],['14:10','14:50']];
  const rows=Array.isArray(settings.donemler)&&settings.donemler.length?settings.donemler:PERIODS.map((s,i)=>({saat:s,baslangic:fallback[i][0],bitis:fallback[i][1]}));
  return rows.map(x=>({saat:Number(x.saat),baslangic:x.baslangic||'',bitis:x.bitis||''}));
}
function periodLabel(p){const t=lessonTimes().find(x=>x.saat===p),clock=t?[t.baslangic,t.bitis].filter(Boolean).join('–'):'';return`<b>${p}. Ders</b>${clock?`<small>${esc(clock)}</small>`:''}`}
function lessonAbbr(name){
  const n=normalize(name),key=n.toLocaleLowerCase('tr');
  const known=[['matematik','MAT'],['türkçe','TÜR'],['fen bilimleri','FEN'],['fen','FEN'],['sosyal bilgiler','SOS'],['sosyal','SOS'],['ingilizce','İNG'],['din kültürü','DİN'],['din','DİN'],['beden eğitimi','BED'],['beden','BED'],['müzik','MÜZ'],['görsel sanatlar','GRS'],['bilişim','BİL'],['rehberlik','REH']];
  const ref=arr('dersListesi').find(x=>normalize(x.ad).localeCompare(n,'tr',{sensitivity:'base'})===0);
  if(ref?.kisaltma)return normalize(ref.kisaltma).toLocaleUpperCase('tr');
  for(const[k,v]of known)if(key.includes(k))return v;
  return n.slice(0,3).toLocaleUpperCase('tr');
}
function teacherInitials(id){const n=teacherName(id);return n==='—'?'':n.split(/\s+/).filter(Boolean).map(x=>x[0]?.toLocaleUpperCase('tr')||'').join('')}
function rowStamp(x){const raw=x?.guncellenmeTarihi||x?.updatedAt||x?.eklenmeTarihi||x?.createdAt||'';const n=Date.parse(raw);return Number.isFinite(n)?n:0}
function preferred(rows){return[...rows].sort((a,b)=>rowStamp(b)-rowStamp(a)||String(b.id||'').localeCompare(String(a.id||'')))[0]||null}
function slotFor(predicate){return preferred(arr('dersProgrami').filter(predicate))}
function formatDate(iso){const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}.${m[2]}.${m[1]}`:String(iso||'')}
function nextMondayIso(){const d=new Date();d.setHours(12,0,0,0);const add=(8-d.getDay())%7||7;d.setDate(d.getDate()+add);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function principalDefaults(){
  const people=[...arr('personel'),...arr('ogretmenler')];
  const p=people.find(x=>{const u=normalize(x.unvan||x.gorev||x.gorevi).toLocaleLowerCase('tr');return u.includes('müdür')&&!u.includes('yardım')})||{};
  return{name:normalize(p.adSoyad||`${p.ad||''} ${p.soyad||''}`),title:normalize(p.unvan||p.gorev||p.gorevi||'Okul Müdürü')||'Okul Müdürü'};
}

const PRINT_STYLE=`<style>
.ka-report .ka-sr-report{font-family:Arial,Helvetica,sans-serif;color:#18231f;print-color-adjust:economy!important;-webkit-print-color-adjust:economy!important}
.ka-report .ka-sr-page{box-sizing:border-box;width:100%;break-after:page;page-break-after:always}.ka-report .ka-sr-page:last-child{break-after:auto;page-break-after:auto}
.ka-report .ka-sr-head{display:grid;grid-template-columns:15mm 1fr;gap:3mm;align-items:center;margin:0 0 3mm;padding:0 0 2.2mm;border-bottom:.5pt solid #9eada7;background:#fff!important}.ka-report .ka-sr-head img{width:13mm;height:13mm;object-fit:contain}.ka-report .ka-sr-headcopy{display:flex;flex-direction:column;gap:.5mm}.ka-report .ka-sr-headcopy .school{font-size:8pt;font-weight:700;color:#4d5b56}.ka-report .ka-sr-headcopy h1{font-size:12pt;line-height:1.1;margin:0;color:#173e32}.ka-report .ka-sr-headcopy .meta{font-size:6.8pt;color:#596760}.ka-report .ka-sr-headcopy .sub{font-size:6.4pt;color:#69756f}
.ka-report .ka-sr-weekly{table-layout:fixed}.ka-report .ka-sr-report table{width:100%!important;border-collapse:collapse!important}.ka-report .ka-sr-report th{background:#f3f7f5!important;color:#173e32!important;border:.45pt solid #aebbb6!important;font-weight:700!important}.ka-report .ka-sr-report td{background:#fff!important;color:#17211d!important;border:.4pt solid #cbd4d0!important}.ka-report .ka-sr-report tbody tr:nth-child(even) td{background:#fbfcfb!important}.ka-report .ka-sr-weekly th,.ka-report .ka-sr-weekly td{padding:1.4mm 1mm!important;text-align:center!important;vertical-align:middle!important;font-size:7.1pt!important;line-height:1.08!important}.ka-report .ka-sr-weekly thead th{font-size:7.4pt!important}.ka-report .ka-sr-weekly th:first-child{width:20mm}.ka-report .ka-sr-weekly td b{display:block;font-size:7.3pt}.ka-report .ka-sr-weekly td small,.ka-report .ka-sr-weekly th small{display:block;margin-top:.5mm;font-size:5.8pt;color:#5d6964}
.ka-report .ka-sr-single-page{min-height:200mm;padding:2mm 1.5mm}.ka-report .ka-sr-single-page .ka-sr-head{grid-template-columns:18mm 1fr;margin-bottom:4mm}.ka-report .ka-sr-single-page .ka-sr-head img{width:16mm;height:16mm}.ka-report .ka-sr-single-page .ka-sr-headcopy h1{font-size:15pt}.ka-report .ka-sr-single-page .ka-sr-weekly th,.ka-report .ka-sr-single-page .ka-sr-weekly td{padding:2.4mm 1.3mm!important;font-size:8.7pt!important}.ka-report .ka-sr-single-page .ka-sr-weekly td b{font-size:9pt}.ka-report .ka-sr-single-page .ka-sr-weekly td small{font-size:7pt}
.ka-report .ka-sr-pair-page{height:290mm;display:grid;grid-template-rows:1fr 1fr;break-after:page;page-break-after:always}.ka-report .ka-sr-pair-page:last-child{break-after:auto;page-break-after:auto}.ka-report .ka-sr-half{box-sizing:border-box;min-height:0;padding:3mm 1.5mm 2.5mm}.ka-report .ka-sr-half+ .ka-sr-half{border-top:.55pt dashed #9aa6a1;position:relative}.ka-report .ka-sr-half+ .ka-sr-half:before{content:'KESİM';position:absolute;top:-2.2mm;left:50%;transform:translateX(-50%);padding:0 2mm;background:#fff;color:#8b9691;font-size:5pt;letter-spacing:.12em}.ka-report .ka-sr-half .ka-sr-head{margin-bottom:2.2mm}.ka-report .ka-sr-half .ka-sr-weekly th,.ka-report .ka-sr-half .ka-sr-weekly td{padding:1.05mm .7mm!important;font-size:6.5pt!important}.ka-report .ka-sr-half .ka-sr-weekly td b{font-size:6.6pt}.ka-report .ka-sr-half .ka-sr-weekly td small{font-size:5.3pt}
.ka-report .ka-sr-sheet-page{min-height:200mm;padding:1mm .5mm}.ka-report .ka-sr-sheet-page .ka-sr-head{grid-template-columns:13mm 1fr;margin-bottom:2mm}.ka-report .ka-sr-sheet-page .ka-sr-head img{width:11mm;height:11mm}.ka-report .ka-sr-sheet-page .ka-sr-headcopy h1{font-size:10.5pt}.ka-report .ka-sr-sheet{table-layout:fixed}.ka-report .ka-sr-sheet th,.ka-report .ka-sr-sheet td{height:4.7mm;padding:.35mm .18mm!important;font-size:4.7pt!important;line-height:1!important;overflow:hidden;text-overflow:clip;text-align:center!important}.ka-report .ka-sr-sheet thead th{font-size:5pt!important}.ka-report .ka-sr-sheet .scope{width:29mm!important;text-align:left!important;padding-left:1.1mm!important}.ka-report .ka-sr-sheet .sign{width:20mm!important}.ka-report .ka-sr-sheet td b{display:block;font-size:4.8pt}.ka-report .ka-sr-sheet td small{display:block;font-size:4.1pt;color:#63706a;margin-top:.25mm}.ka-report .ka-sr-sheet--classes .scope{width:13mm!important;text-align:center!important}.ka-report .ka-sr-sheet--signature .scope{width:27mm!important}
.ka-report .ka-sr-approval{display:grid;grid-template-columns:1fr 52mm;gap:6mm;align-items:start;margin-top:3mm;padding-top:2.5mm;border-top:.45pt solid #aebbb6;font-size:7pt}.ka-report .ka-sr-validity{margin:0;line-height:1.35}.ka-report .ka-sr-principal{text-align:center;min-height:22mm}.ka-report .ka-sr-principal .space{height:10mm}.ka-report .ka-sr-principal strong,.ka-report .ka-sr-principal span{display:block}.ka-report .ka-sr-principal strong{font-size:7.5pt}.ka-report .ka-sr-principal span{margin-top:.8mm;font-size:6.5pt;color:#56635d}
@media print{.ka-report .ka-sr-report *{print-color-adjust:economy!important;-webkit-print-color-adjust:economy!important}}
</style>`;

function metaFromHub(ov){
  return{school:normalize(ov.querySelector('[data-schedule-report-school]')?.value)||schoolInfo().school,title:normalize(ov.querySelector('[data-schedule-report-title]')?.value)||'Ders Programı',year:normalize(ov.querySelector('[data-schedule-report-year]')?.value)||academicYear(),subtitle:normalize(ov.querySelector('[data-schedule-report-subtitle]')?.value),showSchool:!!ov.querySelector('[data-schedule-report-school-show]')?.checked,showTitle:!!ov.querySelector('[data-schedule-report-title-show]')?.checked,showYear:!!ov.querySelector('[data-schedule-report-year-show]')?.checked,showSubtitle:!!ov.querySelector('[data-schedule-report-subtitle-show]')?.checked};
}
function reportHead(meta,title,detail=''){
  const shownTitle=meta.showTitle?(meta.title&&meta.title!=='Ders Programı'?meta.title:title):title;
  const bits=[];if(meta.showYear&&meta.year)bits.push(`${esc(meta.year)} Eğitim Öğretim Yılı`);if(detail)bits.push(esc(detail));
  return`<header class="ka-sr-head"><img src="${esc(logoUrl())}" alt=""><div class="ka-sr-headcopy">${meta.showSchool&&meta.school?`<span class="school">${esc(meta.school)}</span>`:''}<h1>${esc(shownTitle)}</h1>${bits.length?`<span class="meta">${bits.join(' • ')}</span>`:''}${meta.showSubtitle&&meta.subtitle?`<span class="sub">${esc(meta.subtitle)}</span>`:''}</div></header>`;
}
function weeklyTable(kind,key){
  return`<table class="ka-sr-weekly"><thead><tr><th>Ders Saati</th>${DAYS.map(d=>`<th>${esc(d)}</th>`).join('')}</tr></thead><tbody>${PERIODS.map(p=>`<tr><th>${periodLabel(p)}</th>${DAYS.map(day=>{const d=kind==='class'?slotFor(x=>x.sinif===key&&x.gun===day&&Number(x.saat)===p):slotFor(x=>String(x.ogretmenId)===String(key)&&x.gun===day&&Number(x.saat)===p);if(!d)return'<td>—</td>';return kind==='class'?`<td><b>${esc(d.ders||'—')}</b><small>${esc(teacherName(d.ogretmenId))}</small></td>`:`<td><b>${esc(d.sinif||'—')}</b><small>${esc(d.ders||'—')}</small></td>`}).join('')}</tr>`).join('')}</tbody></table>`;
}
function individualCard(kind,key,meta){
  const title=kind==='class'?`${key} Sınıfı Ders Programı`:`${teacherName(key)} Ders Programı`;
  const detail=kind==='teacher'?teacherBranch(key):'';
  return`${reportHead(meta,title,detail)}${weeklyTable(kind,key)}`;
}
function individualBody(kind,keys,meta,layout){
  if(layout==='single')return keys.map(k=>`<section class="ka-sr-report ka-sr-page ka-sr-single-page">${individualCard(kind,k,meta)}</section>`).join('');
  let html='';for(let i=0;i<keys.length;i+=2){const a=keys[i],b=keys[i+1];html+=`<section class="ka-sr-report ka-sr-pair-page"><article class="ka-sr-half">${individualCard(kind,a,meta)}</article><article class="ka-sr-half">${b?individualCard(kind,b,meta):''}</article></section>`}return html;
}
function sheetClasses(names,meta){
  const table=`<table class="ka-sr-sheet ka-sr-sheet--classes"><thead><tr><th rowspan="2" class="scope">Sınıf</th>${DAYS.map(d=>`<th colspan="7">${esc(d)}</th>`).join('')}</tr><tr>${DAYS.map(()=>PERIODS.map(p=>`<th>${p}</th>`).join('')).join('')}</tr></thead><tbody>${names.map(name=>`<tr><th class="scope">${esc(name)}</th>${DAYS.map(day=>PERIODS.map(p=>{const d=slotFor(x=>x.sinif===name&&x.gun===day&&Number(x.saat)===p);return d?`<td><b>${esc(lessonAbbr(d.ders))}</b><small>${esc(teacherInitials(d.ogretmenId))}</small></td>`:'<td></td>'}).join('')).join('')}</tr>`).join('')}</tbody></table>`;
  return`<section class="ka-sr-report ka-sr-page ka-sr-sheet-page">${reportHead(meta,'Sınıflar Ders Programı Çarşafı')}${table}</section>`;
}
function sheetTeachers(ids,meta,signature){
  const teachers=arr('ogretmenler').filter(o=>ids.includes(String(o.id))).sort((a,b)=>teacherName(a.id).localeCompare(teacherName(b.id),'tr'));
  const signTh=signature.enabled?'<th rowspan="2" class="sign">İmza</th>':'';
  const table=`<table class="ka-sr-sheet ka-sr-sheet--teachers ${signature.enabled?'ka-sr-sheet--signature':''}"><thead><tr><th rowspan="2" class="scope">Öğretmen</th>${DAYS.map(d=>`<th colspan="7">${esc(d)}</th>`).join('')}${signTh}</tr><tr>${DAYS.map(()=>PERIODS.map(p=>`<th>${p}</th>`).join('')).join('')}</tr></thead><tbody>${teachers.map(o=>`<tr><th class="scope">${esc(teacherName(o.id))}${teacherBranch(o.id)?`<small>${esc(teacherBranch(o.id))}</small>`:''}</th>${DAYS.map(day=>PERIODS.map(p=>{const d=slotFor(x=>String(x.ogretmenId)===String(o.id)&&x.gun===day&&Number(x.saat)===p);return d?`<td><b>${esc(d.sinif||'—')}</b><small>${esc(lessonAbbr(d.ders))}</small></td>`:'<td></td>'}).join('')).join('')}${signature.enabled?'<td class="sign"></td>':''}</tr>`).join('')}</tbody></table>`;
  const approval=signature.enabled?`<footer class="ka-sr-approval"><p class="ka-sr-validity">Bu ders programı <strong>${esc(formatDate(signature.date))}</strong> tarihinden itibaren geçerlidir.</p><div class="ka-sr-principal"><div class="space"></div><strong>${esc(signature.principalName)}</strong><span>${esc(signature.principalTitle)}</span></div></footer>`:'';
  return`<section class="ka-sr-report ka-sr-page ka-sr-sheet-page">${reportHead(meta,'Öğretmenler Ders Programı Çarşafı')}${table}${approval}</section>`;
}
async function ensureReportEngine(){if(global.ReportEngine?.printReport)return global.ReportEngine;if(global.AppLoader?.loadScript)await global.AppLoader.loadScript('js/modules/report-engine.js');if(!global.ReportEngine?.printReport)throw new Error('Rapor motoru hazır değil.');return global.ReportEngine}

function cloneChecks(source,targetAttr){const box=document.createElement('div');box.className=source?.className||'ka-schedule-report-checks';box.setAttribute(targetAttr,'');if(source)[...source.children].forEach(x=>box.appendChild(x.cloneNode(true)));return box}
function allToggle(box,label='Tümünü seç / kaldır'){
  const row=document.createElement('label');row.className='ka-check ka-sr-select-all';row.innerHTML=`<input type="checkbox" checked><span>${label}</span>`;const input=row.querySelector('input');input.addEventListener('change',()=>box.querySelectorAll('input[type="checkbox"]').forEach(x=>x.checked=input.checked));return row;
}
function makeLayoutSection(ov){
  const field=document.createElement('fieldset');field.className='ka-schedule-report-section';field.dataset.srLayoutSection='';field.innerHTML='<legend>Çıktı Düzeni</legend><div class="ka-schedule-report-orientation"><label class="ka-check"><input type="radio" name="kaSrIndividualLayout" value="single" checked><span>Tekli — Yatay A4</span></label><label class="ka-check"><input type="radio" name="kaSrIndividualLayout" value="double"><span>İkili — Dikey A4 / sayfa başına 2</span></label></div><small class="ka-muted" data-sr-layout-note>Tekli çıktıda seçilen program yatay A4 sayfasını kullanır.</small>';
  const orientation=ov.querySelector('input[name="kaScheduleReportOrientation"]')?.closest('fieldset');if(orientation){orientation.hidden=true;orientation.after(field)}else ov.querySelector('.ka-modal__body')?.prepend(field);
  return field;
}
function addDoublePickers(ov){
  const cp=ov.querySelector('[data-schedule-report-panel="tekSinif"]'),tp=ov.querySelector('[data-schedule-report-panel="tekOgretmen"]'),classSrc=ov.querySelector('[data-schedule-report-class-list]'),teacherSrc=ov.querySelector('[data-schedule-report-teacher-list]');
  if(cp&&classSrc){const wrap=document.createElement('div');wrap.dataset.srDoubleClass='';wrap.hidden=true;const box=cloneChecks(classSrc,'data-sr-double-class-list');wrap.append(allToggle(box,'Tüm sınıfları seç / kaldır'),box);cp.appendChild(wrap)}
  if(tp&&teacherSrc){const wrap=document.createElement('div');wrap.dataset.srDoubleTeacher='';wrap.hidden=true;const box=cloneChecks(teacherSrc,'data-sr-double-teacher-list');wrap.append(allToggle(box,'Tüm öğretmenleri seç / kaldır'),box);tp.appendChild(wrap)}
}
function addTeacherSignatureOptions(ov){
  const panel=ov.querySelector('[data-schedule-report-panel="tumOgretmenler"]');if(!panel)return;const p=principalDefaults(),box=document.createElement('div');box.className='ka-sr-sign-options';box.innerHTML=`<label class="ka-check ka-sr-sign-toggle"><input type="checkbox" data-sr-signature><span>İmza bölümü ekle</span></label><div class="ka-sr-sign-fields" data-sr-sign-fields hidden><label class="ka-field"><span class="ka-field__label">Geçerlilik tarihi</span><input type="date" data-sr-valid-date value="${esc(nextMondayIso())}"></label><label class="ka-field"><span class="ka-field__label">Müdür Ad Soyad</span><input data-sr-principal-name value="${esc(p.name)}" placeholder="Ad Soyad"></label><label class="ka-field"><span class="ka-field__label">Unvan</span><input data-sr-principal-title value="${esc(p.title)}" placeholder="Okul Müdürü"></label><small class="ka-muted">İşaretlendiğinde öğretmen çarşafının en sağına İmza sütunu, altına geçerlilik metni ve sağ alta müdür onayı eklenir.</small></div>`;panel.appendChild(box);const t=box.querySelector('[data-sr-signature]'),fields=box.querySelector('[data-sr-sign-fields]');t.addEventListener('change',()=>fields.hidden=!t.checked)}
function injectAppStyle(){if(document.getElementById('ka-schedule-report-redesign-style'))return;const s=document.createElement('style');s.id='ka-schedule-report-redesign-style';s.textContent=`.ka-sr-sign-options{margin-top:14px;padding:12px;border:1px solid var(--ka-border,#d8e0dc);border-radius:12px;background:var(--ka-surface-2,#fafcfb)}.ka-sr-sign-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.ka-sr-sign-fields>.ka-field:first-child{grid-column:1/-1}.ka-sr-sign-fields>.ka-muted{grid-column:1/-1}.ka-sr-select-all{margin:10px 0 7px;font-weight:700}.ka-schedule-report-panel [data-sr-double-class],.ka-schedule-report-panel [data-sr-double-teacher]{margin-top:12px}.ka-schedule-report-panel [data-sr-double-class]>.ka-schedule-report-checks,.ka-schedule-report-panel [data-sr-double-teacher]>.ka-schedule-report-checks{max-height:220px;overflow:auto}@media(max-width:640px){.ka-sr-sign-fields{grid-template-columns:1fr}}`;document.head.appendChild(s)}
function updateHubState(ov){
  const type=ov.querySelector('[data-schedule-report-type]:checked')?.value||'tekSinif',layout=ov.querySelector('input[name="kaSrIndividualLayout"]:checked')?.value||'single',field=ov.querySelector('[data-sr-layout-section]'),note=ov.querySelector('[data-sr-layout-note]');
  if(field)field.hidden=!(type==='tekSinif'||type==='tekOgretmen');
  const classSelect=ov.querySelector('[data-schedule-report-single-class]')?.closest('.ka-field'),teacherSelect=ov.querySelector('[data-schedule-report-single-teacher]')?.closest('.ka-field'),dc=ov.querySelector('[data-sr-double-class]'),dt=ov.querySelector('[data-sr-double-teacher]');
  if(classSelect)classSelect.hidden=type==='tekSinif'&&layout==='double';if(teacherSelect)teacherSelect.hidden=type==='tekOgretmen'&&layout==='double';if(dc)dc.hidden=!(type==='tekSinif'&&layout==='double');if(dt)dt.hidden=!(type==='tekOgretmen'&&layout==='double');
  if(note)note.textContent=layout==='double'?'Dikey A4 iki eşit parçaya bölünür; her programın başlığı ve logosu ayrıdır. Kağıt ortadan kesilerek dağıtılabilir.':'Tekli program yatay A4 sayfasını mümkün olduğunca doldurur.';
  const orient=ov.querySelector('input[name="kaScheduleReportOrientation"][value="yatay"]');if(orient)orient.checked=true;
}

async function handlePrint(ov,save){
  const type=ov.querySelector('[data-schedule-report-type]:checked')?.value||'tekSinif',layout=ov.querySelector('input[name="kaSrIndividualLayout"]:checked')?.value||'single',meta=metaFromHub(ov);let body='',title='',yon='yatay',compact=false,fontSize=7,margin=3;
  if(type==='tekSinif'){
    let keys=layout==='double'?[...ov.querySelectorAll('[data-sr-double-class-list] input:checked')].map(x=>x.value):[ov.querySelector('[data-schedule-report-single-class]')?.value].filter(Boolean);if(!keys.length)throw new Error('En az bir sınıf seçin.');if(layout==='single')keys=keys.slice(0,1);title=layout==='double'?'Sınıf Programları':'Sınıf Ders Programı';yon=layout==='double'?'dikey':'yatay';body=individualBody('class',keys,meta,layout);
  }else if(type==='tekOgretmen'){
    let keys=layout==='double'?[...ov.querySelectorAll('[data-sr-double-teacher-list] input:checked')].map(x=>x.value):[ov.querySelector('[data-schedule-report-single-teacher]')?.value].filter(Boolean);if(!keys.length)throw new Error('En az bir öğretmen seçin.');if(layout==='single')keys=keys.slice(0,1);title=layout==='double'?'Öğretmen Programları':'Öğretmen Ders Programı';yon=layout==='double'?'dikey':'yatay';body=individualBody('teacher',keys,meta,layout);
  }else if(type==='tumSiniflar'){
    const keys=[...ov.querySelectorAll('[data-schedule-report-class-list] input:checked')].map(x=>x.value);if(!keys.length)throw new Error('En az bir sınıf seçin.');title='Sınıflar Ders Programı Çarşafı';yon='yatay';compact=true;fontSize=5.5;margin=3;body=sheetClasses(keys,meta);
  }else if(type==='tumOgretmenler'){
    const keys=[...ov.querySelectorAll('[data-schedule-report-teacher-list] input:checked')].map(x=>x.value);if(!keys.length)throw new Error('En az bir öğretmen seçin.');const enabled=!!ov.querySelector('[data-sr-signature]')?.checked,date=ov.querySelector('[data-sr-valid-date]')?.value||'',principalName=normalize(ov.querySelector('[data-sr-principal-name]')?.value),principalTitle=normalize(ov.querySelector('[data-sr-principal-title]')?.value)||'Okul Müdürü';if(enabled&&!date)throw new Error('Geçerlilik tarihini seçin.');if(enabled&&!principalName)throw new Error('Müdür ad soyad bilgisini girin.');title='Öğretmenler Ders Programı Çarşafı';yon='yatay';compact=true;fontSize=5.3;margin=3;body=sheetTeachers(keys,meta,{enabled,date,principalName,principalTitle});
  }
  const engine=await ensureReportEngine();save.disabled=true;save.textContent='Hazırlanıyor…';const preview=await engine.printReport(title,body,{fileName:title,yon,logoGoster:false,tarihGoster:false,baslikGoster:false,compact,fontSize,kenarBosluk:margin,extraHead:PRINT_STYLE});if(!preview||!document.getElementById('kaReportPreview'))throw new Error('Rapor önizlemesi açılamadı.');ov.remove();return true;
}
function patchHub(ov){
  if(!ov||ov.dataset.srRedesigned==='1'||!ov.querySelector('.ka-schedule-report-modal'))return false;ov.dataset.srRedesigned='1';injectAppStyle();makeLayoutSection(ov);addDoublePickers(ov);addTeacherSignatureOptions(ov);const save=ov.querySelector('[data-save]');if(save)save.textContent='🖨 Yazdır';ov.querySelectorAll('[data-schedule-report-type],input[name="kaSrIndividualLayout"]').forEach(x=>x.addEventListener('change',()=>updateHubState(ov)));updateHubState(ov);
  ov.addEventListener('click',async e=>{const btn=e.target.closest?.('[data-save]');if(!btn||!ov.contains(btn))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();try{await handlePrint(ov,btn)}catch(err){console.error('[ScheduleReportRedesign]',err);global.toast?.(err?.message||'Rapor hazırlanamadı.');btn.disabled=false;btn.textContent='🖨 Yazdır'}},true);return true;
}
function scan(){patchHub(document.getElementById('kaAcademicScheduleModal'))}
function start(){injectAppStyle();scan();new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true})}

global.ScheduleReportRedesign={patchHub,handlePrint,individualBody,sheetClasses,sheetTeachers,PRINT_STYLE};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
