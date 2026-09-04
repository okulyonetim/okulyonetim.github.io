from pathlib import Path
import re


def read(p): return Path(p).read_text(encoding='utf-8')
def write(p,s): Path(p).write_text(s,encoding='utf-8')

def sub_once(text, pattern, repl, label, flags=0):
    out,n=re.subn(pattern,repl,text,count=1,flags=flags)
    if n!=1: raise SystemExit(f'{label}: expected 1 replacement, got {n}')
    return out

# Settings: keep a stable top-level move map and switch the editor to the target menu immediately.
p='js/modules/settings.js'
s=read(p)
s=sub_once(s,
    r"function menuItemSetting\(g,item\)\{const items=menuGroupSetting\(g\)\?\.items\|\|\{\};return items\[menuItemKey\(g,item\)\]\|\|items\[legacyMenuItemKey\(g,item\)\]\|\|\{\}\}",
    "function menuItemSetting(g,item){const cfg=menuLayoutConfig(),items=menuGroupSetting(g)?.items||{},key=menuItemKey(g,item),legacy=legacyMenuItemKey(g,item),s=items[key]||items[legacy]||{},target=cfg?.moves?.[key]||cfg?.moves?.[legacy]||s.targetGroup;return target?{...s,targetGroup:String(target)}:s}",
    'settings menuItemSetting')
s=sub_once(s,
    r"function readMenuLayoutFromDom\(\)\{.*?return\{groups\}\}",
    "function readMenuLayoutFromDom(){const groups={},moves={};[...document.querySelectorAll('[data-menu-group-row]')].forEach((row,gi)=>{const key=row.dataset.menuGroupRow,order=Number(row.querySelector('[data-menu-group-order]')?.value);groups[key]={label:row.querySelector('[data-menu-group-label]')?.value.trim()||key,icon:row.querySelector('[data-menu-group-icon]')?.value.trim()||'',color:menuColorValue(row.querySelector('[data-menu-group-color]')?.value,''),visible:!!row.querySelector('[data-menu-group-visible]')?.checked,order:Number.isFinite(order)?order:(gi+1)*10,items:{}}});[...document.querySelectorAll('[data-menu-item-row]')].forEach((item,ii)=>{const source=item.dataset.menuItemSource||item.closest('[data-menu-group-row]')?.dataset.menuGroupRow||'';if(!source||!groups[source])return;const order=Number(item.querySelector('[data-menu-item-order]')?.value),target=item.querySelector('[data-menu-item-target]')?.value||source,key=item.dataset.menuItemRow;groups[source].items[key]={label:item.querySelector('[data-menu-item-label]')?.value.trim()||'',icon:item.querySelector('[data-menu-item-icon]')?.value.trim()||'',color:menuColorValue(item.querySelector('[data-menu-item-color]')?.value,''),visible:!!item.querySelector('[data-menu-item-visible]')?.checked,order:Number.isFinite(order)?order:(ii+1)*10,targetGroup:target};moves[key]=target});return{groups,moves}}",
    'settings readMenuLayoutFromDom', flags=re.S)
s=sub_once(s,
    r"function moveMenuItemToTarget\(out,select\)\{const row=select\.closest\('\[data-menu-item-row\]'\);if\(!row\)return;const panel=\[\.\.\.out\.querySelectorAll\('\[data-layout-panel\]'\)\]\.find\(x=>x\.dataset\.layoutPanel===select\.value\),list=panel\?\.querySelector\('\[data-layout-item-list\]'\);if\(!list\)return;list\.querySelector\('\.ka-layout-empty'\)\?\.remove\(\);list\.appendChild\(row\);refreshLayoutCounts\(out\);markLayoutDirty\(out\)\}",
    "function moveMenuItemToTarget(out,select){const row=select.closest('[data-menu-item-row]');if(!row)return;const target=select.value,panel=[...out.querySelectorAll('[data-layout-panel]')].find(x=>x.dataset.layoutPanel===target),list=panel?.querySelector('[data-layout-item-list]');if(!list)return;list.querySelector('.ka-layout-empty')?.remove();list.appendChild(row);refreshLayoutCounts(out);markLayoutDirty(out);selectLayoutMenu(out,target);row.classList.add('is-moved');requestAnimationFrame(()=>row.classList.remove('is-moved'))}",
    'settings moveMenuItemToTarget')
write(p,s)

# Shell: consume the stable move map first, keeping source-local targetGroup as backward compatibility.
p='js/core/shell-ui.js'
s=read(p)
s=sub_once(s,
    r"function menuItemView\(g,item,index,groupSettings\)\{const items=groupSettings\?\.items\|\|\{\},s=items\[menuItemKey\(g,item\)\]\|\|items\[legacyMenuItemKey\(g,item\)\]\|\|\{\},x=\[\.\.\.item\],order=Number\(s\.order\);x\[0\]=String\(s\.label\|\|item\?\.\[0\]\|\|''\);x\[1\]=String\(s\.icon\|\|item\?\.\[1\]\|\|''\);x\.__menuColor=validMenuColor\(s\.color\);x\.__menuVisible=s\.visible!==false;x\.__menuOrder=Number\.isFinite\(order\)\?order:\(index\+1\)\*10;x\.__menuSourceGroup=g\.key;x\.__menuTargetGroup=String\(s\.targetGroup\|\|g\.key\);return x\}",
    "function menuItemView(g,item,index,groupSettings){const cfg=menuLayoutConfig(),items=groupSettings?.items||{},key=menuItemKey(g,item),legacy=legacyMenuItemKey(g,item),s=items[key]||items[legacy]||{},x=[...item],order=Number(s.order),target=cfg?.moves?.[key]||cfg?.moves?.[legacy]||s.targetGroup||g.key;x[0]=String(s.label||item?.[0]||'');x[1]=String(s.icon||item?.[1]||'');x.__menuColor=validMenuColor(s.color);x.__menuVisible=s.visible!==false;x.__menuOrder=Number.isFinite(order)?order:(index+1)*10;x.__menuSourceGroup=g.key;x.__menuTargetGroup=String(target);return x}",
    'shell menuItemView')
write(p,s)

# Runtime versions.
p='js/app-loader.js'; s=read(p); s=s.replace("define('settings',['js/modules/settings.js?v=878']);","define('settings',['js/modules/settings.js?v=879']);");
if "settings.js?v=879" not in s: raise SystemExit('app-loader settings version not bumped')
write(p,s)

p='index.html'; s=read(p); s=s.replace('js/core/shell-ui.js?v=878','js/core/shell-ui.js?v=879').replace('js/app-loader.js?v=878','js/app-loader.js?v=879');
if 'shell-ui.js?v=879' not in s or 'app-loader.js?v=879' not in s: raise SystemExit('index versions not bumped')
write(p,s)

p='service-worker.js'; s=read(p); s=s.replace("oy-cache-v878","oy-cache-v879").replace('js/app-loader.js?v=878','js/app-loader.js?v=879').replace('js/core/shell-ui.js?v=878','js/core/shell-ui.js?v=879').replace('js/modules/settings.js?v=878','js/modules/settings.js?v=879');
if "oy-cache-v879" not in s or 'settings.js?v=879' not in s: raise SystemExit('service worker versions not bumped')
write(p,s)

# Strengthen the existing regression test and update cache generation.
p='tests/menu-customization-v2.test.js'; s=read(p); s=s.replace("const CACHE_ADI='oy-cache-v878';","const CACHE_ADI='oy-cache-v879';")
needle="assert(settings.includes('data-menu-item-target')&&settings.includes('targetGroup:item.querySelector'),'Alt menü başka ana menüye taşınabilmeli.');"
replacement="assert(settings.includes('data-menu-item-target')&&settings.includes('targetGroup:target')&&settings.includes('moves[key]=target'),'Alt menü hedefi hem source ayarında hem kararlı move haritasında saklanmalı.');\nassert(settings.includes('selectLayoutMenu(out,target)'),'Öğe taşınınca düzenleyici hedef menüyü anında göstermeli.');\nassert(shell.includes('cfg?.moves?.[key]')&&shell.includes('__menuTargetGroup=String(target)'),'Shell taşınan öğeyi kararlı move haritasından hedef menüde göstermeli.');"
if needle not in s: raise SystemExit('menu test anchor missing')
s=s.replace(needle,replacement)
write(p,s)

# Other tests that pin the current settings/app shell generation.
for p in ['tests/service-worker-precache-smoke.test.js','tests/module-bundles-smoke.test.js','tests/settings-separate-pages.test.js','tests/classic-shell-v2-smoke.test.js']:
    path=Path(p)
    if not path.exists(): continue
    t=read(p).replace('oy-cache-v878','oy-cache-v879').replace('settings.js?v=878','settings.js?v=879').replace('shell-ui.js?v=878','shell-ui.js?v=879').replace('app-loader.js?v=878','app-loader.js?v=879')
    write(p,t)

print('menu move v879 patch prepared')
