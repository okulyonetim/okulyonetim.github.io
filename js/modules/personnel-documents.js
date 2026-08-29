/* Koruk Asistan — Personel belge adaptörü
 * Eski diploma kayıt örneği talep / okul cevabı davranışlarını V2 ShellUI route'larına taşır.
 * İş verisi saklamaz. Okul/öğretmen bilgisi AppStore + IndexedDB üzerinden okunur;
 * çıktı yalnız merkezi ReportEngine ile hazırlanır.
 */
(function(global){
'use strict';
if(global.PersonnelDocuments)return;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const canView=()=>global.PermissionService?.can?.('management.personnel','read')??true;
const dotted=(v,fallback='...........................')=>String(v||'').trim()||fallback;
function trDate(iso){const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}.${m[2]}.${m[1]}`:''}
function schoolInfo(){return arr('okulBilgileri').find(x=>x.id==='ayarlar')||arr('okulBilgileri')[0]||{}}
function teacherName(id){const o=arr('ogretmenler').find(x=>x.id===id);return o?`${o.ad||''} ${o.soyad||''}`.trim():''}
function principalName(){const okul=schoolInfo();return okul.mudurId?teacherName(okul.mudurId):''}
async function prepareLocal(){
  if(!global.SyncEngine||!global.COL)return;
  const defs={okulBilgileri:COL.okulBilgileri,ogretmenler:COL.ogretmenler},types=[];
  Object.entries(defs).forEach(([type,col])=>{if(col){SyncEngine.register(type,col);types.push(type)}});
  if(types.length){await SyncEngine.localHydrate(types);SyncEngine.schedule(100)}
}
function reportCss(){return `<style>
.pd-doc{font-family:"Times New Roman",Times,serif;font-size:12pt;line-height:1.5;color:#000}.pd-head{text-align:center;margin:0 0 28mm}.pd-head>*{display:block}.pd-head strong{font-size:12pt}.pd-title{text-align:center;font-weight:700;text-decoration:underline;margin:0 0 8mm}.pd-info{width:auto!important;margin:0 0 8mm;border-collapse:collapse!important}.pd-info td{border:0!important;background:#fff!important;color:#000!important;font-size:12pt!important;padding:1.2mm 0!important;vertical-align:top!important}.pd-info td:first-child{font-weight:700;padding-right:6mm!important;white-space:nowrap}.pd-info td:nth-child(2){padding-right:4mm!important}.pd-p{margin:0 0 7mm;text-align:justify}.pd-indent{text-indent:10mm}.pd-bottom{display:flex;justify-content:space-between;gap:10mm;align-items:flex-start;margin-top:14mm}.pd-address{flex:1}.pd-sign{text-align:center;min-width:52mm}.pd-sign>*{display:block}.pd-sign .pd-sign-space{height:6mm}.pd-gap{margin-top:6mm}
</style>`}
function requestBody(v){
  const okul=schoolInfo(),okulRaw=String(v.okulAdi||okul.okulAdi||'').trim(),okulAdi=dotted(okulRaw).toLocaleUpperCase('tr'),il=String(okul.il||'').trim().toLocaleUpperCase('tr');
  const mezuniyet=dotted(trDate(v.mezuniyetTarihi),'....../....../............'),dogum=dotted(trDate(v.dogumTarihi),'....../....../............');
  const govde=`${mezuniyet} tarihinde ${dotted(okulRaw)}'ndan mezun oldum. Diplomamı kaybettiğimden tarafıma diploma kayıt örneği düzenlenmesi hususunda;`;
  return `<div class="pd-doc"><div class="pd-head"><strong>${esc(okulAdi)} MÜDÜRLÜĞÜNE</strong><span>${esc(il)}</span></div><div class="pd-title">Dilekçe Sahibinin;</div><table class="pd-info"><tbody><tr><td>T.C. Kimlik No.su</td><td>:</td><td>${esc(dotted(v.tc))}</td></tr><tr><td>Adı ve Soyadı</td><td>:</td><td>${esc(dotted(v.adSoyad))}</td></tr><tr><td>Baba Adı</td><td>:</td><td>${esc(dotted(v.babaAdi))}</td></tr><tr><td>Anne Adı</td><td>:</td><td>${esc(dotted(v.anneAdi))}</td></tr><tr><td>Doğum Yeri</td><td>:</td><td>${esc(dotted(v.dogumYeri))}</td></tr><tr><td>Doğum Tarihi</td><td>:</td><td>${esc(dogum)}</td></tr><tr><td>Mezun Olduğu Sınıf</td><td>:</td><td>${esc(dotted(v.mezunSinif))}</td></tr></tbody></table><p class="pd-p">${esc(govde)}</p><p class="pd-p">Gereğini arz ederim.</p><div class="pd-bottom"><div class="pd-address">Adres: ${esc(v.adres||'')}</div><div class="pd-sign"><span>imza</span><span class="pd-gap">....../....../............</span><strong>${esc(v.adSoyad||'')}</strong></div></div></div>`
}
function responseBody(v){
  const okul=schoolInfo(),okulRaw=String(v.okulAdi||okul.okulAdi||'').trim(),okulAdi=dotted(okulRaw).toLocaleUpperCase('tr'),il=String(okul.il||'').trim().toLocaleUpperCase('tr');
  const dogum=dotted(trDate(v.dogumTarihi),'....../....../............'),diploma=dotted(trDate(v.diplomaTarihi),'....../....../............'),mudir=String(v.mudurAdi||principalName()||'').trim();
  const govde=`Dilekçe sahibi ${dotted(v.tc,'..........................')} T.C. Kimlik Nolu, ${dogum} doğumlu, ${dotted(v.babaAdi)} ${v.kizOglu||'kızı'} ${dotted(v.adSoyad)}'ın ${dotted(okulRaw)}'ndan (${dotted(v.ogrenimSuresi,'.....')} yıllık) ${diploma} tarih ve ${dotted(v.diplomaSayisi,'............')} sayılı diplomayı almaya hak kazandığı resmi kayıtların incelenmesinden anlaşılmıştır.`;
  return `<div class="pd-doc"><div class="pd-head"><span>T.C.</span><span>${esc(il)} VALİLİĞİ</span><strong>${esc(okulAdi)} MÜDÜRLÜĞÜ</strong></div><div class="pd-title">DİPLOMA KAYIT ÖRNEĞİ</div><p class="pd-p pd-indent">${esc(govde)}</p><div class="pd-bottom"><div class="pd-address"><div>Adres: ${esc(v.adres||'')}</div><div class="pd-gap">Cep No: ${esc(v.cepNo||'')}</div></div><div class="pd-sign"><span>....../....../............</span><span class="pd-gap">${esc(mudir)}</span><strong>Okul Müdürü</strong></div></div></div>`
}
function collect(form){const fd=new FormData(form),v={};for(const [k,val] of fd.entries())v[k]=String(val||'').trim();return v}
async function print(type,form){
  if(!canView())return global.toast?.('Bu belgeyi görüntüleme yetkiniz yok.');
  if(!global.ReportEngine?.printReport)throw new Error('ReportEngine hazır değil.');
  const v=collect(form),isResponse=type==='response',title=isResponse?'Diploma Kayıt Örneği — Okul Cevabı':'Diploma Kayıt Örneği Talep Dilekçesi',body=isResponse?responseBody(v):requestBody(v);
  return ReportEngine.printReport(title,body,{fileName:isResponse?'Diploma_Kayit_Ornegi_Okul_Cevabi':'Diploma_Kayit_Ornegi_Talep_Dilekcesi',logoGoster:false,tarihGoster:false,baslikGoster:false,kenarBosluk:20,fontSize:12,extraHead:reportCss()});
}
function requestForm(okul){return `<div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Adı ve Soyadı</span><input name="adSoyad"></label><label class="ka-field"><span class="ka-field__label">T.C. Kimlik No</span><input name="tc" maxlength="11" inputmode="numeric"></label></div><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Baba Adı</span><input name="babaAdi"></label><label class="ka-field"><span class="ka-field__label">Anne Adı</span><input name="anneAdi"></label></div><label class="ka-field"><span class="ka-field__label">Doğum Yeri</span><input name="dogumYeri" placeholder="Örn: Koruk – Merkez/Elazığ"></label><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Doğum Tarihi</span><input name="dogumTarihi" type="date"></label><label class="ka-field"><span class="ka-field__label">Mezuniyet Tarihi</span><input name="mezuniyetTarihi" type="date"></label></div><label class="ka-field"><span class="ka-field__label">Mezun Olduğu Sınıf</span><input name="mezunSinif" placeholder="Örn: 5. Sınıf"></label><label class="ka-field"><span class="ka-field__label">Adres</span><input name="adres"></label><label class="ka-field"><span class="ka-field__label">Okul Adı</span><input name="okulAdi" value="${esc(okul.okulAdi||'')}"></label>`}
function responseForm(okul){return `<div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Adı ve Soyadı</span><input name="adSoyad"></label><label class="ka-field"><span class="ka-field__label">T.C. Kimlik No</span><input name="tc" maxlength="11" inputmode="numeric"></label></div><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Baba Adı</span><input name="babaAdi"></label><label class="ka-field"><span class="ka-field__label">Kız/Oğul</span><select name="kizOglu"><option value="kızı">kızı</option><option value="oğlu">oğlu</option></select></label></div><label class="ka-field"><span class="ka-field__label">Doğum Tarihi</span><input name="dogumTarihi" type="date"></label><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Öğrenim Süresi (yıllık)</span><input name="ogrenimSuresi" type="number" min="1" max="12"></label><label class="ka-field"><span class="ka-field__label">Diploma Tarihi</span><input name="diplomaTarihi" type="date"></label></div><label class="ka-field"><span class="ka-field__label">Diploma Sayısı</span><input name="diplomaSayisi"></label><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Adres</span><input name="adres"></label><label class="ka-field"><span class="ka-field__label">Cep No</span><input name="cepNo" inputmode="tel"></label></div><label class="ka-field"><span class="ka-field__label">Okul Müdürü Adı Soyadı</span><input name="mudurAdi" value="${esc(principalName())}"></label><label class="ka-field"><span class="ka-field__label">Okul Adı</span><input name="okulAdi" value="${esc(okul.okulAdi||'')}"></label>`}
async function open(type='request',root=document.getElementById('v2ModuleRoot')){
  if(!root)return false;
  if(!canView()){global.toast?.('Bu belgeyi görüntüleme yetkiniz yok.');return false}
  await prepareLocal();
  const response=type==='response',okul=schoolInfo();
  root.innerHTML=`<section class="ka-stack" data-personnel-document-page="${response?'response':'request'}"><div><h2>${response?'Diploma Kayıt Örneği — Okul Cevabı':'Diploma Kayıt Örneği Talep Dilekçesi'}</h2><p class="ka-muted">${response?'Resmî okul cevabı belgesini':'Diploma kayıt örneği talep dilekçesini'} mevcut okul bilgileriyle hazırlayın.</p></div><form class="ka-card" data-personnel-document-form><div class="ka-card__body ka-stack">${response?responseForm(okul):requestForm(okul)}</div><div class="ka-card__footer"><button class="ka-btn" type="submit">A4 Önizle / Yazdır</button></div></form></section>`;
  const form=root.querySelector('[data-personnel-document-form]');
  form?.addEventListener('submit',async e=>{e.preventDefault();const b=form.querySelector('button[type="submit"]'),old=b?.textContent;if(b){b.disabled=true;b.textContent='Hazırlanıyor…'}try{await print(response?'response':'request',form)}catch(err){console.error('[PersonnelDocuments]',err);global.toast?.('Belge önizlemesi açılamadı: '+(err?.message||err))}finally{if(b){b.disabled=false;b.textContent=old}}});
  global.PermissionService?.apply?.(root);
  return true;
}
global.PersonnelDocuments={open,print,prepareLocal,requestBody,responseBody};
})(window);
