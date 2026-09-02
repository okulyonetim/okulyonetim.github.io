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

const drafts={request:Object.create(null),response:Object.create(null)};
function section(icon,title,help,body){return `<section class="ka-card"><div class="ka-card__header"><div class="ka-row"><span class="ka-avatar" aria-hidden="true">${icon}</span><div><h3>${esc(title)}</h3><p class="ka-muted">${esc(help)}</p></div></div></div><div class="ka-card__body ka-stack">${body}</div></section>`}
function requestForm(okul){
  const kisi=`<div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Adı ve Soyadı</span><input name="adSoyad" autocomplete="name" autocapitalize="words" enterkeyhint="next"></label><label class="ka-field"><span class="ka-field__label">T.C. Kimlik No</span><input name="tc" maxlength="11" inputmode="numeric" autocomplete="off" enterkeyhint="next"></label></div><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Baba Adı</span><input name="babaAdi" autocapitalize="words" enterkeyhint="next"></label><label class="ka-field"><span class="ka-field__label">Anne Adı</span><input name="anneAdi" autocapitalize="words" enterkeyhint="next"></label></div><label class="ka-field"><span class="ka-field__label">Doğum Yeri</span><input name="dogumYeri" placeholder="Örn: Koruk – Merkez/Elazığ" autocapitalize="words" enterkeyhint="next"></label><label class="ka-field"><span class="ka-field__label">Doğum Tarihi</span><input name="dogumTarihi" type="date"></label>`;
  const diploma=`<div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Mezuniyet Tarihi</span><input name="mezuniyetTarihi" type="date"></label><label class="ka-field"><span class="ka-field__label">Mezun Olduğu Sınıf</span><input name="mezunSinif" placeholder="Örn: 5. Sınıf" enterkeyhint="next"></label></div>`;
  const iletisim=`<label class="ka-field"><span class="ka-field__label">Adres</span><textarea name="adres" rows="3" autocomplete="street-address" autocapitalize="sentences" enterkeyhint="done"></textarea></label>`;
  const okulBilgisi=`<details class="ka-card"><summary class="ka-card__header"><strong>Belge / Okul Bilgileri</strong><p class="ka-muted">Okul ayarlarından otomatik doldurulur; gerekirse değiştirilebilir.</p></summary><div class="ka-card__body ka-stack"><label class="ka-field"><span class="ka-field__label">Okul Adı</span><input name="okulAdi" value="${esc(okul.okulAdi||'')}"></label></div></details>`;
  return section('👤','Kişi Bilgileri','Dilekçe sahibinin kimlik ve doğum bilgileri.',kisi)+section('🎓','Mezuniyet Bilgileri','Mezuniyet tarihini ve sınıf bilgisini girin.',diploma)+section('📍','İletişim','Dilekçede gösterilecek adres bilgisi.',iletisim)+okulBilgisi;
}
function responseForm(okul){
  const kisi=`<div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Adı ve Soyadı</span><input name="adSoyad" autocomplete="name" autocapitalize="words" enterkeyhint="next"></label><label class="ka-field"><span class="ka-field__label">T.C. Kimlik No</span><input name="tc" maxlength="11" inputmode="numeric" autocomplete="off" enterkeyhint="next"></label></div><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Baba Adı</span><input name="babaAdi" autocapitalize="words" enterkeyhint="next"></label><label class="ka-field"><span class="ka-field__label">Kız/Oğul</span><select name="kizOglu"><option value="kızı">kızı</option><option value="oğlu">oğlu</option></select></label></div><label class="ka-field"><span class="ka-field__label">Doğum Tarihi</span><input name="dogumTarihi" type="date"></label>`;
  const diploma=`<div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Öğrenim Süresi (yıl)</span><input name="ogrenimSuresi" type="number" min="1" max="12" inputmode="numeric" enterkeyhint="next"></label><label class="ka-field"><span class="ka-field__label">Diploma Tarihi</span><input name="diplomaTarihi" type="date"></label></div><label class="ka-field"><span class="ka-field__label">Diploma Sayısı</span><input name="diplomaSayisi" enterkeyhint="next"></label>`;
  const iletisim=`<label class="ka-field"><span class="ka-field__label">Adres</span><textarea name="adres" rows="3" autocomplete="street-address" autocapitalize="sentences"></textarea></label><label class="ka-field"><span class="ka-field__label">Cep No</span><input name="cepNo" inputmode="tel" autocomplete="tel" placeholder="05xx xxx xx xx" enterkeyhint="done"></label>`;
  const okulBilgisi=`<details class="ka-card"><summary class="ka-card__header"><strong>Belge / Okul Bilgileri</strong><p class="ka-muted">Müdür ve okul adı mevcut okul ayarlarından otomatik gelir.</p></summary><div class="ka-card__body ka-stack"><label class="ka-field"><span class="ka-field__label">Okul Müdürü Adı Soyadı</span><input name="mudurAdi" value="${esc(principalName())}" autocapitalize="words"></label><label class="ka-field"><span class="ka-field__label">Okul Adı</span><input name="okulAdi" value="${esc(okul.okulAdi||'')}"></label></div></details>`;
  return section('👤','Kişi Bilgileri','Diploma kayıt örneği hazırlanacak kişinin bilgileri.',kisi)+section('🎓','Diploma Bilgileri','Diploma tarihi, sayısı ve öğrenim süresini girin.',diploma)+section('📍','İletişim ve Onay','Belgede yer alacak adres ve telefon bilgileri.',iletisim)+okulBilgisi;
}
function restoreDraft(pageKey,form){const draft=drafts[pageKey]||{};form?.querySelectorAll?.('[name]')?.forEach(el=>{if(Object.prototype.hasOwnProperty.call(draft,el.name))el.value=draft[el.name]})}
function bindForm(pageKey,form){
  if(!form||form.dataset.personnelDocumentBound==='true')return;
  form.dataset.personnelDocumentBound='true';
  const stop=e=>e.stopPropagation();
  const sync=e=>{const target=e.target;if(target?.name)drafts[pageKey][target.name]=target.value;e.stopPropagation()};
  form.addEventListener('beforeinput',stop);
  form.addEventListener('keydown',stop);
  form.addEventListener('keyup',stop);
  form.addEventListener('input',sync);
  form.addEventListener('change',sync);
  form.addEventListener('submit',async e=>{e.preventDefault();e.stopPropagation();const b=form.querySelector('button[type="submit"]'),old=b?.textContent;if(b){b.disabled=true;b.textContent='Hazırlanıyor…'}try{await print(pageKey,form)}catch(err){console.error('[PersonnelDocuments]',err);global.toast?.('Belge önizlemesi açılamadı: '+(err?.message||err))}finally{if(b){b.disabled=false;b.textContent=old}}});
}
async function open(type='request',root=document.getElementById('v2ModuleRoot')){
  if(!root)return false;
  if(!canView()){global.toast?.('Bu belgeyi görüntüleme yetkiniz yok.');return false}
  const pageKey=type==='response'?'response':'request';
  const existing=root.querySelector?.(`[data-personnel-document-page="${pageKey}"]`);
  if(existing?.querySelector?.('[data-personnel-document-form]'))return true;
  await prepareLocal();
  const response=pageKey==='response',okul=schoolInfo(),title=response?'Diploma Okul Dilekçesi':'Diploma Kayıt Talep Dilekçesi',subtitle=response?'Resmî okul cevabını bölümler halinde doldurun ve A4 önizlemesini hazırlayın.':'Diploma kayıt örneği talebini bölümler halinde doldurun ve A4 önizlemesini hazırlayın.';
  root.innerHTML=`<section class="ka-stack ka-home" data-personnel-document-page="${pageKey}"><div class="ka-plan-hero"><div><span class="ka-plan-hero__icon" aria-hidden="true">🎓</span><div><span class="ka-badge">DİPLOMA İŞLEMLERİ</span><h2>${title}</h2><p>${subtitle}</p></div></div></div><form class="ka-stack" data-personnel-document-form autocomplete="on">${response?responseForm(okul):requestForm(okul)}<section class="ka-card"><div class="ka-card__body ka-stack"><div><strong>Belgeyi oluştur</strong><p class="ka-muted">Bilgileri kontrol edin ve A4 önizlemeyi açın.</p></div><button class="ka-btn ka-btn--lg" type="submit">A4 Önizle / Yazdır</button></div></section></form></section>`;
  const form=root.querySelector('[data-personnel-document-form]');
  restoreDraft(pageKey,form);
  bindForm(pageKey,form);
  global.PermissionService?.apply?.(root);
  return true;
}
global.PersonnelDocuments={open,print,prepareLocal,requestBody,responseBody};
})(window);
