from pathlib import Path


def edit(path, fn):
    p=Path(path); s=p.read_text(encoding='utf-8'); n=fn(s)
    if n==s: raise SystemExit(f'No change applied: {path}')
    p.write_text(n, encoding='utf-8')


def patch_engine(s):
    old='''<button class="dv3btn" data-report-close type="button">✕ Kapat</button>'''
    new='''<button class="dv3btn dv3close" data-report-close type="button" aria-label="Kapat" title="Kapat">✕</button>'''
    if old not in s: raise SystemExit('close button anchor missing')
    s=s.replace(old,new,1)
    old_fit="""function fit(){const available=Math.max(240,viewport.clientWidth-12);scale=Math.min(1,available/page.w);apply();viewport.scrollTo({left:0,top:0});}\nfunction zoom(d){scale+=d;apply();}\nframe.onload=()=>{try{const doc=frame.contentDocument;contentH=Math.max(page.h,doc?.documentElement?.scrollHeight||0,doc?.body?.scrollHeight||0);}catch(_){}apply();requestAnimationFrame(fit);};"""
    new_fit="""function centerScene(){const scaledW=page.w*scale;scene.style.marginLeft=scaledW<Math.max(0,viewport.clientWidth-8)?'auto':'0';scene.style.marginRight=scaledW<Math.max(0,viewport.clientWidth-8)?'auto':'0';}\nfunction fit(){const availableW=Math.max(220,viewport.clientWidth-16),availableH=Math.max(220,viewport.clientHeight-16);scale=Math.min(1,availableW/page.w,availableH/contentH);apply();centerScene();viewport.scrollTo({left:0,top:0,behavior:'auto'});}\nfunction zoom(d){scale+=d;apply();centerScene();}\nfunction scheduleFit(){requestAnimationFrame(()=>requestAnimationFrame(fit));setTimeout(fit,120);}\nframe.onload=()=>{try{const doc=frame.contentDocument;contentH=Math.max(page.h,doc?.documentElement?.scrollHeight||0,doc?.body?.scrollHeight||0);}catch(_){}apply();scheduleFit();};\nif(global.ResizeObserver){const ro=new ResizeObserver(()=>fit());ro.observe(viewport);ov._reportResizeObserver=ro;}else global.addEventListener?.('resize',fit,{passive:true});"""
    if old_fit not in s: raise SystemExit('fit anchor missing')
    return s.replace(old_fit,new_fit,1)

edit('js/modules/report-engine.js',patch_engine)


def patch_css(s):
    old='''@media(max-width:767px){\n  .dv3h.dv3h-report{display:grid;grid-template-columns:auto auto auto minmax(0,1fr) auto;grid-template-areas:\"close title title title print\" \"minus zoom plus . .\";align-items:center;gap:5px;overflow:hidden;padding-left:max(6px,var(--ka-safe-left));padding-right:max(6px,var(--ka-safe-right))}\n  .dv3h-report [data-report-close]{grid-area:close}.dv3h-report .dv3title{grid-area:title;min-width:0}.dv3h-report [data-report-minus]{grid-area:minus}.dv3h-report [data-report-zoom]{grid-area:zoom;margin:0;min-width:46px}.dv3h-report [data-report-plus]{grid-area:plus}.dv3h-report [data-report-print]{grid-area:print;justify-self:end;max-width:100%;padding-inline:10px}\n  .dv3h-report .dv3title b{font-size:13px}.dv3h-report .dv3title small{font-size:10px}\n}\n@media(max-width:390px){.dv3h-report .dv3title small{display:none}.dv3h-report [data-report-close]{font-size:0}.dv3h-report [data-report-close]::first-letter{font-size:15px}}'''
    new='''@media(max-width:767px){\n  .dv3h.dv3h-report{display:grid;grid-template-columns:44px minmax(0,1fr) auto;grid-template-areas:\"close title print\" \"minus zoom plus\";align-items:center;column-gap:8px;row-gap:7px;overflow:hidden;padding-top:max(8px,var(--ka-safe-top));padding-bottom:8px;padding-left:max(8px,var(--ka-safe-left));padding-right:max(8px,var(--ka-safe-right));min-height:auto}\n  .dv3h-report [data-report-close]{grid-area:close;width:44px;height:44px;min-height:44px;padding:0;display:grid;place-items:center;font-size:23px;line-height:1;border-radius:12px}.dv3h-report .dv3title{grid-area:title;min-width:0}.dv3h-report [data-report-minus]{grid-area:minus;justify-self:start;width:44px;padding-inline:0}.dv3h-report [data-report-zoom]{grid-area:zoom;margin:0;min-width:58px;justify-self:center;font-size:13px}.dv3h-report [data-report-plus]{grid-area:plus;justify-self:end;width:44px;padding-inline:0}.dv3h-report [data-report-print]{grid-area:print;justify-self:end;max-width:108px;min-width:92px;padding-inline:10px}\n  .dv3h-report .dv3title b{font-size:14px;line-height:1.2}.dv3h-report .dv3title small{display:block;font-size:10px;line-height:1.2;margin-top:2px}.dv3pdfviewport{scrollbar-gutter:stable both-edges}\n}\n@media(max-width:390px){.dv3h-report .dv3title b{font-size:13px}.dv3h-report .dv3title small{display:none}.dv3h-report [data-report-print]{min-width:86px;max-width:94px;padding-inline:8px}}'''
    if old not in s: raise SystemExit('mobile report css anchor missing')
    return s.replace(old,new,1)

edit('css/design-system.css',patch_css)

# Cache-bust central CSS and PWA cache so devices receive the new preview runtime/styles.
edit('index.html',lambda s:s.replace('css/design-system.css?v=942','css/design-system.css?v=943'))

def patch_sw(s):
    s=s.replace("const CACHE_ADI='oy-cache-v946';","const CACHE_ADI='oy-cache-v947';")
    s=s.replace("./css/design-system.css?v=942","./css/design-system.css?v=943")
    return s
edit('service-worker.js',patch_sw)


def patch_test(s):
    s=s.replace("assert(css.includes('.dv3h.dv3h-report')&&css.includes('grid-template-areas:\\\"close title title title print\\\" \\\"minus zoom plus . .\\\"'),'Mobil rapor araç çubuğu taşmayan grid düzenine sahip olmalı.');", "assert(css.includes('.dv3h.dv3h-report')&&css.includes('grid-template-areas:\\"close title print\\" \\"minus zoom plus\\"')&&css.includes('width:44px;height:44px'),'Mobil rapor araç çubuğu kompakt ve taşmayan grid düzenine sahip olmalı.');")
    s=s.replace("assert(index.includes('css/design-system.css?v=942'),'Yeni mobil rapor stili güncel design-system sürümüyle yüklenmeli.');", "const cssVer=index.match(/css\\/design-system\\.css\\?v=(\\d+)/);assert(cssVer&&Number(cssVer[1])>=943,'Yeni mobil rapor stili güncel design-system sürümüyle yüklenmeli.');")
    insert="assert(engine.includes('function scheduleFit()')&&engine.includes('availableH=Math.max(220,viewport.clientHeight-16)')&&engine.includes('ResizeObserver'),'Rapor ilk açılışta hem genişlik hem yükseklik bakımından sayfaya sığmalı ve ekran değişiminde yeniden hesaplanmalı.');\nassert(engine.includes('class=\\\"dv3btn dv3close\\\"')&&engine.includes('aria-label=\\\"Kapat\\\"'),'Kapat düğmesi kompakt ve erişilebilir olmalı.');\n"
    anchor="assert(engine.includes('>🖨 Yazdır</button>'),'Mobil yazdır düğmesi kısa ve görünür etiket kullanmalı.');\n"
    if anchor not in s: raise SystemExit('test insert anchor missing')
    return s.replace(anchor,anchor+insert,1)
edit('tests/report-preview-print-layout-regression.test.js',patch_test)
