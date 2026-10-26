/* Koruk Asistan — NavEditor
 * "Menüyü düzenle" ekranları: alt menüdeki 5 yuva, kullanıcının kendi menüleri ve her menünün sayfaları.
 * Düzen verisi AppNav'dadır (layoutRaw / saveLayout / resetLayout); bu dosya yalnız ekranları çizer ve
 * NavPages'e menu-edit, bar-pick ve menu-add sayfa türlerini kaydeder. Her değişiklik anında kaydedilir ve hesaba eşitlenir. */
(function(global){
'use strict';
if(global.NavEditor)return;
const nav=()=>global.AppNav,pages=()=>global.NavPages,ui=()=>global.ShellUI;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold=v=>String(v||'').trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i');
const h=()=>pages().helpers;
const role=()=>nav().role();
const read=()=>nav().layoutRaw(role());
const toast=m=>{try{global.toast?.(m)}catch(_){}};
const TONE_NAMES={blue:'Mavi',violet:'Mor',green:'Yeşil',orange:'Turuncu',rose:'Pembe',cyan:'Turkuaz',amber:'Sarı',indigo:'Lacivert',slate:'Gri'};
const newId=()=>`m${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`;
const swap=(list,i,d)=>{const j=i+d;if(j<0||j>=list.length)return false;[list[i],list[j]]=[list[j],list[i]];return true};

/* Alt menü yuvasının görünümü: yerleşik sayfa, menü ya da tek sayfa. */
function describe(key,L){
  const r=role();
  if(key==='home')return{label:r==='idareci'?'Özet':'Bugün',kind:'Sayfa',hint:'Günün özeti ve ana sayfa',icon:'home',tone:'blue'};
  if(key==='program')return{label:'Programım',kind:'Sayfa',hint:'Ders, nöbet ve takvim',icon:'calendar',tone:'green'};
  if(key==='tools')return{label:'Araçlar',kind:'Sayfa',hint:'Tüm menüleriniz ve arama',icon:'grid',tone:'amber'};
  if(key==='me')return{label:'Ben',kind:'Sayfa',hint:'Profil, ayarlar ve menü düzeni',icon:'user',tone:'slate'};
  if(key.startsWith('menu:')){
    const m=L.menus.find(x=>x.id===key.slice(5));
    return m?{label:m.ad,kind:`Menü · ${m.ids.length} sayfa`,hint:nav().menu(m.id)?'':'Boş menü alt menüde görünmez',icon:m.icon,tone:m.tone}:{label:'Silinmiş menü',kind:'Menü',icon:'grid',tone:'slate'};
  }
  const t=nav().tool(key.slice(5));
  return t?{label:t.label,kind:'Tek sayfa',icon:t.icon,tone:t.tone}:{label:'Bilinmeyen sayfa',kind:'Tek sayfa',icon:'grid',tone:'slate'};
}
const ibtn=(act,icon,label,disabled,attrs='')=>`<button type="button" class="ka-ne-ibtn" data-ne="${act}" ${attrs} aria-label="${esc(label)}"${disabled?' disabled':''}>${h().ic(icon,18)}</button>`;
const filterBox=ph=>`<label class="ka-nav-search">${h().ic('search',18)}<input type="search" class="ka-field-bare" data-ne-filter placeholder="${esc(ph)}" autocomplete="off" aria-label="${esc(ph)}"></label>`;

/* ── Menüyü düzenle (ana ekran) ── */
function homeHtml(){
  const L=read(),H=h();
  const slots=L.bar.map((key,i)=>{
    const d=describe(key,L);
    return `<div class="ka-ne-row">${H.ico(d.icon,d.tone,40,20)}<span class="ka-ne-copy"><strong>${esc(d.label)}</strong><small>${i+1}. yuva${i===2?' · ortada':''} · ${esc(d.kind)}</small></span><span class="ka-ne-acts">${ibtn('slot-move','chevu','Bir yuva öne al',i===0,`data-i="${i}" data-d="-1"`)}${ibtn('slot-move','chevd','Bir yuva geriye al',i===L.bar.length-1,`data-i="${i}" data-d="1"`)}<button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-nav-page-go="bar-pick:${i}">Değiştir</button></span></div>`;
  }).join('');
  const pinned=new Set(L.bar.filter(k=>k.startsWith('menu:')).map(k=>k.slice(5)));
  const menus=L.menus.map((m,i)=>`<div class="ka-ne-row">${H.ico(m.icon,m.tone,40,20)}<button type="button" class="ka-ne-main" data-nav-page-go="menu-edit:${esc(m.id)}"><span class="ka-ne-copy"><strong>${esc(m.ad)}</strong><small>${m.ids.length} sayfa${pinned.has(m.id)?' · alt menüde':''}</small></span>${H.chevron()}</button><span class="ka-ne-acts">${ibtn('menu-move','chevu','Menüyü yukarı al',i===0,`data-i="${i}" data-d="-1"`)}${ibtn('menu-move','chevd','Menüyü aşağı al',i===L.menus.length-1,`data-i="${i}" data-d="1"`)}</span></div>`).join('');
  const orphan=nav().inNoMenu(role()).length;
  return H.pageRoot('menu-edit',H.head('Menüyü düzenle','Alt menüyü ve menülerinizi kendiniz belirleyin')
    +`<div class="ka-nav-section"><h3>Alt menü<span>5 yuva</span></h3><p class="ka-nav-hint">Ekranın altındaki beş düğmeyi seçin. Her yuvaya bir menü ya da tek bir sayfa koyabilirsiniz. “Ben” alt menüde kalmalıdır; menü düzenine oradan ulaşırsınız.</p>${H.rowCard(slots)}</div>`
    +`<div class="ka-nav-section"><h3>Menülerim<span>${L.menus.length}</span></h3>${H.rowCard(menus||H.emptyState('Henüz menü yok.'))}<button type="button" class="ka-btn ka-btn--primary ka-ne-wide" data-ne="menu-new">${H.ic('plus',18)}<span>Yeni menü oluştur</span></button></div>`
    +(orphan?`<p class="ka-nav-hint">${orphan} sayfa hiçbir menüde yok. Bunlara Araçlar › Tüm sayfalar listesinden ya da arama ile ulaşırsınız.</p>`:'')
    +(L.custom?`<button type="button" class="ka-btn ka-btn--secondary ka-ne-wide" data-ne="reset">${H.ic('swap',18)}<span>Varsayılan düzene dön</span></button>`:`<p class="ka-nav-hint">Şu an varsayılan düzeni kullanıyorsunuz.</p>`));
}

/* ── Bir menüyü düzenle ── */
function menuHtml(id){
  const L=read(),m=L.menus.find(x=>x.id===id),H=h();
  if(!m)return null;
  const icons=nav().MENU_ICONS.map(n=>`<button type="button" class="ka-ne-chip${m.icon===n?' is-on':''}" data-ne="menu-icon" data-v="${n}" aria-pressed="${m.icon===n}" aria-label="Simge: ${n}">${H.ic(n,20)}</button>`).join('');
  const tones=nav().MENU_TONES.map(n=>`<button type="button" class="ka-ne-swatch${m.tone===n?' is-on':''}" data-ne="menu-tone" data-v="${n}" aria-pressed="${m.tone===n}" aria-label="Renk: ${TONE_NAMES[n]}"><span class="ka-nav-ico" data-tone="${n}" data-size="30"></span></button>`).join('');
  const rows=m.ids.map((tid,i)=>{
    const t=nav().tool(tid);
    if(!t)return '';
    const closed=!nav().toolAllowed(t);
    return `<div class="ka-ne-row">${H.gico(t.glyph,t.tone,40)}<span class="ka-ne-copy"><strong>${esc(t.label)}</strong><small>${closed?'Bu hesapta açık değil':esc(t.sub||'')}</small></span><span class="ka-ne-acts">${ibtn('item-move','chevu','Yukarı al',i===0,`data-i="${i}" data-d="-1"`)}${ibtn('item-move','chevd','Aşağı al',i===m.ids.length-1,`data-i="${i}" data-d="1"`)}${ibtn('item-del','x','Menüden çıkar',false,`data-id="${esc(tid)}"`)}</span></div>`;
  }).join('');
  return H.pageRoot(`menu-edit:${m.id}`,H.head(m.ad,'Adı, simgesi, rengi ve sayfaları')
    +`<article class="ka-ne-card"><label class="ka-ne-label" for="neName">Menü adı</label><input id="neName" class="ka-ne-input" type="text" maxlength="${nav().MENU_NAME_MAX}" value="${esc(m.ad)}" data-ne-name autocomplete="off"><span class="ka-ne-label">Simge</span><div class="ka-ne-chips">${icons}</div><span class="ka-ne-label">Renk</span><div class="ka-ne-chips">${tones}</div></article>`
    +`<div class="ka-nav-section"><h3>Sayfalar<span>${m.ids.length}</span></h3>${H.rowCard(rows||H.emptyState('Bu menüde sayfa yok. Aşağıdan sayfa ekleyin.'))}<button type="button" class="ka-btn ka-btn--primary ka-ne-wide" data-nav-page-go="menu-add:${esc(m.id)}">${H.ic('plus',18)}<span>Sayfa ekle</span></button></div>`
    +`<button type="button" class="ka-btn ka-btn--secondary ka-ne-wide ka-ne-danger" data-ne="menu-del" data-id="${esc(m.id)}">${H.ic('x',18)}<span>Menüyü sil</span></button>`);
}

/* ── Menüye sayfa ekle (işaretlenen anında eklenir, kaldırılır) ── */
function addHtml(id){
  const L=read(),m=L.menus.find(x=>x.id===id),H=h();
  if(!m)return null;
  const have=new Set(m.ids);
  const rows=nav().allTools().map((t,i)=>`<label class="ka-ne-check${i===0?' is-first':''}" data-ne-hay="${esc(fold(`${t.label} ${t.sub}`))}"><input type="checkbox" data-ne-add="${esc(t.id)}"${have.has(t.id)?' checked':''}>${H.gico(t.glyph,t.tone,40)}<span class="ka-ne-copy"><strong>${esc(t.label)}</strong><small>${esc(t.sub||'')}</small></span></label>`).join('');
  return H.pageRoot(`menu-add:${m.id}`,H.head('Sayfa ekle',`${m.ad} menüsü`)+filterBox('Sayfa ara')
    +`<p class="ka-nav-hint"><b data-ne-count>${m.ids.length}</b> sayfa seçili. İşaretlediğiniz sayfa menüye hemen eklenir, işareti kaldırırsanız çıkar.</p>`
    +`<div class="ka-nav-rowcard" data-ne-list>${rows}</div><button type="button" class="ka-btn ka-btn--primary ka-ne-wide" data-ne="back">Bitti</button>`);
}

/* ── Alt menü yuvası seç ── */
function pickHtml(slot){
  const L=read(),H=h();
  if(!(slot>=0&&slot<L.bar.length))return null;
  const cur=L.bar[slot];
  const opt=(key,i)=>{
    const d=describe(key,L);
    return `<button type="button" class="ka-nav-row ka-nav-row__main${i===0?' is-first':''}${key===cur?' is-on':''}" data-ne="pick" data-key="${esc(key)}" data-slot="${slot}">${H.ico(d.icon,d.tone,40,20)}<span class="ka-nav-row__copy"><strong>${esc(d.label)}</strong><small>${esc(d.hint||d.kind)}</small></span>${key===cur?`<span class="ka-ne-tick" aria-label="Şu an seçili">${H.ic('check',20,2.4)}</span>`:''}</button>`;
  };
  const fixed=['home','program','tools','me'].map(opt).join('');
  const menus=L.menus.map((m,i)=>opt(`menu:${m.id}`,i)).join('');
  const tools=nav().allTools().map((t,i)=>`<div data-ne-hay="${esc(fold(`${t.label} ${t.sub}`))}">${opt(`tool:${t.id}`,i)}</div>`).join('');
  return H.pageRoot(`bar-pick:${slot}`,H.head(`${slot+1}. yuva`,slot===2?'Ortadaki vurgulu düğme':'Alt menüde bu yuvada ne görünsün?')
    +`<div class="ka-nav-section"><h3>Sayfalar</h3>${H.rowCard(fixed)}</div>`
    +(menus?`<div class="ka-nav-section"><h3>Menülerim</h3>${H.rowCard(menus)}</div>`:'')
    +`<div class="ka-nav-section"><h3>Tek sayfa</h3>${filterBox('Sayfa ara')}<div class="ka-nav-rowcard" data-ne-list>${tools}</div></div>`);
}

/* ── eylemler ── */
function mutate(fn,{silent=false}={}){
  const L=read();
  if(fn(L)===false)return false;
  nav().saveLayout(L,role(),{silent});
  return true;
}
function pick(slot,key){
  const L=read(),prev=L.bar[slot];
  if(prev===key){ui()?.back?.();return}
  const j=L.bar.indexOf(key);
  if(prev==='me'&&j<0){toast('Ben sayfası alt menüde kalmalı; menü düzenine oradan ulaşırsınız.');return}
  if(j>=0)L.bar[j]=prev;
  L.bar[slot]=key;
  nav().saveLayout(L,role());
  ui()?.back?.();
}
function currentMenuId(){const id=pages().current();return id.includes(':')?id.slice(id.indexOf(':')+1):''}
function onClick(e){
  const root=$('#v2ModuleRoot'),btn=e.target.closest?.('[data-ne]');
  if(!btn||!root||!root.contains(btn)||!$('[data-nav-page]',root))return;
  e.preventDefault();
  const act=btn.dataset.ne,id=currentMenuId(),d=Number(btn.dataset.d)||0,i=Number(btn.dataset.i);
  if(act==='slot-move')mutate(L=>swap(L.bar,i,d));
  else if(act==='menu-move')mutate(L=>swap(L.menus,i,d));
  else if(act==='item-move')mutate(L=>{const m=L.menus.find(x=>x.id===id);return m?swap(m.ids,i,d):false});
  else if(act==='item-del')mutate(L=>{const m=L.menus.find(x=>x.id===id);if(!m)return false;m.ids=m.ids.filter(x=>x!==btn.dataset.id)});
  else if(act==='menu-icon')mutate(L=>{const m=L.menus.find(x=>x.id===id);if(!m)return false;m.icon=btn.dataset.v});
  else if(act==='menu-tone')mutate(L=>{const m=L.menus.find(x=>x.id===id);if(!m)return false;m.tone=btn.dataset.v});
  else if(act==='menu-new'){
    const nid=newId();
    if(read().menus.length>=nav().MENU_MAX){toast(`En çok ${nav().MENU_MAX} menü oluşturabilirsiniz.`);return}
    if(mutate(L=>{L.menus.push({id:nid,ad:'Yeni menü',icon:'grid',tone:'slate',ids:[]})}))ui()?.openPage?.(`menu-edit:${nid}`);
  }
  else if(act==='menu-del'){
    const m=read().menus.find(x=>x.id===id);
    if(m&&global.confirm?.(`“${m.ad}” menüsü silinsin mi? İçindeki sayfalar silinmez, yalnız bu menüden kalkar.`)){
      if(mutate(L=>{L.menus=L.menus.filter(x=>x.id!==id)}))ui()?.back?.();
    }
  }
  else if(act==='reset'){
    if(global.confirm?.('Alt menü, menüler ve sık kullandıklarınız varsayılan düzene dönsün mü?'))nav().resetLayout(role());
  }
  else if(act==='pick')pick(Number(btn.dataset.slot),btn.dataset.key);
  else if(act==='back')ui()?.back?.();
}
function onChange(e){
  const root=$('#v2ModuleRoot');
  if(!root||!root.contains(e.target)||!$('[data-nav-page]',root))return;
  const name=e.target.closest?.('[data-ne-name]');
  if(name){
    const v=name.value.trim().slice(0,nav().MENU_NAME_MAX),id=currentMenuId();
    if(!v){toast('Menü adı boş olamaz.');name.value=read().menus.find(x=>x.id===id)?.ad||'';return}
    mutate(L=>{const m=L.menus.find(x=>x.id===id);if(!m||m.ad===v)return false;m.ad=v});
    return;
  }
  const add=e.target.closest?.('[data-ne-add]');
  if(add){
    const id=currentMenuId(),tid=add.dataset.neAdd;
    mutate(L=>{
      const m=L.menus.find(x=>x.id===id);
      if(!m)return false;
      if(add.checked){if(!m.ids.includes(tid))m.ids.push(tid)}else m.ids=m.ids.filter(x=>x!==tid);
    },{silent:true});
    const n=$('[data-ne-count]',root);
    if(n)n.textContent=String(read().menus.find(x=>x.id===id)?.ids.length||0);
  }
}
function onInput(e){
  const f=e.target.closest?.('[data-ne-filter]');
  if(!f)return;
  const q=fold(f.value),root=$('#v2ModuleRoot');
  $$('[data-ne-hay]',root).forEach(el=>{el.hidden=!!q&&!el.dataset.neHay.includes(q)});
}

pages().register('menu-edit',{
  info:arg=>arg?{id:`menu-edit:${arg}`,tab:'me',title:'Menüyü düzenle',parent:'menu-edit'}:{id:'menu-edit',tab:'me',title:'Menüyü düzenle',parent:'me'},
  html:arg=>arg?menuHtml(arg):homeHtml()
});
pages().register('bar-pick',{
  info:arg=>({id:`bar-pick:${arg}`,tab:'me',title:`${Number(arg)+1}. yuva`,parent:'menu-edit'}),
  html:arg=>pickHtml(Number(arg))
});
pages().register('menu-add',{
  info:arg=>({id:`menu-add:${arg}`,tab:'me',title:'Sayfa ekle',parent:`menu-edit:${arg}`}),
  html:arg=>addHtml(arg)
});
document.addEventListener('click',onClick);
document.addEventListener('change',onChange);
document.addEventListener('input',onInput);
global.NavEditor={describe};
})(window);
