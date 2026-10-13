/* Koruk Asistan — WEB KABUĞU (≥1100px)
   Geniş ekranda (tarayıcı, tablet yatay) alt gezinme çubuğu yerine sol menü + üst çubuk gösterir.
   Telefon / APK görünümü ve ShellUI yönlendirmesi AYNEN korunur: bu dosya yalnız yan menü ile üst çubuğun işaretlemesini
   kurar, ShellUI.routeModule'ü çağırır ve rota olayını (koruk:shell-route) dinler. Tüm görünüm css/design-system-base.css
   içindeki "WEB ARAYÜZÜ" bölümündeki --ka-web-* belirteçlerinden gelir; ≥1100px dışında bu öğeler CSS ile gizlidir. */
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
let model=[],openKey='',activeItemKey='',lastSig='',renderQueued=false,searchOpenedByTop=false,canBackNow=false;
const ui=()=>global.ShellUI;
const isWeb=()=>ui()?.webMode?.()===true;
const norm=v=>String(v||'');
const itemKey=(route,page)=>norm(route)+':'+norm(page);
function safeRead(){try{const v=JSON.parse(localStorage.getItem(RECENT_KEY)||'[]');return Array.isArray(v)?v:[]}catch(_){return[]}}
function safeWrite(list){try{localStorage.setItem(RECENT_KEY,JSON.stringify(list))}catch(_){}}
function findItem(route,page){for(const g of model){const hit=g.items.find(i=>i.route===route&&i.page===norm(page));if(hit)return{group:g,item:hit}}return null}
function findGroupByRoute(route){for(const g of model){if(g.items.some(i=>i.route===route))return g}return null}
function ico(glyph,extra=''){return `<span class="ka-web-ico ${extra}" data-ka-glyph="${esc(glyph)}" aria-hidden="true">${esc(glyph)}</span>`}

/* ── iskelet: yan menü + üst çubuk eklentileri (bir kez) ── */
function build(){
  const app=$('#app');if(!app||$('.ka-web-side',app))return;
  const side=doc.createElement('aside');side.className='ka-web-side';side.setAttribute('aria-label','Ana menü');
  side.innerHTML=`<button class="ka-web-brand" type="button" data-ka-home-trigger aria-label="Ana sayfaya git"><img class="ka-web-brand__logo" src="assets/icon-192.png" width="44" height="44" alt=""><span class="ka-web-brand__text"><strong data-ka-web-school>KORUK İLK-ORTAOKULU</strong><small>Koruk Asistan</small></span></button><nav class="ka-web-nav" aria-label="Sayfalar"><button class="ka-web-link ka-web-link--home" type="button" data-ka-web-home>${ico('🏠','ka-web-ico--home')}<span class="ka-web-link__label">Ana Sayfa</span></button><div class="ka-web-sep" role="presentation"></div><div class="ka-web-groups" data-ka-web-groups></div><div class="ka-web-recent" data-ka-web-recent hidden><h3>Son kullanılanlar</h3><div data-ka-web-recent-list></div></div></nav><button class="ka-web-me" type="button" data-ka-web-profile aria-haspopup="dialog" aria-label="Hesap menüsü"><span class="ka-web-me__avatar" data-ka-web-avatar>K</span><span class="ka-web-me__text"><strong data-ka-web-name>Kullanıcı</strong><small data-ka-web-role></small></span><span class="ka-web-me__chev" aria-hidden="true">${SVG.down}</span></button>`;
  app.insertBefore(side,app.firstChild);
  const header=$('.ka-app-header',app);
  if(header){
    const crumb=doc.createElement('div');crumb.className='ka-web-crumb';
    crumb.innerHTML=`<button class="ka-web-crumb__back" type="button" data-ka-shell-back aria-label="Önceki sayfaya dön" title="Geri" hidden>${SVG.back}</button><span class="ka-web-crumb__group" data-ka-web-crumb-group hidden></span><i class="ka-web-crumb__sep" aria-hidden="true" hidden>${SVG.chevron}</i><strong class="ka-web-crumb__title" data-ka-web-crumb-title>Ana Sayfa</strong>`;
    const search=doc.createElement('label');search.className='ka-web-search';
    search.innerHTML=`${SVG.search}<input type="search" data-ka-web-search placeholder="Öğretmen, öğrenci veya sayfa ara…" autocomplete="off" aria-label="Ara"><kbd aria-hidden="true">Ctrl K</kbd>`;
    const wx=doc.createElement('button');wx.type='button';wx.className='ka-web-wx';wx.hidden=true;wx.setAttribute('data-ka-web-wx','');wx.setAttribute('aria-label','Hava durumu');
    wx.innerHTML='<span class="ka-web-wx__icon" data-ka-web-wx-icon></span><b data-ka-web-wx-temp></b><span class="ka-web-wx__text" data-ka-web-wx-text></span>';
    const note=doc.createElement('button');note.type='button';note.className='ka-primary ka-web-note';note.setAttribute('data-ka-web-note','');
    note.innerHTML=`${SVG.plus}<span>Hızlı not</span>`;
    header.insertBefore(note,header.firstChild);header.insertBefore(wx,header.firstChild);header.insertBefore(search,header.firstChild);header.insertBefore(crumb,header.firstChild);
  }
  bind(side);
}

/* ── yan menü içeriği ── */
function readModel(){try{return ui()?.webMenu?.()||[]}catch(e){console.warn('[WebShell/menu]',e);return[]}}
function groupHtml(g){
  const custom=g.color?` data-menu-custom-color="true" style="--ka-menu-custom:${esc(g.color)}"`:'';
  const open=g.key===openKey;
  return `<div class="ka-web-group${open?' is-open':''}" data-ka-web-group-wrap="${esc(g.key)}" data-ka-menu-group="${esc(g.key)}" data-tone="${esc(g.tone)}"${custom}><button class="ka-web-link ka-web-link--group" type="button" data-ka-web-group="${esc(g.key)}" aria-expanded="${open}">${ico(g.icon)}<span class="ka-web-link__label">${esc(g.label)}</span><span class="ka-web-count">${g.count}</span><span class="ka-web-link__chev" aria-hidden="true">${SVG.chevron}</span></button><div class="ka-web-sub" ${open?'':'hidden'}>${g.items.map((it,i)=>subHtml(g,it,i)).join('')}</div></div>`;
}
function subHtml(g,it,i){
  const prevSub=i>0&&g.items[i-1].section!==it.section;
  const head=it.section==='sub'&&(i===0||prevSub)?`<h4>${esc(g.subLabel)}</h4>`:'';
  const custom=it.color?` data-menu-custom-color="true" style="--ka-menu-item-custom:${esc(it.color)}"`:'';
  return `${head}<button class="ka-web-sublink" type="button" data-ka-web-route="${esc(it.route)}" data-ka-web-page="${esc(it.page)}" data-ka-web-group-key="${esc(g.key)}" data-ka-web-title="${esc(it.label)}"${custom}>${ico(it.glyph,'ka-web-ico--sub')}<span>${esc(it.label)}</span></button>`;
}
function markGlyphs(root){
  $$('.ka-web-ico[data-ka-glyph]',root).forEach(el=>{
    let known=false;try{known=getComputedStyle(el).getPropertyValue('--ic').trim().length>0}catch(_){}
    el.classList.toggle('has-ic',known);
  });
}
function renderMenu(){
  renderQueued=false;
  const side=$('.ka-web-side');if(!side)return;
  if(!isWeb())return;
  model=readModel();
  const host=$('[data-ka-web-groups]',side);if(!host)return;
  const scroller=$('.ka-web-nav',side),top=scroller?scroller.scrollTop:0;
  const act=resolveActive(ui()?.currentView?.());
  if(act.group&&!openKey)openKey=act.group;
  if(openKey&&!model.some(g=>g.key===openKey))openKey='';
  host.innerHTML=model.map(groupHtml).join('');
  markGlyphs(side);
  if(scroller)scroller.scrollTop=top;
  paintActive();renderRecent();renderIdentity();renderCrumb(ui()?.currentView?.());
}
function queueRender(){if(renderQueued)return;renderQueued=true;(global.requestAnimationFrame||setTimeout)(renderMenu)}

/* ── aktif sayfa ── */
function resolveActive(view){
  if(!view||(view.kind==='route'&&view.name==='dashboard'))return{home:true,group:'',key:''};
  if(view.kind==='route'){
    const exact=findItem(view.name,view.page);
    if(exact)return{home:false,group:exact.group.key,key:itemKey(exact.item.route,exact.item.page),item:exact.item,groupLabel:exact.group.label};
    const g=findGroupByRoute(view.name);
    return{home:false,group:g?.key||'',key:'',groupLabel:g?.label||''};
  }
  return{home:false,group:'',key:''};
}
function paintActive(){
  const side=$('.ka-web-side');if(!side)return;
  const act=resolveActive(ui()?.currentView?.());
  activeItemKey=act.key;
  $('[data-ka-web-home]',side)?.classList.toggle('is-active',act.home===true);
  $('[data-ka-web-home]',side)?.toggleAttribute('aria-current',act.home===true);
  $$('.ka-web-sublink',side).forEach(b=>{const on=itemKey(b.dataset.kaWebRoute,b.dataset.kaWebPage)===act.key;b.classList.toggle('is-active',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  $$('.ka-web-group',side).forEach(w=>w.classList.toggle('has-active',!!act.group&&w.dataset.kaWebGroupWrap===act.group&&!!act.key));
}
function applyOpen(){
  $$('.ka-web-group').forEach(w=>{const on=w.dataset.kaWebGroupWrap===openKey;w.classList.toggle('is-open',on);$('[data-ka-web-group]',w)?.setAttribute('aria-expanded',String(on));const sub=$('.ka-web-sub',w);if(sub)sub.hidden=!on});
}
function toggleOpen(key){openKey=openKey===key?'':key;applyOpen()}

/* ── üst çubuk: kırıntı ── */
function renderCrumb(view){
  const g=$('[data-ka-web-crumb-group]'),t=$('[data-ka-web-crumb-title]'),sep=$('.ka-web-crumb__sep'),back=$('.ka-web-crumb__back');
  if(!t)return;
  const act=resolveActive(view),titleEl=$('#v2ModuleTitle');
  let title='Ana Sayfa',group='';
  if(!act.home){title=act.item?.label||view?.title||titleEl?.textContent?.trim()||'';group=act.groupLabel||''}
  t.textContent=title||'Ana Sayfa';
  if(g){g.textContent=group;g.hidden=!group}
  if(sep)sep.hidden=!group;
  if(back)back.hidden=!canBackNow;
}

/* ── son kullanılanlar ── */
function pushRecent(view){
  if(!view||view.kind!=='route'||view.name==='dashboard')return;
  const hit=findItem(view.name,view.page);if(!hit)return;
  const rec={route:hit.item.route,page:hit.item.page,title:hit.item.label,glyph:hit.item.glyph};
  const list=safeRead().filter(x=>itemKey(x.route,x.page)!==itemKey(rec.route,rec.page));list.unshift(rec);
  safeWrite(list.slice(0,RECENT_MAX+3));
}
function renderRecent(){
  const wrap=$('[data-ka-web-recent]'),list=$('[data-ka-web-recent-list]');if(!wrap||!list)return;
  const rows=safeRead().filter(x=>findItem(x.route,x.page)).filter(x=>itemKey(x.route,x.page)!==activeItemKey).slice(0,RECENT_MAX);
  wrap.hidden=!rows.length;
  list.innerHTML=rows.map(r=>{const f=findItem(r.route,r.page);return `<button class="ka-web-sublink ka-web-sublink--recent" type="button" data-ka-menu-group="${esc(f.group.key)}" data-tone="${esc(f.group.tone)}" data-ka-web-route="${esc(r.route)}" data-ka-web-page="${esc(r.page)}" data-ka-web-group-key="${esc(f.group.key)}" data-ka-web-title="${esc(f.item.label)}">${ico(f.item.glyph,'ka-web-ico--sub')}<span>${esc(f.item.label)}</span></button>`}).join('');
  markGlyphs(list);
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
    const r=$('[data-ka-web-role]',side);if(r)r.textContent=info.role||'';
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
function go(route,page,title,group){
  if(!route)return;
  Promise.resolve(ui()?.routeModule?.(route,{bottom:'menu',page:page||'',title:title||'',parentMenu:group||''})).catch(e=>{console.error('[WebShell/route]',e);global.toast?.('Sayfa açılamadı.')});
}
function bind(side){
  side.addEventListener('click',e=>{
    const home=e.target.closest('[data-ka-web-home]');if(home){e.preventDefault();ui()?.home?.();return}
    const grp=e.target.closest('[data-ka-web-group]');if(grp){e.preventDefault();toggleOpen(grp.dataset.kaWebGroup);return}
    const row=e.target.closest('[data-ka-web-route]');if(row){e.preventDefault();go(row.dataset.kaWebRoute,row.dataset.kaWebPage,row.dataset.kaWebTitle,row.dataset.kaWebGroupKey);return}
    const me=e.target.closest('[data-ka-web-profile]');if(me){e.preventDefault();ui()?.openProfilePopover?.(me)}
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
      if(!page){if(!q.trim())return;ui()?.renderSearch?.();searchOpenedByTop=true;page=$('[data-shell-search-input]');try{input.focus();input.setSelectionRange(q.length,q.length)}catch(_){}}
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


/* ── ana sayfa: kısa özet cümlesi + sütunlar arası duvar örgüsü (satır yüksekliği ölçümü) ── */
const DAY_NAMES=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
const pad2=n=>String(n).padStart(2,'0');
const isoOf=d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const fold=v=>String(v||'').toLocaleLowerCase('tr').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');
const rows=t=>{try{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]}catch(_){return[]}};
const bold=v=>`<b>${esc(v)}</b>`;
function briefHtml(){
  const now=new Date(),today=isoOf(now),u=global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{},tid=u.bagliOgretmenId||u.ogretmenId||'',admin=u.admin===true;
  const parts=[];
  const duties=rows('nobetAtamalari').filter(x=>String(x?.tarih||'').slice(0,10)===today);
  if(admin||!tid){
    const teachers=rows('ogretmenler').filter(x=>x?.aktif!==false).length;
    if(teachers)parts.push(`Bugün ${bold(teachers+' öğretmen')} görevde${duties.length?`, ${bold(duties.length+' nöbetçi')} var`:''}.`);
    else if(duties.length)parts.push(`Bugün ${bold(duties.length+' nöbetçi')} var.`);
  }else{
    const day=fold(DAY_NAMES[now.getDay()]),mine=rows('dersProgrami').filter(x=>fold(x?.gun)===day&&x?.ogretmenId===tid).length;
    if(mine)parts.push(`Bugün ${bold(mine+' dersiniz')} var.`);
    const myDuty=duties.find(x=>x?.ogretmenId===tid);
    if(myDuty)parts.push(`Bugün ${bold('nöbetçisiniz')}${myDuty.nobetYeri?` (${esc(myDuty.nobetYeri)})`:''}.`);
  }
  const key=today.slice(0,7),dayKey=String(now.getDate()),rec=rows('yemekMenuleri').find(x=>String(x?.id||'')===key),row=rec?.menu?.[dayKey]||rec?.menu?.[now.getDate()]||{};
  const items=(Array.isArray(row?.items)?row.items:[row?.corba,row?.ana]).map(v=>String(v??'').trim()).filter(Boolean);
  if(items.length&&now.getDay()>0&&now.getDay()<6)parts.push(`Öğle yemeğinde ${bold(items.slice(0,2).join(', '))} var.`);
  const base=new Date(today+'T00:00:00'),next=rows('belirliGunler').map(x=>({n:x?.ad,d:String(x?.tarihBaslangic||'').slice(0,10)})).filter(x=>x.n&&/^\d{4}-\d{2}-\d{2}$/.test(x.d)).map(x=>({...x,days:Math.round((new Date(x.d+'T00:00:00')-base)/86400000)})).filter(x=>x.days>=0&&x.days<=30).sort((a,b)=>a.days-b.days)[0];
  if(next)parts.push(`En yakın özel gün: ${bold(next.n)} (${next.days===0?'bugün':next.days+' gün sonra'}).`);
  return parts.join(' ');
}
function decorateHome(){
  const hero=$('#v2ModuleRoot .ka-home>.kh-hero');if(!hero)return;
  const html=briefHtml(),cur=$('.ka-web-brief',hero);
  if(!html){cur?.remove();return}
  if(cur){if(cur.innerHTML!==html)cur.innerHTML=html;return}
  const p=doc.createElement('p');p.className='ka-web-brief';p.innerHTML=html;
  const anchor=$('.kh-date',hero)||$('.kh-greeting',hero);if(anchor)anchor.after(p);else hero.appendChild(p);
}
let homeRO=null,homeMO=null,layoutQueued=false,homeNode=null;
function layoutHome(){
  layoutQueued=false;
  const home=$('#v2ModuleRoot .ka-home');
  if(!home||!isWeb())return;
  const row=parseFloat(getComputedStyle(home).gridAutoRows)||4;
  if(!homeRO&&global.ResizeObserver)homeRO=new ResizeObserver(queueLayout);
  const pair=['food-menu','duty','today-duty'].map(k=>$(`:scope>[data-home-section="${k}"]`,home)).filter(Boolean).slice(0,2);
  const wide=global.matchMedia?.('(min-width:1280px)').matches===true,pairOn=wide&&pair.length===2;
  /* doğal yükseklikleri ölç (is-pair kalkık), sonra çifti en yüksek olana eşitle */
  home.querySelectorAll(':scope>.is-pair').forEach(el=>el.classList.remove('is-pair'));
  const spans=new Map();
  for(const el of home.children){
    const m=parseFloat(getComputedStyle(el).marginBottom)||0,h=el.getBoundingClientRect().height+m;
    spans.set(el,Math.max(1,Math.ceil(h/row)));
    if(pairOn&&pair.includes(el))homeRO?.unobserve(el);else homeRO?.observe(el);
  }
  if(pairOn){const n=Math.max(...pair.map(el=>spans.get(el)||1));pair.forEach(el=>{spans.set(el,n);el.classList.add('is-pair')})}
  for(const [el,n] of spans){const span='span '+n;if(el.style.gridRowEnd!==span)el.style.gridRowEnd=span}
}
function queueLayout(){if(layoutQueued)return;layoutQueued=true;(global.requestAnimationFrame||setTimeout)(layoutHome)}
function onModuleRootChange(){
  const home=$('#v2ModuleRoot .ka-home');
  if(!home){homeNode=null;return}
  if(!isWeb())return;
  decorateHome();layoutHome();
  if(home!==homeNode){homeNode=home;try{homeRO?.disconnect()}catch(_){}}
  layoutHome();
}
function watchHome(){
  const root=$('#v2ModuleRoot');if(!root||homeMO||!global.MutationObserver)return;
  homeMO=new MutationObserver(onModuleRootChange);homeMO.observe(root,{childList:true});
  global.addEventListener('resize',queueLayout,{passive:true});
  onModuleRootChange();
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
  if(act.group&&act.key)openKey=act.group;
  pushRecent(view);
  applyOpen();paintActive();renderRecent();renderCrumb(view);
}
function wire(){
  global.addEventListener('koruk:shell-route',onRoute);
  global.addEventListener('koruk:web-menu-open',()=>{$('.ka-web-nav')?.scrollTo?.({top:0});$('[data-ka-web-home]')?.focus?.()});
  for(const ev of ['koruk:app-ready','koruk:app-config-changed','koruk:permissions-changed','koruk:auth-local-restored'])global.addEventListener(ev,queueRender);
  global.AppStore?.subscribe?.('session.user',queueRender);
  global.AppStore?.subscribe?.('ui.weather',renderWeather);
  for(const t of ['ogretmenler','nobetAtamalari','yemekMenuleri','belirliGunler','dersProgrami'])global.AppStore?.subscribe?.('data.'+t,()=>{if(isWeb())decorateHome()});
  global.AppStore?.subscribe?.('ui.theme',()=>{queueRender()});
  for(const t of ['ogretmenler','kullanicilar','okulBilgileri'])global.AppStore?.subscribe?.('data.'+t,renderIdentity);
  const brand=$('.ka-brand-home');
  if(brand&&global.MutationObserver){new MutationObserver(()=>{renderIdentity();renderWeather()}).observe(brand,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['src','hidden']})}
  const title=$('#v2ModuleTitle');
  if(title&&global.MutationObserver)new MutationObserver(()=>renderCrumb(ui()?.currentView?.())).observe(title,{childList:true,characterData:true,subtree:true});
  const mq=global.matchMedia?.('(min-width:1100px)');
  const onMq=()=>{if(mq?.matches){ui()?.closeMenu?.();queueRender();renderWeather();onModuleRootChange()}};
  if(mq?.addEventListener)mq.addEventListener('change',onMq);else mq?.addListener?.(onMq);
  setInterval(()=>{if(isWeb())renderWeather()},15000);
}
function init(){
  build();wire();watchHome();
  if(isWeb()){queueRender();renderWeather()}
}
global.KorukWebShell={init,renderMenu:queueRender,renderWeather};
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);
})(window);
