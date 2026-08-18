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
".dv3body.dv3wordbody{background:#cfd3d7}.dv3wordviewport{padding:10px;overflow:visible;width:100%;min-width:0;box-sizing:border-box}.dv3wordscene{position:relative;margin:0 auto}",
".dv3body.dv3wordbody{background:#cfd3d7;overflow:hidden;display:flex;flex-direction:column;min-width:0}.dv3wordtools{flex:0 0 auto}.dv3wordviewport{flex:1 1 auto;min-height:0;padding:10px;overflow:auto;width:100%;max-width:100%;min-width:0;box-sizing:border-box;overscroll-behavior:contain;touch-action:pan-x pan-y}.dv3wordscene{position:relative;margin:0}",
'isolated word viewport css')

rep(
"function wordZoomUygula(z){wordZoom=Math.max(0.35,Math.min(3,z));wordOlcekUygula();}",
"function wordZoomUygula(z){wordZoom=Math.max(0.2,Math.min(3,z));wordOlcekUygula();}",
'word manual zoom lower bound')

old_fit="function wordSigdir(){if(!A)return;const st=A.body.querySelector('#dv3wordStage'),wrapper=A.body.querySelector('#dv3word .docx-wrapper'),sayfa=A.body.querySelector('#dv3word section.docx');if(!st||!wrapper||!sayfa)return;st.style.transform='none';const sayfalar=[...A.body.querySelectorAll('#dv3word section.docx')];const maxSayfaW=Math.max(...sayfalar.map(x=>x.offsetWidth||x.getBoundingClientRect().width||1),sayfa.offsetWidth||1);const ws=getComputedStyle(wrapper),padX=(parseFloat(ws.paddingLeft)||0)+(parseFloat(ws.paddingRight)||0);const dogalW=Math.ceil(maxSayfaW+padX);const dogalH=Math.ceil(wrapper.scrollHeight||st.scrollHeight||sayfa.scrollHeight||1);st.dataset.naturalWidth=String(dogalW);st.dataset.naturalHeight=String(dogalH);const uygunW=Math.max(240,A.body.clientWidth-20);wordZoom=Math.max(0.35,Math.min(1,uygunW/dogalW));wordOlcekUygula();A.body.scrollTo({left:0,top:0,behavior:'auto'});}"
new_fit="function wordSigdir(){if(!A)return;const st=A.body.querySelector('#dv3wordStage'),wrap=A.body.querySelector('#dv3wordViewport'),wrapper=A.body.querySelector('#dv3word .docx-wrapper'),sayfa=A.body.querySelector('#dv3word section.docx');if(!st||!wrap||!wrapper||!sayfa)return;st.style.transform='none';const sayfalar=[...A.body.querySelectorAll('#dv3word section.docx')];const maxSayfaW=Math.max(...sayfalar.map(x=>x.offsetWidth||x.getBoundingClientRect().width||1),sayfa.offsetWidth||1);const ws=getComputedStyle(wrapper),padX=(parseFloat(ws.paddingLeft)||0)+(parseFloat(ws.paddingRight)||0);const dogalW=Math.ceil(maxSayfaW+padX);const dogalH=Math.ceil(wrapper.scrollHeight||st.scrollHeight||sayfa.scrollHeight||1);st.dataset.naturalWidth=String(dogalW);st.dataset.naturalHeight=String(dogalH);const uygunW=Math.max(1,wrap.clientWidth-20);wordZoom=Math.max(0.15,Math.min(1,uygunW/dogalW));wordOlcekUygula();wrap.scrollTo({left:0,top:0,behavior:'auto'});}"
rep(old_fit,new_fit,'true fit inside Word viewport')

p.write_text(s,encoding='utf-8')

t=Path('tests/document-viewer-smoke.test.js')
ts=t.read_text(encoding='utf-8')
extra="""
assert(src.includes('.dv3body.dv3wordbody{background:#cfd3d7;overflow:hidden;display:flex'), 'Word zoom tüm görüntüleyici gövdesini yatay büyütmemeli.');
assert(src.includes('.dv3wordviewport{flex:1 1 auto;min-height:0;padding:10px;overflow:auto'), 'Word yatay/dikey kaydırma yalnız belge viewportunda olmalı.');
assert(src.includes('const uygunW=Math.max(1,wrap.clientWidth-20)'), 'Word Sığdır gerçek belge viewport genişliğini kullanmalı.');
assert(src.includes('Math.max(0.15,Math.min(1,uygunW/dogalW))'), 'Geniş Word sayfaları %35 alt sınırı nedeniyle sağdan kesilmemeli.');
assert(src.includes("wrap.scrollTo({left:0,top:0"), 'Sığdır sonrası yalnız Word viewportu başa dönmeli.');
"""
marker="console.log('Belge görüntüleyici smoke testleri başarılı.');"
if extra.strip() not in ts:
    ts=ts.replace(marker,extra+'\n'+marker)
t.write_text(ts,encoding='utf-8')
