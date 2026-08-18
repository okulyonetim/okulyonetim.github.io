from pathlib import Path

p = Path('js/dokuman-okuyucu.js')
s = p.read_text(encoding='utf-8')

def rep(old, new, label):
    global s
    c = s.count(old)
    if c != 1:
        raise SystemExit(f'{label}: expected 1 match, got {c}')
    s = s.replace(old, new, 1)

rep(".dv3title b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dv3title small{color:#aeb7c2}",
    ".dv3title b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff!important;text-shadow:0 1px 1px #0008}.dv3title small{color:#d7dee7!important}",
    'dark title contrast')

rep(".dv3wordviewport{padding:10px;overflow:visible;min-width:100%}.dv3wordstage{transform-origin:top left;display:inline-block;vertical-align:top}",
    ".dv3body.dv3wordbody{background:#cfd3d7}.dv3wordviewport{padding:10px;overflow:visible;width:100%;min-width:0;box-sizing:border-box}.dv3wordscene{position:relative;margin:0 auto}.dv3wordstage{position:absolute;left:0;top:0;transform-origin:top left;display:block}",
    'word viewport scene css')

old_olcek = "function wordOlcekUygula(){if(!A)return;const st=A.body.querySelector('#dv3wordStage'),wrap=A.body.querySelector('#dv3wordViewport');if(!st||!wrap)return;st.style.transform=`scale(${wordZoom})`;const dogalW=st.dataset.naturalWidth?Number(st.dataset.naturalWidth):(st.scrollWidth||1),dogalH=st.dataset.naturalHeight?Number(st.dataset.naturalHeight):(st.scrollHeight||1);wrap.style.width=Math.ceil(dogalW*wordZoom)+'px';wrap.style.height=Math.ceil(dogalH*wordZoom)+'px';const l=A.body.querySelector('#dv3wordZoomLabel');if(l)l.textContent=Math.round(wordZoom*100)+'%';}"
new_olcek = "function wordOlcekUygula(){if(!A)return;const st=A.body.querySelector('#dv3wordStage'),scene=A.body.querySelector('#dv3wordScene'),wrap=A.body.querySelector('#dv3wordViewport');if(!st||!scene||!wrap)return;const dogalW=Math.max(1,Number(st.dataset.naturalWidth)||st.scrollWidth||1),dogalH=Math.max(1,Number(st.dataset.naturalHeight)||st.scrollHeight||1);st.style.transform=`scale(${wordZoom})`;scene.style.width=Math.ceil(dogalW*wordZoom)+'px';scene.style.height=Math.ceil(dogalH*wordZoom)+'px';wrap.style.width='100%';wrap.style.height='auto';const l=A.body.querySelector('#dv3wordZoomLabel');if(l)l.textContent=Math.round(wordZoom*100)+'%';}"
rep(old_olcek, new_olcek, 'word scale scene sizing')

old_fit = "function wordSigdir(){if(!A)return;const st=A.body.querySelector('#dv3wordStage'),sayfa=A.body.querySelector('#dv3word section.docx');if(!st||!sayfa)return;st.style.transform='none';const sayfaW=sayfa.getBoundingClientRect().width||sayfa.offsetWidth||1,uygunW=Math.max(240,A.body.clientWidth-24);st.dataset.naturalWidth=String(st.scrollWidth||sayfaW);st.dataset.naturalHeight=String(st.scrollHeight||sayfa.scrollHeight||1);wordZoom=Math.max(0.35,Math.min(1,uygunW/sayfaW));wordOlcekUygula();A.body.scrollTo({left:0,top:0,behavior:'auto'});}"
new_fit = "function wordSigdir(){if(!A)return;const st=A.body.querySelector('#dv3wordStage'),wrapper=A.body.querySelector('#dv3word .docx-wrapper'),sayfa=A.body.querySelector('#dv3word section.docx');if(!st||!wrapper||!sayfa)return;st.style.transform='none';const sayfalar=[...A.body.querySelectorAll('#dv3word section.docx')];const maxSayfaW=Math.max(...sayfalar.map(x=>x.offsetWidth||x.getBoundingClientRect().width||1),sayfa.offsetWidth||1);const ws=getComputedStyle(wrapper),padX=(parseFloat(ws.paddingLeft)||0)+(parseFloat(ws.paddingRight)||0);const dogalW=Math.ceil(maxSayfaW+padX);const dogalH=Math.ceil(wrapper.scrollHeight||st.scrollHeight||sayfa.scrollHeight||1);st.dataset.naturalWidth=String(dogalW);st.dataset.naturalHeight=String(dogalH);const uygunW=Math.max(240,A.body.clientWidth-20);wordZoom=Math.max(0.35,Math.min(1,uygunW/dogalW));wordOlcekUygula();A.body.scrollTo({left:0,top:0,behavior:'auto'});}"
rep(old_fit, new_fit, 'word fit natural dimensions')

old_render = "async function renderDocx(buf){status('Word belgesi hazırlanıyor…');try{await docxReady();wordZoom=1;A.body.innerHTML='<div class=\"dv3wordtools\"><button class=\"dv3btn\" id=\"dv3wordMinus\">−</button><button class=\"dv3btn\" id=\"dv3wordFit\">Sığdır</button><span id=\"dv3wordZoomLabel\" style=\"min-width:48px;text-align:center;font-weight:700\">100%</span><button class=\"dv3btn\" id=\"dv3wordPlus\">+</button></div><div class=\"dv3wordviewport\" id=\"dv3wordViewport\"><div class=\"dv3wordstage\" id=\"dv3wordStage\"><div class=\"dv3word\" id=\"dv3word\"></div></div></div>';await docx.renderAsync(buf,A.body.querySelector('#dv3word'),null,{inWrapper:true,breakPages:true,ignoreWidth:false,ignoreHeight:false,ignoreFonts:false,renderHeaders:true,renderFooters:true,renderFootnotes:true,ignoreLastRenderedPageBreak:false,useBase64URL:true});A.body.querySelector('#dv3wordMinus').onclick=()=>wordZoomUygula(wordZoom-0.15);A.body.querySelector('#dv3wordPlus').onclick=()=>wordZoomUygula(wordZoom+0.15);A.body.querySelector('#dv3wordFit').onclick=wordSigdir;requestAnimationFrame(()=>requestAnimationFrame(wordSigdir));}catch(e){fail('Word belgesi görüntülenemedi.',e.message);}}"
new_render = "async function renderDocx(buf){status('Word belgesi hazırlanıyor…');try{await docxReady();wordZoom=1;A.body.classList.add('dv3wordbody');A.body.innerHTML='<div class=\"dv3wordtools\"><button class=\"dv3btn\" id=\"dv3wordMinus\">−</button><button class=\"dv3btn\" id=\"dv3wordFit\">Sığdır</button><span id=\"dv3wordZoomLabel\" style=\"min-width:48px;text-align:center;font-weight:700\">100%</span><button class=\"dv3btn\" id=\"dv3wordPlus\">+</button></div><div class=\"dv3wordviewport\" id=\"dv3wordViewport\"><div class=\"dv3wordscene\" id=\"dv3wordScene\"><div class=\"dv3wordstage\" id=\"dv3wordStage\"><div class=\"dv3word\" id=\"dv3word\"></div></div></div></div>';await docx.renderAsync(buf,A.body.querySelector('#dv3word'),null,{inWrapper:true,breakPages:true,ignoreWidth:false,ignoreHeight:false,ignoreFonts:false,renderHeaders:true,renderFooters:true,renderFootnotes:true,ignoreLastRenderedPageBreak:false,useBase64URL:true});A.body.querySelector('#dv3wordMinus').onclick=()=>wordZoomUygula(wordZoom-0.15);A.body.querySelector('#dv3wordPlus').onclick=()=>wordZoomUygula(wordZoom+0.15);A.body.querySelector('#dv3wordFit').onclick=wordSigdir;requestAnimationFrame(()=>requestAnimationFrame(wordSigdir));}catch(e){fail('Word belgesi görüntülenemedi.',e.message);}}"
rep(old_render, new_render, 'word render scene')

p.write_text(s, encoding='utf-8')

t = Path('tests/document-viewer-smoke.test.js')
ts = t.read_text(encoding='utf-8')
extra = """
assert(src.includes('id=\"dv3wordScene\"'), 'Word için ölçülü belge sahnesi bulunmalı.');
assert(src.includes("scene.style.width=Math.ceil(dogalW*wordZoom)+'px'"), 'Word scroll genişliği gerçek zoomlu belge genişliğine eşitlenmeli.');
assert(src.includes("scene.style.height=Math.ceil(dogalH*wordZoom)+'px'"), 'Word scroll yüksekliği gerçek zoomlu belge yüksekliğine eşitlenmeli.');
assert(src.includes("wrap.style.width='100%'"), 'Word viewport sonsuz yatay genişliğe dönüşmemeli.');
assert(src.includes('color:#fff!important'), 'Koyu temada belge adı yüksek kontrastlı olmalı.');
assert(src.includes('A.body.classList.add(\'dv3wordbody\')'), 'Word alanı siyah boşluk yerine belge zemini kullanmalı.');
"""
marker = "console.log('Belge görüntüleyici smoke testleri başarılı.');"
if extra.strip() not in ts:
    ts = ts.replace(marker, extra + '\n' + marker)
t.write_text(ts, encoding='utf-8')
