/* Koruk Asistan — merkezi ShellUI menü özelleştirme katmanı.
 * Yeni router/veri katmanı kurmaz; ShellUI.MENU_GROUPS + AppConfig kullanır.
 */
(function(global){
'use strict';
if(global.MenuCustomizer)return;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const clone=v=>JSON.parse(JSON.stringify(v));
const canEdit=()=>global.AKTIF_KULLANICI?.admin===true||global.AppStore?.get?.('session.user')?.admin===true||global.PermissionService?.can?.('settings.app.edit','edit')===true;
const appRow=()=>global.AppStore?.data?.('appConfig')?.find?.(x=>x.id==='uygulama')||{};
let defaults=[],observer=null,patched=false,modal=null;
const groupKey=g=>String(g?.key||'').trim();
const itemKey=(g,item)=>`${groupKey(g)}:${String(item?.[2]||'')}:${String(item?.[3]||'root')}`;
function layout(){const v=appRow()?.menuLayout;return v&&typeof v==='object'?v:{groups:{}}}
function groupSettings(key){return layout()?.groups?.[key]||{}}
function itemSettings(g,item){return groupSettings(groupKey(g))?.items?.[itemKey(g,item)]||{}}
function normalizeOrder(v,fallback){const n=Number(v);return Number.isFinite(n)?n:fallback}
function buildItem(g,item,index){const s=itemSettings(g,item),x=[...item];x[0]=String(s.label||item[0]||'');x[1]=String(s.icon||item[1]||'');x.__menuKey=itemKey(g,item);x.__menuColor=String(s.color||'');x.__menuOrder=normalizeOrder(s.order,(index+1)*10);x.__menuVisible=s.visible!==false;return x}
function apply(){
 if(!global.ShellUI?.MENU_GROUPS||!defaults.length)return false;
 const target=global.ShellUI.MENU_GROUPS,conf=layout()?.groups||{};
 const next=defaults.map((base,gi)=>{
   const s=conf[base.key]||{},g={...clone(base)};
   g.label=String(s.label||base.label||'');g.icon=String(s.icon||base.icon||'');g.__menuColor=String(s.color||'');g.__menuOrder=normalizeOrder(s.order,(gi+1)*10);g.__menuVisible=s.visible!==false;
   g.items=(base.items||[]).map((it,i)=>buildItem(base,it,i)).filter(x=>x.__menuVisible).sort((a,b)=>a.__menuOrder-b.__menuOrder);
   g.subItems=(base.subItems||[]).map((it,i)=>buildItem(base,it,(base.items||[]).length+i)).filter(x=>x.__menuVisible).sort((a,b)=>a.__menuOrder-b.__menuOrder);
   if(!g.__menuVisible){g.items=[];g.subItems=[]}
   return g;
 }).sort((a,b)=>a.__menuOrder-b.__menuOrder);
 target.splice(0,target.length,...next);decorateSoon();return true;
}
function patchAppConfig(){
 if(patched||!global.AppConfig?.save||!global.AppConfig?.get)return;patched=true;
 const oldGet=global.AppConfig.get.bind(global.AppConfig),oldSave=global.AppConfig.save.bind(global.AppConfig);
 global.AppConfig.get=()=>({...oldGet(),menuLayout:clone(appRow()?.menuLayout||{groups:{}})});
 global.AppConfig.save=patch=>{const p={...(patch||{})};if(!Object.prototype.hasOwnProperty.call(p,'menuLayout')&&appRow()?.menuLayout)p.menuLayout=clone(appRow().menuLayout);return oldSave(p)};
}
function activeGroup(){const h=$('#kaMenuLayer .ka-menu-head h2');if(!h)return null;const txt=String(h.textContent||'').trim();return global.ShellUI?.MENU_GROUPS?.find?.(g=>String(g.label||'').trim()===txt)||null}
function decorate(){
 const layer=$('#kaMenuLayer');if(!layer)return;
 $$('.ka-menu-card[data-ka-menu-group]',layer).forEach(card=>{const g=global.ShellUI.MENU_GROUPS.find(x=>x.key===card.dataset.kaMenuGroup);if(g?.__menuColor)card.style.background=`linear-gradient(145deg,${g.__menuColor},color-mix(in srgb,${g.__menuColor} 72%,#000))`;else card.style.removeProperty('background')});
 const g=activeGroup();if(g){const items=[...(g.items||[]),...(g.subItems||[])],rows=$$('[data-ka-shell-route]',layer);rows.forEach((row,i)=>{const it=items[i];if(!it)return;row.dataset.menuCustomKey=it.__menuKey||'';if(it.__menuColor)row.style.borderInlineStart=`4px solid ${it.__menuColor}`;else row.style.removeProperty('border-inline-start')})}
 if(canEdit()&&!layer.querySelector('[data-menu-customize]')){const head=layer.querySelector('.ka-menu-head');if(head){const b=document.createElement('button');b.type='button';b.className='ka-btn ka-btn--secondary ka-btn--sm';b.dataset.menuCustomize='';b.textContent='⚙ Özelleştir';b.addEventListener('click',e=>{e.stopPropagation();openEditor()});head.appendChild(b)}}
}
function decorateSoon(){requestAnimationFrame(()=>requestAnimationFrame(decorate))}
function rowEditor(g,item,index){const s=itemSettings(g,item),key=itemKey(g,item);return `<div class="ka-card"><div class="ka-card__body ka-stack" data-menu-item-row="${esc(key)}"><div class="ka-row ka-row--between"><strong>${esc(item[0])}</strong><label class="ka-check"><input type="checkbox" data-menu-visible ${s.visible!==false?'checked':''}><span>Göster</span></label></div><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Ad</span><input data-menu-label value="${esc(s.label||item[0])}"></label><label class="ka-field"><span class="ka-field__label">İkon</span><input data-menu-icon value="${esc(s.icon||item[1])}" maxlength="8"></label><label class="ka-field"><span class="ka-field__label">Renk</span><input type="color" data-menu-color value="${esc(s.color||'#20ad8b')}"></label><label class="ka-field"><span class="ka-field__label">Sıra</span><input type="number" data-menu-order min="1" step="1" value="${normalizeOrder(s.order,(index+1)*10)}"></label></div></div></div>`}
function groupEditor(g,index){const s=groupSettings(g.key),items=[...(g.items||[]),...(g.subItems||[])];return `<details class="ka-card" ${index===0?'open':''} data-menu-group-row="${esc(g.key)}"><summary class="ka-card__header" style="cursor:pointer"><div class="ka-row ka-row--between"><strong>${esc(g.icon)} ${esc(g.label)}</strong><span class="ka-badge">${items.length}</span></div></summary><div class="ka-card__body ka-stack"><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Menü adı</span><input data-group-label value="${esc(s.label||g.label)}"></label><label class="ka-field"><span class="ka-field__label">İkon</span><input data-group-icon value="${esc(s.icon||g.icon)}" maxlength="8"></label><label class="ka-field"><span class="ka-field__label">Kart rengi</span><input type="color" data-group-color value="${esc(s.color||'#20ad8b')}"></label><label class="ka-field"><span class="ka-field__label">Sıra</span><input type="number" data-group-order min="1" step="1" value="${normalizeOrder(s.order,(index+1)*10)}"></label></div><label class="ka-check"><input type="checkbox" data-group-visible ${s.visible!==false?'checked':''}><span>Bu ana menüyü göster</span></label><h4>Menü öğeleri</h4>${items.map((it,i)=>rowEditor(g,it,i)).join('')}</div></details>`}
function closeEditor(){modal?.remove();modal=null;document.body.classList.remove('ka-layer-open')}
function collect(){const groups={};$$('[data-menu-group-row]',modal).forEach((el,gi)=>{const key=el.dataset.menuGroupRow,items={};$$('[data-menu-item-row]',el).forEach((row,ii)=>{items[row.dataset.menuItemRow]={label:row.querySelector('[data-menu-label]')?.value.trim()||'',icon:row.querySelector('[data-menu-icon]')?.value.trim()||'',color:row.querySelector('[data-menu-color]')?.value||'',visible:!!row.querySelector('[data-menu-visible]')?.checked,order:normalizeOrder(row.querySelector('[data-menu-order]')?.value,(ii+1)*10)}});groups[key]={label:el.querySelector('[data-group-label]')?.value.trim()||'',icon:el.querySelector('[data-group-icon]')?.value.trim()||'',color:el.querySelector('[data-group-color]')?.value||'',visible:!!el.querySelector('[data-group-visible]')?.checked,order:normalizeOrder(el.querySelector('[data-group-order]')?.value,(gi+1)*10),items}});return{groups}}
async function saveEditor(){if(!canEdit())return;const btn=modal?.querySelector('[data-menu-save]');if(btn){btn.disabled=true;btn.textContent='Kaydediliyor…'}try{await global.AppConfig.save({menuLayout:collect()});apply();closeEditor();global.ShellUI?.renderMenuGrid?.();decorateSoon();global.toast?.('Menü düzeni kaydedildi.')}catch(e){console.error('[MenuCustomizer/save]',e);global.toast?.(e?.message==='yetkisiz'?'Bu işlem için yetkiniz yok.':'Menü düzeni kaydedilemedi.')}finally{if(btn){btn.disabled=false;btn.textContent='Kaydet'}}}
async function resetEditor(){if(!canEdit()||!confirm('Menü adları, ikonları, renkleri, görünürlüğü ve sırası varsayılan değerlere dönsün mü?'))return;try{await global.AppConfig.save({menuLayout:{groups:{}}});apply();closeEditor();global.ShellUI?.renderMenuGrid?.();decorateSoon();global.toast?.('Menü varsayılan düzene döndürüldü.')}catch(e){console.error('[MenuCustomizer/reset]',e);global.toast?.('Menü sıfırlanamadı.')}}
function openEditor(){if(!canEdit())return;closeEditor();modal=document.createElement('div');modal.className='ka-modal-backdrop';modal.dataset.menuCustomizeModal='';modal.innerHTML=`<section class="ka-modal" style="width:min(760px,100%);max-height:92dvh"><div class="ka-modal__header"><div><h3>Menüyü Özelleştir</h3><p class="ka-muted">Ana menüler ve alt öğeler: ad, ikon, renk, görünürlük ve sıra.</p></div><button type="button" class="ka-icon-button" data-menu-close aria-label="Kapat">×</button></div><div class="ka-modal__body ka-stack">${defaults.map(groupEditor).join('')}</div><div class="ka-modal__footer"><button type="button" class="ka-btn ka-btn--ghost" data-menu-reset>Varsayılana Dön</button><button type="button" class="ka-btn ka-btn--secondary" data-menu-close>İptal</button><button type="button" class="ka-btn" data-menu-save>Kaydet</button></div></section>`;document.body.appendChild(modal);document.body.classList.add('ka-layer-open');$$('[data-menu-close]',modal).forEach(b=>b.addEventListener('click',closeEditor));modal.querySelector('[data-menu-save]')?.addEventListener('click',saveEditor);modal.querySelector('[data-menu-reset]')?.addEventListener('click',resetEditor)}
function bind(){if(!global.ShellUI?.MENU_GROUPS||!global.AppConfig){setTimeout(bind,80);return}defaults=clone(global.ShellUI.MENU_GROUPS);patchAppConfig();apply();const layer=$('#kaMenuLayer');if(layer){observer=new MutationObserver(decorateSoon);observer.observe(layer,{childList:true,subtree:true})}global.addEventListener('koruk:app-config-changed',apply);global.AppStore?.subscribe?.('data.appConfig',apply);decorateSoon()}
global.MenuCustomizer={apply,openEditor,closeEditor,get layout(){return clone(layout())},get defaults(){return clone(defaults)}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})(window);
