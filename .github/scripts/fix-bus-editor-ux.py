from pathlib import Path
import re

transport_path=Path('js/modules/transport.js')
transport=transport_path.read_text(encoding='utf-8')

stage_token='<div class="ka-bus-classic-stage">${busCabinHtml(s)}</div>'
if transport.count(stage_token)!=1:
    raise SystemExit(f'stage token count={transport.count(stage_token)}')
toolbar='''${editable?'<div class="ka-bus-tool-grid"><button class="ka-btn ka-btn--secondary" type="button" data-bus-row-add>➕ Sıra Ekle</button><button class="ka-btn ka-btn--secondary" type="button" data-bus-row-remove>➖ Sıra Sil</button><button class="ka-btn ka-btn--secondary" type="button" data-bus-report>🖨 Rapor Al</button><button class="ka-btn ka-btn--secondary" type="button" data-bus-clear-all>🗑 Atamaları Temizle</button></div>':'<div class="ka-bus-tool-grid is-readonly"><button class="ka-btn ka-btn--secondary" type="button" data-bus-report>🖨 Rapor Al</button></div>'}<div class="ka-bus-classic-stage">${busCabinHtml(s)}</div>'''
transport=transport.replace(stage_token,toolbar,1)

save_re=re.compile(r" ov\.querySelector\('\[data-bus-save\]'\)\.onclick=async\(\)=>\{if\(!canEditBusSeats\(\)\)\{toast\?\.\('Öğretmen kullanıcıları servis oturma planını yalnız görüntüleyebilir\.'\);return\}const b=ov\.querySelector\('\[data-bus-save\]'\);b\.disabled=true;b\.textContent='Kaydediliyor…';try\{renumberBusSeats\(\);await window\.ServisOturmaService\.planElementsKaydet\(editor\.servisId,editor\.sablon,editor\.elements,false\);toast\?\.\('Oturma planı cihazda kaydedildi\.'\);closeEditor\(\);render\(\)\}catch\(e\)\{toast\?\.\('Plan kaydedilemedi: '\+\(e\?\.message\|\|e\)\);b\.disabled=false;b\.textContent='💾 Kaydet'\}\}")
new_save=""" ov.querySelector('[data-bus-save]').onclick=()=>{if(!canEditBusSeats()){toast?.('Öğretmen kullanıcıları servis oturma planını yalnız görüntüleyebilir.');return}const b=ov.querySelector('[data-bus-save]');renumberBusSeats();const servisId=editor.servisId,sablon=editor.sablon,elements=structuredClone(editor.elements);b.disabled=true;b.textContent='Kaydedildi ✓';let settled=false;const task=window.ServisOturmaService.planElementsKaydet(servisId,sablon,elements,false);Promise.resolve(task).then(()=>{settled=true;toast?.('Oturma planı cihazda kaydedildi.')}).catch(e=>{settled=true;console.error('[Transport/seating-save]',e);toast?.('Plan arka planda kaydedilemedi: '+(e?.message||e))});setTimeout(()=>{if(!settled)toast?.('Plan cihazda güncellendi; kalıcı kayıt arka planda tamamlanıyor.')},900);setTimeout(()=>{closeEditor();try{render()}catch(e){console.error('[Transport/seating-render]',e)}},120)}"""
transport,n=save_re.subn(new_save,transport,count=1)
if n!=1:
    raise SystemExit(f'save handler replacement count={n}')
transport_path.write_text(transport,encoding='utf-8')

css_path=Path('css/design-system.css')
css=css_path.read_text(encoding='utf-8')
marker='/* Servis Oturma — hızlı editör UX v4 */'
if marker not in css:
    css += '''\n\n/* Servis Oturma — hızlı editör UX v4 */
.ka-bus-tool-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;margin:10px 0 4px!important}.ka-bus-tool-grid.is-readonly{grid-template-columns:1fr!important}.ka-bus-tool-grid .ka-btn{width:100%!important;min-width:0!important;min-height:44px!important;padding:0 9px!important;font-size:12.5px!important;line-height:1.15!important}.ka-bus-classic-stage+.ka-bus-row-actions{display:none!important}.ka-bus-classic-legend+.ka-bus-classic-actions{display:none!important}.ka-bus-classic-shell .ka-bus-seat{height:78px!important;min-height:78px!important;padding:7px 4px 5px!important}.ka-bus-classic-shell .ka-bus-seat__avatar{width:21px!important;height:21px!important;margin:0 auto 2px!important;font-size:9px!important}.ka-bus-classic-shell .ka-bus-seat__name{display:block!important;width:100%!important;max-height:none!important;overflow:visible!important;text-overflow:clip!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;font-size:8.4px!important;line-height:1.08!important;font-weight:850!important;text-align:center!important}.ka-bus-classic-driver{min-height:96px!important;padding:8px 6px!important}.ka-bus-classic-driver strong{max-width:100%!important;overflow:visible!important;text-overflow:clip!important;white-space:normal!important;overflow-wrap:anywhere!important;font-size:14px!important;line-height:1.2!important;text-align:center!important}.ka-bus-classic-driver span{font-size:30px!important}.ka-bus-classic-content{padding-bottom:92px!important}
@media(max-width:420px){.ka-bus-tool-grid{gap:7px!important}.ka-bus-tool-grid .ka-btn{min-height:42px!important;font-size:11.5px!important;padding-inline:6px!important}.ka-bus-classic-shell .ka-bus-seat{height:80px!important;min-height:80px!important}.ka-bus-classic-shell .ka-bus-seat__name{font-size:8px!important;line-height:1.06!important}.ka-bus-classic-driver strong{font-size:13px!important}}
'''
css_path.write_text(css,encoding='utf-8')

index_path=Path('index.html')
index=index_path.read_text(encoding='utf-8')
for old,new in [('css/design-system.css?v=891','css/design-system.css?v=892'),('js/app-loader.js?v=890','js/app-loader.js?v=892')]:
    if old not in index: raise SystemExit(f'index token missing: {old}')
    index=index.replace(old,new,1)
index_path.write_text(index,encoding='utf-8')

loader_path=Path('js/app-loader.js')
loader=loader_path.read_text(encoding='utf-8')
if 'AppLoader v43' not in loader: raise SystemExit('loader header moved')
loader=loader.replace('AppLoader v43','AppLoader v44',1)
old="define('transport',['js/modules/report-engine.js','js/modules/transport.js']);"
new="define('transport',['js/modules/report-engine.js','js/modules/transport.js?v=892']);"
if old not in loader: raise SystemExit('transport loader token moved')
loader=loader.replace(old,new,1)
loader_path.write_text(loader,encoding='utf-8')

sw_path=Path('service-worker.js')
sw=sw_path.read_text(encoding='utf-8')
repls=[("const CACHE_ADI='oy-cache-v891';","const CACHE_ADI='oy-cache-v892';"),("'./css/design-system.css?v=891'","'./css/design-system.css?v=892'"),("'./js/app-loader.js?v=890'","'./js/app-loader.js?v=892'"),("'./js/modules/transport.js?v=890'","'./js/modules/transport.js?v=892'")]
for old,new in repls:
    if old not in sw: raise SystemExit(f'sw token missing: {old}')
    sw=sw.replace(old,new,1)
sw_path.write_text(sw,encoding='utf-8')

parity_path=Path('tests/transport-seating-classic-parity.test.js')
parity=parity_path.read_text(encoding='utf-8')
parity=parity.replace("define('transport',['js/modules/report-engine.js','js/modules/transport.js'])","define('transport',['js/modules/report-engine.js','js/modules/transport.js?v=892'])")
parity=parity.replace('css/design-system.css?v=891','css/design-system.css?v=892').replace("CACHE_ADI='oy-cache-v891'","CACHE_ADI='oy-cache-v892'")
parity_path.write_text(parity,encoding='utf-8')

vis_path=Path('tests/transport-bus-shell-visible.test.js')
vis=vis_path.read_text(encoding='utf-8')
vis=vis.replace('css/design-system.css?v=891','css/design-system.css?v=892').replace("CACHE_ADI='oy-cache-v891'","CACHE_ADI='oy-cache-v892'").replace("'./css/design-system.css?v=891'","'./css/design-system.css?v=892'")
vis_path.write_text(vis,encoding='utf-8')

test_path=Path('tests/transport-seating-editor-actions.test.js')
test_path.write_text(r'''const fs=require('fs');
const assert=require('assert');
const transport=fs.readFileSync('js/modules/transport.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
new Function(transport);
for(const token of ['ka-bus-tool-grid','data-bus-row-add','data-bus-row-remove','data-bus-report','data-bus-clear-all'])assert(transport.includes(token),`Editör aracı eksik: ${token}`);
assert(transport.includes("b.textContent='Kaydedildi ✓'"),'Kaydet butonu sonsuz Kaydediliyor durumunda kalmamalı.');
assert(transport.includes('const task=window.ServisOturmaService.planElementsKaydet'),'Local-first kayıt görevi başlatılmalı.');
assert(transport.includes('setTimeout(()=>{closeEditor();try{render()}'),'Kayıt arka planda sürse bile editör kullanıcıyı kilitlememeli.');
for(const token of ['Servis Oturma — hızlı editör UX v4','.ka-bus-tool-grid{','.ka-bus-classic-stage+.ka-bus-row-actions{display:none!important}', 'white-space:normal!important','overflow-wrap:anywhere!important'])assert(css.includes(token),`Yeni servis oturma UX stili eksik: ${token}`);
assert(index.includes('css/design-system.css?v=892')&&index.includes('js/app-loader.js?v=892'),'Index yeni servis oturma paketini yüklemeli.');
assert(loader.includes("define('transport',['js/modules/report-engine.js','js/modules/transport.js?v=892'])"),'Transport cache-bust sürümü güncel olmalı.');
assert(sw.includes("CACHE_ADI='oy-cache-v892'")&&sw.includes("'./js/modules/transport.js?v=892'")&&sw.includes("'./css/design-system.css?v=892'"),'Service Worker yeni servis oturma paketini önbelleğe almalı.');
console.log('Servis oturma editör hızlı erişim/kayıt/isim sığdırma testi başarılı.');
''',encoding='utf-8')

print('bus editor UX patch applied')
