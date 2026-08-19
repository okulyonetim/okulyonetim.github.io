/* ================================================================
   WEB SIDEBAR v2
   Alt navigasyonun resmi menü verisini masaüstünde sabit sidebar olarak çizer.
   ================================================================ */
(function(){
'use strict';
if(window.innerWidth<1024||window.__webSidebarV2)return;
window.__webSidebarV2=true;

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const PREF_KEY='anMenuKartTercihleriV2';
const OPEN_KEY='wsSidebarOpenGroupsV2';
const ACTIVE_KEY='wsSidebarActiveV2';
let shell=null,navEl=null,flyout=null,activeKey='panel';

function cssYukle(){
  if($('link[data-ws2-css]'))return;
  const l=document.createElement('link');l.rel='stylesheet';l.href='css/web-sidebar-v2.css';l.dataset.ws2Css='1';document.head.appendChild(l);
}
function svg(inner,size=18){return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;}
const ICON={
  home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3.5-8 8-8s8 3 8 8"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  collapse:'<path d="m15 18-6-6 6-6"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1h.1a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
};
function prefs(){try{return JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{};}catch(_){return {};}}
function openSet(){try{return new Set(JSON.parse(localStorage.getItem(OPEN_KEY)||'[]'));}catch(_){return new Set();}}
function saveOpen(set){try{localStorage.setItem(OPEN_KEY,JSON.stringify(Array.from(set)));}catch(_){}}
function canSee(o){return !o?false:(!o.modul||typeof gorebilir!=='function'||gorebilir(o.modul));}
function normLabel(v){return String(v||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('tr-TR');}
function legacyExtras(baseGroups){
  const represented=new Set();
  baseGroups.forEach(g=>{
    (g.ogeler||[]).forEach(o=>represented.add(normLabel(o.ad)));
    (g.altGrup?.ogeler||[]).forEach(o=>represented.add(normLabel(o.ad)));
  });
  represented.add(normLabel('Ana Sayfa'));represented.add(normLabel('Arama'));represented.add(normLabel('Profilim'));
  const extra=[];const seenTabs=new Set();
  $$('.ws2-legacy-source .nav-tab[data-tab]').forEach(tab=>{
    const target=(tab.getAttribute('data-tab')||'').trim();
    if(!target||target==='panel'||target==='arama'||seenTabs.has(target))return;
    if(tab.hidden||tab.getAttribute('aria-hidden')==='true'||tab.style.display==='none'||tab.classList.contains('hidden'))return;
    const modul=tab.getAttribute('data-modul')||tab.dataset.modul||null;
    if(modul&&typeof gorebilir==='function'&&!gorebilir(modul))return;
    const label=(tab.querySelector('.nt-label')?.textContent||tab.getAttribute('aria-label')||tab.textContent||target).replace(/\s+/g,' ').trim();
    if(!label||represented.has(normLabel(label)))return;
    seenTabs.add(target);represented.add(normLabel(label));
    extra.push({
      anahtar:'legacy_'+target,
      ad:label,
      ikon:null,
      modul,
      _legacyTab:target,
      aksiyon:function(){if(typeof sekmeAc==='function')sekmeAc(target);}
    });
  });
  if(!extra.length)return null;
  return {anahtar:'ws2_diger',ad:'Diğer Menüler',renk:'#64748B',ikon:ICON.settings,ogeler:extra,altGrup:null,_officialAd:'Diğer Menüler',_officialRenk:'#64748B',_fallback:true};
}
function groups(){
  const raw=typeof window._navDuzeniTumGruplarGetir==='function'?window._navDuzeniTumGruplarGetir():[];
  const p=prefs();
  const list=raw.filter(g=>g&&!g._gizliMi).map(g=>{
    const pref=p[g.anahtar]||{};
    const main=(g.ogeler||[]).filter(o=>o&&!o._gizliMi&&canSee(o));
    const alt=g.altGrup?Object.assign({},g.altGrup,{ogeler:(g.altGrup.ogeler||[]).filter(o=>o&&!o._gizliMi&&canSee(o))}):null;
    return Object.assign({},g,{ad:pref.ad||g.ad,renk:pref.renk||g.renk,ogeler:main,altGrup:alt,_officialAd:g.ad,_officialRenk:g.renk});
  }).filter(g=>g.ogeler.length+(g.altGrup?.ogeler?.length||0)>0);
  const fallback=legacyExtras(list);if(fallback)list.push(fallback);
  return list;
}
function legacyHazirla(sidebar){
  let legacy=$('.ws2-legacy-source',sidebar);if(legacy)return legacy;
  legacy=document.createElement('div');legacy.className='ws2-legacy-source';
  while(sidebar.firstChild)legacy.appendChild(sidebar.firstChild);
  sidebar.appendChild(legacy);return legacy;
}
function adRol(){
  const k=typeof AKTIF_KULLANICI!=='undefined'?AKTIF_KULLANICI:null;
  let og=null;try{og=typeof bagliOgretmenimGetir==='function'?bagliOgretmenimGetir():null;}catch(_){ }
  const ad=og?.adSoyad||og?.ad||k?.adSoyad||k?.ad||k?.kullaniciAdi||'Kullanıcı';
  const rol=k?.admin?'Yönetici':((typeof AKTIF_ROL!=='undefined'&&AKTIF_ROL?.ad)||og?.brans||'Kullanıcı');
  const foto=og?.profilFotoUrl||k?.fotoUrl||'';
  return {ad,rol,foto,admin:!!k?.admin};
}
function quickButton(key,label,icon,click){
  const b=document.createElement('button');b.type='button';b.className='ws2-quick-btn';b.dataset.ws2Key=key;b.title=label;
  b.innerHTML=`<span class="ws2-qicon">${svg(icon,17)}</span><span class="ws2-label">${esc(label)}</span>`;
  b.addEventListener('click',()=>{setActive(key);click();});return b;
}
function setActive(key){activeKey=key||'';try{localStorage.setItem(ACTIVE_KEY,activeKey);}catch(_){ }syncActive();}
function syncActive(){
  $$('.ws2-quick-btn,.ws2-item',shell).forEach(x=>x.classList.toggle('is-active',x.dataset.ws2Key===activeKey));
}
function itemBtn(o,g){
  const b=document.createElement('button');b.type='button';b.className='ws2-item';b.dataset.ws2Key=o.anahtar;b.title=o.ad;b.style.setProperty('--group-color',g.renk||'#0f9f9a');
  b.innerHTML=`<span class="ws2-item-dot"></span><span class="ws2-item-label">${esc(o.ad)}</span>`;
  b.addEventListener('click',()=>{setActive(o.anahtar);closeFlyout();try{o.aksiyon();}catch(e){console.error('[WebSidebar] Menü aksiyonu:',e);}});return b;
}
function appendItems(container,g){
  g.ogeler.forEach(o=>container.appendChild(itemBtn(o,g)));
  if(g.altGrup&&g.altGrup.ogeler.length){const l=document.createElement('div');l.className='ws2-alt-label';l.textContent=g.altGrup.ad||'Diğer';container.appendChild(l);g.altGrup.ogeler.forEach(o=>container.appendChild(itemBtn(o,g)));}
}
function editGroup(g){
  if(g._fallback)return;
  if(typeof modalAc!=='function')return;
  const body=`<div class="form-group"><label>Menü adı</label><input id="ws2EditName" value="${esc(g.ad)}" style="width:100%"></div><div class="form-group"><label>Renk</label><div style="display:flex;gap:10px;align-items:center"><input type="color" id="ws2EditColor" value="${esc(g.renk||'#0f9f9a')}"><input id="ws2EditHex" value="${esc(g.renk||'#0f9f9a')}" style="flex:1"></div></div><button type="button" class="btn btn-ghost btn-sm" id="ws2ResetGroup" style="width:100%;margin-top:8px">Varsayılana dön</button>`;
  modalAc('Menü Grubunu Özelleştir',body,()=>{
    const name=$('#ws2EditName')?.value?.trim();const color=$('#ws2EditHex')?.value?.trim()||$('#ws2EditColor')?.value;
    if(!name)return typeof toast==='function'&&toast('Menü adı boş olamaz.');if(!/^#[0-9a-fA-F]{6}$/.test(color))return typeof toast==='function'&&toast('Geçerli bir renk seçin.');
    const p=prefs();p[g.anahtar]={};if(name!==g._officialAd)p[g.anahtar].ad=name;if(color.toLowerCase()!==(g._officialRenk||'').toLowerCase())p[g.anahtar].renk=color;if(!Object.keys(p[g.anahtar]).length)delete p[g.anahtar];
    localStorage.setItem(PREF_KEY,JSON.stringify(p));rebuildAltNav();render();if(typeof modalKapat==='function')modalKapat();
  },null,'Kaydet');
  setTimeout(()=>{const c=$('#ws2EditColor'),h=$('#ws2EditHex'),r=$('#ws2ResetGroup');if(c&&h)c.addEventListener('input',()=>h.value=c.value);if(h&&c)h.addEventListener('input',()=>{if(/^#[0-9a-fA-F]{6}$/.test(h.value))c.value=h.value;});if(r)r.addEventListener('click',()=>{const p=prefs();delete p[g.anahtar];localStorage.setItem(PREF_KEY,JSON.stringify(p));rebuildAltNav();if(typeof modalKapat==='function')modalKapat();render();});},0);
}
function rebuildAltNav(){try{if(typeof window._navDuzeniYerelUygula==='function')window._navDuzeniYerelUygula(typeof window._navDuzeniVerisiGetir==='function'?window._navDuzeniVerisiGetir():{},false);}catch(_){}}
function groupBlock(g){
  const block=document.createElement('div');block.className='ws2-group';block.dataset.group=g.anahtar;const opened=openSet().has(g.anahtar);if(opened)block.classList.add('is-open');
  const head=document.createElement('div');head.className='ws2-group-head';
  const btn=document.createElement('button');btn.type='button';btn.className='ws2-group-btn';btn.title=g.ad;btn.style.setProperty('--group-color',g.renk||'#0f9f9a');
  const total=g.ogeler.length+(g.altGrup?.ogeler?.length||0);btn.innerHTML=`<span class="ws2-group-icon">${svg(g.ikon||ICON.settings,18)}</span><span class="ws2-group-label">${esc(g.ad)}</span><span class="ws2-count">${total}</span><span class="ws2-chevron">${svg(ICON.chevron,13)}</span>`;
  btn.addEventListener('click',()=>{if(document.body.classList.contains('nav-collapsed'))return openFlyout(g,btn);const s=openSet();if(block.classList.toggle('is-open'))s.add(g.anahtar);else s.delete(g.anahtar);saveOpen(s);});
  const eb=document.createElement('button');eb.type='button';eb.className='ws2-group-edit';eb.title='Bu grubu özelleştir';eb.innerHTML=svg(ICON.edit,14);if(g._fallback)eb.hidden=true;else eb.addEventListener('click',e=>{e.stopPropagation();editGroup(g);});
  head.append(btn,eb);block.appendChild(head);
  const sub=document.createElement('div');sub.className='ws2-sub';const inner=document.createElement('div');inner.className='ws2-sub-inner';const list=document.createElement('div');list.className='ws2-sub-list';list.style.setProperty('--group-color',g.renk||'#0f9f9a');appendItems(list,g);inner.appendChild(list);sub.appendChild(inner);block.appendChild(sub);return block;
}
function closeFlyout(){if(flyout){flyout.remove();flyout=null;}}
function openFlyout(g,anchor){closeFlyout();flyout=document.createElement('div');flyout.className='ws2-flyout';flyout.style.setProperty('--group-color',g.renk||'#0f9f9a');const h=document.createElement('div');h.className='ws2-flyout-head';h.innerHTML=`<span class="ws2-group-icon" style="--group-color:${esc(g.renk||'#0f9f9a')}">${svg(g.ikon||ICON.settings,17)}</span><span>${esc(g.ad)}</span>`;flyout.appendChild(h);appendItems(flyout,g);document.body.appendChild(flyout);const r=anchor.getBoundingClientRect(),fr=flyout.getBoundingClientRect();let top=Math.min(Math.max(10,r.top-8),window.innerHeight-fr.height-10);flyout.style.left=(r.right+10)+'px';flyout.style.top=top+'px';syncActive();}
function profile(){const p=adRol();const av=p.foto?`<img src="${esc(p.foto)}" alt="">`:'👤';return `<button type="button" class="ws2-profile-btn" id="ws2Profile"><span class="ws2-avatar">${av}</span><span class="ws2-user"><strong>${esc(p.ad)}</strong><span>${esc(p.rol)}</span></span></button>`;}
function adminEdit(){const p=adRol();if(!p.admin)return '';return `<button type="button" class="ws2-admin-edit" id="ws2AdminEdit" title="Navigasyon Düzenini Aç">${svg(ICON.settings,16)}<span>Navigasyonu düzenle</span></button>`;}
function globalEditor(){try{if(typeof sekmeAc==='function')sekmeAc('ayarlar');setTimeout(()=>{if(typeof renderNavDuzeniYonetim==='function')renderNavDuzeniYonetim();const e=document.getElementById('navDuzeniYonetimBolumu');if(e)e.scrollIntoView({behavior:'smooth',block:'start'});},180);}catch(e){console.error(e);}}
function render(){
  if(!shell||!navEl)return;const list=groups();navEl.innerHTML='';list.forEach(g=>navEl.appendChild(groupBlock(g)));const foot=$('.ws2-foot',shell);if(foot){foot.innerHTML=adminEdit()+profile();$('#ws2AdminEdit',foot)?.addEventListener('click',globalEditor);$('#ws2Profile',foot)?.addEventListener('click',()=>{if(window.AltNav?.git)window.AltNav.git('profil');else if(typeof profilVeyaSecimAc==='function')profilVeyaSecimAc();});}syncActive();
}
function build(){
  cssYukle();const sidebar=$('#app > .sidebar');if(!sidebar)return;legacyHazirla(sidebar);shell=document.createElement('div');shell.className='ws2-shell';
  shell.innerHTML=`<div class="ws2-head"><img class="ws2-logo" src="assets/icon-192.png" alt="Okul"><div class="ws2-brand"><strong>Koruk İlk-Ortaokulu</strong><span>Yönetim Merkezi</span></div><button type="button" class="ws2-collapse" id="ws2Collapse" title="Menüyü daralt / genişlet">${svg(ICON.collapse,16)}</button></div><div class="ws2-quick" id="ws2Quick"></div><div class="ws2-section-label">Menüler</div><div class="ws2-nav" id="ws2Nav"></div><div class="ws2-foot"></div>`;
  sidebar.appendChild(shell);navEl=$('#ws2Nav',shell);const q=$('#ws2Quick',shell);q.append(quickButton('panel','Ana Sayfa',ICON.home,()=>typeof sekmeAc==='function'&&sekmeAc('panel')),quickButton('arama','Arama',ICON.search,()=>typeof sekmeAc==='function'&&sekmeAc('arama')),quickButton('profil','Profilim',ICON.profile,()=>window.AltNav?.git?window.AltNav.git('profil'):typeof profilVeyaSecimAc==='function'&&profilVeyaSecimAc()));
  $('#ws2Collapse',shell).addEventListener('click',()=>{closeFlyout();document.body.classList.toggle('nav-collapsed');try{localStorage.setItem('navCollapsed',document.body.classList.contains('nav-collapsed')?'1':'0');}catch(_){}});
  try{activeKey=localStorage.getItem(ACTIVE_KEY)||'panel';}catch(_){activeKey='panel';}render();
}
function hookNav(){if(window.__ws2NavHook)return;const orig=window._navDuzeniYerelUygula;if(typeof orig!=='function')return;window.__ws2NavHook=true;window._navDuzeniYerelUygula=function(){const r=orig.apply(this,arguments);queueMicrotask(()=>render());return r;};}
function boot(){build();hookNav();setTimeout(()=>{hookNav();render();},350);setTimeout(render,1200);setTimeout(render,3200);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('click',e=>{if(flyout&&!e.target.closest('.ws2-flyout')&&!e.target.closest('.ws2-group-btn'))closeFlyout();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeFlyout();});
window.addEventListener('blur',closeFlyout);
window.WebSidebarV2={yenile:render,kapatFlyout:closeFlyout};
})();
