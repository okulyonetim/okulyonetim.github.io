from pathlib import Path
import re


def replace_once(text, pattern, replacement, label):
    text2, count = re.subn(pattern, lambda m: replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 replacement, got {count}')
    return text2


map_path = Path('js/modules/map-ui.js')
map_js = map_path.read_text(encoding='utf-8')

shell = r'''function shell(){return `<section class="ka-map-page" data-map-workspace>
<article class="ka-map-hero"><div class="ka-map-hero__copy"><span class="ka-map-hero__eyebrow">ULAŞIM &amp; GÜZERGÂH</span><h2>Harita</h2><p>Servis güzergâhını oluşturun, konum arayın ve rota mesafesini anlık takip edin.</p></div><span class="ka-map-hero__pin" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z" fill="currentColor"/><circle cx="12" cy="9" r="2.6" fill="white"/></svg></span></article>
<article class="ka-card ka-map-workspace"><div class="ka-card__body ka-map-workspace__body"><div class="ka-map-workspace__title"><span aria-hidden="true">🗺️</span><div><h3>Güzergâh Haritası</h3><p>Konum arayın, servis seçin ve rota noktalarını harita üzerinde yönetin.</p></div></div>
<div class="ka-map-search-wrap"><span class="ka-map-field-icon" aria-hidden="true">⌕</span><input id="mapSearchInput" type="search" placeholder="Yer adı ara (örn: Koruk Köyü)..." autocomplete="off" aria-label="Yer adı ara"><div id="mapSearchResults" class="ka-map-search-results ka-hidden"></div></div>
<div class="ka-map-service-wrap"><select id="mapServiceSelect" aria-label="Servis seç"><option value="">— Servis seçin —</option>${services().map(s=>`<option value="${esc(s.id)}">${esc(serviceName(s))}${s.guzergahMesafe?` · ${esc(s.guzergahMesafe)} km`:''}</option>`).join('')}</select><button class="ka-map-load-button" type="button" data-map-load aria-label="Kayıtlı güzergâhı yükle" title="Kayıtlı güzergâhı yükle">↻</button></div>
<div class="ka-map-controlbar"><div class="ka-map-stats"><span class="ka-map-stat">Nokta: <b id="mapPointCount">0</b></span><span class="ka-map-stat">Mesafe: <b id="mapDistance">—</b></span></div><div class="ka-map-actions"><button class="ka-btn ka-btn--secondary" type="button" data-map-clear><span aria-hidden="true">⌫</span> Temizle</button><button class="ka-btn" type="button" data-map-save data-ka-permission="tools.map" data-ka-write="tools.map"><span aria-hidden="true">▣</span> Servise Kaydet</button></div></div>
<div class="ka-map-canvas-wrap"><div id="toolsLeafletMap" class="ka-map-canvas" aria-label="Servis güzergâh haritası"><div class="ka-map-loading">Harita hazırlanıyor…</div></div><div class="ka-map-floating-tools"><button type="button" data-map-layer aria-label="Uydu görünümünü aç" title="Harita katmanını değiştir">🛰️</button><button type="button" data-map-location aria-label="Konumumu bul" title="Konumumu bul">⌾</button></div></div>
<div class="ka-map-hint"><span class="ka-map-hint__icon" aria-hidden="true">i</span><div><strong>Haritaya dokunarak güzergâh noktası ekleyin.</strong><span>Noktaları sürükleyerek rotayı güncelleyebilirsiniz.</span></div></div></div></article>
<div class="ka-map-lists-grid"><section class="ka-card ka-map-list-panel"><div class="ka-card__body"><div class="ka-map-list-head"><div><span aria-hidden="true">⭐</span><h3>Favoriler</h3></div><span class="ka-map-count" id="mapFavoriteCount">0</span></div><div id="mapFavorites" class="ka-map-list"></div></div></section><section class="ka-card ka-map-list-panel"><div class="ka-card__body"><div class="ka-map-list-head"><div><span aria-hidden="true">🚌</span><h3>Servis Güzergâhları</h3></div><span class="ka-map-count" id="mapRouteCount">0</span></div><div id="mapRoutes" class="ka-map-list"></div></div></section></div>
</section>`}
function leafletCssReady'''
map_js = replace_once(map_js, r'function shell\(\)\{return `.*?`\}\nfunction leafletCssReady', shell, 'map shell')

map_js = replace_once(
    map_js,
    r'function renderInfo\(\)\{.*?\}\nfunction renderDataLists',
    r'''function renderInfo(){const n=document.getElementById('mapPointCount'),d=document.getElementById('mapDistance'),save=document.querySelector('[data-map-save]');if(n)n.textContent=String(points.length);if(d)d.textContent=points.length>=2?`${km()} km`:'—';if(save)save.disabled=points.length<2||!document.getElementById('mapServiceSelect')?.value;renderDataLists()}
function renderDataLists''',
    'renderInfo',
)

lists = r'''function renderDataLists(){const fav=favorites(),routes=services().filter(s=>Array.isArray(s.guzergahKoordinatlar)&&s.guzergahKoordinatlar.length);const fc=document.getElementById('mapFavoriteCount'),rc=document.getElementById('mapRouteCount'),fb=document.getElementById('mapFavorites'),rb=document.getElementById('mapRoutes');if(fc)fc.textContent=String(fav.length);if(rc)rc.textContent=String(routes.length);if(fb){fb.innerHTML=fav.length?fav.map(f=>`<article class="ka-map-favorite-row"><span class="ka-map-favorite-star" aria-hidden="true">★</span><div class="ka-map-row-main"><strong>${esc(f.ad||'Favori')}</strong>${f.aciklama?`<small>${esc(f.aciklama)}</small>`:''}</div><div class="ka-map-row-actions"><button type="button" class="ka-map-mini-action" data-fav-add="${esc(f.id)}" aria-label="${esc(f.ad||'Favori')} rotaya ekle" title="Rotaya ekle">＋</button>${global.HaritaService?.favoriSilinebilirMi?.(f)?`<button type="button" class="ka-map-mini-action ka-map-mini-action--danger" data-fav-delete="${esc(f.id)}" aria-label="${esc(f.ad||'Favori')} favorisini sil" title="Favoriyi sil">⌫</button>`:''}</div></article>`).join(''):'<div class="ka-map-empty"><span>☆</span><strong>Favori konum bulunamadı.</strong><small>Haritadaki bir noktayı favoriye ekleyebilirsiniz.</small></div>';fb.querySelectorAll('[data-fav-add]').forEach(b=>b.onclick=()=>{const f=fav.find(x=>String(x.id)===String(b.dataset.favAdd));if(f){addPoint(Number(f.lat),Number(f.lng),f.ad);map?.setView([Number(f.lat),Number(f.lng)],15)}});fb.querySelectorAll('[data-fav-delete]').forEach(b=>b.onclick=async()=>{const f=fav.find(x=>String(x.id)===String(b.dataset.favDelete));if(!f)return;try{await global.HaritaService.favoriSil(f.id,f);renderDataLists()}catch(e){global.toast?.(e?.message||'Favori silinemedi.')}})}if(rb){rb.innerHTML=routes.length?routes.map(s=>{const raw=Number(s.guzergahMesafe),distance=Number.isFinite(raw)&&raw>0?`${raw.toFixed(1)} km`:'Mesafe kaydı yok';return `<button class="ka-map-route-row" type="button" data-route-load="${esc(s.id)}"><span class="ka-map-route-icon" aria-hidden="true">▣</span><span class="ka-map-row-main"><strong>${esc(serviceName(s))}</strong><small>${esc(distance)} · ${s.guzergahKoordinatlar.length} rota noktası</small></span><span class="ka-map-route-chevron" aria-hidden="true">›</span></button>`}).join(''):'<div class="ka-map-empty"><span>🚌</span><strong>Kayıtlı servis güzergâhı bulunamadı.</strong><small>Bir servis seçip en az iki nokta ekleyerek rota kaydedebilirsiniz.</small></div>';rb.querySelectorAll('[data-route-load]').forEach(b=>b.onclick=()=>loadService(b.dataset.routeLoad))}}
async function search'''
map_js = replace_once(map_js, r'function renderDataLists\(\)\{.*?\}\nasync function search', lists, 'renderDataLists')

search_render = r'''function renderSearch(list){const box=document.getElementById('mapSearchResults');if(!box)return;if(!list.length){box.classList.add('ka-hidden');box.innerHTML='';return}box.classList.remove('ka-hidden');box.innerHTML=list.map((r,i)=>`<article class="ka-map-search-row"><div class="ka-map-row-main"><strong>${esc(String(r.display_name||'').split(',')[0])}</strong><small>${esc(String(r.display_name||'').split(',').slice(1,4).join(','))}</small></div><div class="ka-map-row-actions"><button class="ka-map-search-action" type="button" data-search-add="${i}">Rotaya Ekle</button><button class="ka-map-mini-action" type="button" data-search-fav="${i}" aria-label="Favoriye ekle">★</button></div></article>`).join('');box.querySelectorAll('[data-search-add]').forEach(b=>b.onclick=()=>{const r=list[Number(b.dataset.searchAdd)],lat=Number(r.lat),lng=Number(r.lon),ad=String(r.display_name||'').split(',')[0];addPoint(lat,lng,ad);map?.setView([lat,lng],15);box.classList.add('ka-hidden')});box.querySelectorAll('[data-search-fav]').forEach(b=>b.onclick=()=>{const r=list[Number(b.dataset.searchFav)];saveFavorite(Number(r.lat),Number(r.lon),String(r.display_name||'').split(',')[0])})}
function goLocation'''
map_js = replace_once(map_js, r'function renderSearch\(list\)\{.*?\}\nfunction goLocation', search_render, 'renderSearch')

toggle = r'''function toggleLayer(){if(!map)return;const btn=document.querySelector('[data-map-layer]');if(layer==='street'){map.removeLayer(street);satellite.addTo(map);layer='satellite';if(btn){btn.textContent='🗺️';btn.setAttribute('aria-label','Sokak görünümünü aç')}}else{map.removeLayer(satellite);street.addTo(map);layer='street';if(btn){btn.textContent='🛰️';btn.setAttribute('aria-label','Uydu görünümünü aç')}}}
async function saveFavorite'''
map_js = replace_once(map_js, r'function toggleLayer\(\)\{.*?\}\nasync function saveFavorite', toggle, 'toggleLayer')

load = r'''function loadService(id){if(!map||!global.L){global.toast?.('Harita bağlantısı henüz hazır değil.');return}const s=services().find(x=>String(x.id)===String(id));if(!s?.guzergahKoordinatlar?.length){global.toast?.('Bu servis için kayıtlı güzergâh yok.');return}clearRoute();const sel=document.getElementById('mapServiceSelect');if(sel)sel.value=id;s.guzergahKoordinatlar.forEach(p=>addPoint(Number(p.lat),Number(p.lng),p.ad||''));if(points.length){const bounds=L.latLngBounds(points.map(p=>[p.lat,p.lng]));map?.fitBounds(bounds,{padding:[32,32]})}}
async function mount'''
map_js = replace_once(map_js, r'function loadService\(id\)\{.*?\}\nasync function mount', load, 'loadService')

mount = r'''async function mount(root){if(!root)return false;unmount();mountedRoot=root;root.innerHTML=shell();bind();renderInfo();try{await ensureLibs();if(mountedRoot!==root)return false;initMap();renderInfo();return true}catch(e){console.warn('[Harita/Leaflet]',e?.message||e);const canvas=root.querySelector('#toolsLeafletMap');if(canvas){canvas.classList.add('is-error');canvas.innerHTML=`<div class="ka-map-load-error"><strong>Harita bağlantısı kurulamadı.</strong><span>${esc(e?.message||'Harita kütüphanesi yüklenemedi.')}</span><small>Favoriler ve kayıtlı servis güzergâhları cihaz verisinden kullanılmaya devam eder.</small></div>`}return false}}
function refresh'''
map_js = replace_once(map_js, r'async function mount\(root\)\{.*?\}\nfunction refresh', mount, 'mount')

map_js = map_js.replace(
    "routeLine=L.polyline(line,{weight:5,opacity:.85}).addTo(map)",
    "routeLine=L.polyline(line,{weight:5,opacity:.9,className:'ka-map-route-line'}).addTo(map)",
)
map_js = map_js.replace(
    "routeLine=L.polyline(points.map(p=>[p.lat,p.lng]),{weight:4,opacity:.8,dashArray:'8,4'}).addTo(map)",
    "routeLine=L.polyline(points.map(p=>[p.lat,p.lng]),{weight:4,opacity:.85,dashArray:'8,4',className:'ka-map-route-line'}).addTo(map)",
)
map_js = replace_once(map_js, r'\n/\* Tools sekmesi köprüsü:.*?\n\}\)\(window\);\s*$', '\n})(window);\n', 'obsolete map bridge')
map_path.write_text(map_js, encoding='utf-8')


tools_path = Path('js/modules/tools.js')
tools = tools_path.read_text(encoding='utf-8')
new_render = r'''function renderMap(){const content=document.getElementById('toolsContent'),count=document.getElementById('toolsCount'),host=document.querySelector('[data-tools-module]');host?.classList.add('ka-tools-map-active');if(count)count.textContent='';if(!content)return;if(content.querySelector('[data-map-workspace]')){global.HaritaUI?.refresh?.();return}if(!global.HaritaUI?.mount){content.innerHTML='<div class="ka-empty">Harita motoru hazır değil.</div>';return}content.innerHTML='<div class="ka-empty">Harita hazırlanıyor…</div>';Promise.resolve(global.HaritaUI.mount(content)).catch(e=>{console.error('[Tools/Harita]',e);if(content.isConnected)content.innerHTML='<div class="ka-empty">Harita açılamadı.</div>'})}
function monthDoc'''
tools = replace_once(
    tools,
    r'function mapFavoriteCard\(f\)\{.*?\}\nfunction routeCard\(s\)\{.*?\}\nfunction renderMap\(\)\{.*?\}\nfunction monthDoc',
    new_render,
    'Tools map renderer',
)
tools = replace_once(tools, r'function bindMap\(\)\{.*?\}\nfunction bindAttendance', 'function bindAttendance', 'old map binding')

lifecycle = r'''function openPage(page,title=''){const allowed=['checklists','map','forms','attendance'];if(!allowed.includes(page))return false;const previous=active;if(previous==='forms'&&page!=='forms')global.ClassicCizelgelerParity?.close?.();if(previous==='map'&&page!=='map')global.HaritaUI?.unmount?.();active=page;const host=document.querySelector('[data-tools-module]');host?.classList.toggle('ka-tools-map-active',page==='map');const h=host?.querySelector(':scope > .ka-row h2');if(h&&title)h.textContent=title;if(page==='forms')global.ClassicCizelgelerParity?.open?.(title);else render();let prep=null;if(page==='map')prep=global.ToolsData?.prepareMap?.();else if(page==='forms')prep=global.ToolsData?.prepareForms?.();else if(page==='attendance')prep=global.ToolsData?.prepareAttendance?.();else prep=global.ToolsData?.prepareControlLists?.();Promise.resolve(prep).then(()=>{if(!mounted||active!==page)return;if(page==='forms')global.ClassicCizelgelerParity?.render?.(true);else render()}).catch(e=>console.warn('[Tools/openPage]',e?.message||e));return true}
function unmount(){mounted=false;global.HaritaUI?.unmount?.();document.querySelector('[data-tools-module]')?.classList.remove('ka-tools-map-active');unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];global.ClassicCizelgelerParity?.close?.()}
global.ToolsModule'''
tools = replace_once(
    tools,
    r"function openPage\(page,title=''\)\{.*?\}\nfunction unmount\(\)\{.*?\}\nglobal.ToolsModule",
    lifecycle,
    'Tools map lifecycle',
)
tools_path.write_text(tools, encoding='utf-8')


css_path = Path('css/design-system.css')
css = css_path.read_text(encoding='utf-8')
marker = '/* Harita — premium rota çalışma alanı v1 */'
if marker not in css:
    css += r'''

/* Harita — premium rota çalışma alanı v1 */
[data-tools-module].ka-tools-map-active > .ka-row:first-child{display:none!important}
.ka-map-page{--map-surface:var(--ka-card-bg);--map-raised:var(--ka-card-raised-bg);--map-line:var(--ka-border);width:min(100%,1080px);margin:0 auto;display:grid;gap:14px;padding-bottom:8px}
.ka-map-hero{position:relative;isolation:isolate;min-height:164px;display:grid;grid-template-columns:minmax(0,1fr) 150px;align-items:center;gap:20px;overflow:hidden;padding:24px 28px;border:1px solid color-mix(in srgb,var(--ka-primary) 28%,var(--ka-hero-border));border-radius:26px;background:linear-gradient(135deg,color-mix(in srgb,var(--ka-primary) 18%,var(--ka-card-bg)),color-mix(in srgb,var(--ka-primary) 7%,var(--ka-card-bg)) 52%,var(--ka-card-bg));box-shadow:var(--ka-hero-shadow)}
.ka-map-hero::after{content:"";position:absolute;right:-30px;top:-70px;width:280px;height:280px;z-index:-1;border-radius:50%;background:repeating-radial-gradient(circle at center,color-mix(in srgb,var(--ka-primary) 12%,transparent) 0 1px,transparent 1px 14px);opacity:.55}
.ka-map-hero__copy{min-width:0}.ka-map-hero__eyebrow{display:block;margin-bottom:7px;color:var(--ka-primary);font-size:11px;font-weight:900;letter-spacing:.12em}.ka-map-hero h2{font-size:clamp(27px,4vw,38px);letter-spacing:-.035em}.ka-map-hero p{max-width:570px;margin-top:9px;color:var(--ka-text-muted);font-size:14px;line-height:1.5}.ka-map-hero__pin{justify-self:center;width:78px;height:78px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(145deg,var(--ka-primary),var(--ka-primary-hover));color:var(--ka-button-text);box-shadow:0 14px 30px color-mix(in srgb,var(--ka-primary) 28%,transparent)}.ka-map-hero__pin svg{width:42px;height:42px}
.ka-map-workspace{overflow:visible;border-radius:24px}.ka-map-workspace__body{display:grid;gap:11px;padding:18px!important}.ka-map-workspace__title{display:flex;align-items:center;gap:10px;margin-bottom:2px}.ka-map-workspace__title>span{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:var(--ka-primary-soft);font-size:18px}.ka-map-workspace__title h3{font-size:19px}.ka-map-workspace__title p{margin-top:2px;color:var(--ka-text-muted);font-size:10.5px}
.ka-map-search-wrap{position:relative}.ka-map-search-wrap input{height:48px;padding-left:42px;border-radius:15px}.ka-map-field-icon{position:absolute;left:14px;top:8px;z-index:1;color:var(--ka-text-muted);font-size:25px;line-height:30px;pointer-events:none}.ka-map-search-results{position:absolute;z-index:700;left:0;right:0;top:calc(100% + 6px);max-height:260px;overflow:auto;padding:5px;border:1px solid var(--ka-border);border-radius:16px;background:var(--ka-card-raised-bg);box-shadow:var(--ka-shadow-modal)}.ka-map-search-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 10px;border-bottom:1px solid var(--ka-border)}.ka-map-search-row:last-child{border-bottom:0}.ka-map-search-action{min-height:32px;padding:0 10px;border:1px solid var(--ka-border);border-radius:10px;background:var(--ka-primary-soft);color:var(--ka-primary);font-size:10px;font-weight:850}
.ka-map-service-wrap{display:grid;grid-template-columns:minmax(0,1fr) 48px;gap:7px}.ka-map-service-wrap select{height:48px;border-radius:15px}.ka-map-load-button{width:48px;height:48px;border:1px solid var(--ka-input-border);border-radius:15px;background:var(--ka-card-raised-bg);color:var(--ka-primary);font-size:22px;font-weight:900;cursor:pointer}.ka-map-load-button:hover{background:var(--ka-primary-soft)}
.ka-map-controlbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.ka-map-stats,.ka-map-actions{display:flex;align-items:center;gap:8px}.ka-map-stat{display:inline-flex;align-items:center;gap:5px;min-height:36px;padding:5px 12px;border:1px solid var(--ka-border);border-radius:999px;background:var(--ka-muted-bg);color:var(--ka-text-muted);font-size:11px;font-weight:750;white-space:nowrap}.ka-map-stat b{color:var(--ka-primary);font-size:12px}.ka-map-actions .ka-btn{min-height:38px;border-radius:12px;padding-inline:13px;font-size:11.5px}.ka-map-actions [data-map-save]{box-shadow:0 7px 18px color-mix(in srgb,var(--ka-primary) 20%,transparent)}
.ka-map-canvas-wrap{position:relative;overflow:hidden;border:1px solid var(--ka-border);border-radius:20px;background:var(--ka-muted-bg);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ka-primary) 4%,transparent)}.ka-map-canvas{width:100%;height:clamp(320px,47dvh,470px);min-height:320px;background:linear-gradient(145deg,var(--ka-muted-bg),var(--ka-card-bg))}.ka-map-canvas.is-error{display:grid;place-items:center;padding:20px}.ka-map-loading,.ka-map-load-error{height:100%;min-height:300px;display:grid;place-items:center;text-align:center;color:var(--ka-text-muted)}.ka-map-load-error{align-content:center;gap:5px}.ka-map-load-error strong{color:var(--ka-text)}.ka-map-load-error span{font-size:12px}.ka-map-load-error small{max-width:400px;font-size:10px}.ka-map-floating-tools{position:absolute;z-index:550;right:12px;top:12px;display:grid;gap:8px}.ka-map-floating-tools button{width:44px;height:44px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--ka-border) 82%,transparent);border-radius:14px;background:color-mix(in srgb,var(--ka-card-raised-bg) 92%,transparent);color:var(--ka-text);box-shadow:var(--ka-shadow-md);font-size:18px;cursor:pointer;backdrop-filter:blur(8px)}.ka-map-floating-tools button:hover{color:var(--ka-primary);border-color:color-mix(in srgb,var(--ka-primary) 35%,var(--ka-border))}.ka-map-page .leaflet-control-zoom{overflow:hidden;border:0!important;border-radius:14px!important;box-shadow:var(--ka-shadow-md)!important}.ka-map-page .leaflet-control-zoom a{width:42px!important;height:42px!important;line-height:42px!important;border-color:var(--ka-border)!important;background:color-mix(in srgb,var(--ka-card-raised-bg) 94%,transparent)!important;color:var(--ka-text)!important}.ka-map-page .leaflet-control-attribution{border-radius:8px 0 0 0;background:color-mix(in srgb,var(--ka-card-raised-bg) 86%,transparent)!important;color:var(--ka-text-muted)!important;backdrop-filter:blur(7px)}.ka-map-page .leaflet-popup-content-wrapper{border:1px solid var(--ka-border);border-radius:15px;background:var(--ka-card-raised-bg);color:var(--ka-text);box-shadow:var(--ka-shadow-modal)}.ka-map-page .leaflet-popup-tip{background:var(--ka-card-raised-bg)}.ka-map-page .ka-map-route-line{stroke:var(--ka-primary)!important}
.ka-map-hint{display:grid;grid-template-columns:32px minmax(0,1fr);align-items:center;gap:10px;padding:10px 12px;border:1px solid color-mix(in srgb,var(--ka-primary) 22%,var(--ka-border));border-radius:15px;background:linear-gradient(135deg,var(--ka-primary-soft),color-mix(in srgb,var(--ka-primary) 4%,var(--ka-card-bg)))}.ka-map-hint__icon{width:28px;height:28px;display:grid;place-items:center;border:2px solid var(--ka-primary);border-radius:50%;color:var(--ka-primary);font-size:15px;font-weight:950}.ka-map-hint strong,.ka-map-hint span{display:block}.ka-map-hint strong{font-size:11.5px}.ka-map-hint span{margin-top:1px;color:var(--ka-text-muted);font-size:10px}
.ka-map-lists-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ka-map-list-panel{overflow:hidden;border-radius:20px}.ka-map-list-panel>.ka-card__body{padding:14px!important}.ka-map-list-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}.ka-map-list-head>div{display:flex;align-items:center;gap:7px}.ka-map-list-head h3{font-size:15px}.ka-map-count{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:25px;padding:0 8px;border-radius:999px;background:var(--ka-primary-soft);color:var(--ka-primary);font-size:10px;font-weight:900}.ka-map-list{display:grid;border:1px solid var(--ka-border);border-radius:14px;overflow:hidden}.ka-map-favorite-row,.ka-map-route-row{min-width:0;display:grid;align-items:center;gap:9px;border:0;border-bottom:1px solid var(--ka-border);background:var(--ka-card-bg);color:var(--ka-text)}.ka-map-favorite-row:last-child,.ka-map-route-row:last-child{border-bottom:0}.ka-map-favorite-row{grid-template-columns:25px minmax(0,1fr) auto;padding:10px}.ka-map-favorite-star{color:#f0af13;font-size:17px}.ka-map-row-main{min-width:0;text-align:left}.ka-map-row-main strong,.ka-map-row-main small{display:block;min-width:0}.ka-map-row-main strong{font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ka-map-row-main small{margin-top:2px;color:var(--ka-text-muted);font-size:9px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ka-map-row-actions{display:flex;align-items:center;gap:5px}.ka-map-mini-action{width:34px;height:34px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--ka-primary) 34%,var(--ka-border));border-radius:10px;background:var(--ka-card-raised-bg);color:var(--ka-primary);font-size:16px;font-weight:900;cursor:pointer}.ka-map-mini-action--danger{border-color:color-mix(in srgb,var(--ka-danger) 35%,var(--ka-border));color:var(--ka-danger)}.ka-map-route-row{width:100%;grid-template-columns:28px minmax(0,1fr) 16px;padding:9px 10px;text-align:left;cursor:pointer}.ka-map-route-row:hover{background:var(--ka-primary-soft)}.ka-map-route-icon{width:26px;height:26px;display:grid;place-items:center;border-radius:8px;background:var(--ka-primary-soft);color:var(--ka-primary);font-size:12px}.ka-map-route-chevron{color:var(--ka-primary);font-size:22px;line-height:1}.ka-map-empty{display:grid;justify-items:center;gap:3px;padding:22px 12px;text-align:center;background:var(--ka-card-bg);color:var(--ka-text-muted)}.ka-map-empty>span{font-size:21px}.ka-map-empty strong{color:var(--ka-text);font-size:11px}.ka-map-empty small{font-size:9px}
[data-theme="dark"] .ka-map-hero{background:linear-gradient(135deg,#063b2d 0%,#064f3b 50%,#08392e 100%);border-color:#146e54}.ka-map-page .leaflet-container{font-family:var(--ka-font)}
@media(max-width:760px){.ka-map-page{gap:11px}.ka-map-hero{min-height:142px;grid-template-columns:minmax(0,1fr) 86px;padding:18px;border-radius:22px}.ka-map-hero p{font-size:12px}.ka-map-hero__pin{width:62px;height:62px}.ka-map-hero__pin svg{width:34px;height:34px}.ka-map-workspace__body{padding:13px!important}.ka-map-workspace__title p{display:none}.ka-map-controlbar{align-items:stretch}.ka-map-stats{width:100%}.ka-map-actions{width:100%;display:grid;grid-template-columns:minmax(0,.78fr) minmax(0,1.22fr)}.ka-map-actions .ka-btn{width:100%;padding-inline:8px}.ka-map-lists-grid{grid-template-columns:1fr}.ka-map-canvas{height:340px;min-height:340px}}
@media(max-width:390px){.ka-map-hero{grid-template-columns:1fr 64px;padding:16px}.ka-map-hero__eyebrow{font-size:9.5px}.ka-map-hero h2{font-size:27px}.ka-map-hero p{font-size:11px}.ka-map-hero__pin{width:54px;height:54px}.ka-map-stat{padding-inline:9px}.ka-map-controlbar{gap:8px}.ka-map-search-wrap input,.ka-map-service-wrap select{font-size:12px}.ka-map-canvas{height:320px;min-height:320px}.ka-map-favorite-row{grid-template-columns:22px minmax(0,1fr) auto}.ka-map-mini-action{width:32px;height:32px}}
'''
    css_path.write_text(css, encoding='utf-8')


sw_path = Path('service-worker.js')
sw = sw_path.read_text(encoding='utf-8')
if 'oy-cache-v814' not in sw:
    raise SystemExit('service worker cache version changed unexpectedly')
sw_path.write_text(sw.replace('oy-cache-v814', 'oy-cache-v815', 1), encoding='utf-8')


test = Path('tests/map-page-redesign.test.js')
test.write_text(
    r'''const fs=require('fs');
const assert=require('assert');
const map=fs.readFileSync('js/modules/map-ui.js','utf8');
const tools=fs.readFileSync('js/modules/tools.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
for(const token of ['data-map-workspace','ka-map-hero','ULAŞIM &amp; GÜZERGÂH','Güzergâh Haritası','Yer adı ara (örn: Koruk Köyü)...','ka-map-canvas-wrap','mapFavoriteCount','mapRouteCount','Servise Kaydet','ka-map-hint'])assert(map.includes(token),`Yeni Harita görünümü eksik: ${token}`);
for(const token of ["global.HaritaUI.mount(content)","content.querySelector('[data-map-workspace]')","previous==='map'&&page!=='map'","global.HaritaUI?.unmount?.()","ka-tools-map-active"])assert(tools.includes(token),`Tools→Harita canonical lifecycle eksik: ${token}`);
assert(!map.includes('data-tools-tab'),'Emekli Harita tab köprüsü geri dönmemeli.');
assert(!map.includes('MutationObserver'),'Harita runtime DOM gözlemci parity katmanı kullanmamalı.');
for(const token of ['/* Harita — premium rota çalışma alanı v1 */','.ka-map-hero{','.ka-map-lists-grid{','.ka-map-floating-tools{','[data-theme="dark"] .ka-map-hero{'])assert(css.includes(token),`Merkezi Harita tasarımı eksik: ${token}`);
assert(map.includes("global.DeviceData.update('servisler'"),'Harita rota kaydı local-first DeviceData hattında kalmalı.');
assert(map.includes("PermissionService?.require?.('tools.map','edit')"),'Harita düzenleme yetkisi merkezi PermissionService üzerinde kalmalı.');
assert(sw.includes('oy-cache-v815'),'Yeni Harita CSS/JS için PWA cache sürümü yükseltilmeli.');
console.log('Harita açık/koyu premium sayfa redesign sözleşmesi başarılı.');
''',
    encoding='utf-8',
)
