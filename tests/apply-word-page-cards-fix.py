from pathlib import Path
p=Path('js/dokuman-okuyucu.js'); s=p.read_text(encoding='utf-8')
def rep(a,b,label):
    global s
    if s.count(a)!=1: raise SystemExit(f'{label}: {s.count(a)} matches')
    s=s.replace(a,b,1)
rep(".dv3word .docx-wrapper{padding:18px!important;background:#cfd3d7!important;align-items:flex-start!important;justify-content:flex-start!important;min-width:max-content!important}.dv3word section.docx{margin:0 0 18px 0!important;box-shadow:0 2px 12px #0005!important;background:#fff!important}",".dv3word .docx-wrapper{padding:18px!important;background:#aeb4ba!important;align-items:flex-start!important;justify-content:flex-start!important;min-width:max-content!important;display:flex!important;flex-direction:column!important;gap:22px!important}.dv3word section.docx{margin:0!important;box-shadow:0 4px 18px #0007!important;background:#fff!important;outline:1px solid #d6d9dc!important;flex:0 0 auto!important}.dv3word section.docx:last-child{margin-bottom:0!important}.dv3wordpageinfo{margin-left:6px;min-width:66px;text-align:center;font-size:12px;font-weight:700;color:#e8edf2}",'css')
old="A.body.innerHTML='<div class=\"dv3wordtools\"><button class=\"dv3btn\" id=\"dv3wordMinus\">−</button><button class=\"dv3btn\" id=\"dv3wordFit\">Sığdır</button><span id=\"dv3wordZoomLabel\" style=\"min-width:48px;text-align:center;font-weight:700\">100%</span><button class=\"dv3btn\" id=\"dv3wordPlus\">+</button></div>"
new="A.body.innerHTML='<div class=\"dv3wordtools\"><button class=\"dv3btn\" id=\"dv3wordMinus\">−</button><button class=\"dv3btn\" id=\"dv3wordFit\">Sığdır</button><span id=\"dv3wordZoomLabel\" style=\"min-width:48px;text-align:center;font-weight:700\">100%</span><button class=\"dv3btn\" id=\"dv3wordPlus\">+</button><span class=\"dv3wordpageinfo\" id=\"dv3wordPageInfo\">1 / 1</span></div>"
rep(old,new,'toolbar')
needle="A.body.querySelector('#dv3wordFit').onclick=wordSigdir;requestAnimationFrame(()=>requestAnimationFrame(wordSigdir));"
insert="const wrap=A.body.querySelector('#dv3wordViewport'),sayfalar=[...A.body.querySelectorAll('#dv3word section.docx')],bilgi=A.body.querySelector('#dv3wordPageInfo');const sayfaBilgiGuncelle=()=>{if(!bilgi||!sayfalar.length)return;const y=wrap.scrollTop/Math.max(wordZoom,0.01),i=sayfalar.findIndex(x=>(x.offsetTop+x.offsetHeight/2)>=y);bilgi.textContent=(Math.max(0,i)+1)+' / '+sayfalar.length;};if(bilgi)bilgi.textContent='1 / '+Math.max(1,sayfalar.length);wrap.addEventListener('scroll',sayfaBilgiGuncelle,{passive:true});A.body.querySelector('#dv3wordFit').onclick=wordSigdir;requestAnimationFrame(()=>requestAnimationFrame(()=>{wordSigdir();sayfaBilgiGuncelle();}));"
rep(needle,insert,'page counter')
p.write_text(s,encoding='utf-8')
t=Path('tests/document-viewer-smoke.test.js'); ts=t.read_text(encoding='utf-8'); marker="console.log('Belge görüntüleyici smoke testleri başarılı.');"; extra="\nassert(src.includes('gap:22px!important'), 'Word sayfa aralığı görünür olmalı.');\nassert(src.includes('id=\\\"dv3wordPageInfo\\\"'), 'Word sayfa sayacı bulunmalı.');\n"
if extra.strip() not in ts: ts=ts.replace(marker,extra+'\n'+marker)
t.write_text(ts,encoding='utf-8')
