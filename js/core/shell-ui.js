/* Koruk Asistan — V2 Shell UI
 * Eski Koruk Asistan UX hiyerarşisi yeni local-first mimaride yeniden üretilir.
 * Eski JS/CSS dosyalarına çalışma zamanı bağımlılığı yoktur.
 */
(function(global){
'use strict';
if(global.ShellUI)return;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const user=()=>global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};
const SVG={
 home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
 profile:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 menu:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
 search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 note:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14v18H5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 8h8M8 12h8M8 16h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 back:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 chevron:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

/* Eski uygulamadaki gerçek kategori hiyerarşisinin V2 karşılığı.
 * route: yeni mimaride açılacak ana modül. Alt özellik henüz ayrı V2 route
 * değilse ilgili ana modül açılır; eski global fonksiyon çağrılmaz. */
const MENU_GROUPS=[
 {key:'people',label:'Öğretmen & Öğrenciler',icon:'👥',tone:'green',route:'people',items:[
  ['Öğretmenler','👩‍🏫','people'],['Öğrenciler','🎓','people'],['Sınıflar','🏫','people'],['Öğrenci Yoklama','☑️','people'],['Öğrenci Listesi Oluşturucu','📋','tools'],['Ödev Takip Çizelgesi','✅','tools'],['Not Çizelgesi','📊','tools']
 ]},
 {key:'exams',label:'Sınavlar ve Not İşlemleri',icon:'📝',tone:'blue',route:'academic',items:[
  ['Yazılı Sınavlar','☑️','academic'],['Deneme Sınavları','🧪','academic'],['Deneme Sonuçları','🏅','academic'],['Test Sonuçları','📋','academic'],['Ders Et. Kat. Puan Dağıtımı','📊','tools'],['Proje Değerlendirme Ölçeği','📏','tools']
 ]},
 {key:'programs',label:'Programlar',icon:'📅',tone:'lime',route:'academic',items:[
  ['Ders Programı','📅','academic'],['Nöbet Programı','🛡️','management'],['Yıllık Plan','📚','academic']
 ]},
 {key:'communication',label:'İletişim & Haberler',icon:'💬',tone:'red',route:'communication',items:[
  ['Mesajlaşma','💬','communication'],['Haberler','📰','communication'],['Duyurular','📣','communication'],['Anketler','📋','communication']
 ]},
 {key:'calendar',label:'Takvim & Notlar',icon:'📆',tone:'cyan',route:'communication',items:[
  ['Takvim','📆','communication'],['Notlar','📒','communication']
 ]},
 {key:'transport',label:'Taşıma',icon:'🚌',tone:'violet',route:'transport',items:[
  ['Taşıma İşlemleri','🚌','transport'],['Harita','🗺️','tools']
 ]},
 {key:'documents',label:'Doküman & Evraklar',icon:'📁',tone:'amber',route:'documents',items:[
  ['Dokümanlar','📁','documents'],['Mevzuat','📖','documents'],['Akademik Takvim','📅','documents'],['Kontrol Listeleri','📋','tools'],['Evrak Takibi','📄','documents'],['Aylık İşler','🕘','management']
 ],subLabel:'Raporlar',subItems:[
  ['Maarif Model','🏅','documents'],['Belirli Gün ve Haftalar','📅','documents'],['ŞÖK','🛡️','documents'],['Rehberlik','🧭','documents'],['Yıllık Planlar & BEP Planları','📋','documents'],['Zümre','👥','documents'],['Sosyal Kulüpler','♡','documents']
 ]},
 {key:'management',label:'İdari İşler',icon:'🗂️',tone:'orange',route:'management',items:[
  ['Personeller','👥','management'],['Maaş Değişikliği','💵','management'],['Tebliğ-Tebellüğ İmza Sirküsü','🔔','management'],['Puantaj & İmza Sirküsü','🕘','management'],['Dilekçe & İzinler','📄','management'],['Devamsızlık Çizelgesi','📅','management'],['Evrak Takibi','📄','documents']
 ]},
 {key:'settings',label:'Ayarlar',icon:'⚙️',tone:'slate',route:'settings',items:[
  ['Ayarlar','⚙️','settings'],['Okul Bilgileri','🏢','settings'],['Veriler','🗄️','settings'],['Kullanıcı İşlemleri','🛡️','settings'],['Kullanıcı İstatistikleri','📋','settings']
 ]}
];
const TONE_ROUTE={green:'people',blue:'academic',lime:'academic',red:'communication',cyan:'communication',violet:'transport',amber:'documents',orange:'management',slate:'settings'};
const DASHBOARD_ROUTES={announcements:'communication',news:'communication',stats:'people',duty:'management',upcoming:'communication',lessons:'academic','week-duty':'management',exams:'academic',schedule:'academic',notes:'communication',calendar:'communication'};
let activeAction='home',menuGroup=null;
function setTitle(v){const el=$('#v2ModuleTitle');if(el)el.textContent=v||''}
function setBottomActive(action){activeAction=action;$$('[data-ka-shell-action]').forEach(b=>{const on=b.dataset.kaShellAction===action;b.classList.toggle('active',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current')})}
function moduleAllowed(name){const meta=global.AppConfig?.module?.(name);return meta?.visible!==false&&global.PermissionService?.moduleLevel?.(name)!=='hidden'}
function closeMenu(){const layer=$('#kaMenuLayer');if(layer){layer.classList.remove('open');layer.hidden=true;layer.innerHTML=''}menuGroup=null;document.body.classList.remove('ka-layer-open')}
async function routeModule(name,{bottom='menu'}={}){closeMenu();const meta=global.AppConfig?.module?.(name)||{label:name};if(meta.visible===false||global.PermissionService?.moduleLevel?.(name)==='hidden')return false;setBottomActive(bottom);global.AppLoader?.setActiveModule?.(name);setTitle(meta.label||name);await global.AppLoader?.load?.(name);return true}
function visibleItems(g){return (g.items||[]).filter(x=>moduleAllowed(x[2])).concat((g.subItems||[]).filter(x=>moduleAllowed(x[2])))}
function visibleGroups(){return MENU_GROUPS.filter(g=>moduleAllowed(g.route)&&visibleItems(g).length)}
function menuCount(g){return visibleItems(g).length}
function renderMenuGrid(){const layer=$('#kaMenuLayer');if(!layer)return;menuGroup=null;const cards=visibleGroups();layer.innerHTML=`<div class="ka-menu-page"><header class="ka-menu-head"><h2>Menü</h2><button type="button" class="ka-icon-button" data-ka-menu-close aria-label="Menüyü kapat">${SVG.close}</button></header><div class="ka-menu-grid">${cards.map(g=>`<button type="button" class="ka-menu-card ka-menu-card--${g.tone}" data-ka-menu-group="${g.key}"><span class="ka-menu-card__count">${menuCount(g)}</span><span class="ka-menu-card__icon">${g.icon}</span><strong>${esc(g.label)}</strong></button>`).join('')}</div></div>`;layer.querySelector('[data-ka-menu-close]')?.addEventListener('click',closeMenu);$$('[data-ka-menu-group]',layer).forEach(b=>b.addEventListener('click',()=>renderMenuList(b.dataset.kaMenuGroup)))}
function listRow(item){return `<button type="button" class="ka-card ka-list-card ka-row" data-ka-menu-route="${item[2]}"><span class="ka-avatar">${item[1]}</span><strong class="ka-grow">${esc(item[0])}</strong><span class="ka-menu-chevron">${SVG.chevron}</span></button>`}
function renderMenuList(key){const layer=$('#kaMenuLayer'),g=MENU_GROUPS.find(x=>x.key===key);if(!layer||!g)return;menuGroup=key;const main=(g.items||[]).filter(x=>moduleAllowed(x[2])),sub=(g.subItems||[]).filter(x=>moduleAllowed(x[2]));layer.innerHTML=`<div class="ka-menu-page ka-menu-list-page" data-menu-tone="${g.tone}"><header class="ka-menu-head"><button type="button" class="ka-icon-button" data-ka-menu-back aria-label="Menüye dön">${SVG.back}</button><h2>${esc(g.label)}</h2></header><div class="ka-stack ka-menu-list">${main.map(listRow).join('')}${sub.length?`<div class="ka-menu-subhead">${esc(g.subLabel||'Diğer')}</div>${sub.map(listRow).join('')}`:''}</div></div>`;layer.querySelector('[data-ka-menu-back]')?.addEventListener('click',renderMenuGrid);$$('[data-ka-menu-route]',layer).forEach(b=>b.addEventListener('click',()=>routeModule(b.dataset.kaMenuRoute,{bottom:'menu'})))}
function openMenu(){const layer=$('#kaMenuLayer');if(!layer)return;renderMenuGrid();layer.hidden=false;requestAnimationFrame(()=>layer.classList.add('open'));document.body.classList.add('ka-layer-open');setBottomActive('menu')}
function profileName(u){return u.adSoyad||[u.ad,u.soyad].filter(Boolean).join(' ')||u.displayName||u.kullaniciAdi||'Kullanıcı'}
function profileRole(u){return u.unvan||u.rolAdi||u.rol||u.brans||'Koruk Asistan Kullanıcısı'}
function linkedTeacher(){const id=user().bagliOgretmenId;return id?arr('ogretmenler').find(x=>x.id===id)||null:null}
function renderProfile(){closeMenu();setBottomActive('profile');setTitle('Profilim');const u=user(),t=linkedTeacher(),root=$('#v2ModuleRoot');if(!root)return;const name=t?[t.ad,t.soyad].filter(Boolean).join(' '):profileName(u),role=t?.brans||profileRole(u),photo=t?.profilFotoUrl||t?.fotoUrl||u.fotoUrl||'',initials=name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toLocaleUpperCase('tr');root.innerHTML=`<section class="ka-profile-page"><div class="ka-profile-hero"><div class="ka-profile-avatar">${photo?`<img src="${esc(photo)}" alt="${esc(name)}">`:esc(initials||'K')}</div><div class="ka-profile-copy"><h2>${esc(name)}</h2><p>${esc(role)}</p>${t?.telefon||u.telefon?`<small>☎ ${esc(t?.telefon||u.telefon)}</small>`:''}${t?.email||u.email?`<small>✉ ${esc(t?.email||u.email)}</small>`:''}</div></div><div class="ka-profile-section"><h3>Çizelgelerim</h3><div class="ka-profile-grid"><button type="button" data-profile-route="academic">📅<span>Ders Programım</span></button><button type="button" data-profile-route="management">🛡️<span>Nöbetlerim</span></button><button type="button" data-profile-route="academic">📏<span>Sınavlarım</span></button><button type="button" data-profile-route="documents">📄<span>Diğer Görevlerim</span></button></div></div><button type="button" class="ka-logout-button" data-profile-logout>↪ Oturumu Kapat</button></section>`;$$('[data-profile-route]',root).forEach(b=>b.addEventListener('click',()=>routeModule(b.dataset.profileRoute,{bottom:'profile'})));root.querySelector('[data-profile-logout]')?.addEventListener('click',()=>global.cikisYap?.())}
function norm(v){return String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function searchRows(q){const n=norm(q),rows=[];for(const x of arr('ogretmenler')){const title=x.adSoyad||[x.ad,x.soyad].filter(Boolean).join(' ')||'Öğretmen';if(!n||norm(`${title} ${x.brans||''} ${x.telefon||''}`).includes(n))rows.push({type:'Öğretmen',icon:'👩‍🏫',title,meta:x.brans||x.unvan||''})}for(const x of arr('veliler')){const title=x.ogrenciAdi||x.adSoyad||x.ad||'Öğrenci';if(!n||norm(`${title} ${x.veliAdi||''} ${x.telefon||''} ${x.sinif||x.sinifAdi||''}`).includes(n))rows.push({type:'Öğrenci',icon:'🎓',title,meta:[x.sinifAdi||x.sinif,x.veliAdi].filter(Boolean).join(' · ')})}for(const x of arr('servisler')){const title=x.servisAdi||x.guzergah||x.plaka||'Servis';if(!n||norm(`${title} ${x.plaka||''} ${x.soforAdi||''}`).includes(n))rows.push({type:'Servis',icon:'🚌',title,meta:[x.plaka,x.soforAdi].filter(Boolean).join(' · ')})}for(const x of arr('evrakTakibi')){const title=x.evrakAdi||x.baslik||x.konu||'Evrak';if(!n||norm(`${title} ${x.durum||''}`).includes(n))rows.push({type:'Evrak',icon:'📄',title,meta:x.durum||''})}return rows.slice(0,80)}
function renderSearchResults(root,q){const out=root.querySelector('[data-shell-search-results]'),rows=searchRows(q);if(!out)return;out.innerHTML=rows.length?rows.map(r=>`<article class="ka-search-result"><span>${r.icon}</span><div><strong>${esc(r.title)}</strong><small>${esc([r.type,r.meta].filter(Boolean).join(' · '))}</small></div></article>`).join(''):'<div class="ka-empty">Eşleşen kayıt bulunamadı.</div>'}
function renderSearch(){closeMenu();setBottomActive('search');setTitle('Arama');const root=$('#v2ModuleRoot');if(!root)return;root.innerHTML=`<section class="ka-search-page"><div class="ka-search-box">${SVG.search}<input type="search" data-shell-search-input placeholder="İsim, sınıf, telefon, servis, evrak…" autocomplete="off"></div><div class="ka-search-chips"><span>Öğrenci</span><span>Öğretmen</span><span>Servis</span><span>Evrak</span></div><div data-shell-search-results></div></section>`;const input=root.querySelector('[data-shell-search-input]');input?.addEventListener('input',()=>renderSearchResults(root,input.value));renderSearchResults(root,'');setTimeout(()=>input?.focus(),40)}
function closeQuickNote(){document.getElementById('kaQuickNoteModal')?.remove()}
function openQuickNote(){closeMenu();setBottomActive('note');closeQuickNote();const ov=document.createElement('div');ov.id='kaQuickNoteModal';ov.className='ka-modal-backdrop ka-sheet-backdrop';ov.innerHTML=`<section class="ka-modal ka-quick-note"><div class="ka-modal__header"><div><h3>Hızlı Not</h3><p class="ka-muted">Aklınızdakini hemen kaydedin</p></div><button type="button" class="ka-icon-button" data-note-close aria-label="Kapat">${SVG.close}</button></div><div class="ka-modal__body ka-stack"><label class="ka-field"><span class="ka-field__label">Notunuz</span><textarea data-note-text rows="7" placeholder="Notunuzu yazın..."></textarea></label><div class="ka-note-colors"><button type="button" data-note-color="yesil" class="active">●</button><button type="button" data-note-color="mavi">●</button><button type="button" data-note-color="mor">●</button><button type="button" data-note-color="turuncu">●</button></div></div><div class="ka-modal__footer"><button type="button" class="ka-btn ka-btn--secondary" data-note-cancel>İptal</button><button type="button" class="ka-btn" data-note-save>Kaydet</button></div></section>`;document.body.appendChild(ov);let color='yesil';$$('[data-note-color]',ov).forEach(b=>b.addEventListener('click',()=>{$$('[data-note-color]',ov).forEach(x=>x.classList.remove('active'));b.classList.add('active');color=b.dataset.noteColor}));const close=()=>{closeQuickNote();setBottomActive(global.AppStore?.get?.('ui.route')==='dashboard'?'home':'menu')};ov.querySelector('[data-note-close]')?.addEventListener('click',close);ov.querySelector('[data-note-cancel]')?.addEventListener('click',close);ov.querySelector('[data-note-save]')?.addEventListener('click',async()=>{const text=ov.querySelector('[data-note-text]')?.value.trim();if(!text)return;const u=user();try{await global.DeviceData?.add?.('notlar',global.COL?.notlar,{baslik:'Hızlı Not',icerik:text,not:text,renk:color,sahipUid:u.uid||'',tarih:new Date().toISOString(),olusturmaTarihi:new Date().toISOString()});close();global.toast?.('Not kaydedildi.')}catch(e){console.error('[QuickNote]',e);global.toast?.('Not kaydedilemedi.')}});setTimeout(()=>ov.querySelector('[data-note-text]')?.focus(),30)}
function home(){closeMenu();setBottomActive('home');return routeModule('dashboard',{bottom:'home'})}
function bindHeader(){document.querySelector('[data-ka-home-trigger]')?.addEventListener('click',home);document.querySelector('[data-ka-header-profile]')?.addEventListener('click',renderProfile)}
function bindBottom(){$$('[data-ka-shell-action]').forEach(btn=>btn.addEventListener('click',()=>{const a=btn.dataset.kaShellAction;if(a==='home')home();else if(a==='profile')renderProfile();else if(a==='menu')openMenu();else if(a==='search')renderSearch();else if(a==='note')openQuickNote()}))}
function bindDashboardCards(){document.addEventListener('click',e=>{if(e.target.closest('button,a,input,select,textarea,label'))return;const hero=e.target.closest('.ka-home-hero');if(hero){routeModule('academic',{bottom:'menu'});return}const card=e.target.closest('[data-home-section]');if(!card)return;const target=DASHBOARD_ROUTES[card.dataset.homeSection];if(target)routeModule(target,{bottom:'menu'});});}
function hydrateHeader(){const u=user(),profile=$('[data-ka-header-profile]');if(profile){const n=profileName(u),initials=n.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toLocaleUpperCase('tr');profile.textContent=initials||'K';profile.setAttribute('aria-label',`${n} profili`)}}
function init(){bindHeader();bindBottom();bindDashboardCards();hydrateHeader();window.addEventListener('koruk:app-ready',hydrateHeader);window.addEventListener('koruk:app-config-changed',()=>{if(!$('#kaMenuLayer')?.hidden){menuGroup?renderMenuList(menuGroup):renderMenuGrid()}});global.AppStore?.subscribe?.('session.user',hydrateHeader)}
global.ShellUI={init,home,openMenu,closeMenu,routeModule,renderProfile,renderSearch,openQuickNote,renderMenuGrid,renderMenuList,MENU_GROUPS,DASHBOARD_ROUTES};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);
