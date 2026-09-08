from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label} marker missing')
    return text.replace(old, new, 1)

settings = Path('js/modules/settings.js')
s = settings.read_text(encoding='utf-8')

s = replace_once(
    s,
    "let active='home',mounted=false,unsubs=[],settingsAccordion='',statisticsRefreshing=false,layoutSection='menus',layoutMenu='people';",
    "let active='home',mounted=false,unsubs=[],settingsAccordion='',statisticsRefreshing=false,layoutSection='menus',layoutMenu='people',adminInfoData=null,adminInfoDraft=null,adminInfoLoading=false;",
    'settings state'
)

helpers = r'''function normalizeSettingsRole(v){return String(v||'').trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i')}
function managerSettingsUser(){const u=window.AKTIF_KULLANICI||window.AppStore?.get?.('session.user')||{},r=window.AKTIF_ROL||window.AppStore?.get?.('session.role')||arr('roller').find(x=>x.id===u.rolId)||{},n=normalizeSettingsRole(r.ad||r.rolAdi||u.rolAdi||u.rol||'');return n==='yonetici'||n.startsWith('yonetici ')}
function adminInfoAllowed(){return admin()||managerSettingsUser()}
function adminInfoId(){return`row-${Date.now()}-${Math.random().toString(36).slice(2,8)}`}
function adminToday(){return new Date().toISOString().slice(0,10)}
function cloneAdminInfo(v){try{return structuredClone(v)}catch(_){return JSON.parse(JSON.stringify(v))}}
function defaultAdminInfo(){return{elektrikAboneNo:'',suAboneNo:'',internetAboneNo:'',vergiDairesi:'',vergiNumarasi:'',abonelikler:[],resmiBilgiler:[],resmiNumaralar:[],uygulamaSifreleri:[],not:'',notlar:[]}}
function normalizeAdminInfo(v={}){const sourceNotes=Array.isArray(v.notlar)?v.notlar:[],legacyNote=String(v.not||'').trim(),notlar=(sourceNotes.length?sourceNotes:(legacyNote?[{id:'legacy-note',baslik:'Genel Not',icerik:legacyNote,tarih:''}]:[])).map(x=>({id:String(x.id||adminInfoId()),baslik:String(x.baslik||''),icerik:String(x.icerik??x.not??''),tarih:String(x.tarih||'').slice(0,10)}));const legacySubs=[['Elektrik',v.elektrikAboneNo],['Su',v.suAboneNo],['İnternet',v.internetAboneNo]].filter(([,n])=>String(n||'').trim()).map(([tur,numara])=>({id:adminInfoId(),tur,kurum:'',numara:String(numara),aciklama:''}));const abonelikler=(Array.isArray(v.abonelikler)&&v.abonelikler.length?v.abonelikler:legacySubs).map(x=>({id:String(x.id||adminInfoId()),tur:String(x.tur||'Diğer'),kurum:String(x.kurum||x.birim||''),numara:String(x.numara||x.aboneNo||x.musteriNo||''),aciklama:String(x.aciklama||'')}));const legacyOfficial=[];if(String(v.vergiDairesi||v.vergiNumarasi||'').trim())legacyOfficial.push({id:adminInfoId(),tur:'Vergi Numarası',birim:'Ortak',baslik:String(v.vergiDairesi||'Vergi Dairesi'),deger:String(v.vergiNumarasi||''),aciklama:''});for(const x of Array.isArray(v.resmiNumaralar)?v.resmiNumaralar:[])legacyOfficial.push({id:String(x.id||adminInfoId()),tur:'Resmî Numara',birim:'Ortak',baslik:String(x.baslik||''),deger:String(x.deger||''),aciklama:''});const resmiBilgiler=(Array.isArray(v.resmiBilgiler)&&v.resmiBilgiler.length?v.resmiBilgiler:legacyOfficial).map(x=>({id:String(x.id||adminInfoId()),tur:String(x.tur||'Resmî Numara'),birim:String(x.birim||'Ortak'),baslik:String(x.baslik||''),deger:String(x.deger||x.numara||''),aciklama:String(x.aciklama||'')}));return{...defaultAdminInfo(),...v,abonelikler,resmiBilgiler,resmiNumaralar:resmiBilgiler.map(x=>({id:x.id,baslik:[x.birim,x.baslik||x.tur].filter(Boolean).join(' · '),deger:x.deger})),uygulamaSifreleri:(Array.isArray(v.uygulamaSifreleri)?v.uygulamaSifreleri:[]).map(x=>({id:String(x.id||adminInfoId()),ad:String(x.ad||''),kullaniciAdi:String(x.kullaniciAdi||''),sifre:String(x.sifre||''),url:String(x.url||''),not:String(x.not||'')})),notlar,not:notlar[0]?.icerik||legacyNote}}
function adminOption(value,label,current){return`<option value="${esc(value)}" ${String(current||'')===String(value)?'selected':''}>${esc(label)}</option>`}
function adminSubscriptionRow(x={}){return`<div class="ka-admin-record" data-admin-subscription-row data-row-id="${esc(x.id||adminInfoId())}"><div class="ka-admin-form-grid"><label class="ka-field"><span class="ka-field__label">Abonelik Türü</span><select data-admin-subscription-type>${['Elektrik','Su','İnternet','Doğalgaz','Telefon','Diğer'].map(v=>adminOption(v,v,x.tur||'Diğer')).join('')}</select></label><label class="ka-field"><span class="ka-field__label">Kurum / Birim</span><input data-admin-subscription-org value="${esc(x.kurum||'')}" placeholder="Örn. Koruk Ortaokulu"></label><label class="ka-field"><span class="ka-field__label">Abone / Müşteri No</span><input data-admin-subscription-number value="${esc(x.numara||'')}"></label><label class="ka-field"><span class="ka-field__label">Açıklama</span><input data-admin-subscription-note value="${esc(x.aciklama||'')}"></label></div><button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-admin-subscription-remove>Kaydı Sil</button></div>`}
function adminOfficialRow(x={}){return`<div class="ka-admin-record" data-admin-number-row data-row-id="${esc(x.id||adminInfoId())}"><div class="ka-admin-form-grid"><label class="ka-field"><span class="ka-field__label">Bilgi Türü</span><select data-admin-number-type>${['Vergi Numarası','Kurum Kodu','Mükellef No','IBAN','Resmî Numara','Diğer'].map(v=>adminOption(v,v,x.tur||'Resmî Numara')).join('')}</select></label><label class="ka-field"><span class="ka-field__label">Birim</span><select data-admin-number-unit>${['Ortak','İlkokul','Ortaokul','Diğer'].map(v=>adminOption(v,v,x.birim||'Ortak')).join('')}</select></label><label class="ka-field"><span class="ka-field__label">Başlık / Kurum</span><input data-admin-number-title value="${esc(x.baslik||'')}"></label><label class="ka-field"><span class="ka-field__label">Numara / Değer</span><input data-admin-number-value value="${esc(x.deger||'')}"></label><label class="ka-field ka-field--wide"><span class="ka-field__label">Açıklama</span><input data-admin-number-note value="${esc(x.aciklama||'')}"></label></div><button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-admin-number-remove>Kaydı Sil</button></div>`}
function adminSecretRow(x={}){return`<div class="ka-admin-record" data-admin-secret-row data-row-id="${esc(x.id||adminInfoId())}"><div class="ka-admin-form-grid"><label class="ka-field"><span class="ka-field__label">Uygulama / Hizmet</span><input data-admin-secret-name value="${esc(x.ad||'')}"></label><label class="ka-field"><span class="ka-field__label">Kullanıcı Adı</span><input data-admin-secret-user value="${esc(x.kullaniciAdi||'')}" autocomplete="off"></label><label class="ka-field ka-field--wide"><span class="ka-field__label">Şifre</span><div class="ka-row"><input class="ka-grow" type="password" data-admin-secret-password value="${esc(x.sifre||'')}" autocomplete="new-password"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-admin-secret-toggle>Göster</button><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-admin-secret-copy>Kopyala</button></div></label><label class="ka-field"><span class="ka-field__label">Web Adresi</span><input type="url" data-admin-secret-url value="${esc(x.url||'')}"></label><label class="ka-field"><span class="ka-field__label">Not</span><input data-admin-secret-note value="${esc(x.not||'')}"></label></div><button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-admin-secret-remove>Kaydı Sil</button></div>`}
function adminNoteRow(x={}){return`<div class="ka-admin-record" data-admin-note-row data-row-id="${esc(x.id||adminInfoId())}"><div class="ka-admin-form-grid"><label class="ka-field"><span class="ka-field__label">Not Başlığı</span><input data-admin-note-title value="${esc(x.baslik||'')}"></label><label class="ka-field"><span class="ka-field__label">Tarih</span><input type="date" data-admin-note-date value="${esc(x.tarih||'')}"></label><label class="ka-field ka-field--wide"><span class="ka-field__label">Not</span><textarea rows="4" data-admin-note-content>${esc(x.icerik||'')}</textarea></label></div><button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-admin-note-remove>Notu Sil</button></div>`}
function adminSection(icon,title,subtitle,body){return`<section class="ka-admin-section"><div class="ka-admin-section__header"><span class="ka-admin-section__icon">${icon}</span><span class="ka-admin-section__title"><strong>${esc(title)}</strong><small>${esc(subtitle)}</small></span></div><div class="ka-admin-section__body">${body}</div></section>`}
function adminInfoPage(){if(adminInfoLoading&&!adminInfoData)return'<div class="ka-empty">İdari bilgiler yükleniyor…</div>';const d=normalizeAdminInfo(adminInfoDraft||adminInfoData||{}),stat=(icon,value,label)=>`<div class="ka-admin-stat"><span>${icon}</span><div><strong>${esc(value)}</strong><small>${esc(label)}</small></div></div>`,subs=`<div class="ka-stack">${d.abonelikler.length?d.abonelikler.map(adminSubscriptionRow).join(''):'<div class="ka-admin-empty">Henüz abonelik eklenmedi.</div>'}</div><button class="ka-btn ka-btn--secondary ka-admin-section-add" type="button" data-admin-subscription-add>+ Abonelik Ekle</button>`,official=`<div class="ka-stack">${d.resmiBilgiler.length?d.resmiBilgiler.map(adminOfficialRow).join(''):'<div class="ka-admin-empty">Henüz resmî bilgi eklenmedi.</div>'}</div><button class="ka-btn ka-btn--secondary ka-admin-section-add" type="button" data-admin-number-add>+ Resmî Bilgi Ekle</button>`,secrets=`<div class="ka-stack">${d.uygulamaSifreleri.length?d.uygulamaSifreleri.map(adminSecretRow).join(''):'<div class="ka-admin-empty">Henüz şifre kaydı eklenmedi.</div>'}</div><button class="ka-btn ka-btn--secondary ka-admin-section-add" type="button" data-admin-secret-add>+ Şifre Ekle</button>`,notes=`<div class="ka-stack">${d.notlar.length?d.notlar.map(adminNoteRow).join(''):'<div class="ka-admin-empty">Henüz idari not eklenmedi.</div>'}</div><button class="ka-btn ka-btn--secondary ka-admin-section-add" type="button" data-admin-note-add>+ Not Ekle</button>`;return`<section class="ka-stack ka-admin-info-page"><div class="ka-admin-info-hero"><span class="ka-admin-info-hero__icon">🔐</span><div><strong>İdari Bilgiler ve Şifreler</strong><small>Yalnız Admin ve Yönetici</small></div></div><div class="ka-admin-stats">${stat('🔌',d.abonelikler.length,'Abonelik')}${stat('🏛️',d.resmiBilgiler.length,'Resmî Bilgi')}${stat('🔑',d.uygulamaSifreleri.length,'Şifre Kaydı')}${stat('📝',d.notlar.length,'İdari Not')}</div>${adminSection('🔌','Abonelik Bilgileri','Elektrik, su, internet ve diğer abonelikler',subs)}${adminSection('🏛️','Vergi ve Resmî Numaralar','İlkokul, ortaokul ve ortak resmî bilgiler',official)}${adminSection('🔑','Uygulama ve Portal Şifreleri','Kurum adına kullanılan giriş bilgileri',secrets)}${adminSection('📝','İdari Notlar','İstediğiniz kadar idari not ekleyin',notes)}<div class="ka-admin-savebar"><button class="ka-btn" type="button" data-admin-info-save>💾 İdari Bilgileri Kaydet</button></div></section>`}
function collectAdminInfo(out){const abonelikler=[...out.querySelectorAll('[data-admin-subscription-row]')].map(row=>({id:row.dataset.rowId||adminInfoId(),tur:row.querySelector('[data-admin-subscription-type]')?.value||'Diğer',kurum:row.querySelector('[data-admin-subscription-org]')?.value||'',numara:row.querySelector('[data-admin-subscription-number]')?.value||'',aciklama:row.querySelector('[data-admin-subscription-note]')?.value||''})),resmiBilgiler=[...out.querySelectorAll('[data-admin-number-row]')].map(row=>({id:row.dataset.rowId||adminInfoId(),tur:row.querySelector('[data-admin-number-type]')?.value||'Resmî Numara',birim:row.querySelector('[data-admin-number-unit]')?.value||'Ortak',baslik:row.querySelector('[data-admin-number-title]')?.value||'',deger:row.querySelector('[data-admin-number-value]')?.value||'',aciklama:row.querySelector('[data-admin-number-note]')?.value||''})),notlar=[...out.querySelectorAll('[data-admin-note-row]')].map(row=>({id:row.dataset.rowId||adminInfoId(),baslik:row.querySelector('[data-admin-note-title]')?.value||'',tarih:row.querySelector('[data-admin-note-date]')?.value||'',icerik:row.querySelector('[data-admin-note-content]')?.value||''})),firstSub=t=>abonelikler.find(x=>x.tur===t)?.numara||'',firstTax=resmiBilgiler.find(x=>x.tur==='Vergi Numarası')||{};adminInfoDraft={abonelikler,resmiBilgiler,elektrikAboneNo:firstSub('Elektrik'),suAboneNo:firstSub('Su'),internetAboneNo:firstSub('İnternet'),vergiDairesi:firstTax.baslik||'',vergiNumarasi:firstTax.deger||'',resmiNumaralar:resmiBilgiler.map(x=>({id:x.id,baslik:[x.birim,x.baslik||x.tur].filter(Boolean).join(' · '),deger:x.deger})),uygulamaSifreleri:[...out.querySelectorAll('[data-admin-secret-row]')].map(row=>({id:row.dataset.rowId||adminInfoId(),ad:row.querySelector('[data-admin-secret-name]')?.value||'',kullaniciAdi:row.querySelector('[data-admin-secret-user]')?.value||'',sifre:row.querySelector('[data-admin-secret-password]')?.value||'',url:row.querySelector('[data-admin-secret-url]')?.value||'',not:row.querySelector('[data-admin-secret-note]')?.value||''})),notlar,not:notlar[0]?.icerik||'',guncellenmeTarihi:adminInfoData?.guncellenmeTarihi||adminInfoDraft?.guncellenmeTarihi||''};return adminInfoDraft}
async function loadAdminInfo(){if(!adminInfoAllowed())return;adminInfoLoading=true;render();try{if(!window.db||!window.COL?.idariBilgiler)throw new Error('Veri bağlantısı hazır değil.');const snap=await window.db.collection(window.COL.idariBilgiler).doc('ayarlar').get();adminInfoData=normalizeAdminInfo(snap.exists?snap.data():{});adminInfoDraft=cloneAdminInfo(adminInfoData)}catch(e){toast?.('İdari bilgiler yüklenemedi: '+(e?.message||e))}finally{adminInfoLoading=false;render()}}
async function saveAdminInfo(){if(!adminInfoAllowed())return toast?.('Bu işlem için yetkiniz yok.');const out=document.getElementById('settingsContent'),payload=normalizeAdminInfo(collectAdminInfo(out));payload.guncellenmeTarihi=new Date().toISOString();payload.guncelleyenUid=(window.AKTIF_KULLANICI||{})?.uid||'';const btn=out?.querySelector('[data-admin-info-save]');if(btn){btn.disabled=true;btn.textContent='Kaydediliyor…'}try{await window.db.collection(window.COL.idariBilgiler).doc('ayarlar').set(payload,{merge:false});adminInfoData=normalizeAdminInfo(payload);adminInfoDraft=cloneAdminInfo(adminInfoData);toast?.('İdari bilgiler kaydedildi.');render()}catch(e){toast?.('İdari bilgiler kaydedilemedi: '+(e?.message||e));if(btn){btn.disabled=false;btn.textContent='💾 İdari Bilgileri Kaydet'}}}
function bindAdminInfo(out){out.addEventListener('input',()=>collectAdminInfo(out));const rerender=()=>render();out.querySelector('[data-admin-subscription-add]')?.addEventListener('click',()=>{collectAdminInfo(out);adminInfoDraft.abonelikler.push({id:adminInfoId(),tur:'Diğer',kurum:'',numara:'',aciklama:''});rerender()});out.querySelector('[data-admin-number-add]')?.addEventListener('click',()=>{collectAdminInfo(out);adminInfoDraft.resmiBilgiler.push({id:adminInfoId(),tur:'Resmî Numara',birim:'Ortak',baslik:'',deger:'',aciklama:''});rerender()});out.querySelector('[data-admin-secret-add]')?.addEventListener('click',()=>{collectAdminInfo(out);adminInfoDraft.uygulamaSifreleri.push({id:adminInfoId(),ad:'',kullaniciAdi:'',sifre:'',url:'',not:''});rerender()});out.querySelector('[data-admin-note-add]')?.addEventListener('click',()=>{collectAdminInfo(out);adminInfoDraft.notlar.push({id:adminInfoId(),baslik:'',icerik:'',tarih:adminToday()});rerender()});out.addEventListener('click',async e=>{const row=e.target.closest?.('[data-admin-subscription-row],[data-admin-number-row],[data-admin-secret-row],[data-admin-note-row]');if(e.target.closest?.('[data-admin-subscription-remove]')){collectAdminInfo(out);adminInfoDraft.abonelikler=adminInfoDraft.abonelikler.filter(x=>x.id!==row?.dataset.rowId);rerender();return}if(e.target.closest?.('[data-admin-number-remove]')){collectAdminInfo(out);adminInfoDraft.resmiBilgiler=adminInfoDraft.resmiBilgiler.filter(x=>x.id!==row?.dataset.rowId);rerender();return}if(e.target.closest?.('[data-admin-secret-remove]')){collectAdminInfo(out);adminInfoDraft.uygulamaSifreleri=adminInfoDraft.uygulamaSifreleri.filter(x=>x.id!==row?.dataset.rowId);rerender();return}if(e.target.closest?.('[data-admin-note-remove]')){collectAdminInfo(out);adminInfoDraft.notlar=adminInfoDraft.notlar.filter(x=>x.id!==row?.dataset.rowId);rerender();return}const toggle=e.target.closest?.('[data-admin-secret-toggle]');if(toggle){const input=row?.querySelector('[data-admin-secret-password]');if(input){input.type=input.type==='password'?'text':'password';toggle.textContent=input.type==='password'?'Göster':'Gizle'}return}if(e.target.closest?.('[data-admin-secret-copy]')){const input=row?.querySelector('[data-admin-secret-password]');if(input?.value){try{await navigator.clipboard.writeText(input.value);toast?.('Şifre kopyalandı.')}catch(_){toast?.('Şifre kopyalanamadı.')}}}});out.querySelector('[data-admin-info-save]')?.addEventListener('click',saveAdminInfo)}
function holidayRanges(){const cfg=lessonSettings(),raw=Array.isArray(cfg.tatilAraliklari)?cfg.tatilAraliklari:[];if(raw.length)return raw.map((x,i)=>({id:String(x.id||`tatil-${i}`),ad:String(x.ad||'Tatil'),baslangicTarihi:String(x.baslangicTarihi||''),bitisTarihi:String(x.bitisTarihi||''),not:String(x.not||'')}));if(cfg.tatilModu&&cfg.tatilBaslangicTarihi&&cfg.okulAcilisTarihi){const end=new Date(`${cfg.okulAcilisTarihi}T12:00:00`);end.setDate(end.getDate()-1);return[{id:'legacy-holiday',ad:'Mevcut Tatil',baslangicTarihi:String(cfg.tatilBaslangicTarihi),bitisTarihi:lessonLocalDateValue(end),not:String(cfg.tatilModuNotu||'')}]}return[]}
let holidayDraft=null;
function currentHolidayRanges(){return Array.isArray(holidayDraft)?holidayDraft:holidayRanges()}
function holidayPage(){const editable=systemSettingsEditable(),rows=currentHolidayRanges(),disabled=editable?'':'disabled',cards=rows.map(x=>`<div class="ka-admin-record" data-holiday-row data-row-id="${esc(x.id)}"><label class="ka-field"><span class="ka-field__label">Tatil Adı</span><input data-holiday-name value="${esc(x.ad)}" ${disabled}></label><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Başlangıç Tarihi</span><input type="date" data-holiday-start value="${esc(x.baslangicTarihi)}" ${disabled}></label><label class="ka-field"><span class="ka-field__label">Bitiş Tarihi</span><input type="date" data-holiday-end value="${esc(x.bitisTarihi)}" ${disabled}></label></div><label class="ka-field"><span class="ka-field__label">Not</span><input data-holiday-note value="${esc(x.not)}" ${disabled}></label>${editable?'<button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-holiday-remove>Sil</button>':''}</div>`).join('');return`<section class="ka-stack"><article class="ka-card"><div class="ka-card__body ka-stack"><div><strong>🏖️ Planlı Tatiller</strong><div class="ka-muted">Başlangıç ve bitiş tarihleri dahildir. Tarih aralığında Tatil Modu otomatik çalışır.</div></div><div class="ka-stack" data-holiday-list>${cards||'<div class="ka-empty">Henüz planlı tatil yok.</div>'}</div>${editable?'<button class="ka-btn ka-btn--secondary" type="button" data-holiday-add>+ Tatil Ekle</button><button class="ka-btn" type="button" data-holiday-save>💾 Tatilleri Kaydet</button>':'<div class="ka-muted">Bu alan salt okunur.</div>'}</div></article></section>`}
function collectHolidayDraft(out){holidayDraft=[...out.querySelectorAll('[data-holiday-row]')].map(row=>({id:row.dataset.rowId||adminInfoId(),ad:row.querySelector('[data-holiday-name]')?.value||'Tatil',baslangicTarihi:row.querySelector('[data-holiday-start]')?.value||'',bitisTarihi:row.querySelector('[data-holiday-end]')?.value||'',not:row.querySelector('[data-holiday-note]')?.value||''}));return holidayDraft}
function bindHoliday(out){if(!systemSettingsEditable())return;out.addEventListener('input',()=>collectHolidayDraft(out));out.querySelector('[data-holiday-add]')?.addEventListener('click',()=>{collectHolidayDraft(out);holidayDraft.push({id:adminInfoId(),ad:'Yeni Tatil',baslangicTarihi:'',bitisTarihi:'',not:''});render()});out.addEventListener('click',e=>{if(!e.target.closest?.('[data-holiday-remove]'))return;collectHolidayDraft(out);const id=e.target.closest('[data-holiday-row]')?.dataset.rowId;holidayDraft=holidayDraft.filter(x=>x.id!==id);render()});out.querySelector('[data-holiday-save]')?.addEventListener('click',async()=>{const ranges=collectHolidayDraft(out);for(const x of ranges){if(!x.baslangicTarihi||!x.bitisTarihi)return toast?.('Her tatil için başlangıç ve bitiş tarihi seçin.');if(x.bitisTarihi<x.baslangicTarihi)return toast?.('Tatil bitiş tarihi başlangıçtan önce olamaz.')}const sorted=ranges.slice().sort((a,b)=>a.baslangicTarihi.localeCompare(b.baslangicTarihi));for(let i=1;i<sorted.length;i++)if(sorted[i].baslangicTarihi<=sorted[i-1].bitisTarihi)return toast?.('Tatil tarih aralıkları birbiriyle çakışamaz.');const cfg=lessonSettings();cfg.tatilAraliklari=ranges;cfg.tatilAraliklariVersion=1;cfg.guncellenmeTarihi=new Date().toISOString();await DeviceData.set('dersSaatleri',COL.dersSaatleri,'ayarlar',cfg,{merge:false});holidayDraft=null;toast?.('Tatil planı kaydedildi.');render()})}
'''

marker = 'async function prepareLocal(){'
if marker not in s:
    raise SystemExit('prepareLocal marker missing')
s = s.replace(marker, helpers + marker, 1)

s = replace_once(s, "['lesson-hours','Ders Saatleri','Zil saatleri, öğle arası ve tatil modu'],", "['lesson-hours','Ders Saatleri','Zil saatleri ve öğle arası'],['holiday','Tatil Modu','Planlı tatiller ve otomatik tarih aralıkları'],", 'home lesson item')
s = replace_once(s, "['storage','Depolama','Kullanıcı depolama sınırları']", "['storage','Depolama','Kullanıcı depolama sınırları'],['admin-info','İdari Bilgiler ve Şifreler','Abonelik, resmî bilgiler, şifreler ve notlar']", 'home system item')
s = replace_once(s,
    "function settingsDescription(page){if(page==='home')return'Hesap, akademik yapı ve sistem ayarları.';return page==='statistics'?'Tüm kullanıcıların giriş, kullanım ve depolama hareketlerini tek ekrandan izleyin.':'Bu bölümün ayarlarını yönetin.'}",
    "function settingsDescription(page){if(page==='home')return'Hesap, akademik yapı ve sistem ayarları.';if(page==='statistics')return'Tüm kullanıcıların giriş, kullanım ve depolama hareketlerini tek ekrandan izleyin.';if(page==='holiday')return'Planlı tatiller ve otomatik Tatil Modu.';if(page==='admin-info')return'Abonelik, resmî bilgi, şifre ve idari notlar.';return'Bu bölümün ayarlarını yönetin.'}",
    'description')

# Lesson hours: remove holiday card only, keep lesson UI unchanged.
start = s.index('function lessonHours(){')
end = s.index('function distributeLessonHours', start)
lesson = s[start:end]
lesson2, n = re.subn(r'<article class="ka-card"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><strong>🏖️ Tatil Modu.*?</article>', '', lesson, count=1, flags=re.S)
if n != 1:
    raise SystemExit('holiday card remove failed')
s = s[:start] + lesson2 + s[end:]

# Lesson save: holiday fields no longer belong to this page.
start = s.index('async function saveLessonHours(){')
end = s.index('function bindLessonHours', start)
block = s[start:end]
block2, n = re.subn(r"const holiday=!!document\.querySelector\('\[data-lesson-holiday\]'\).*?const current=lessonSettings\(\),\{id:_id,\.\.\.base\}=current,holidayStart=.*?,payload=", "const current=lessonSettings(),{id:_id,...base}=current,payload=", block, count=1, flags=re.S)
if n != 1:
    raise SystemExit('holiday save extraction failed')
block2 = block2.replace(",tatilModu:holiday,tatilModuNotu:holidayMessage,okulAcilisTarihi:openingDate,tatilBaslangicTarihi:holidayStart", '')
block2 = block2.replace("toast?.('Ders saatleri ve tatil modu kaydedildi.')", "toast?.('Ders saatleri kaydedildi.')")
s = s[:start] + block2 + s[end:]

start = s.index('function bindLessonHours(out){')
end = s.index('function teacherOptions', start)
s = s[:start] + "function bindLessonHours(out){const editable=systemSettingsEditable(),lunch=out.querySelector('[data-lesson-lunch-enabled]'),lunchSync=()=>{const off=!editable||!lunch?.checked;out.querySelectorAll('[data-lesson-auto-lunch-duration],[data-lesson-auto-lunch-after]').forEach(x=>x.disabled=off)};lunch?.addEventListener('change',lunchSync);lunchSync();out.querySelector('[data-lesson-auto-distribute]')?.addEventListener('click',()=>distributeLessonHours(out));out.querySelector('[data-lesson-hours-save]')?.addEventListener('click',saveLessonHours)}\n" + s[end:]

s = replace_once(s,
    "function activeAllowed(tab){if(settingsTeacherUser()&&['users','statistics','roles'].includes(tab))return false;if(tab==='users'||tab==='statistics')return canUsers('preview');if(tab==='roles')return canRoles('preview');if(['storage','app','reminders'].includes(tab))return admin();if(tab==='school')return schoolVisible();return true}",
    "function activeAllowed(tab){if(settingsTeacherUser()&&['users','statistics','roles','admin-info'].includes(tab))return false;if(tab==='admin-info')return adminInfoAllowed();if(tab==='users'||tab==='statistics')return canUsers('preview');if(tab==='roles')return canRoles('preview');if(['storage','app','reminders'].includes(tab))return admin();if(tab==='school')return schoolVisible();return true}",
    'activeAllowed')

start = s.index('function render(){')
end = s.index('function backSettings', start)
r = s[start:end]
r = r.replace("active==='lesson-hours'?lessonHours():", "active==='lesson-hours'?lessonHours():active==='holiday'?holidayPage():")
r = r.replace("active==='app'?appLayout():account()", "active==='app'?appLayout():active==='admin-info'?adminInfoPage():account()")
r = r.replace("if(active==='lesson-hours')bindLessonHours(out);", "if(active==='lesson-hours')bindLessonHours(out);if(active==='holiday')bindHoliday(out);if(active==='admin-info')bindAdminInfo(out);")
s = s[:start] + r + s[end:]

start = s.index("function openPage(page,title=''){")
end = s.index('function unmount(){', start)
o = s[start:end]
o = o.replace("if(page==='statistics')void prepareStatisticsData(false);", "if(page==='statistics')void prepareStatisticsData(false);if(page==='admin-info'&&!adminInfoData&&!adminInfoLoading)void loadAdminInfo();if(page!=='holiday')holidayDraft=null;")
s = s[:start] + o + s[end:]
s = s.replace("function unmount(){mounted=false;", "function unmount(){mounted=false;adminInfoData=null;adminInfoDraft=null;adminInfoLoading=false;holidayDraft=null;", 1)

settings.write_text(s, encoding='utf-8')

# Native styles.
css = Path('css/design-system.css')
c = css.read_text(encoding='utf-8')
styles = r'''
/* Native Settings: İdari Bilgiler ve Şifreler */
.ka-admin-info-page{max-width:760px;margin:0 auto;padding-bottom:18px;overflow-x:hidden}
.ka-admin-info-hero{display:flex;gap:12px;align-items:center;padding:16px;border:1px solid var(--ka-border);border-radius:20px;background:linear-gradient(135deg,color-mix(in srgb,var(--ka-primary) 13%,transparent),transparent)}
.ka-admin-info-hero__icon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:color-mix(in srgb,var(--ka-primary) 15%,transparent);font-size:24px;flex:0 0 auto}
.ka-admin-info-hero small,.ka-admin-section__title small,.ka-admin-stat small{display:block;color:var(--ka-muted);margin-top:3px}
.ka-admin-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.ka-admin-stat{min-width:0;border:1px solid var(--ka-border);border-radius:18px;padding:14px;background:var(--ka-card-bg);display:flex;align-items:center;gap:11px}
.ka-admin-stat>span{width:40px;height:40px;display:grid;place-items:center;border-radius:13px;background:color-mix(in srgb,var(--ka-primary) 11%,transparent);font-size:19px;flex:0 0 auto}
.ka-admin-section{border:1px solid var(--ka-border);border-radius:20px;background:var(--ka-card-bg);overflow:hidden}
.ka-admin-section__header{display:flex;align-items:center;gap:12px;padding:15px 16px;border-bottom:1px solid var(--ka-border)}
.ka-admin-section__icon{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:color-mix(in srgb,var(--ka-primary) 12%,transparent);font-size:20px;flex:0 0 auto}
.ka-admin-section__title{min-width:0;flex:1}.ka-admin-section__title strong{display:block}
.ka-admin-section__body{padding:14px;display:grid;gap:12px}.ka-admin-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ka-admin-form-grid .ka-field--wide{grid-column:1/-1}
.ka-admin-record{border:1px solid var(--ka-border);border-radius:16px;padding:13px;background:color-mix(in srgb,var(--ka-card-bg) 96%,var(--ka-text) 4%);display:grid;gap:12px}
.ka-admin-section-add{width:100%;min-height:46px}.ka-admin-empty{padding:14px;border:1px dashed var(--ka-border);border-radius:14px;text-align:center;color:var(--ka-muted)}
.ka-admin-savebar{position:sticky;bottom:82px;z-index:5;padding:10px;border:1px solid var(--ka-border);border-radius:18px;background:color-mix(in srgb,var(--ka-card-bg) 92%,transparent);backdrop-filter:blur(12px);box-shadow:0 10px 28px rgba(0,0,0,.12)}.ka-admin-savebar .ka-btn{width:100%;min-height:50px}
button:not(:disabled){transition:transform .1s ease,filter .1s ease,box-shadow .1s ease,opacity .1s ease}button.ka-is-pressed,button:not(:disabled):active{transform:scale(.965);filter:brightness(.94)}
@media(max-width:640px){.ka-admin-info-page{width:100%;max-width:none}.ka-admin-form-grid{grid-template-columns:1fr}.ka-admin-form-grid .ka-field--wide{grid-column:auto}.ka-admin-section__header{padding:14px}.ka-admin-section__body{padding:12px}.ka-admin-savebar{bottom:78px}}
'''
if '/* Native Settings: İdari Bilgiler ve Şifreler */' not in c:
    c += '\n' + styles
css.write_text(c, encoding='utf-8')

# Move button feedback into the canonical shell.
shell = Path('js/core/shell-ui.js')
sh = shell.read_text(encoding='utf-8')
marker = "const user=()=>global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};"
feedback = r'''const user=()=>global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};
function installButtonFeedback(){if(global.__kaButtonFeedbackInstalled)return;global.__kaButtonFeedbackInstalled=true;document.addEventListener('pointerdown',e=>{const b=e.target.closest?.('button:not(:disabled)');if(b)b.classList.add('ka-is-pressed')},true);const clear=e=>e.target.closest?.('button')?.classList.remove('ka-is-pressed');document.addEventListener('pointerup',clear,true);document.addEventListener('pointercancel',clear,true);document.addEventListener('click',e=>{const b=e.target.closest?.('button:not(:disabled)');if(!b||b.dataset.pressToast==='off'||b.matches('.ka-icon-button,.ka-bottom-item,[data-ka-shell-action],[data-modal-close],[data-close]'))return;if(!b.matches('.ka-btn,button[type="submit"]'))return;const label=String(b.innerText||b.textContent||'İşlem').replace(/\s+/g,' ').trim().slice(0,42);if(label)global.toast?.(`✓ ${label} seçildi`)},true)}
installButtonFeedback();'''
if marker not in sh:
    raise SystemExit('shell user marker missing')
sh = sh.replace(marker, feedback, 1)
shell.write_text(sh, encoding='utf-8')

# Remove extension loader/cache/style-injection exception.
firebase = Path('js/firebase-init.js')
f = firebase.read_text(encoding='utf-8')
f, n = re.subn(r"\n/\* Ayarlar uzantısı:.*?settingsAdminExtensionLoad.*?\n\}\)\(\);\n?", '\n', f, count=1, flags=re.S)
if n != 1:
    raise SystemExit('firebase extension loader remove failed')
firebase.write_text(f, encoding='utf-8')

sw = Path('service-worker.js')
w = sw.read_text(encoding='utf-8').replace("'./js/core/settings-admin-extension.js',", '')
w = re.sub(r"const CACHE_ADI='oy-cache-v(\d+)'", lambda m: f"const CACHE_ADI='oy-cache-v{int(m.group(1))+1}'", w, count=1)
sw.write_text(w, encoding='utf-8')

arch = Path('scripts/check-client-architecture.mjs')
a = arch.read_text(encoding='utf-8')
a = a.replace("const STYLE_INJECTION_ALLOWLIST=new Set(['js/core/settings-admin-extension.js']);", "const STYLE_INJECTION_ALLOWLIST=new Set();")
arch.write_text(a, encoding='utf-8')

Path('tests/admin-info-mobile-notes.test.js').write_text(r'''const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('js/modules/settings.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
const firebase=fs.readFileSync('js/firebase-init.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
new Function(src);
assert(src.includes("['admin-info','İdari Bilgiler ve Şifreler'"),'İdari bilgiler native Settings menüsünde değil.');
assert(src.includes("active==='admin-info'?adminInfoPage()"),'İdari bilgiler native render akışına bağlı değil.');
assert(src.includes("active==='holiday'?holidayPage()"),'Tatil Modu native Settings sayfası değil.');
assert(src.includes('data-admin-subscription-add')&&src.includes('data-admin-note-add'),'Esnek abonelik/not ekleme eksik.');
assert(src.includes("['Ortak','İlkokul','Ortaokul','Diğer']"),'İlkokul/Ortaokul resmî bilgi ayrımı eksik.');
assert(!src.includes('<details class="ka-admin-section'),'Akordiyon tekrar eklenmiş.');
assert(css.includes('Native Settings: İdari Bilgiler ve Şifreler'),'İdari ekran stilleri design-system.css içinde değil.');
assert(!firebase.includes('settings-admin-extension.js'),'firebase-init extension loader içermemeli.');
assert(!sw.includes('settings-admin-extension.js'),'Service worker extension cache içermemeli.');
assert(!fs.existsSync('js/core/settings-admin-extension.js'),'Extension dosyası tamamen silinmeli.');
console.log('Native Settings idari bilgiler + tatil entegrasyonu başarılı.');
''', encoding='utf-8')

ext = Path('js/core/settings-admin-extension.js')
if ext.exists():
    ext.unlink()

print('Native settings integration complete')
