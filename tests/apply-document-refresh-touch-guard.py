from pathlib import Path

p=Path('js/dokuman-okuyucu.js')
s=p.read_text(encoding='utf-8')

def rep(a,b,label):
    global s
    c=s.count(a)
    if c!=1:
        raise SystemExit(f'{label}: expected 1 match, got {c}')
    s=s.replace(a,b,1)

needle="function googleDocsMu(u){return /^https:\\/\\/(docs|drive)\\.google\\.com\\//i.test(String(u||''));}"
insert=needle+"\nfunction pullToRefreshAyarla(enabled){try{const p=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.PullToRefreshPlugin;if(p&&typeof p.setEnabled==='function'){const r=p.setEnabled({enabled:!!enabled});if(r&&typeof r.catch==='function')r.catch(()=>{});}}catch(_){}}\nfunction belgeYenilemeDokunmaKoruma(kok){if(!kok)return;const ust=kok.querySelector('.dv3h'),govde=kok.querySelector('#dv3body');const ac=()=>pullToRefreshAyarla(true),kapat=()=>pullToRefreshAyarla(false);if(ust){ust.addEventListener('touchstart',ac,{passive:true});ust.addEventListener('pointerdown',ac,{passive:true});}if(govde){govde.addEventListener('touchstart',kapat,{passive:true});govde.addEventListener('pointerdown',kapat,{passive:true});govde.addEventListener('touchend',ac,{passive:true});govde.addEventListener('touchcancel',ac,{passive:true});govde.addEventListener('pointerup',ac,{passive:true});govde.addEventListener('pointercancel',ac,{passive:true});}}"
rep(needle,insert,'refresh helpers')

old="document.body.appendChild(d);A={url,name,e,body:d.querySelector('#dv3body')};d.querySelector('#dv3x').onclick=close;d.querySelector('#dv3down').onclick=download;}"
new="document.body.appendChild(d);A={url,name,e,body:d.querySelector('#dv3body')};belgeYenilemeDokunmaKoruma(d);pullToRefreshAyarla(true);d.querySelector('#dv3x').onclick=close;d.querySelector('#dv3down').onclick=download;}"
rep(old,new,'open shell guard')

old="function close(){document.getElementById('dv3')?.remove();if(A?.blobUrl)URL.revokeObjectURL(A.blobUrl);A=null;pdf=null;wb=null;if(document.body.dataset.dv3Overflow!==undefined){document.body.style.overflow=document.body.dataset.dv3Overflow;delete document.body.dataset.dv3Overflow;}}"
new="function close(){pullToRefreshAyarla(true);document.getElementById('dv3')?.remove();if(A?.blobUrl)URL.revokeObjectURL(A.blobUrl);A=null;pdf=null;wb=null;if(document.body.dataset.dv3Overflow!==undefined){document.body.style.overflow=document.body.dataset.dv3Overflow;delete document.body.dataset.dv3Overflow;}}"
rep(old,new,'close restores refresh')

p.write_text(s,encoding='utf-8')

t=Path('tests/document-viewer-smoke.test.js')
ts=t.read_text(encoding='utf-8')
marker="console.log('Belge görüntüleyici smoke testleri başarılı.');"
extra="""
assert(src.includes('function pullToRefreshAyarla(enabled)'), 'Belge görüntüleyici native pull-to-refresh kontrolüne sahip olmalı.');
assert(src.includes("p.setEnabled({enabled:!!enabled})"), 'PullToRefreshPlugin setEnabled kullanılmalı.');
assert(src.includes("govde.addEventListener('touchstart',kapat"), 'Belge gövdesine dokununca pull-to-refresh kapanmalı.');
assert(src.includes("govde.addEventListener('touchend',ac"), 'Belge dokunması bitince pull-to-refresh geri açılmalı.');
assert(src.includes("ust.addEventListener('touchstart',ac"), 'Üst başlık alanında pull-to-refresh açık kalmalı.');
assert(src.includes('function close(){pullToRefreshAyarla(true);'), 'Belge kapanınca pull-to-refresh mutlaka geri açılmalı.');
"""
if extra.strip() not in ts:
    ts=ts.replace(marker,extra+'\n'+marker)
t.write_text(ts,encoding='utf-8')

sw=Path('service-worker.js')
x=sw.read_text(encoding='utf-8')
if "const CACHE_ADI = 'oy-cache-v435';" in x:
    x=x.replace("const CACHE_ADI = 'oy-cache-v435';","const CACHE_ADI = 'oy-cache-v436';",1)
elif "const CACHE_ADI = 'oy-cache-v436';" not in x:
    raise SystemExit('service worker cache version unexpected')
sw.write_text(x,encoding='utf-8')
