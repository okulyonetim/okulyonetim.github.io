from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: expected source not found')
    return text.replace(old, new, 1)


# 1) AppConfig must preserve the real classic-menu customization payload.
p = Path('js/app-loader.js')
text = p.read_text(encoding='utf-8')
text = replace_once(
    text,
    "function appConfig(){const r=rawConfig();return{defaultModule:r.defaultModule||'dashboard',modules:mergeRows(MODULE_DEFAULTS,r.modules),dashboardCards:mergeRows(DASHBOARD_DEFAULTS,r.dashboardCards)}}",
    "function appConfig(){const r=rawConfig(),menuLayout=r.menuLayout&&typeof r.menuLayout==='object'?r.menuLayout:{groups:{}};return{defaultModule:r.defaultModule||'dashboard',modules:mergeRows(MODULE_DEFAULTS,r.modules),dashboardCards:mergeRows(DASHBOARD_DEFAULTS,r.dashboardCards),menuLayout}}",
    'appConfig menuLayout'
)
text = replace_once(
    text,
    "const resetConfig=()=>saveConfig({defaultModule:'dashboard',modules:MODULE_DEFAULTS,dashboardCards:DASHBOARD_DEFAULTS});",
    "const resetConfig=()=>saveConfig({defaultModule:'dashboard',modules:MODULE_DEFAULTS,dashboardCards:DASHBOARD_DEFAULTS,menuLayout:{groups:{}}});",
    'reset menuLayout'
)
p.write_text(text, encoding='utf-8')


# 2) ShellUI renders the classic menu from AppConfig.menuLayout directly.
p = Path('js/core/shell-ui.js')
text = p.read_text(encoding='utf-8')
start = text.find('function visibleItems(g){')
end = text.find('function openMenu(){', start)
if start < 0 or end < 0:
    raise SystemExit('ShellUI menu render block not found')
block = r'''function menuLayoutConfig(){const v=global.AppConfig?.get?.()?.menuLayout;return v&&typeof v==='object'?v:{groups:{}}}
function validMenuColor(v){v=String(v||'').trim();return /^#[0-9a-f]{6}$/i.test(v)?v:''}
function menuItemKey(g,item){return `${String(g?.key||'')}:${String(item?.[2]||'')}:${String(item?.[3]||'root')}:${String(item?.[0]||'')}`}
function legacyMenuItemKey(g,item){return `${String(g?.key||'')}:${String(item?.[2]||'')}:${String(item?.[3]||'root')}`}
function menuItemView(g,item,index,groupSettings){const items=groupSettings?.items||{},s=items[menuItemKey(g,item)]||items[legacyMenuItemKey(g,item)]||{},x=[...item],order=Number(s.order);x[0]=String(s.label||item?.[0]||'');x[1]=String(s.icon||item?.[1]||'');x.__menuColor=validMenuColor(s.color);x.__menuVisible=s.visible!==false;x.__menuOrder=Number.isFinite(order)?order:(index+1)*10;return x}
function menuGroupView(g,index){const s=menuLayoutConfig()?.groups?.[g.key]||{},order=Number(s.order),x={...g};x.label=String(s.label||g.label||'');x.icon=String(s.icon||g.icon||'');x.__menuColor=validMenuColor(s.color);x.__menuVisible=s.visible!==false;x.__menuOrder=Number.isFinite(order)?order:(index+1)*10;x.items=(g.items||[]).map((item,i)=>menuItemView(g,item,i,s)).filter(item=>item.__menuVisible).sort((a,b)=>a.__menuOrder-b.__menuOrder);x.subItems=(g.subItems||[]).map((item,i)=>menuItemView(g,item,(g.items||[]).length+i,s)).filter(item=>item.__menuVisible).sort((a,b)=>a.__menuOrder-b.__menuOrder);return x}
function visibleItems(g){return(g.items||[]).filter(itemAllowed).concat((g.subItems||[]).filter(itemAllowed))}
function visibleGroups(){return MENU_GROUPS.map(menuGroupView).filter(g=>g.hidden!==true&&g.__menuVisible!==false&&visibleItems(g).length).sort((a,b)=>a.__menuOrder-b.__menuOrder)}
function menuCount(g){return visibleItems(g).length}
function menuGroupAttrs(g){return g.__menuColor?` data-menu-custom-color="true" style="--ka-menu-custom:${g.__menuColor}"`:''}
function menuItemAttrs(item){return item.__menuColor?` data-menu-custom-color="true" style="--ka-menu-item-custom:${item.__menuColor}"`:''}
function renderMenuGrid(){const layer=$('#kaMenuLayer');if(!layer)return;menuGroup=null;const cards=visibleGroups();layer.innerHTML=`<div class="ka-menu-page"><div class="ka-menu-head"><h2>Menü</h2><button class="ka-icon-button" type="button" data-ka-menu-close aria-label="Kapat">${SVG.close}</button></div><div class="ka-menu-grid">${cards.map(g=>`<button class="ka-menu-card ka-menu-card--${g.tone}" type="button" data-ka-menu-group="${g.key}"${menuGroupAttrs(g)}><span class="ka-menu-card__icon">${g.icon}</span><strong>${esc(g.label)}</strong><span class="ka-badge">${menuCount(g)}</span></button>`).join('')}</div></div>`;layer.querySelector('[data-ka-menu-close]')?.addEventListener('click',closeMenu);layer.querySelectorAll('[data-ka-menu-group]').forEach(b=>b.addEventListener('click',()=>renderMenuList(b.dataset.kaMenuGroup)))}
function listRow(item){return `<button type="button" class="ka-btn ka-btn--secondary" data-ka-shell-route="${item[2]}" data-ka-shell-page="${item[3]||''}" data-ka-shell-title="${esc(item[0])}"${menuItemAttrs(item)}><span class="ka-avatar">${item[1]}</span><span class="ka-grow"><strong>${esc(item[0])}</strong></span><span>${SVG.chevron}</span></button>`}
function renderMenuList(key){const layer=$('#kaMenuLayer'),g=visibleGroups().find(x=>x.key===key);if(!layer||!g)return;menuGroup=key;const main=(g.items||[]).filter(itemAllowed),sub=(g.subItems||[]).filter(itemAllowed);layer.innerHTML=`<div class="ka-menu-page"><div class="ka-menu-head"><button class="ka-icon-button" type="button" data-ka-menu-back aria-label="Geri">${SVG.back}</button><h2>${esc(g.label)}</h2><button class="ka-icon-button" type="button" data-ka-menu-close aria-label="Kapat">${SVG.close}</button></div><div class="ka-menu-list ka-stack">${main.map(listRow).join('')}${sub.length?`<h3>${esc(g.subLabel||'Diğer')}</h3>${sub.map(listRow).join('')}`:''}</div></div>`;layer.querySelector('[data-ka-menu-back]')?.addEventListener('click',renderMenuGrid);layer.querySelector('[data-ka-menu-close]')?.addEventListener('click',closeMenu);bindMenuRoutes(layer)}
'''
text = text[:start] + block + text[end:]
p.write_text(text, encoding='utf-8')


# 3) Settings gets a real classic-menu editor instead of only route/module metadata.
p = Path('js/modules/settings.js')
text = p.read_text(encoding='utf-8')
start = text.find('function moduleEditorRow(m){')
end = text.find('function moveRow(button,dir){', start)
if start < 0 or end < 0:
    raise SystemExit('Settings app editor block not found')
block = r'''const MENU_COLOR_DEFAULTS={people:'#19876a',exams:'#3389d7',communication:'#cb6657',programs:'#b89a24',calendar:'#3396ae',transport:'#735faf',documents:'#d89137',management:'#398047',settings:'#687784'};
function menuLayoutConfig(){const v=window.AppConfig?.get?.()?.menuLayout;return v&&typeof v==='object'?v:{groups:{}}}
function menuItemKey(g,item){return `${String(g?.key||'')}:${String(item?.[2]||'')}:${String(item?.[3]||'root')}:${String(item?.[0]||'')}`}
function legacyMenuItemKey(g,item){return `${String(g?.key||'')}:${String(item?.[2]||'')}:${String(item?.[3]||'root')}`}
function menuGroupSetting(g){return menuLayoutConfig()?.groups?.[g.key]||{}}
function menuItemSetting(g,item){const items=menuGroupSetting(g)?.items||{};return items[menuItemKey(g,item)]||items[legacyMenuItemKey(g,item)]||{}}
function menuColorValue(v,fallback){v=String(v||'').trim();return /^#[0-9a-f]{6}$/i.test(v)?v:fallback}
function menuEditorItem(g,item,index){const s=menuItemSetting(g,item),fallback=menuColorValue(menuGroupSetting(g)?.color,MENU_COLOR_DEFAULTS[g.key]||'#17684f'),order=Number(s.order);return `<article class="ka-settings-menu-item" data-menu-item-row="${esc(menuItemKey(g,item))}"><div class="ka-row ka-row--between"><div class="ka-grow"><strong>${esc(item[0])}</strong><small class="ka-muted">${esc(item[2]||'')}${item[3]?` / ${esc(item[3])}`:''}</small></div><label class="ka-check"><input type="checkbox" data-menu-item-visible ${s.visible!==false?'checked':''}> Göster</label></div><div class="ka-settings-menu-fields"><label class="ka-field"><span class="ka-field__label">Ad</span><input data-menu-item-label value="${esc(s.label||item[0])}"></label><label class="ka-field"><span class="ka-field__label">İkon</span><input data-menu-item-icon value="${esc(s.icon||item[1]||'')}" maxlength="8"></label><label class="ka-field ka-settings-color-field"><span class="ka-field__label">Renk</span><input type="color" data-menu-item-color value="${esc(menuColorValue(s.color,fallback))}"></label><label class="ka-field"><span class="ka-field__label">Sıra</span><input type="number" min="1" step="1" data-menu-item-order value="${Number.isFinite(order)?order:(index+1)*10}"></label></div></article>`}
function menuEditorGroup(g,index){const s=menuGroupSetting(g),items=[...(g.items||[]),...(g.subItems||[])],order=Number(s.order),color=menuColorValue(s.color,MENU_COLOR_DEFAULTS[g.key]||'#17684f');return `<details class="ka-card ka-settings-menu-group" data-menu-group-row="${esc(g.key)}" ${index===0?'open':''}><summary class="ka-card__header"><div class="ka-row ka-row--between"><div class="ka-row"><span class="ka-settings-menu-swatch" style="--ka-settings-menu-color:${color}"></span><div><strong>${esc(g.icon)} ${esc(g.label)}</strong><small class="ka-muted">${items.length} öğe</small></div></div><span aria-hidden="true">⌄</span></div></summary><div class="ka-card__body ka-stack"><label class="ka-check"><input type="checkbox" data-menu-group-visible ${s.visible!==false?'checked':''}> Bu ana menüyü göster</label><div class="ka-settings-menu-fields"><label class="ka-field"><span class="ka-field__label">Menü adı</span><input data-menu-group-label value="${esc(s.label||g.label)}"></label><label class="ka-field"><span class="ka-field__label">İkon</span><input data-menu-group-icon value="${esc(s.icon||g.icon||'')}" maxlength="8"></label><label class="ka-field ka-settings-color-field"><span class="ka-field__label">Kart rengi</span><input type="color" data-menu-group-color value="${esc(color)}"></label><label class="ka-field"><span class="ka-field__label">Sıra</span><input type="number" min="1" step="1" data-menu-group-order value="${Number.isFinite(order)?order:(index+1)*10}"></label></div><div class="ka-stack"><h4>Alt menü öğeleri</h4>${items.map((item,i)=>menuEditorItem(g,item,i)).join('')}</div></div></details>`}
function menuLayoutEditor(){const groups=window.AppConfig?.CLASSIC_MENU_GROUPS||[];return groups.length?groups.map(menuEditorGroup).join(''):'<div class="ka-empty">Ana menü kataloğu hazırlanıyor.</div>'}
function moduleEditorRow(m){return `<article class="ka-card" data-app-module-row="${esc(m.key)}"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><strong>${esc(m.key)}</strong><label class="ka-check"><input type="checkbox" data-app-visible ${m.visible!==false?'checked':''}> Modülü etkin tut</label></div><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Modül adı</span><input data-app-label value="${esc(m.label)}"></label><label class="ka-field"><span class="ka-field__label">Modül ikonu</span><input data-app-icon value="${esc(m.icon||'')}" maxlength="8"></label></div><div class="ka-row"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-move-up>↑ Yukarı</button><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-move-down>↓ Aşağı</button></div></div></article>`}
function dashboardEditorRow(c){return `<article class="ka-card" data-dashboard-card-row="${esc(c.key)}"><div class="ka-card__body ka-row"><div class="ka-grow"><strong>${esc(c.label)}</strong><div class="ka-muted">${esc(c.key)}</div></div><label class="ka-check"><input type="checkbox" data-card-visible ${c.visible!==false?'checked':''}> Göster</label><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-move-up>↑</button><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-move-down>↓</button></div></article>`}
function appLayout(){const cfg=window.AppConfig?.get?.();if(!cfg)return'<div class="ka-empty">Uygulama konfigürasyonu hazırlanıyor.</div>';const opts=cfg.modules.map(m=>`<option value="${esc(m.key)}" ${m.key===cfg.defaultModule?'selected':''}>${esc(m.label)}</option>`).join('');return `<article class="ka-card"><div class="ka-card__body ka-stack"><div><strong>Merkezi Uygulama Düzeni</strong><div class="ka-muted">Ana menü kartlarının adını, ikonunu, rengini, görünürlüğünü ve sırasını burada değiştirin. Değişiklikler kaydedildiği anda ana menüye uygulanır.</div></div><label class="ka-field"><span class="ka-field__label">Varsayılan açılış sayfası</span><select id="appDefaultModule">${opts}</select></label></div></article><section class="ka-stack"><div><h3>Ana Menü Kartları</h3><div class="ka-muted">Kart ve alt menü özelleştirmeleri</div></div><div id="appClassicMenuEditor" class="ka-stack">${menuLayoutEditor()}</div></section><section class="ka-stack"><h3>Modül Erişimi</h3><div id="appModuleEditor" class="ka-stack">${cfg.modules.map(moduleEditorRow).join('')}</div></section><section class="ka-stack"><h3>Dashboard Kartları</h3><div id="dashboardCardEditor" class="ka-stack">${cfg.dashboardCards.map(dashboardEditorRow).join('')}</div></section><div class="ka-row"><button class="ka-btn ka-btn--secondary" type="button" data-app-reset data-ka-permission="settings.app.edit" data-ka-write="settings.app.edit">Varsayılana Dön</button><button class="ka-btn" type="button" data-app-save data-ka-permission="settings.app.edit" data-ka-write="settings.app.edit">Uygulama Düzenini Kaydet</button></div>`}
'''
text = text[:start] + block + text[end:]
start = text.find('function readAppConfigFromDom(){')
end = text.find('async function saveAppLayout(){', start)
if start < 0 or end < 0:
    raise SystemExit('Settings readAppConfig block not found')
block = r'''function readMenuLayoutFromDom(){const groups={};[...document.querySelectorAll('[data-menu-group-row]')].forEach((row,gi)=>{const key=row.dataset.menuGroupRow,items={};[...row.querySelectorAll('[data-menu-item-row]')].forEach((item,ii)=>{const order=Number(item.querySelector('[data-menu-item-order]')?.value);items[item.dataset.menuItemRow]={label:item.querySelector('[data-menu-item-label]')?.value.trim()||'',icon:item.querySelector('[data-menu-item-icon]')?.value.trim()||'',color:menuColorValue(item.querySelector('[data-menu-item-color]')?.value,''),visible:!!item.querySelector('[data-menu-item-visible]')?.checked,order:Number.isFinite(order)?order:(ii+1)*10}});const order=Number(row.querySelector('[data-menu-group-order]')?.value);groups[key]={label:row.querySelector('[data-menu-group-label]')?.value.trim()||key,icon:row.querySelector('[data-menu-group-icon]')?.value.trim()||'',color:menuColorValue(row.querySelector('[data-menu-group-color]')?.value,''),visible:!!row.querySelector('[data-menu-group-visible]')?.checked,order:Number.isFinite(order)?order:(gi+1)*10,items}});return{groups}}
function readAppConfigFromDom(){const current=window.AppConfig.get(),modules=[...document.querySelectorAll('[data-app-module-row]')].map((row,i)=>({key:row.dataset.appModuleRow,label:row.querySelector('[data-app-label]')?.value.trim()||row.dataset.appModuleRow,icon:row.querySelector('[data-app-icon]')?.value.trim()||'',visible:!!row.querySelector('[data-app-visible]')?.checked,order:(i+1)*10})),dashboardCards=[...document.querySelectorAll('[data-dashboard-card-row]')].map((row,i)=>{const old=current.dashboardCards.find(x=>x.key===row.dataset.dashboardCardRow)||{};return{...old,key:row.dataset.dashboardCardRow,visible:!!row.querySelector('[data-card-visible]')?.checked,order:(i+1)*10}});return{defaultModule:document.getElementById('appDefaultModule')?.value||'dashboard',modules,dashboardCards,menuLayout:readMenuLayoutFromDom()}}
'''
text = text[:start] + block + text[end:]
p.write_text(text, encoding='utf-8')


# 4) Compact the bad oversized menu and remove decorative gear bubbles.
p = Path('css/design-system.css')
text = p.read_text(encoding='utf-8')
start_marker = '/* Shell menu + bottom navigation — canonical modern surface. */'
end_marker = '[data-transport-module]'
start = text.find(start_marker)
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('Canonical menu CSS block not found')
block = r'''/* Shell menu — compact, customizable, single canonical design owner. */
.ka-menu-grid{padding:14px max(12px,var(--ka-safe-right)) calc(20px + var(--ka-safe-bottom)) max(12px,var(--ka-safe-left));row-gap:10px;column-gap:10px}
.ka-menu-card{min-height:116px;aspect-ratio:auto;border-radius:18px;padding:13px 9px 12px;gap:7px;border:1px solid color-mix(in srgb,var(--ka-button-text) 11%,transparent);box-shadow:0 4px 12px color-mix(in srgb,var(--ka-text) 9%,transparent);transition:transform var(--ka-transition-fast),box-shadow var(--ka-transition-fast),filter var(--ka-transition-fast)}
.ka-menu-card:hover{filter:saturate(1.03);box-shadow:0 6px 16px color-mix(in srgb,var(--ka-text) 12%,transparent)}.ka-menu-card:active{transform:scale(.98)}
.ka-menu-card::before{content:none!important;display:none!important}
.ka-menu-card__icon{width:44px;height:44px;font-size:23px;border:1px solid color-mix(in srgb,var(--ka-button-text) 18%,transparent);background:color-mix(in srgb,var(--ka-button-text) 14%,transparent);box-shadow:none}
.ka-menu-card strong{font-size:12.5px;line-height:1.24}.ka-menu-card>.ka-badge{right:9px;top:9px;min-width:24px;height:24px;padding-inline:6px;border:1px solid color-mix(in srgb,var(--ka-button-text) 12%,transparent);background:color-mix(in srgb,var(--ka-button-text) 18%,transparent);font-size:10px}
.ka-menu-card[data-menu-custom-color="true"]{background:linear-gradient(145deg,var(--ka-menu-custom),color-mix(in srgb,var(--ka-menu-custom) 72%,#000))!important}
.ka-menu-card[data-ka-menu-group="settings"]:last-child:nth-child(odd){grid-column:1/-1;width:calc(50% - 5px);justify-self:center}
.ka-menu-head{min-height:64px;padding:max(9px,var(--ka-safe-top)) max(12px,var(--ka-safe-right)) 9px max(12px,var(--ka-safe-left));background:var(--ka-header-bg);backdrop-filter:none;-webkit-backdrop-filter:none}.ka-menu-head h2{font-size:19px;letter-spacing:-.02em}
.ka-menu-list{padding:11px max(11px,var(--ka-safe-right)) calc(22px + var(--ka-safe-bottom)) max(11px,var(--ka-safe-left));gap:7px}.ka-menu-list>.ka-btn{min-height:58px;justify-content:flex-start;padding:7px 10px;border-radius:15px;border-color:var(--ka-border);background:var(--ka-card-bg);color:var(--ka-text);box-shadow:none;text-align:left}.ka-menu-list>.ka-btn:hover{background:var(--ka-muted-bg);color:var(--ka-text)}.ka-menu-list>.ka-btn:active{transform:scale(.995)}.ka-menu-list>.ka-btn .ka-avatar{width:40px;height:40px;flex:0 0 40px;border-radius:12px;background:var(--ka-primary-soft);color:var(--ka-primary)}.ka-menu-list>.ka-btn strong{font-size:13px}.ka-menu-list>.ka-btn>span:last-child{color:var(--ka-text-muted);display:grid;place-items:center}.ka-menu-list>.ka-btn[data-menu-custom-color="true"]{border-inline-start:3px solid var(--ka-menu-item-custom)}.ka-menu-list>.ka-btn[data-menu-custom-color="true"] .ka-avatar{background:color-mix(in srgb,var(--ka-menu-item-custom) 14%,var(--ka-card-bg));color:var(--ka-menu-item-custom)}.ka-menu-list>h3{margin:12px 2px 2px;font-size:16px}
.ka-settings-menu-group>summary{cursor:pointer}.ka-settings-menu-group>summary small{display:block;margin-top:2px}.ka-settings-menu-swatch{width:12px;height:38px;flex:0 0 12px;border-radius:999px;background:var(--ka-settings-menu-color)}.ka-settings-menu-fields{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(90px,.45fr) minmax(84px,.35fr) minmax(74px,.28fr);gap:8px}.ka-settings-menu-item{padding:10px;border:1px solid var(--ka-border);border-radius:14px;background:var(--ka-muted-bg);display:grid;gap:8px}.ka-settings-menu-item small{display:block;margin-top:2px;font-size:9px}.ka-settings-color-field input[type="color"]{padding:4px;min-height:44px}
[data-theme="dark"] .ka-menu-card{border-color:color-mix(in srgb,#fff 8%,transparent);box-shadow:0 5px 14px rgba(0,0,0,.22)}
@media(max-width:640px){.ka-settings-menu-fields{grid-template-columns:minmax(0,1fr) 86px}.ka-settings-color-field input[type="color"]{min-height:42px}}
@media(max-width:380px){.ka-menu-grid{padding-inline:max(9px,var(--ka-safe-left));gap:8px}.ka-menu-card{min-height:108px;border-radius:16px;padding:11px 6px 10px}.ka-menu-card__icon{width:40px;height:40px;font-size:21px}.ka-menu-card strong{font-size:11.5px}.ka-menu-card[data-ka-menu-group="settings"]:last-child:nth-child(odd){width:calc(50% - 4px)}.ka-menu-list>.ka-btn{min-height:54px}.ka-menu-list>.ka-btn .ka-avatar{width:37px;height:37px;flex-basis:37px}}
'''
text = text[:start] + block + text[end:]
p.write_text(text, encoding='utf-8')


# 5) Force PWA clients to refresh the repaired shell resources.
p = Path('service-worker.js')
text = p.read_text(encoding='utf-8')
text = replace_once(text, "const CACHE_ADI='oy-cache-v825';", "const CACHE_ADI='oy-cache-v826';", 'service worker cache')
p.write_text(text, encoding='utf-8')


# 6) Lock the repaired ownership contract with a focused regression test.
Path('tests/menu-customization-v2.test.js').write_text(r'''const fs=require('fs');
const assert=require('assert');
const app=fs.readFileSync('js/app-loader.js','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const settings=fs.readFileSync('js/modules/settings.js','utf8');
const design=fs.readFileSync('css/design-system.css','utf8');
assert(app.includes("menuLayout=r.menuLayout&&typeof r.menuLayout==='object'?r.menuLayout:{groups:{}}"),'AppConfig gerçek menuLayout alanını korumalı.');
assert(app.includes("menuLayout:{groups:{}}"),'Varsayılana dönüş classic menuLayout alanını da sıfırlamalı.');
assert(shell.includes('function menuGroupView(g,index)')&&shell.includes('function menuItemView(g,item,index,groupSettings)'),'ShellUI classic menü özelleştirmesini doğrudan render modeline uygulamalı.');
assert(shell.includes('data-menu-custom-color')&&shell.includes('visibleGroups().find'),'Ana ve alt menü özelleştirmeleri görünür renderer tarafından tüketilmeli.');
assert(settings.includes('Ana Menü Kartları')&&settings.includes('function readMenuLayoutFromDom()')&&settings.includes('menuLayout:readMenuLayoutFromDom()'),'Settings menü kartı/öğe özelleştirmesini AppConfig.menuLayout içine yazmalı.');
for(const field of ['data-menu-group-label','data-menu-group-icon','data-menu-group-color','data-menu-group-visible','data-menu-group-order','data-menu-item-label','data-menu-item-color','data-menu-item-visible'])assert(settings.includes(field),`Menü özelleştirme alanı eksik: ${field}`);
assert(design.includes('.ka-menu-card::before{content:none!important'),'Dekoratif dişli balonları görünür menüden kaldırılmalı.');
assert(design.includes('min-height:116px')&&design.includes('row-gap:10px'),'Ana menü mobilde kompakt ve aralıklı olmalı.');
assert(!fs.existsSync('js/core/menu-customizer.js'),'İkinci runtime menu customizer sahibi geri dönmemeli.');
console.log('Menü özelleştirme + kompakt görünüm sözleşmesi başarılı.');
''', encoding='utf-8')
