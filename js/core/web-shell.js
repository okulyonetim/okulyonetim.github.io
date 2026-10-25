/* Koruk Asistan — WEB KABUĞU (≥1100px)
   Geniş ekranda (tarayıcı, tablet yatay) alt gezinme çubuğu yerine sol menü + üst çubuk gösterir.
   Sol menü AppNav.webMenu()'den (rolün sekmeleri; Araçlar/Yönetim altında araç grupları) kurulur, sayfalar ShellUI.openTab / openPage /
   routeModule ile açılır ve rota olayı (koruk:shell-route) dinlenir. Telefon / APK görünümü aynı yönlendirmeyi kullanır.
   Tüm görünüm css/design-system-base.css içindeki "WEB ARAYÜZÜ" bölümündeki --ka-web-* belirteçlerinden gelir; ≥1100px dışında bu öğeler CSS ile gizlidir. */
(function(global){
'use strict';
if(global.__korukWebShell)return;global.__korukWebShell=true;
const doc=document;
const $=(s,r=doc)=>r.querySelector(s),$$=(s,r=doc)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RECENT_KEY='ka-web-recent',RECENT_MAX=3;
const SVG={
  chevron:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  down:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  back:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  plus:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'
};
let model=[],openKey='',lastSig='',renderQueued=false,canBackNow=false;
const ui=()=>global.ShellUI;
const nav=()=>global.AppNav;
const isWeb=()=>ui()?.webMode?.()===true;
function safeRead(){try{const v=JSON.parse(localStorage.getItem(RECENT_KEY)||'[]');return Array.isArray(v)?v:[]}catch(_){return[]}}
function safeWrite(list){try{localStorage.setItem(RECENT_KEY,JSON.stringify(list))}catch(_){}}

/* ── iskelet: yan menü + üst çubuk eklentileri (bir kez) ── */
function build(){
  const app=$('#app');if(!app||$('.ka-web-side',app))return;
  const side=doc.createElement('aside');side.className='ka-web-side';side.setAttribute('aria-label','Ana menü');
  side.innerHTML=`<button class="ka-web-brand" type="button" data-ka-home-trigger aria-label="Ana sayfaya git"><img class="ka-web-brand__logo" src="assets/icon-192.png" width="44" height="44" alt=""><span class="ka-web-brand__text"><strong data-ka-web-school>KORUK İLK-ORTAOKULU</strong><small>Koruk Asistan</small></span></button><nav class="ka-web-nav" aria-label="Sayfalar"><div class="ka-web-groups" data-ka-web-groups></div><div class="ka-web-recent" data-ka-web-recent hidden><h3>Son kullanılanlar</h3><div data-ka-web-recent-list></div></div></nav><div class="ka-web-me"><button class="ka-web-me__card" type="button" data-ka-web-profile aria-label="Ben"><span class="ka-web-me__avatar" data-ka-web-avatar>K</span><span class="ka-web-me__text"><strong data-ka-web-name>Kullanıcı</strong><small data-ka-web-role></small></span></button><button class="ka-web-me__switch" type="button" data-ka-web-switch hidden><span data-ka-web-switch-label></span></button></div>`;
  app.insertBefore(side,app.firstChild);
  const header=$('.ka-app-header',app);
  if(header){
    const crumb=doc.createElement('div');crumb.className='ka-web-crumb';
    crumb.innerHTML=`<button class="ka-web-crumb__back" type="button" data-ka-shell-back aria-label="Önceki sayfaya dön" title="Geri" hidden>${SVG.back}</button><span class="ka-web-crumb__group" data-ka-web-crumb-group hidden></span><i class="ka-web-crumb__sep" aria-hidden="true" hidden>${SVG.chevron}</i><strong class="ka-web-crumb__title" data-ka-web-crumb-title>Ana Sayfa</strong>`;
    const search=doc.createElement('label');search.className='ka-web-search';
    search.innerHTML=`${SVG.search}<input type="search" class="ka-field-bare" data-ka-web-search placeholder="Araç, öğretmen, öğrenci veya sayfa ara…" autocomplete="off" aria-label="Ara"><kbd aria-hidden="true">Ctrl K</kbd>`;
    const wx=doc.createElement('button');wx.type='button';wx.className='ka-web-wx';wx.hidden=true;wx.setAttribute('data-ka-web-wx','');wx.setAttribute('aria-label','Hava durumu');
    wx.innerHTML='<span class="ka-web-wx__icon" data-ka-web-wx-icon></span><b data-ka-web-wx-temp></b><span class="ka-web-wx__text" data-ka-web-wx-text></span>';
    const note=doc.createElement('button');note.type='button';note.className='ka-primary ka-web-note';note.setAttribute('data-ka-web-note','');
    note.innerHTML=`${SVG.plus}<span>Hızlı not</span>`;
    header.insertBefore(note,header.firstChild);header.insertBefore(wx,header.firstChild);header.insertBefore(search,header.firstChild);header.insertBefore(crumb,header.firstChild);
  }
  bind(side);
}

/* ── yan menü içeriği: rolün sekmeleri; Araçlar/Yönetim sekmesi araç gruplarını açar ── */
function readModel(){try{return nav()?.webMenu?.()||[]}catch(e){console.warn('[WebShell/menu]',e);return[]}}
function tabHtml(t){
  const kids=t.children||[],open=kids.length&&t.key===openKey;
  const head=`<button class="ka-web-link${kids.length?' ka-web-link--group':''}" type="button" data-ka-web-tab="${esc(t.key)}"${kids.length?` aria-expanded="${!!open}"`:''}><span class="ka-web-ico" aria-hidden="true">${nav().icon(t.icon,20)}</span><span class="ka-web-link__label">${esc(t.label)}</span>${kids.length?`<span class="ka-web-link__chev" aria-hidden="true">${SVG.chevron}</span>`:''}</button>`;
  if(!kids.length)return `<div class="ka-web-group" data-ka-web-group-wrap="${esc(t.key)}">${head}</div>`;
  return `<div class="ka-web-group${open?' is-open':''}" data-ka-web-group-wrap="${esc(t.key)}">${head}<div class="ka-web-sub" ${open?'':'hidden'}>${kids.map(k=>`<button class="ka-web-sublink" type="button" data-ka-web-page="${esc(k.key)}" data-ka-web-title="${esc(k.label)}"><span>${esc(k.label)}</span><span class="ka-web-count">${k.count}</span></button>`).join('')}</div></div>`;
}
function renderMenu(){
  renderQueued=false;
  const side=$('.ka-web-side');if(!side||!isWeb()||!nav())return;
  model=readModel();
  const host=$('[data-ka-web-groups]',side);if(!host)return;
  const scroller=$('.ka-web-nav',side),top=scroller?scroller.scrollTop:0;
  const act=resolveActive(ui()?.currentView?.());
  if(act.tab==='tools')openKey='tools';
  host.innerHTML=model.map(tabHtml).join('');
  if(scroller)scroller.scrollTop=top;
  paintActive();renderRecent();renderIdentity();renderCrumb(ui()?.currentView?.());
}
function queueRender(){if(renderQueued)return;renderQueued=true;(global.requestAnimationFrame||setTimeout)(renderMenu)}

/* ── aktif sayfa ── */
function resolveActive(view){
  if(!view||(view.kind==='route'&&view.name==='dashboard'&&!view.page))return{tab:'home',page:''};
  if(view.kind==='nav')return{tab:view.bottom,page:view.page};
  if(view.kind==='route'){const p=nav()?.parentOf?.(view.name,view.page)||'';return{tab:view.bottom||nav()?.tabOf?.(view.name,view.page)||'',page:p.startsWith('tools:')?p:''}}
  if(view.kind==='profile'||view.kind==='profile-detail')return{tab:'me',page:''};
  return{tab:'',page:''};
}
function paintActive(){
  const side=$('.ka-web-side');if(!side)return;
  const act=resolveActive(ui()?.currentView?.());
  $$('[data-ka-web-tab]',side).forEach(b=>{const on=b.dataset.kaWebTab===act.tab;b.classList.toggle('is-active',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  $$('.ka-web-sublink',side).forEach(b=>{const on=b.dataset.kaWebPage===act.page;b.classList.toggle('is-active',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  $('[data-ka-web-profile]',side)?.classList.toggle('is-active',act.tab==='me');
}
function applyOpen(){
  $$('.ka-web-group').forEach(w=>{const kids=$('.ka-web-sub',w);if(!kids)return;const on=w.dataset.kaWebGroupWrap===openKey;w.classList.toggle('is-open',on);$('[data-ka-web-tab]',w)?.setAttribute('aria-expanded',String(on));kids.hidden=!on});
}

/* ── üst çubuk: kırıntı ── */
function crumbOf(view){
  const t=nav();
  if(!view||(view.kind==='route'&&view.name==='dashboard'&&!view.page))return{group:'',title:t?.tab?.('home')?.label||'Ana Sayfa'};
  if(view.kind==='nav'){
    const tab=t?.tab?.(view.bottom)?.label||'';
    return view.page.startsWith('tools:')?{group:t?.tab?.('tools')?.label||'',title:view.title}:{group:'',title:tab||view.title};
  }
  if(view.kind==='route'){
    const p=t?.parentOf?.(view.name,view.page)||'';
    let group='';
    if(p.startsWith('tools:'))group=t.group(p.slice(6))?.label||'';
    else if(p)group=t.tab(p)?.label||'';
    const tool=t?.findTool?.(view.name,view.page);
    return{group,title:tool?.label||view.title||$('#v2ModuleTitle')?.textContent?.trim()||''};
  }
  return{group:'',title:view.title||$('#v2ModuleTitle')?.textContent?.trim()||''};
}
function renderCrumb(view){
  const g=$('[data-ka-web-crumb-group]'),t=$('[data-ka-web-crumb-title]'),sep=$('.ka-web-crumb__sep'),back=$('.ka-web-crumb__back');
  if(!t)return;
  const c=crumbOf(view);
  t.textContent=c.title||'Ana Sayfa';
  if(g){g.textContent=c.group;g.hidden=!c.group}
  if(sep)sep.hidden=!c.group;
  if(back)back.hidden=!canBackNow;
}

/* ── son kullanılanlar ── */
function pushRecent(view){
  if(!view||view.kind!=='route'||view.name==='dashboard')return;
  const tool=nav()?.findTool?.(view.name,view.page);if(!tool)return;
  const list=safeRead().filter(x=>x.id!==tool.id);list.unshift({id:tool.id});
  safeWrite(list.slice(0,RECENT_MAX+3));
}
function renderRecent(){
  const wrap=$('[data-ka-web-recent]'),list=$('[data-ka-web-recent-list]');if(!wrap||!list||!nav())return;
  const cur=ui()?.currentView?.(),curTool=cur?.kind==='route'?nav().findTool(cur.name,cur.page):null;
  const rows=safeRead().map(x=>nav().tool(x.id)).filter(t=>t&&nav().toolAllowed(t)&&t.id!==curTool?.id).slice(0,RECENT_MAX);
  wrap.hidden=!rows.length;
  list.innerHTML=rows.map(t=>`<button class="ka-web-sublink ka-web-sublink--recent" type="button" data-ka-web-tool="${esc(t.id)}"><span class="ka-web-ico ka-web-ico--sub" aria-hidden="true">${nav().icon(t.icon,16)}</span><span>${esc(t.label)}</span></button>`).join('');
}

/* ── kimlik (okul adı, hesap kartı, hava) ── */
function renderIdentity(){
  const side=$('.ka-web-side');if(!side)return;
  const school=$('.ka-app-brand strong')?.textContent?.trim(),logo=$('.ka-school-logo')?.getAttribute('src');
  const s=$('[data-ka-web-school]',side);if(s&&school)s.textContent=school;
  const l=$('.ka-web-brand__logo',side);if(l&&logo&&l.getAttribute('src')!==logo)l.setAttribute('src',logo);
  let info=null;try{info=ui()?.profileInfo?.()}catch(_){}
  if(info){
    const initials=String(info.name||'').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toLocaleUpperCase('tr')||'K';
    const av=$('[data-ka-web-avatar]',side);if(av)av.innerHTML=info.photo?`<img src="${esc(info.photo)}" alt="">`:esc(initials);
    const n=$('[data-ka-web-name]',side);if(n)n.textContent=info.name||'Kullanıcı';
    const r=$('[data-ka-web-role]',side);if(r)r.textContent=info.role||nav()?.roleLabel?.(nav().role())||'';
  }
  const sw=$('[data-ka-web-switch]',side);
  if(sw&&nav()){
    const can=nav().canSwitch();sw.hidden=!can;
    if(can){sw.dataset.kaWebSwitch=nav().otherRole();$('[data-ka-web-switch-label]',sw).textContent=nav().otherRole()==='ogretmen'?'Öğretmen menüsüne geç':'Yönetim menüsüne geç'}
  }
}
function renderWeather(){
  const btn=$('[data-ka-web-wx]');if(!btn)return;
  let v=null;try{v=global.SchoolLiveStatus?.weatherView?.()}catch(_){}
  const chip=$('[data-ka-weather]');
  if(v&&v.temp!==undefined&&v.temp!=='—'&&v.temp!==''){
    $('[data-ka-web-wx-icon]',btn).textContent=v.emoji||'';
    $('[data-ka-web-wx-temp]',btn).textContent=`${v.temp}°`;
    $('[data-ka-web-wx-text]',btn).textContent=[v.text,String(v.location||'').split(/[,·]/)[0].trim()].filter(Boolean).join(' · ');
    btn.hidden=false;return;
  }
  if(chip&&!chip.hidden&&chip.textContent.trim()){
    const m=chip.textContent.trim().match(/^(\S+)\s*(.*)$/);
    $('[data-ka-web-wx-icon]',btn).textContent=m?m[1]:'';$('[data-ka-web-wx-temp]',btn).textContent=m?m[2]:chip.textContent.trim();$('[data-ka-web-wx-text]',btn).textContent='';btn.hidden=false;return;
  }
  btn.hidden=true;
}

/* ── etkileşim ── */
function bind(side){
  side.addEventListener('click',e=>{
    const tab=e.target.closest('[data-ka-web-tab]');
    if(tab){
      e.preventDefault();
      const key=tab.dataset.kaWebTab,w=tab.closest('.ka-web-group');
      if(w&&$('.ka-web-sub',w)){openKey=openKey===key?'':key;applyOpen();if(openKey===key)ui()?.openTab?.(key);return}
      ui()?.openTab?.(key);return;
    }
    const page=e.target.closest('[data-ka-web-page]');if(page){e.preventDefault();ui()?.openPage?.(page.dataset.kaWebPage,{fresh:true});return}
    const tool=e.target.closest('[data-ka-web-tool]');
    if(tool){e.preventDefault();const t=nav()?.tool?.(tool.dataset.kaWebTool);if(t)Promise.resolve(ui()?.routeModule?.(t.route,{page:t.page,title:t.label})).catch(err=>{console.error('[WebShell/route]',err);global.toast?.('Sayfa açılamadı.')});return}
    const sw=e.target.closest('[data-ka-web-switch]');if(sw){e.preventDefault();if(nav()?.setRole?.(sw.dataset.kaWebSwitch))ui()?.openTab?.('home');return}
    const me=e.target.closest('[data-ka-web-profile]');if(me){e.preventDefault();ui()?.openTab?.('me')}
  });
  doc.addEventListener('click',e=>{
    const note=e.target.closest('[data-ka-web-note]');if(note){e.preventDefault();ui()?.openQuickNote?.();return}
    const wx=e.target.closest('[data-ka-web-wx]');if(wx){e.preventDefault();global.SchoolLiveStatus?.openWeather?.()}
  });
  const input=$('[data-ka-web-search]');
  if(input){
    const sync=()=>{
      const q=input.value;
      let page=$('[data-shell-search-input]');
      if(!page){if(!q.trim())return;ui()?.renderSearch?.();page=$('[data-shell-search-input]');try{input.focus();input.setSelectionRange(q.length,q.length)}catch(_){}}
      if(page&&page.value!==q){page.value=q;page.dispatchEvent(new Event('input',{bubbles:true}))}
    };
    input.addEventListener('input',sync);
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(!$('[data-shell-search-input]'))ui()?.renderSearch?.();sync()}else if(e.key==='Escape'){input.value='';input.blur()}});
    input.addEventListener('focus',()=>{if(!$('[data-shell-search-input]')&&input.value.trim())sync()});
  }
  doc.addEventListener('keydown',e=>{
    if(!isWeb())return;
    if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='k'){e.preventDefault();$('[data-ka-web-search]')?.focus();$('[data-ka-web-search]')?.select()}
  });
}

/* ── olaylar ── */
function onRoute(e){
  const view=e?.detail?.view||ui()?.currentView?.();
  canBackNow=e?.detail?.canBack===true;
  const sig=JSON.stringify([view?.kind,view?.name,view?.page,view?.title,canBackNow]);
  if(sig===lastSig)return;
  lastSig=sig;
  if(!isWeb())return;
  if(view?.kind!=='search'){const i=$('[data-ka-web-search]');if(i&&i.value&&doc.activeElement!==i)i.value=''}
  const act=resolveActive(view);
  if(act.tab==='tools')openKey='tools';
  pushRecent(view);
  applyOpen();paintActive();renderRecent();renderCrumb(view);
}
function wire(){
  global.addEventListener('koruk:shell-route',onRoute);
  for(const ev of ['koruk:app-ready','koruk:app-config-changed','koruk:permissions-changed','koruk:auth-local-restored','koruk:nav-role-changed'])global.addEventListener(ev,queueRender);
  global.AppStore?.subscribe?.('session.user',queueRender);
  global.AppStore?.subscribe?.('ui.weather',renderWeather);
  global.AppStore?.subscribe?.('ui.theme',()=>{queueRender()});
  for(const t of ['ogretmenler','kullanicilar','okulBilgileri'])global.AppStore?.subscribe?.('data.'+t,renderIdentity);
  const brand=$('.ka-brand-home');
  if(brand&&global.MutationObserver){new MutationObserver(()=>{renderIdentity();renderWeather()}).observe(brand,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['src','hidden']})}
  const title=$('#v2ModuleTitle');
  if(title&&global.MutationObserver)new MutationObserver(()=>renderCrumb(ui()?.currentView?.())).observe(title,{childList:true,characterData:true,subtree:true});
  const mq=global.matchMedia?.('(min-width:1100px)');
  const onMq=()=>{if(mq?.matches){queueRender();renderWeather()}};
  if(mq?.addEventListener)mq.addEventListener('change',onMq);else mq?.addListener?.(onMq);
  setInterval(()=>{if(isWeb())renderWeather()},15000);
}
function init(){
  build();wire();
  if(isWeb()){queueRender();renderWeather()}
}
global.KorukWebShell={init,renderMenu:queueRender,renderWeather};
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);
})(window);
