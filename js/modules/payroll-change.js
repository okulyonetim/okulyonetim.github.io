/* Koruk Asistan — Maaş Değişikliği Bildirim Formu V2
 * A-H veri modeli eski form ile uyumludur. Form verisi oturumluk/in-memory'dir.
 * Kaynak: AppStore/DeviceData; çıktı: merkezi ReportEngine; görünüm: design-system.css.
 */
(function(global){
'use strict';
if(global.PayrollChangeModule)return;
const MONTHS=['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
let state=null,openSection='D';
function roster(){
 const teachers=rows('ogretmenler').map(o=>({id:'o_'+o.id,tur:'ogretmen',tc:o.tcNo||o.tc||'',ad:`${o.ad||''} ${o.soyad||''}`.trim()||o.adSoyad||'',gorev:o.unvan||o.brans||'Öğretmen'}));
 const staff=rows('personel').map(p=>({id:'p_'+p.id,tur:'personel',tc:p.tc||p.tcNo||'',ad:p.adSoyad||`${p.ad||''} ${p.soyad||''}`.trim(),gorev:p.gorev||p.unvan||'Personel'}));
 return [...teachers,...staff].filter(x=>x.ad).sort((a,b)=>a.ad.localeCompare(b.ad,'tr'));
}
function blank(){const d=new Date();return{ay:MONTHS[d.getMonth()],yil:d.getFullYear(),gecenAyPersonelSayisi:roster().length,buAyGiren:0,buAyCikan:0,aylikSizIzinde:0,B:[],C:[],D:[],E:[],F:[],G:[],H:[]};}
const SECTION_META=Object.freeze({
 B:{title:'B) Ayrılan Personel',empty:'Ayrılan personel eklenmedi.',fields:[{key:'tarih',label:'Ayrılış Tarihi',type:'date'},{key:'neden',label:'Ayrılma Nedeni'}]},
 C:{title:'C) Başlayan Personel',empty:'Başlayan personel eklenmedi.',fields:[{key:'tarih',label:'Başlama Tarihi',type:'date'},{key:'neden',label:'Başlama Nedeni'}]},
 D:{title:'D) Terfi İşlemleri',empty:'Terfi işlemi için öğretmen veya personel eklenmedi.',fields:[{key:'eskiDerece',label:'Eski Derece',type:'number'},{key:'eskiKademe',label:'Eski Kademe',type:'number'},{key:'yeniDerece',label:'Yeni Derece',type:'number'},{key:'yeniKademe',label:'Yeni Kademe',type:'number'},{key:'terfiTarihi',label:'Terfi Tarihi',type:'date'}]},
 E:{title:'E) Maaş Değişikliği',empty:'Maaş değişikliği kaydı eklenmedi.',fields:[{key:'onceki',label:'Önceki Durum'},{key:'yeni',label:'Yeni Durum'}]},
 F:{title:'F) Kesintiler',empty:'Kesinti kaydı eklenmedi.',fields:[{key:'neden',label:'Kesinti Nedeni'},{key:'hesapNo',label:'Ödeneceği Yer / Hesap No'},{key:'oran',label:'Oran / Miktar'}]},
 G:{title:'G) Raporlu Gün',empty:'Raporlu gün kaydı eklenmedi.',fields:[{key:'baslama',label:'Başlama Tarihi',type:'date'},{key:'bitis',label:'Bitiş Tarihi',type:'date'},{key:'gunSayisi',label:'Kesinti Gün Sayısı',type:'number'}]},
 H:{title:'H) Sendika Değişikliği',empty:'Sendika değişikliği kaydı eklenmedi.',fields:[{key:'ayrilanSendika',label:'Ayrıldığı Sendika'},{key:'ayrilmaTarihi',label:'Ayrılma Tarihi',type:'date'},{key:'girilenSendika',label:'Girdiği Sendika'},{key:'girmeTarihi',label:'Giriş Tarihi',type:'date'},{key:'uyelikNo',label:'Üyelik No'}]}
});
function canView(){return global.PermissionService?.can?.('documents.view','preview')!==false}
function canEdit(){return global.PermissionService?.can?.('documents.edit','edit')!==false}
function ensure(){if(!state)state=blank();return state}
function field(label,html){return `<label class="ka-field"><span class="ka-field__label">${esc(label)}</span>${html}</label>`}
function input(path,value,type='text',placeholder=''){return `<input type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" data-payroll-field="${esc(path)}" ${canEdit()?'':'disabled'}>`}
function personOptions(section){const used=new Set((ensure()[section]||[]).map(x=>x.kaynakId)),list=roster().filter(x=>!used.has(x.id)),teachers=list.filter(x=>x.tur==='ogretmen'),staff=list.filter(x=>x.tur==='personel'),options=items=>items.map(x=>`<option value="${esc(x.id)}">${esc(x.ad)} · ${esc(x.gorev)}</option>`).join('');return `<option value="">— Öğretmen veya personel seç —</option>${teachers.length?`<optgroup label="Öğretmenler">${options(teachers)}</optgroup>`:''}${staff.length?`<optgroup label="Diğer Personel">${options(staff)}</optgroup>`:''}`}
function initials(name){return String(name||'P').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toLocaleUpperCase('tr')||'P'}
function newEntry(section,r){const defaults={B:{tarih:'',neden:''},C:{tarih:'',neden:''},D:{eskiDerece:'',eskiKademe:'',yeniDerece:'',yeniKademe:'',terfiTarihi:''},E:{onceki:'',yeni:''},F:{neden:'',hesapNo:'',oran:''},G:{baslama:'',bitis:'',gunSayisi:''},H:{ayrilanSendika:'',ayrilmaTarihi:'',girilenSendika:'',girmeTarihi:'',uyelikNo:''}};return{kaynakId:r.id,kaynakTuru:r.tur,tc:r.tc,ad:r.ad,gorev:r.gorev,...defaults[section]}}
function personCard(section,i,x,fields){return `<article class="ka-payroll-person-card"><header><span class="ka-payroll-avatar">${esc(initials(x.ad))}</span><div><strong>${esc(x.ad)}</strong><small>${esc(x.gorev||'Personel')} · ${x.kaynakTuru==='ogretmen'?'Öğretmen':'Personel'} · TC: ${esc(x.tc?`••••••${String(x.tc).slice(-4)}`:'—')}</small></div><button type="button" data-payroll-remove="${section}:${i}" aria-label="${esc(x.ad)} kaydını kaldır" ${canEdit()?'':'disabled'}>⌫</button></header><div class="ka-payroll-person-fields">${fields.map(f=>field(f.label,input(`${section}.${i}.${f.key}`,x[f.key],f.type||'text',f.placeholder||''))).join('')}</div></article>`}
function sectionCard(section){const meta=SECTION_META[section],list=ensure()[section],open=openSection===section;return `<article class="ka-payroll-section ${open?'is-open':''}"><button class="ka-payroll-section-head" type="button" data-payroll-section-toggle="${section}" aria-expanded="${open}"><span>${esc(meta.title)}</span><b>${list.length}</b><i>${open?'⌃':'⌄'}</i></button>${open?`<div class="ka-payroll-section-body"><div class="ka-payroll-picker"><label class="ka-field"><span class="ka-field__label">Öğretmen / Personel Seç</span><select data-payroll-picker="${section}" ${canEdit()?'':'disabled'}>${personOptions(section)}</select></label><button class="ka-btn" type="button" data-payroll-add-person="${section}" ${canEdit()?'':'disabled'}>＋ Ekle</button></div>${list.length?`<div class="ka-payroll-person-list">${list.map((x,i)=>personCard(section,i,x,meta.fields)).join('')}</div>`:`<div class="ka-payroll-empty">${esc(meta.empty)}<small>Açılır listeden seçim yapıp Ekle düğmesine dokunun.</small></div>`}</div>`:''}</article>`}
function metric(label,key,value,tone=''){return `<label class="ka-payroll-metric ${tone}"><span>${esc(label)}</span><input type="number" value="${esc(value)}" data-payroll-root="${esc(key)}" ${canEdit()?'':'disabled'}></label>`}
function render(root=document.getElementById('v2ModuleRoot')){
 if(!root)return false;
 if(!canView()){root.innerHTML='<div class="ka-empty">Bu formu görüntüleme yetkiniz yok.</div>';global.toast?.('Bu formu görüntüleme yetkiniz yok.');return false}
 const s=ensure(),pay=s.gecenAyPersonelSayisi+s.buAyGiren-s.buAyCikan-s.aylikSizIzinde;
 root.innerHTML=`<section class="ka-payroll-page" data-payroll-v2>
  <header class="ka-payroll-header"><button type="button" data-payroll-back aria-label="Geri">‹</button><div><h2>Maaş Değişikliği</h2><p>${esc(s.ay)} ${esc(s.yil)} · Bildirim Formu</p></div><button type="button" data-payroll-print>🖨 <span>Yazdır</span></button></header>
  <main class="ka-payroll-content">
   <article class="ka-payroll-overview"><div class="ka-payroll-overview-title"><span>▣</span><div><small>A) PERSONEL ÖZETİ</small><strong>Dönem ve ödeme durumu</strong></div></div><div class="ka-payroll-period">${field('Ay',`<select data-payroll-root="ay" ${canEdit()?'':'disabled'}>${MONTHS.map(m=>`<option ${m===s.ay?'selected':''}>${m}</option>`).join('')}</select>`)}${field('Yıl',`<input type="number" value="${s.yil}" data-payroll-root="yil" ${canEdit()?'':'disabled'}>`)}</div><div class="ka-payroll-metrics">${metric('Geçen Ay','gecenAyPersonelSayisi',s.gecenAyPersonelSayisi,'is-previous')}${metric('Giren','buAyGiren',s.buAyGiren,'is-in')}${metric('Çıkan','buAyCikan',s.buAyCikan,'is-out')}${metric('Aylıksız','aylikSizIzinde',s.aylikSizIzinde,'is-leave')}</div><div class="ka-payroll-total"><span>Ödeme Yapılacak</span><strong>${pay}</strong></div></article>
   <div class="ka-payroll-sections">${Object.keys(SECTION_META).map(sectionCard).join('')}</div>
  </main>
  <footer class="ka-payroll-actions"><button class="ka-btn ka-btn--secondary" type="button" data-payroll-reset ${canEdit()?'':'disabled'}>Formu Sıfırla</button><button class="ka-btn" type="button" data-payroll-print>🖨 Yazdır / PDF</button></footer>
 </section>`;
 bind(root);global.PermissionService?.applyModule?.('documents');return true
}
function setPath(path,value){const p=path.split('.'),sec=p[0],i=Number(p[1]),key=p[2];if(!state?.[sec]?.[i])return;state[sec][i][key]=value}
function bind(root){
 root.querySelector('[data-payroll-back]')?.addEventListener('click',()=>global.DocumentsModule?.mount?.(root));
 root.querySelectorAll('[data-payroll-root]').forEach(el=>el.onchange=()=>{const k=el.dataset.payrollRoot;state[k]=el.type==='number'?Number(el.value)||0:el.value;render(root)});
 root.querySelectorAll('[data-payroll-field]').forEach(el=>el.onchange=()=>setPath(el.dataset.payrollField,el.value));
 root.querySelectorAll('[data-payroll-section-toggle]').forEach(b=>b.onclick=()=>{openSection=openSection===b.dataset.payrollSectionToggle?'':b.dataset.payrollSectionToggle;render(root)});
 root.querySelectorAll('[data-payroll-add-person]').forEach(b=>b.onclick=()=>{const section=b.dataset.payrollAddPerson,select=root.querySelector(`[data-payroll-picker="${section}"]`),r=roster().find(x=>x.id===select?.value);if(!r)return global.toast?.('Öğretmen veya personel seçin.');if(state[section].some(x=>x.kaynakId===r.id))return global.toast?.('Bu kişi bölüme zaten eklendi.');state[section].push(newEntry(section,r));openSection=section;render(root)});
 root.querySelectorAll('[data-payroll-remove]').forEach(b=>b.onclick=()=>{const[s,i]=b.dataset.payrollRemove.split(':');state[s].splice(Number(i),1);render(root)});
 root.querySelectorAll('[data-payroll-reset]').forEach(b=>b.addEventListener('click',()=>{state=blank();openSection='D';render(root)}));
 root.querySelectorAll('[data-payroll-print]').forEach(b=>b.addEventListener('click',print));
}
function active(section){return ensure()[section]||[]}
function trDate(v){if(!v)return'';const d=new Date(v+'T00:00:00');return Number.isNaN(d.getTime())?v:d.toLocaleDateString('tr-TR')}
function table(title,headers,body){if(!body.length)return'';return `<h3>${esc(title)}</h3><table><thead><tr>${headers.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${body.join('')}</tbody></table>`}
function reportBody(){const s=ensure(),school=rows('okulBilgileri').find(x=>x.id==='ayarlar')||global.okulBilgileriAyari||{},pay=s.gecenAyPersonelSayisi+s.buAyGiren-s.buAyCikan-s.aylikSizIzinde,row=x=>`<tr>${x.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`;return `<h1>MAAŞ DEĞİŞİKLİĞİ BİLDİRİM FORMU</h1><table><tbody><tr><th>Kurumun Adı</th><td>${esc(school.okulAdi||'KORUK İLK-ORTAOKULU')}</td><th>İlgili Ay-Yıl</th><td>${esc(s.ay)} ${esc(s.yil)}</td></tr></tbody></table><h3>A) Mevcut Personel Sayısı</h3><table><thead><tr><th>Geçen Ay</th><th>Bu Ay Giren</th><th>Bu Ay Çıkan</th><th>Aylıksız İzinde</th><th>Ödeme Yapılacak</th></tr></thead><tbody>${row([s.gecenAyPersonelSayisi,s.buAyGiren,s.buAyCikan,s.aylikSizIzinde,pay])}</tbody></table>${table('B) Ayrılan Personel',['TC','Ad Soyad','Görev','Ayrılış Tarihi','Neden'],s.B.map(x=>row([x.tc,x.ad,x.gorev,trDate(x.tarih),x.neden])))}${table('C) Başlayan Personel',['TC','Ad Soyad','Görev','Başlama Tarihi','Neden'],s.C.map(x=>row([x.tc,x.ad,x.gorev,trDate(x.tarih),x.neden])))}${table('D) Terfi Edecek Personel',['TC','Ad Soyad','Görev','Eski D/K','Yeni D/K','Terfi Tarihi'],active('D').map(x=>row([x.tc,x.ad,x.gorev,`${x.eskiDerece}/${x.eskiKademe}`,`${x.yeniDerece}/${x.yeniKademe}`,trDate(x.terfiTarihi)])))}${table('E) Maaş Değişikliği',['TC','Ad Soyad','Önceki Durum','Yeni Durum'],active('E').map(x=>row([x.tc,x.ad,x.onceki,x.yeni])))}${table('F) Kesintiler',['TC','Ad Soyad','Neden','Hesap / Yer','Oran / Miktar'],active('F').map(x=>row([x.tc,x.ad,x.neden,x.hesapNo,x.oran])))}${table('G) Raporlu Gün',['TC','Ad Soyad','Başlama','Bitiş','Kesinti Gün'],active('G').map(x=>row([x.tc,x.ad,trDate(x.baslama),trDate(x.bitis),x.gunSayisi])))}${table('H) Sendika Bilgi Değişikliği',['TC','Ad Soyad','Ayrıldığı Sendika','Ayrılma','Girdiği Sendika','Giriş','Üyelik No'],active('H').map(x=>row([x.tc,x.ad,x.ayrilanSendika,trDate(x.ayrilmaTarihi),x.girilenSendika,trDate(x.girmeTarihi),x.uyelikNo])))}<p>Kurumumuzun <strong>${esc(s.ay)} ${esc(s.yil)}</strong> ayına ait personel maaşlarında esas alınacak değişiklik durumu kayıtlarımıza uygun olarak düzenlenmiştir.</p>`}
function print(){if(!canView()){global.toast?.('Bu formu görüntüleme yetkiniz yok.');return false}if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return false}global.ReportEngine.printReport('Maaş Değişikliği Bildirim Formu',reportBody(),{fileName:`Maas_Degisikligi_${ensure().ay}_${ensure().yil}`,yon:'yatay'});return true}
function inject(){const root=document.querySelector('[data-documents-module]');if(!root||root.querySelector('[data-document-form="payroll"]'))return;const rowsEl=root.querySelector('.ka-row');if(!rowsEl)return;const b=document.createElement('button');b.type='button';b.className='ka-btn ka-btn--secondary ka-btn--sm';b.dataset.documentForm='payroll';b.dataset.kaPermission='documents.view';b.dataset.kaMinLevel='preview';b.textContent='Maaş Değişikliği Formu';b.onclick=()=>{if(!canView())return global.toast?.('Bu formu görüntüleme yetkiniz yok.');state=blank();openSection='D';render(document.getElementById('v2ModuleRoot'))};rowsEl.appendChild(b);global.PermissionService?.applyModule?.('documents')}
function open(){if(!canView()){global.toast?.('Bu formu görüntüleme yetkiniz yok.');return false}state=blank();openSection='D';return render()}
global.PayrollChangeModule={open,render,reset:()=>{state=blank();openSection='D';return state},reportBody};
global.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='documents')requestAnimationFrame(inject)});
})(window);
