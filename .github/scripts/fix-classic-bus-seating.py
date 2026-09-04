from pathlib import Path
import re

transport_path = Path('js/modules/transport.js')
transport = transport_path.read_text(encoding='utf-8')

old_plan = '''function planElements(plan,sablon){const sb=sablon||plan?.sablon||'ducato';if(Array.isArray(plan?.elements)&&plan.elements.length)return structuredClone(plan.elements);const yerlesim=Array.isArray(plan?.yerlesim)&&plan.yerlesim.length?plan.yerlesim:(SO_SABLONLAR[sb]?.yerlesimUret()||[]);return legacyToElements(yerlesim,plan?.koltuklar||[]);}'''
new_plan = '''function elementAssignmentsToLegacy(elements){return(Array.isArray(elements)?elements:[]).map((el,idx)=>{const p=el?.properties||{};if(el?.type==='sofor'||!(el?.studentId||p.studentName||p.reserved||p.stop||p.note||el?.color||el?.locked))return null;return{no:idx+1,ogrenciId:el.studentId||null,ogrenciAdi:p.studentName||'',rezerve:!!p.reserved,durak:p.stop||'',not:p.note||'',renk:el.color||null,kilit:!!el.locked};}).filter(Boolean)}
function busElementLayoutUsable(elements){const list=Array.isArray(elements)?elements:[],seats=list.filter(e=>e&&e.type!=='sofor'&&e.visible!==false);if(!seats.length)return false;const allowed=new Set(['sol-dis','sol-ic','sag-ic','sag-dis','arka']);for(const e of seats){if(e.row===null||e.row===undefined||e.row===''||!Number.isFinite(Number(e.row)))return false;if(!allowed.has(String(e.properties?.konum||'')))return false}const rows=new Map();for(const e of seats){const key=Number(e.row);if(!rows.has(key))rows.set(key,[]);rows.get(key).push(e)}if(seats.length>4&&rows.size<2)return false;for(const row of rows.values()){if(row.length>4)return false;const normal=row.filter(e=>e.properties?.konum!=='arka').map(e=>e.properties?.konum);if(new Set(normal).size!==normal.length)return false}return true}
function planElements(plan,sablon){const sb=sablon||plan?.sablon||'ducato',raw=Array.isArray(plan?.elements)?plan.elements:[];if(sb==='ozel'&&raw.length)return structuredClone(raw);if(raw.length&&busElementLayoutUsable(raw))return structuredClone(raw);const yerlesim=Array.isArray(plan?.yerlesim)&&plan.yerlesim.length?plan.yerlesim:(SO_SABLONLAR[sb]?.yerlesimUret()||[]),assignments=Array.isArray(plan?.koltuklar)&&plan.koltuklar.length?plan.koltuklar:elementAssignmentsToLegacy(raw);return legacyToElements(yerlesim,assignments);}'''
if old_plan not in transport:
    raise SystemExit('planElements contract not found')
transport = transport.replace(old_plan, new_plan, 1)

old_shell = 'return `<div class="ka-bus-cabin ka-bus-classic-shell">'
new_shell = 'return `<div class="ka-bus-classic-shell" data-bus-classic-shell>'
if old_shell not in transport:
    raise SystemExit('classic bus shell root not found')
transport = transport.replace(old_shell, new_shell, 1)
transport_path.write_text(transport, encoding='utf-8')

css_path = Path('css/design-system.css')
css = css_path.read_text(encoding='utf-8')
marker = '/* Servis Oturma — eski ekran birebir düzeltme v3 */'
if marker not in css:
    css += r'''

/* Servis Oturma — eski ekran birebir düzeltme v3
   Referans: mobil klasik oturma planı. Yeni veri katmanı/local-first korunur. */
.ka-bus-classic-modal{
  width:min(660px,calc(100% - 18px))!important;
}
.ka-bus-classic-header{
  padding:14px 18px!important;
}
.ka-bus-classic-header h2{
  font-size:clamp(18px,4.7vw,24px)!important;
  line-height:1.18!important;
}
.ka-bus-classic-header .ka-icon-button{
  width:42px!important;
  height:42px!important;
  flex:0 0 42px!important;
}
.ka-bus-classic-content{
  padding:14px 16px 18px!important;
  gap:14px!important;
}
.ka-bus-classic-hero{
  padding:16px!important;
  border-radius:20px!important;
}
.ka-bus-classic-hero h3{
  margin-bottom:14px!important;
  font-size:20px!important;
}
.ka-bus-classic-stats{
  grid-template-columns:repeat(3,minmax(0,1fr))!important;
  gap:12px!important;
}
.ka-bus-classic-stats div:last-child{
  grid-column:1!important;
}
.ka-bus-classic-stats small{
  font-size:11px!important;
}
.ka-bus-classic-stats strong{
  font-size:clamp(16px,4.3vw,22px)!important;
}
.ka-bus-classic-hero p{
  margin-top:13px!important;
  padding-top:11px!important;
  font-size:13px!important;
}
.ka-bus-template-section{
  margin-top:0!important;
  gap:8px!important;
}
.ka-bus-template-grid{
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:9px!important;
}
.ka-bus-template-card{
  min-width:0!important;
  min-height:70px!important;
  padding:10px 12px!important;
  border-radius:14px!important;
}
.ka-bus-template-card>span{
  font-size:20px!important;
}
.ka-bus-template-card strong{
  min-width:0!important;
  font-size:14px!important;
  white-space:normal!important;
}
.ka-bus-template-card small{
  min-width:0!important;
  font-size:11px!important;
}
.ka-bus-template-card:last-child:nth-child(odd){
  grid-column:1/-1!important;
}
.ka-bus-template-card.is-active{
  background:#e72b2f!important;
  border-color:#e72b2f!important;
  color:#fff!important;
  box-shadow:0 8px 20px rgba(231,43,47,.24)!important;
}
.ka-bus-template-card.is-active small{
  color:rgba(255,255,255,.78)!important;
}
.ka-bus-edit-row{
  margin:2px 0 0!important;
}
.ka-bus-classic-stage{
  display:block!important;
  width:100%!important;
  overflow-x:hidden!important;
  padding:8px 0 2px!important;
  margin-top:2px!important;
}
.ka-bus-classic-shell{
  position:relative!important;
  display:block!important;
  box-sizing:border-box!important;
  width:100%!important;
  max-width:410px!important;
  min-width:0!important;
  min-height:0!important;
  margin:0 auto!important;
  padding:24px 14px 18px!important;
  border:3px solid color-mix(in srgb,var(--ka-text-muted) 48%,transparent)!important;
  border-radius:44px 44px 22px 22px!important;
  background:color-mix(in srgb,var(--ka-card-bg) 70%,#546274 30%)!important;
  box-shadow:inset 0 -11px 0 rgba(0,0,0,.12),0 14px 28px rgba(0,0,0,.16)!important;
  overflow:hidden!important;
}
.ka-bus-classic-front-row{
  grid-template-columns:minmax(0,1.18fr) minmax(0,1fr)!important;
  gap:12px!important;
  margin-bottom:8px!important;
}
.ka-bus-classic-front-seats,
.ka-bus-classic-side{
  min-width:0!important;
}
.ka-bus-classic-body{
  gap:7px!important;
}
.ka-bus-classic-row{
  grid-template-columns:minmax(0,1fr) 30px minmax(0,1fr)!important;
  gap:6px!important;
  min-width:0!important;
}
.ka-bus-classic-side{
  gap:6px!important;
  min-height:62px!important;
}
.ka-bus-classic-aisle{
  min-height:62px!important;
}
.ka-bus-classic-shell .ka-bus-seat{
  flex:0 1 60px!important;
  width:min(60px,100%)!important;
  min-width:0!important;
  height:62px!important;
  min-height:62px!important;
  padding:8px 4px 4px!important;
  border-radius:15px!important;
}
.ka-bus-classic-shell .ka-bus-seat__avatar{
  width:25px!important;
  height:25px!important;
  font-size:11px!important;
}
.ka-bus-classic-shell .ka-bus-seat__name{
  font-size:10px!important;
}
.ka-bus-classic-rear{
  gap:6px!important;
  margin-top:12px!important;
  padding-top:12px!important;
}
.ka-bus-row-actions{
  gap:10px!important;
  margin:12px 0!important;
}
.ka-bus-classic-legend{
  margin-top:10px!important;
  padding:9px 12px!important;
  gap:10px!important;
}
.ka-bus-classic-actions{
  gap:9px!important;
  margin-top:10px!important;
}
.ka-bus-classic-modal .ka-btn--secondary,
.ka-bus-classic-modal [data-bus-layout-edit],
.ka-bus-classic-modal [data-bus-row-add],
.ka-bus-classic-modal [data-bus-row-remove],
.ka-bus-classic-modal [data-bus-clear-all],
.ka-bus-classic-modal [data-bus-report]{
  background:var(--ka-button-secondary-bg)!important;
  color:var(--ka-button-secondary-text)!important;
  border-color:var(--ka-button-secondary-border)!important;
  box-shadow:none!important;
}
.ka-bus-classic-footer{
  padding:13px 16px max(13px,var(--ka-safe-bottom))!important;
  gap:12px!important;
}
.ka-bus-classic-footer .ka-btn{
  min-height:50px!important;
  font-size:16px!important;
}
.ka-bus-classic-footer [data-bus-save]{
  background:var(--ka-button-bg)!important;
  color:var(--ka-button-text)!important;
  border-color:transparent!important;
}
@media(max-width:560px){
  .ka-bus-editor-backdrop{
    padding:8px!important;
    align-items:center!important;
  }
  .ka-bus-editor-modal{
    width:100%!important;
    height:auto!important;
    max-height:calc(100dvh - 16px)!important;
    border-radius:20px!important;
  }
  .ka-bus-classic-content{
    padding:12px!important;
  }
  .ka-bus-classic-hero{
    padding:14px!important;
  }
  .ka-bus-template-grid{
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
  }
  .ka-bus-classic-shell{
    width:100%!important;
    max-width:390px!important;
    min-width:0!important;
  }
  .ka-bus-classic-front-row{
    grid-template-columns:minmax(0,1.16fr) minmax(0,1fr)!important;
    gap:8px!important;
  }
  .ka-bus-classic-row{
    grid-template-columns:minmax(0,1fr) 28px minmax(0,1fr)!important;
    gap:5px!important;
  }
  .ka-bus-classic-side{
    gap:5px!important;
  }
  .ka-bus-classic-shell .ka-bus-seat{
    flex-basis:56px!important;
    width:min(56px,100%)!important;
    height:60px!important;
    min-height:60px!important;
  }
}
@media(max-width:390px){
  .ka-bus-classic-header{
    padding:12px 13px!important;
  }
  .ka-bus-classic-header h2{
    font-size:18px!important;
  }
  .ka-bus-classic-stats{
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
    gap:8px!important;
  }
  .ka-bus-classic-stats div:last-child{
    grid-column:1!important;
  }
  .ka-bus-template-grid{
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    gap:7px!important;
  }
  .ka-bus-template-card{
    min-height:66px!important;
    padding:8px!important;
    column-gap:7px!important;
  }
  .ka-bus-template-card>span{
    font-size:18px!important;
  }
  .ka-bus-template-card strong{
    font-size:12px!important;
  }
  .ka-bus-template-card small{
    font-size:10px!important;
  }
  .ka-bus-classic-shell{
    transform:none!important;
    width:100%!important;
    min-width:0!important;
    padding-inline:10px!important;
  }
  .ka-bus-classic-shell .ka-bus-seat{
    flex-basis:51px!important;
    width:min(51px,100%)!important;
    height:58px!important;
    min-height:58px!important;
  }
  .ka-bus-classic-shell .ka-bus-seat__name{
    font-size:9px!important;
  }
  .ka-bus-classic-footer{
    gap:8px!important;
    padding-inline:10px!important;
  }
}
'''
css_path.write_text(css, encoding='utf-8')

index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
if 'css/design-system.css?v=889' not in index or 'js/app-loader.js?v=882' not in index:
    raise SystemExit('index cache versions moved')
index = index.replace('css/design-system.css?v=889', 'css/design-system.css?v=890', 1)
index = index.replace('js/app-loader.js?v=882', 'js/app-loader.js?v=890', 1)
index_path.write_text(index, encoding='utf-8')

loader_path = Path('js/app-loader.js')
loader = loader_path.read_text(encoding='utf-8')
loader = loader.replace('/* Koruk Asistan — AppLoader v42', '/* Koruk Asistan — AppLoader v43', 1)
old_transport = "define('transport',['js/modules/report-engine.js','js/modules/transport.js']);"
new_transport = "define('transport',['js/modules/report-engine.js','js/modules/transport.js?v=890']);"
if old_transport not in loader:
    raise SystemExit('transport loader definition not found')
loader = loader.replace(old_transport, new_transport, 1)
loader_path.write_text(loader, encoding='utf-8')

sw_path = Path('service-worker.js')
sw = sw_path.read_text(encoding='utf-8')
if "const CACHE_ADI='oy-cache-v889';" not in sw:
    raise SystemExit('service worker cache moved')
sw = sw.replace("const CACHE_ADI='oy-cache-v889';", "const CACHE_ADI='oy-cache-v890';", 1)
if "'./css/design-system.css?v=889','./js/app-loader.js?v=882'" not in sw:
    raise SystemExit('service worker versioned shell paths moved')
sw = sw.replace("'./css/design-system.css?v=889','./js/app-loader.js?v=882'", "'./css/design-system.css?v=890','./js/app-loader.js?v=890'", 1)
needle = "'./js/modules/transport.js'"
if "'./js/modules/transport.js?v=890'" not in sw:
    if needle not in sw:
        raise SystemExit('transport precache path not found')
    sw = sw.replace(needle, "'./js/modules/transport.js?v=890','./js/modules/transport.js'", 1)
sw_path.write_text(sw, encoding='utf-8')

test_path = Path('tests/transport-seating-classic-parity.test.js')
test_path.write_text(r'''const fs=require('fs');
const assert=require('assert');
const transport=fs.readFileSync('js/modules/transport.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
new Function(transport);
for(const token of ['function busElementLayoutUsable','function elementAssignmentsToLegacy','busElementLayoutUsable(raw)','data-bus-classic-shell','ka-bus-classic-stats','ka-bus-template-grid','data-bus-row-add','data-bus-row-remove','data-bus-report'])assert(transport.includes(token),`Eski oturma paritesi eksik: ${token}`);
assert(transport.includes("if(sb==='ozel'&&raw.length)"),'Özel tasarım ham yerleşimi korunmalı.');
assert(transport.includes('assignments=Array.isArray(plan?.koltuklar)&&plan.koltuklar.length?plan.koltuklar:elementAssignmentsToLegacy(raw)'),'Bozuk element yerleşiminde öğrenci atamaları kaybolmamalı.');
assert(!transport.includes('<div class="ka-bus-cabin ka-bus-classic-shell">'),'Klasik araç şeması eski generic cabin sınıfıyla çakışmamalı.');
for(const token of ['Servis Oturma — eski ekran birebir düzeltme v3','.ka-bus-template-card.is-active','background:#e72b2f!important','.ka-bus-classic-stage{','overflow-x:hidden!important','.ka-bus-classic-shell{','min-width:0!important'])assert(css.includes(token),`Klasik mobil stil eksik: ${token}`);
assert(css.includes('@media(max-width:390px)')&&css.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important'),'Dar telefonda araç tipleri iki sütunda kalmalı.');
assert(css.includes('.ka-bus-classic-stats div:last-child')&&css.includes('grid-column:1!important'),'Doluluk eski ekrandaki gibi ikinci satır ilk hücrede olmalı.');
assert(loader.includes("js/modules/transport.js?v=890"),'Transport modülü cache-busted yüklenmeli.');
assert(index.includes('css/design-system.css?v=890')&&index.includes('js/app-loader.js?v=890'),'Index yeni oturma düzenini zorunlu yüklemeli.');
assert(sw.includes("CACHE_ADI='oy-cache-v890'")&&sw.includes("./js/modules/transport.js?v=890"),'Service Worker yeni transport paketini önbelleğe almalı.');
for(const forbidden of ['db.collection','firebase.firestore','localStorage.setItem','localStorage.removeItem'])assert(!transport.includes(forbidden),`Local-first sınırı ihlal edildi: ${forbidden}`);
console.log('Servis oturma eski ekran mobil paritesi başarılı.');
''', encoding='utf-8')

print('classic bus seating parity patch applied')
