from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')

# 1) ReportEngine: replace the whole report-preview surface with a dedicated component.
p='js/modules/report-engine.js'
s=read(p)
start=s.index('function closePreview({fromBack=false}={})')
end=s.index('async function printReport(title,body,opts={})', start)
new_block=r'''function closePreview({fromBack=false}={}){const ov=document.getElementById('kaReportPreview');try{ov?._reportResizeObserver?.disconnect?.()}catch(_){}ov?.remove();global.KorukPlatformAdapter?.setPullToRefreshEnabled?.(true).catch?.(()=>{});if(fromBack)rearmShellBack();}
function previewHtml(html,{title='Rapor Önizleme',fileName:name=title,yon='dikey'}={}){
  closePreview();installReportBackGuard();global.KorukPlatformAdapter?.setPullToRefreshEnabled?.(false).catch?.(()=>{});
  const safeYon=yon==='yatay'?'yatay':'dikey',page=pagePx(safeYon),ov=document.createElement('div');
  ov.id='kaReportPreview';ov.className='dv3 ka-report-preview';
  ov.innerHTML=`<header class="ka-report-preview__toolbar"><div class="ka-report-preview__main"><button class="dv3btn ka-report-preview__close" data-report-close type="button" aria-label="Kapat" title="Kapat">✕</button><div class="ka-report-preview__title"><b>${esc(title)}</b><small>${safeYon==='yatay'?'Yatay':'Dikey'} A4 önizleme</small></div><button class="dv3btn primary ka-report-preview__print" data-report-print type="button" aria-label="Yazdır / PDF">🖨 Yazdır</button></div><div class="ka-report-preview__zoom"><button class="dv3btn" data-report-minus type="button" aria-label="Uzaklaştır">−</button><span class="dv3pdfpageinfo" data-report-zoom>100%</span><button class="dv3btn" data-report-plus type="button" aria-label="Yakınlaştır">+</button><button class="dv3btn ka-report-preview__fit" data-report-fit type="button">Sığdır</button><button class="dv3btn ka-report-preview__actual" data-report-100 type="button">%100</button></div></header><div class="ka-report-preview__body"><div class="ka-report-preview__viewport" data-report-viewport><div class="ka-report-preview__scene" data-report-scene><iframe id="kaReportFrame" class="dv3frame ka-report-preview__frame" title="${esc(title)}"></iframe></div></div></div>`;
  document.body.appendChild(ov);
  const frame=ov.querySelector('#kaReportFrame'),viewport=ov.querySelector('[data-report-viewport]'),scene=ov.querySelector('[data-report-scene]'),label=ov.querySelector('[data-report-zoom]');
  let scale=1,contentH=page.h,autoFit=true,fitTimer=0;
  function alignScene(){const scaledW=page.w*scale,room=Math.max(0,viewport.clientWidth-16),center=scaledW<=room;scene.style.marginLeft=center?'auto':'0';scene.style.marginRight=center?'auto':'0';}
  function apply(){scale=Math.max(.25,Math.min(2.5,scale));frame.style.width=page.w+'px';frame.style.height=contentH+'px';frame.style.transform=`scale(${scale})`;scene.style.width=Math.ceil(page.w*scale)+'px';scene.style.height=Math.ceil(contentH*scale)+'px';label.textContent=Math.round(scale*100)+'%';alignScene();}
  function fit(){const width=viewport.clientWidth;if(width<80){clearTimeout(fitTimer);fitTimer=setTimeout(fit,60);return;}autoFit=true;scale=Math.min(1,Math.max(.25,(width-16)/page.w));apply();viewport.scrollTo({left:0,top:0,behavior:'auto'});}
  function scheduleFit(){requestAnimationFrame(()=>requestAnimationFrame(fit));clearTimeout(fitTimer);fitTimer=setTimeout(fit,120);}
  function zoom(delta){autoFit=false;scale+=delta;apply();}
  function actual(){autoFit=false;scale=1;apply();viewport.scrollTo({left:0,top:0,behavior:'auto'});}
  ov.querySelector('[data-report-close]').onclick=()=>closePreview();
  ov.querySelector('[data-report-minus]').onclick=()=>zoom(-.1);
  ov.querySelector('[data-report-plus]').onclick=()=>zoom(.1);
  ov.querySelector('[data-report-fit]').onclick=fit;
  ov.querySelector('[data-report-100]').onclick=actual;
  ov.querySelector('[data-report-print]').onclick=async()=>{const b=ov.querySelector('[data-report-print]'),old=b.textContent;b.disabled=true;b.textContent='Hazırlanıyor…';try{await printHtml(html,name,safeYon);}catch(e){global.toast?.('Yazdırma açılamadı: '+(e?.message||e));}finally{b.disabled=false;b.textContent=old;}};
  if(global.ResizeObserver){const ro=new ResizeObserver(()=>{if(autoFit)scheduleFit();else alignScene();});ro.observe(viewport);ov._reportResizeObserver=ro;}
  frame.onload=()=>{try{const doc=frame.contentDocument;contentH=Math.max(page.h,doc?.documentElement?.scrollHeight||0,doc?.body?.scrollHeight||0);}catch(_){}scheduleFit();};
  scheduleFit();frame.srcdoc=html;
  return ov;
}
'''
s=s[:start]+new_block+s[end:]
write(p,s)

# 2) Design system: remove the old report-toolbar override and add one canonical report preview component.
p='css/design-system.css'
s=read(p)
s=re.sub(r'/\* Rapor önizleme araç çubuğu: dar mobil ekranlarda Yazdır düğmesi daima görünür\. \*/\s*@media\(max-width:767px\)\{.*?\}\s*@media\(max-width:390px\)\{.*?\}\s*', '', s, count=1, flags=re.S)
canonical=r'''
/* REPORT PREVIEW — CANONICAL
   Rapor önizlemesi generic belge görüntüleyiciden bağımsız, tam viewport sahibi bir yüzeydir. */
.ka-report-preview{position:fixed!important;inset:0!important;width:100vw!important;max-width:none!important;height:100dvh!important;min-height:100dvh!important;margin:0!important;transform:none!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;background:var(--dv-body-bg)!important}
.ka-report-preview__toolbar{flex:0 0 auto;width:100%;background:var(--dv-hbg);border-bottom:1px solid var(--dv-border);padding:max(8px,var(--ka-safe-top)) max(8px,var(--ka-safe-right)) 8px max(8px,var(--ka-safe-left));display:grid;gap:7px;z-index:2}
.ka-report-preview__main{display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:8px;min-width:0}
.ka-report-preview__close{width:44px;height:44px;min-height:44px;padding:0;display:grid;place-items:center;font-size:23px;line-height:1;border-radius:12px}
.ka-report-preview__title{min-width:0}.ka-report-preview__title b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dv-text)!important;font-size:14px;line-height:1.2}.ka-report-preview__title small{display:block;margin-top:2px;color:var(--dv-muted)!important;font-size:10px;line-height:1.2}
.ka-report-preview__print{justify-self:end;min-width:92px;max-width:110px;padding-inline:10px}
.ka-report-preview__zoom{display:grid;grid-template-columns:44px 64px 44px auto auto;align-items:center;justify-content:start;gap:7px}.ka-report-preview__zoom .dv3btn{min-height:44px}.ka-report-preview__zoom [data-report-minus],.ka-report-preview__zoom [data-report-plus]{width:44px;padding-inline:0}.ka-report-preview__zoom [data-report-zoom]{margin:0;min-width:64px;text-align:center;font-size:13px}
.ka-report-preview__body{flex:1 1 auto;min-height:0;min-width:0;width:100%;overflow:hidden;background:var(--dv-body-bg)}
.ka-report-preview__viewport{width:100%;height:100%;min-width:0;min-height:0;overflow:auto;padding:8px;box-sizing:border-box;overscroll-behavior:contain;touch-action:pan-x pan-y;-webkit-overflow-scrolling:touch}
.ka-report-preview__scene{position:relative;margin:0 auto}.ka-report-preview__frame{position:absolute;left:0;top:0;transform-origin:top left;background:#fff;border:0;max-width:none!important}
@media(max-width:767px){.ka-report-preview__fit,.ka-report-preview__actual{display:none}.ka-report-preview__zoom{grid-template-columns:44px 64px 44px;justify-content:start}.ka-report-preview__viewport{padding:4px}}
@media(max-width:390px){.ka-report-preview__title b{font-size:13px}.ka-report-preview__title small{display:none}.ka-report-preview__print{min-width:86px;max-width:94px;padding-inline:8px}}
@media(min-width:768px){.ka-report-preview__toolbar{grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;padding:10px 14px}.ka-report-preview__main{grid-template-columns:44px minmax(180px,1fr) auto}.ka-report-preview__zoom{justify-content:end}.ka-report-preview__viewport{padding:12px}}
'''
s=s.rstrip()+canonical+'\n'
write(p,s)

# 3) Ensure clients fetch the new canonical CSS and a fresh SW cache.
p='index.html';s=read(p);s=s.replace('css/design-system.css?v=942','css/design-system.css?v=943');write(p,s)
p='service-worker.js';s=read(p);s=s.replace("const CACHE_ADI='oy-cache-v946';","const CACHE_ADI='oy-cache-v947';");s=s.replace("./css/design-system.css?v=942","./css/design-system.css?v=943");write(p,s)

# 4) Update the existing regression contract to the new canonical component.
p='tests/report-preview-print-layout-regression.test.js'
new_test=r'''const fs=require('fs');const assert=require('assert');
const engine=fs.readFileSync('js/modules/report-engine.js','utf8');const css=fs.readFileSync('css/design-system.css','utf8');const schedule=fs.readFileSync('js/core/schedule-report-redesign.js','utf8');const index=fs.readFileSync('index.html','utf8');const init=fs.readFileSync('js/firebase-init.js','utf8');const sw=fs.readFileSync('service-worker.js','utf8');
new Function(engine);new Function(schedule);
assert(engine.includes('async function inlineReportAssets(html)'),'Rapor logosu HTML içine gömülmeli.');
assert(engine.includes('box-sizing:border-box;width:${w}!important;min-height:${h}!important'),'A4 rapor padding dahil sayfa ölçüsünde kalmalı.');
assert(engine.includes("ov.className='dv3 ka-report-preview'"),'Rapor önizleme generic görüntüleyiciden ayrılmış canonical yüzey kullanmalı.');
assert(engine.includes('function scheduleFit()')&&engine.includes('scheduleFit();frame.srcdoc=html'),'Sığdırma iframe load olayına bağlı kalmadan ilk açılışta çalışmalı.');
assert(engine.includes('ResizeObserver')&&engine.includes('if(autoFit)scheduleFit()'),'Viewport değişimlerinde otomatik sığdırma korunmalı.');
assert(engine.includes("scene.style.marginLeft=center?'auto':'0'"),'Sığan rapor ortalanmalı, büyük rapor soldan kaydırılabilir başlamalı.');
assert(engine.includes('aria-label="Kapat"')&&engine.includes('>✕</button>'),'Kapat butonu kompakt ve erişilebilir olmalı.');
assert(engine.includes('>🖨 Yazdır</button>'),'Yazdır düğmesi kısa ve görünür etiket kullanmalı.');
assert(css.includes('REPORT PREVIEW — CANONICAL')&&css.includes('.ka-report-preview{position:fixed!important;inset:0!important;width:100vw!important')&&css.includes('.ka-report-preview__main{display:grid;grid-template-columns:44px minmax(0,1fr) auto'),'Rapor yüzeyi ve header tam viewport canonical düzene sahip olmalı.');
assert(!css.includes('grid-template-areas:"close title title title print"'),'Eski rapor toolbar yaması kaldırılmış olmalı.');
assert(schedule.includes('border:.65pt solid #7f9189!important')&&schedule.includes('border:.55pt solid #9eaca6!important'),'Çarşaf hücre kenarlıkları daha belirgin olmalı.');
const cssVer=index.match(/css\/design-system\.css\?v=(\d+)/);assert(cssVer&&Number(cssVer[1])>=943,'Canonical rapor stili yeni sürümle yüklenmeli.');
assert(init.includes('schedule-report-redesign.js?v=941'),'Çarşaf rapor stili yüklenmeli.');
const cache=sw.match(/const CACHE_ADI='oy-cache-v(\d+)'/);assert(cache&&Number(cache[1])>=947,'Yeni rapor önizleme motoru için SW cache yükseltilmeli.');
console.log('Canonical rapor önizleme yerleşimi ve yazdırma regresyon testi başarılı.');
'''
write(p,new_test)
