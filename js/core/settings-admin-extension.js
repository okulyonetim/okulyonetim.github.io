/* Koruk Asistan — Settings extensions
 * - Tatil planlarini Ders Saatleri ekranindan ayirir ve bagimsiz Ayarlar sayfasina tasir.
 * - Admin + Yonetici icin idari bilgi / sifre kasasi sayfasi ekler.
 * - Islem butonlarina gorunur basma ve kisa toast geri bildirimi verir.
 */
(function(global){
'use strict';
if(global.KorukSettingsExtensions)return;

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=>`row-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
let customPage='';
let adminInfo=null;
let adminDraft=null;
let adminLoading=false;
let renderQueued=false;
let lastPressToastAt=0;
let lastPressToastButton=null;

function rows(type){const v=global.AppStore?.data?.(type);return Array.isArray(v)?v:[]}
function currentUser(){return global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{}}
function currentRole(){const u=currentUser();return global.AKTIF_ROL||global.AppStore?.get?.('session.role')||rows('roller').find(x=>x.id===u.rolId)||{}}
function normalizeRole(v){return String(v||'').trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i')}
function isAdmin(){return currentUser().admin===true}
function isManagerRole(){const r=currentRole(),n=normalizeRole(r.ad||r.rolAdi||currentUser().rolAdi||currentUser().rol||'');return n==='yonetici'||n.startsWith('yonetici ')}
function canSeeAdminInfo(){return isAdmin()||isManagerRole()}
function canEditHoliday(){return isAdmin()||(typeof global.duzenleyebilir==='function'&&global.duzenleyebilir('sistemAyarlari'))||global.PermissionService?.can?.('sistemAyarlari','edit')===true}
function settingsRoot(){return q('[data-settings-module]')}
function settingsContent(){return q('#settingsContent')}
function settingsTitle(){return q('[data-settings-title]')}
function settingsDescription(){return q('[data-settings-description]')}
function holidayConfig(){return rows('dersSaatleri').find(x=>x.id==='ayarlar')||rows('dersSaatleri')[0]||{}}

function injectStyles(){
  if(q('#koruk-settings-extension-style'))return;
  const s=document.createElement('style');s.id='koruk-settings-extension-style';
  s.textContent=`
    button:not(:disabled){transition:transform .1s ease,filter .1s ease,box-shadow .1s ease,opacity .1s ease}
    button.ka-is-pressed,button:not(:disabled):active{transform:scale(.965);filter:brightness(.94)}
    .ka-admin-info-hero{display:flex;gap:12px;align-items:flex-start;padding:16px;border:1px solid var(--ka-border,#dce8e2);border-radius:18px;background:linear-gradient(135deg,rgba(22,118,79,.09),rgba(22,118,79,.02))}
    .ka-admin-info-hero__icon{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:rgba(22,118,79,.12);font-size:24px;flex:0 0 auto}
    .ka-admin-secret-row,.ka-admin-number-row{border:1px solid var(--ka-border,#dce8e2);border-radius:16px;padding:14px}
    .ka-admin-secret-actions{display:flex;gap:8px;flex-wrap:wrap}
    .ka-admin-secret-actions .ka-btn{min-width:0}
    .ka-admin-info-warning{padding:12px 14px;border-radius:14px;background:rgba(191,137,0,.1);border:1px solid rgba(191,137,0,.2)}
    [data-admin-settings-page] .ka-grid{align-items:end}
    @media(max-width:640px){[data-admin-settings-page] .ka-grid{grid-template-columns:1fr}.ka-admin-secret-actions{width:100%}.ka-admin-secret-actions .ka-btn{flex:1}}
  `;
  document.head.appendChild(s);
}

function buttonLabel(button){
  const aria=String(button.getAttribute('aria-label')||'').trim();
  let text=String(button.innerText||button.textContent||'').replace(/\s+/g,' ').trim();
  if(text.length>42)text=text.slice(0,42)+'…';
  return text||aria||'İşlem';
}
function actionable(button){
  if(!button||button.disabled||button.dataset.pressToast==='off')return false;
  if(button.matches('.ka-icon-button,.ka-bottom-item,.ka-settings-accordion__toggle,[data-settings-back],[data-ka-shell-action],[data-modal-close],[data-close]'))return false;
  return button.matches('.ka-btn,[data-settings-open],[data-admin-ext-open],button[type="submit"]');
}
function installButtonFeedback(){
  document.addEventListener('pointerdown',e=>{const b=e.target.closest?.('button:not(:disabled)');if(b)b.classList.add('ka-is-pressed')},true);
  const clear=e=>{const b=e.target.closest?.('button');if(b)b.classList.remove('ka-is-pressed')};
  document.addEventListener('pointerup',clear,true);document.addEventListener('pointercancel',clear,true);document.addEventListener('pointerleave',clear,true);
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('button');if(!actionable(b))return;
    const now=Date.now();if(lastPressToastButton===b&&now-lastPressToastAt<500)return;lastPressToastAt=now;lastPressToastButton=b;
    global.toast?.(`✓ ${buttonLabel(b)} seçildi`);
  },true);
}

function settingsItem(key,title,description){
  const b=document.createElement('button');b.type='button';b.className='ka-settings-accordion__item';b.dataset.adminExtOpen=key;
  b.innerHTML=`<span><strong>${esc(title)}</strong><small>${esc(description)}</small></span><span aria-hidden="true">›</span>`;
  return b;
}
function updateGroupCount(group){const count=group?.querySelectorAll('.ka-settings-accordion__body > .ka-settings-accordion__item').length||0;const small=q('[data-settings-accordion-toggle] small',group);if(small)small.textContent=`${count} ayar`}
function injectSettingsMenu(){
  if(customPage||!settingsRoot())return;
  const academic=q('[data-settings-accordion="academic"]');const academicBody=q('.ka-settings-accordion__body',academic);
  if(academicBody&&!q('[data-admin-ext-open="holiday"]',academicBody)){
    const item=settingsItem('holiday','Tatil Modu','Planlı tatiller ve otomatik tarih aralıkları');
    const lesson=q('[data-settings-open="lesson-hours"]',academicBody);lesson?.after(item);if(!lesson)academicBody.appendChild(item);updateGroupCount(academic);
    const lessonDesc=q('[data-settings-open="lesson-hours"] small',academicBody);if(lessonDesc)lessonDesc.textContent='Zil saatleri ve öğle arası';
  }
  const system=q('[data-settings-accordion="system"]');const systemBody=q('.ka-settings-accordion__body',system);
  const existing=systemBody&&q('[data-admin-ext-open="admin-info"]',systemBody);
  if(canSeeAdminInfo()){
    if(systemBody&&!existing){systemBody.appendChild(settingsItem('admin-info','İdari Bilgiler ve Şifreler','Abonelik, vergi ve uygulama giriş bilgileri'));updateGroupCount(system)}
  }else if(existing){existing.remove();updateGroupCount(system)}
}

function preserveHolidayBridge(card){
  if(!card)return;
  const cfg=holidayConfig();
  let bridge=q('[data-admin-holiday-legacy-bridge]',card);
  if(!bridge){bridge=document.createElement('div');bridge.hidden=true;bridge.dataset.adminHolidayLegacyBridge='';bridge.innerHTML='<input type="checkbox" data-lesson-holiday><input data-lesson-opening-date><textarea data-lesson-holiday-message></textarea>';card.appendChild(bridge)}
  const toggle=q('[data-lesson-holiday]',bridge),date=q('[data-lesson-opening-date]',bridge),msg=q('[data-lesson-holiday-message]',bridge);
  if(toggle)toggle.checked=!!cfg.tatilModu;if(date)date.value=String(cfg.okulAcilisTarihi||'').slice(0,10);if(msg)msg.value=String(cfg.tatilModuNotu||cfg.tatilNotu||'');
}
function hideHolidayInsideLessonHours(){
  if(customPage||String(settingsTitle()?.textContent||'').trim()!=='Ders Saatleri')return;
  const out=settingsContent();if(!out)return;
  const modern=q('[data-quality-holiday-card]',out);if(modern){preserveHolidayBridge(modern);modern.hidden=true;modern.style.display='none'}
  const legacy=q('[data-lesson-holiday]',out);if(legacy&&!legacy.closest('[data-admin-holiday-legacy-bridge]')){const card=legacy.closest('.ka-card')||legacy.parentElement;if(card){card.hidden=true;card.style.display='none'}}
}

function setCustomHeader(title,desc){const h=settingsTitle(),d=settingsDescription();if(h)h.textContent=title;if(d)d.textContent=desc}
function renderHolidayPage(){
  const out=settingsContent();if(!out)return;
  setCustomHeader('Tatil Modu','Tatil tarihlerini planlayın; belirtilen günlerde tatil modu otomatik çalışır.');
  out.innerHTML=`<section class="ka-stack" data-admin-settings-page="holiday"><div class="ka-admin-info-hero"><div class="ka-admin-info-hero__icon">🏖️</div><div><strong>Planlı Tatiller</strong><div class="ka-muted">Başlangıç ve bitiş günleri dahil edilir. Birden fazla tatil ekleyebilirsiniz.</div></div></div><article class="ka-card"><div class="ka-card__body"><label class="ka-check"><input type="checkbox" data-lesson-holiday ${holidayConfig().tatilModu?'checked':''}> Tatil modunu etkinleştir</label></div></article></section>`;
  global.KorukQualityFixes?.enhance?.();
  requestAnimationFrame(()=>{const card=q('[data-quality-holiday-card]',out);if(card){card.hidden=false;card.style.display='';}else global.KorukQualityFixes?.enhance?.()});
}

function defaultAdminInfo(){return{elektrikAboneNo:'',suAboneNo:'',internetAboneNo:'',vergiDairesi:'',vergiNumarasi:'',resmiNumaralar:[],uygulamaSifreleri:[],not:''}}
function normalizedAdminInfo(v={}){
  const base=defaultAdminInfo();return{...base,...v,
    resmiNumaralar:(Array.isArray(v.resmiNumaralar)?v.resmiNumaralar:[]).map(x=>({id:String(x.id||id()),baslik:String(x.baslik||''),deger:String(x.deger||'')})),
    uygulamaSifreleri:(Array.isArray(v.uygulamaSifreleri)?v.uygulamaSifreleri:[]).map(x=>({id:String(x.id||id()),ad:String(x.ad||''),kullaniciAdi:String(x.kullaniciAdi||''),sifre:String(x.sifre||''),url:String(x.url||''),not:String(x.not||'')}))
  }
}
function numberRow(x={}){return `<div class="ka-admin-number-row ka-stack" data-admin-number-row data-row-id="${esc(x.id||id())}"><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Başlık</span><input data-admin-number-title value="${esc(x.baslik||'')}" placeholder="Örn. Vergi No / Mükellef No"></label><label class="ka-field"><span class="ka-field__label">Numara</span><input data-admin-number-value value="${esc(x.deger||'')}"></label></div><div class="ka-row"><button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-admin-number-remove>Sil</button></div></div>`}
function secretRow(x={}){return `<div class="ka-admin-secret-row ka-stack" data-admin-secret-row data-row-id="${esc(x.id||id())}"><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Uygulama / Hizmet</span><input data-admin-secret-name value="${esc(x.ad||'')}" placeholder="Örn. MEBBİS"></label><label class="ka-field"><span class="ka-field__label">Kullanıcı Adı</span><input data-admin-secret-user value="${esc(x.kullaniciAdi||'')}" autocomplete="off"></label></div><label class="ka-field"><span class="ka-field__label">Şifre</span><div class="ka-row"><input class="ka-grow" type="password" data-admin-secret-password value="${esc(x.sifre||'')}" autocomplete="new-password"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-admin-secret-toggle data-press-toast="off">Göster</button><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-admin-secret-copy data-press-toast="off">Kopyala</button></div></label><label class="ka-field"><span class="ka-field__label">Web Adresi</span><input type="url" data-admin-secret-url value="${esc(x.url||'')}" placeholder="https://..."></label><label class="ka-field"><span class="ka-field__label">Not</span><input data-admin-secret-note value="${esc(x.not||'')}"></label><div class="ka-admin-secret-actions"><button class="ka-btn ka-btn--danger ka-btn--sm" type="button" data-admin-secret-remove>Bu Kaydı Sil</button></div></div>`}
function collectAdminDraft(root=settingsContent()){
  if(!root)return adminDraft||adminInfo||defaultAdminInfo();
  const value={
    elektrikAboneNo:q('[data-admin-electric]',root)?.value||'',suAboneNo:q('[data-admin-water]',root)?.value||'',internetAboneNo:q('[data-admin-internet]',root)?.value||'',vergiDairesi:q('[data-admin-tax-office]',root)?.value||'',vergiNumarasi:q('[data-admin-tax-no]',root)?.value||'',not:q('[data-admin-info-note]',root)?.value||'',
    resmiNumaralar:qa('[data-admin-number-row]',root).map(row=>({id:row.dataset.rowId||id(),baslik:q('[data-admin-number-title]',row)?.value||'',deger:q('[data-admin-number-value]',row)?.value||''})),
    uygulamaSifreleri:qa('[data-admin-secret-row]',root).map(row=>({id:row.dataset.rowId||id(),ad:q('[data-admin-secret-name]',row)?.value||'',kullaniciAdi:q('[data-admin-secret-user]',row)?.value||'',sifre:q('[data-admin-secret-password]',row)?.value||'',url:q('[data-admin-secret-url]',row)?.value||'',not:q('[data-admin-secret-note]',row)?.value||''}))
  };adminDraft=value;return value;
}
function adminInfoHtml(data){
  const d=normalizedAdminInfo(data);return `<section class="ka-stack" data-admin-settings-page="admin-info"><div class="ka-admin-info-hero"><div class="ka-admin-info-hero__icon">🔐</div><div><strong>İdari Bilgiler ve Şifreler</strong><div class="ka-muted">Bu sayfa yalnız Admin ve Yönetici rolündeki kullanıcılar içindir.</div></div></div><div class="ka-admin-info-warning"><strong>Gizli alan</strong><div class="ka-muted">Uygulama şifreleri ekranda maskeli gösterilir. Yetkisiz kullanıcıların Firestore erişimi güvenlik kuralıyla engellenir.</div></div><article class="ka-card"><div class="ka-card__header"><h3>Abonelik Bilgileri</h3></div><div class="ka-card__body ka-stack"><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Elektrik Abone No</span><input data-admin-electric value="${esc(d.elektrikAboneNo)}"></label><label class="ka-field"><span class="ka-field__label">Su Abone No</span><input data-admin-water value="${esc(d.suAboneNo)}"></label><label class="ka-field"><span class="ka-field__label">İnternet Abone / Müşteri No</span><input data-admin-internet value="${esc(d.internetAboneNo)}"></label></div></div></article><article class="ka-card"><div class="ka-card__header"><h3>Vergi ve Resmî Numaralar</h3></div><div class="ka-card__body ka-stack"><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Vergi Dairesi</span><input data-admin-tax-office value="${esc(d.vergiDairesi)}"></label><label class="ka-field"><span class="ka-field__label">Vergi Numarası</span><input data-admin-tax-no value="${esc(d.vergiNumarasi)}"></label></div><div class="ka-stack" data-admin-number-list>${d.resmiNumaralar.map(numberRow).join('')}</div><div><button class="ka-btn ka-btn--secondary" type="button" data-admin-number-add>+ Resmî Numara Ekle</button></div></div></article><article class="ka-card"><div class="ka-card__header"><h3>Uygulama ve Portal Şifreleri</h3></div><div class="ka-card__body ka-stack"><div class="ka-stack" data-admin-secret-list>${d.uygulamaSifreleri.map(secretRow).join('')}</div><div><button class="ka-btn ka-btn--secondary" type="button" data-admin-secret-add>+ Uygulama Şifresi Ekle</button></div></div></article><article class="ka-card"><div class="ka-card__body"><label class="ka-field"><span class="ka-field__label">Genel İdari Not</span><textarea rows="4" data-admin-info-note>${esc(d.not)}</textarea></label></div></article><div class="ka-row"><button class="ka-btn" type="button" data-admin-info-save>💾 İdari Bilgileri Kaydet</button></div></section>`}

async function loadAdminInfo(){
  if(!canSeeAdminInfo()){customPage='';global.toast?.('Bu sayfaya yalnız Admin ve Yönetici erişebilir.');global.SettingsModule?.openPage?.('home','Ayarlar');return}
  if(adminLoading)return;adminLoading=true;const out=settingsContent();if(out)out.innerHTML='<div class="ka-empty">İdari bilgiler yükleniyor…</div>';
  try{
    if(!global.db||!global.COL?.idariBilgiler)throw new Error('Güvenli veri bağlantısı hazır değil.');
    const snap=await global.db.collection(global.COL.idariBilgiler).doc('ayarlar').get();adminInfo=normalizedAdminInfo(snap.exists?snap.data():{});adminDraft=structuredCloneSafe(adminInfo);renderAdminPage();
  }catch(e){if(out)out.innerHTML=`<div class="ka-card"><div class="ka-card__body ka-stack"><strong>İdari bilgiler açılamadı</strong><div class="ka-muted">${esc(e?.message||e)}</div><button class="ka-btn" type="button" data-admin-retry>Tekrar Dene</button></div></div>`;q('[data-admin-retry]',out)?.addEventListener('click',loadAdminInfo)}finally{adminLoading=false}
}
function structuredCloneSafe(v){try{return structuredClone(v)}catch(_){return JSON.parse(JSON.stringify(v))}}
function renderAdminPage(){
  if(customPage!=='admin-info')return;if(!canSeeAdminInfo()){customPage='';global.SettingsModule?.openPage?.('home','Ayarlar');return}
  const out=settingsContent();if(!out)return;setCustomHeader('İdari Bilgiler ve Şifreler','Yalnız Admin ve Yönetici rolündeki kullanıcılar için gizli okul bilgileri.');out.innerHTML=adminInfoHtml(adminDraft||adminInfo||defaultAdminInfo());bindAdminPage(out);
}
function bindAdminPage(out){
  out.addEventListener('input',()=>collectAdminDraft(out));
  q('[data-admin-number-add]',out)?.addEventListener('click',()=>{collectAdminDraft(out);adminDraft.resmiNumaralar.push({id:id(),baslik:'',deger:''});renderAdminPage()});
  q('[data-admin-secret-add]',out)?.addEventListener('click',()=>{collectAdminDraft(out);adminDraft.uygulamaSifreleri.push({id:id(),ad:'',kullaniciAdi:'',sifre:'',url:'',not:''});renderAdminPage()});
  out.addEventListener('click',async e=>{
    const nr=e.target.closest?.('[data-admin-number-remove]');if(nr){collectAdminDraft(out);const rid=nr.closest('[data-admin-number-row]')?.dataset.rowId;adminDraft.resmiNumaralar=adminDraft.resmiNumaralar.filter(x=>x.id!==rid);renderAdminPage();return}
    const sr=e.target.closest?.('[data-admin-secret-remove]');if(sr){collectAdminDraft(out);const rid=sr.closest('[data-admin-secret-row]')?.dataset.rowId;adminDraft.uygulamaSifreleri=adminDraft.uygulamaSifreleri.filter(x=>x.id!==rid);renderAdminPage();return}
    const toggle=e.target.closest?.('[data-admin-secret-toggle]');if(toggle){const row=toggle.closest('[data-admin-secret-row]'),input=q('[data-admin-secret-password]',row);if(input){const show=input.type==='password';input.type=show?'text':'password';toggle.textContent=show?'Gizle':'Göster';global.toast?.(show?'Şifre gösteriliyor.':'Şifre gizlendi.')}return}
    const copy=e.target.closest?.('[data-admin-secret-copy]');if(copy){const input=q('[data-admin-secret-password]',copy.closest('[data-admin-secret-row]'));if(!input?.value)return global.toast?.('Kopyalanacak şifre yok.');try{await navigator.clipboard.writeText(input.value);global.toast?.('Şifre panoya kopyalandı.')}catch(_){global.toast?.('Şifre kopyalanamadı.')}return}
  });
  q('[data-admin-info-save]',out)?.addEventListener('click',saveAdminInfo);
}
async function saveAdminInfo(){
  if(!canSeeAdminInfo())return global.toast?.('Bu işlem için yetkiniz yok.');
  const payload=normalizedAdminInfo(collectAdminDraft());payload.guncellenmeTarihi=new Date().toISOString();payload.guncelleyenUid=currentUser().uid||'';payload.guncelleyenAd=currentUser().ad||currentUser().kullaniciAdi||'';
  const btn=q('[data-admin-info-save]');if(btn){btn.disabled=true;btn.textContent='Kaydediliyor…'}
  try{await global.db.collection(global.COL.idariBilgiler).doc('ayarlar').set(payload,{merge:false});adminInfo=normalizedAdminInfo(payload);adminDraft=structuredCloneSafe(adminInfo);global.toast?.('İdari bilgiler güvenli alana kaydedildi.');renderAdminPage()}catch(e){global.toast?.('İdari bilgiler kaydedilemedi: '+(e?.message||e));if(btn){btn.disabled=false;btn.textContent='💾 İdari Bilgileri Kaydet'}}
}

function openCustomPage(page){
  if(page==='admin-info'&&!canSeeAdminInfo())return global.toast?.('Bu sayfaya yalnız Admin ve Yönetici erişebilir.');
  customPage=page;
  if(page==='holiday'){renderHolidayPage();return}
  if(page==='admin-info'){setCustomHeader('İdari Bilgiler ve Şifreler','Yalnız Admin ve Yönetici rolündeki kullanıcılar için gizli okul bilgileri.');loadAdminInfo()}
}
function leaveCustomPage(){customPage='';adminDraft=null;global.SettingsModule?.openPage?.('home','Ayarlar');requestAnimationFrame(injectSettingsMenu)}

function handleSettingsClicks(e){
  const open=e.target.closest?.('[data-admin-ext-open]');if(open){e.preventDefault();e.stopImmediatePropagation();openCustomPage(open.dataset.adminExtOpen);return}
  if(customPage&&e.target.closest?.('[data-settings-back]')){e.preventDefault();e.stopImmediatePropagation();leaveCustomPage()}
}
function repairSettingsSurface(){
  if(!settingsRoot())return;
  if(customPage==='holiday'){
    if(!q('[data-admin-settings-page="holiday"]'))renderHolidayPage();return;
  }
  if(customPage==='admin-info'){
    if(!q('[data-admin-settings-page="admin-info"]')&&!adminLoading)renderAdminPage();return;
  }
  injectSettingsMenu();hideHolidayInsideLessonHours();
}
function queueRepair(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;repairSettingsSurface()})}
function start(){
  injectStyles();installButtonFeedback();document.addEventListener('click',handleSettingsClicks,true);
  const mo=new MutationObserver(queueRepair);mo.observe(document.documentElement,{childList:true,subtree:true});
  global.addEventListener('koruk:module-ready',queueRepair);global.addEventListener('koruk:app-ready',queueRepair);
  global.AppStore?.subscribe?.('session.user',queueRepair);global.AppStore?.subscribe?.('session.role',queueRepair);global.AppStore?.subscribe?.('data.dersSaatleri',queueRepair);
  setInterval(queueRepair,1200);queueRepair();
}

global.KorukSettingsExtensions={canSeeAdminInfo,isManagerRole,openCustomPage,repair:queueRepair};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
