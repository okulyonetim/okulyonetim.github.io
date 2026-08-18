from pathlib import Path

p=Path('js/dokuman-okuyucu.js')
s=p.read_text(encoding='utf-8')

def rep(old,new,label):
    global s
    c=s.count(old)
    if c!=1:
        raise SystemExit(f'{label}: expected 1 match, got {c}')
    s=s.replace(old,new,1)

rep(
".dv3word .docx-wrapper{padding:18px!important;background:#cfd3d7!important;align-items:flex-start!important;justify-content:flex-start!important;min-width:max-content!important}.dv3word section.docx{margin:0 0 18px 0!important;box-shadow:0 2px 12px #0005!important;background:#fff!important}",
".dv3word .docx-wrapper{padding:18px!important;background:#aeb4ba!important;align-items:flex-start!important;justify-content:flex-start!important;min-width:max-content!important;display:flex!important;flex-direction:column!important;gap:22px!important}.dv3word section.docx{margin:0!important;box-shadow:0 4px 18px #0007!important;background:#fff!important;outline:1px solid #d6d9dc!important;flex:0 0 auto!important}.dv3word section.docx:last-child{margin-bottom:0!important}.dv3wordpageinfo{margin-left:6px;min-width:66px;text-align:center;font-size:12px;font-weight:700;color:#e8edf2}",
'word page cards css')

old_render="async function renderDocx(buf){status('Word belgesi hazırlanıyor…');try{await docxReady();wordZoom=1;A.body.classList.add('dv3wordbody');A.body.innerHTML='<div class=\"dv3wordtools\"><button class=\"dv3btn\" id=\"dv3wordMinus\">−</button><button class=\"dv3btn\" id=\"dv3wordFit\">Sığdır</button><span id=\"dv3wordZoomLabel\" style=\"min-width:48px;text-align:center;font-weight:700\">100%</span><button class=\"dv3btn\" id=\"dv3wordPlus\">+</button></div><div class=\"dv3wordviewport\" id=\"dv3wordViewport\"><div class=\"dv3wordscene\" id=\"dv3wordScene\"><div class=\"dv3wordstage\" id=\"dv3wordStage\"><div class=\"dv3word\" id=\"dv3word\"></div></div></div></div>';await docx.renderAsync(buf,A.body.querySelector('#dv3word'),null,{inWrapper:true,breakPages:true,ignoreWidth:false,ignoreHeight:false,ignoreFonts:false,renderHeaders:true,renderFooters:true,renderFootnotes:true,ignoreLastRenderedPageBreak:false,useBase64URL:true});A.body.querySelector('#dv3wordMinus').onclick=()=>wordZoomUygula(wordZoom-0.15);A.body.querySelector('#dv3wordPlus').onclick=()=>wordZoomUygula(wordZoom+0.15);A.body.querySelector('#dv3wordFit').onclick=wordSigdir;requestAnimationFrame(()=>requestAnimationFrame(wordSigdir));}catch(e){fail('Word belgesi görüntülenemedi.',e.message);}}"
new_render="async function renderDocx(buf){status('Word belgesi hazırlanıyor…');try{await docxReady();wordZoom=1;A.body.classList.add('dv3wordbody');A.body.innerHTML='<div class=\"dv3wordtools\"><button class=\"dv3btn\" id=\"dv3wordMinus\">−</button><button class=\"dv3btn\" id=\"dv3wordFit\">Sığdır</button><span id=\"dv3wordZoomLabel\" style=\"min-width:48px;text-align:center;font-weight:700\">100%</span><button class=\"dv3btn\" id=\"dv3wordPlus\">+</button><span class=\"dv3wordpageinfo\" id=\"dv3wordPageInfo\">1 / 1</span></div><div class=\"dv3wordviewport\" id=\"dv3wordViewport\"><div class=\"dv3wordscene\" id=\"dv3wordScene\"><div class=\"dv3wordstage\" id=\"dv3wordStage\"><div class=\"dv3word\" id=\"dv3word\"></div></div></div></div>';await docx.renderAsync(buf,A.body.querySelector('#dv3word'),null,{inWrapper:true,breakPages:true,ignoreWidth:false,ignoreHeight:false,ignoreFonts:false,renderHeaders:true,renderFooters:true,renderFootnotes:true,ignoreLastRenderedPageBreak:false,useBase64URL:true});const wrap=A.body.querySelector('#dv3wordViewport'),sayfalar=[...A.body.querySelectorAll('#dv3word section.docx')],bilgi=A.body.querySelector('#dv3wordPageInfo');const sayfaBilgiGuncelle=()=>{if(!bilgi||!sayfalar.length)return;const y=wrap.scrollTop/Math.max(wordZoom,0.01),hedef=sayfalar.findIndex(x=>(x.offsetTop+x.offsetHeight/2)>=y);bilgi.textContent=(Math.max(0,hedef)+1)+' / '+sayfalar.length;};if(bilgi)bilgi.textContent='1 / '+Math.max(1,sayfalar.length);wrap.addEventListener('scroll',sayfaBilgiGuncelle,{passive:true});A.body.querySelector('#dv3wordMinus').onclick=()=>wordZoomUygula(wordZoom-0.15);A.body.querySelector('#dv3wordPlus').onclick=()=>wordZoomUygula(wordZoom+0.15);A.body.querySelector('#dv3wordFit').onclick=wordSigdir;requestAnimationFrame(()=>requestAnimationFrame(()=>{wordSigdir();sayfaBilgiGuncelle();}));}catch(e){fail('Word belgesi görüntülenemedi.',e.message);}}"
rep(old_render,new_render,'word page indicator render')

p.write_text(s,encoding='utf-8')

t=Path('tests/document-viewer-smoke.test.js')
ts=t.read_text(encoding='utf-8')
extra="""
assert(src.includes('display:flex!important;flex-direction:column!important;gap:22px!important'), 'Word sayfaları ayrı kartlar halinde dikey dizilmeli.');
assert(src.includes('id=\"dv3wordPageInfo\"'), 'Word görüntüleyicide sayfa sayacı bulunmalı.');
assert(src.includes("bilgi.textContent='1 / '+Math.max(1,sayfalar.length)"), 'Word toplam sayfa sayısı gösterilmeli.');
assert(src.includes("wrap.addEventListener('scroll',sayfaBilgiGuncelle"), 'Word sayfa göstergesi kaydırmada güncellenmeli.');
"""
marker="console.log('Belge görüntüleyici smoke testleri başarılı.');"
if extra.strip() not in ts:
    ts=ts.replace(marker,extra+'\n'+marker)
t.write_text(ts,encoding='utf-8')
