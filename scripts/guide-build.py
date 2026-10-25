#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Koruk Asistan — kullanım kılavuzu üreticisi.

  python3 scripts/guide-build.py shots [--only konu1,konu2]   # gerçek uygulama ekran görüntüleri + numara konumları
  python3 scripts/guide-build.py pdf                           # aynı veriden A4 PDF kılavuzu

Ekran görüntüleri, bu depodaki uygulamanın kendisinden (yerel sunucu + headless Chromium) alınır; yapay çizim değildir.
Veri olarak scripts/guide-seed.js içindeki kurgusal örnek veri kullanılır (gerçek kişisel veri yoktur).
İçerik tek kaynaktan gelir: js/modules/guide-data.js (her ekranın `cekim` adımları ve işaretlerin `sec` seçicileri dahil).
Gereksinimler: python3, playwright (+ chromium), Pillow. Çıktı: assets/guide/*.webp ve guide-data.js içindeki geometri bloğu.
"""
import sys,os,re,json,argparse,threading,http.server,socketserver,functools,io,time

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA=os.path.join(ROOT,'js','modules','guide-data.js')
SEED=os.path.join(ROOT,'scripts','guide-seed.js')
OUT=os.path.join(ROOT,'assets','guide')
VIEW=(390,844); DPR=2
FIXED_TIME='2026-10-14T10:25:00+03:00'       # çarşamba, 3. ders — "bugün" içeren ekranlar her üretimde aynı görünür
STUB="""(function(){var p;function mk(){var f=function(){};p=new Proxy(f,{get:function(t,k){if(k==='then'||k===Symbol.toPrimitive||k===Symbol.iterator)return undefined;if(k==='length')return 0;return p},apply:function(){return p},construct:function(){return p}});return p}window.firebase=window.firebase||mk();})();"""
BOOT="""(sch)=>{document.documentElement.setAttribute('data-theme',sch);document.getElementById('configWarning')?.classList.add('ka-hidden');const l=document.getElementById('girisEkrani');if(l){l.hidden=true;l.classList.add('ka-hidden')}const a=document.getElementById('app');a.hidden=false;a.classList.add('ready','show');window.AKTIF_KULLANICI={admin:true,uid:'u1',ad:'Okul',soyad:'Yöneticisi'}}"""
SCROLL="""(y)=>{const m=[...document.querySelectorAll('.ka-modal-backdrop,[role=dialog]')].filter(e=>!e.hidden).pop();const scrollable=e=>{const o=getComputedStyle(e).overflowY;return(o==='auto'||o==='scroll')&&e.scrollHeight>e.clientHeight+4};const pool=m?[...m.querySelectorAll('*')].filter(scrollable):[document.scrollingElement,document.querySelector('.ka-app-content')].filter(Boolean);const t=pool[0];if(t){const mx=t.scrollHeight-t.clientHeight;t.scrollTop=typeof y==='string'&&y.startsWith('son')?Math.max(0,mx-(Number(y.slice(4))||0)):y}}"""
LOGIN="""()=>{document.documentElement.classList.add('ka-auth-resolved');const st=document.createElement('style');st.textContent='#girisEkrani{display:grid!important;visibility:visible!important}#app{display:none!important}';document.head.appendChild(st)}"""   # uygulama giriş ekranını kendiliğinden gizlediği için stille zorla gösterilir
KNOWN_ERR=('firebase is not defined','firebaseyiBaslat')

_REL={}
def release_json():
    """Hakkında sayfasındaki 'son sürüm' satırı için GitHub'daki gerçek yayın bilgisi (uydurma değil). Alınamazsa None."""
    if 'v' in _REL:return _REL['v']
    import urllib.request,ssl
    ca='/root/.ccr/ca-bundle.crt';ctx=ssl.create_default_context(cafile=ca) if os.path.exists(ca) else None
    try:
        r=urllib.request.urlopen(urllib.request.Request('https://api.github.com/repos/okulyonetim/okulyonetim.github.io/releases/latest',headers={'User-Agent':'koruk-guide-build'}),timeout=20,context=ctx)
        _REL['v']=r.read().decode('utf8')
    except Exception as ex:
        print('UYARI: sürüm bilgisi alınamadı:',ex);_REL['v']=None
    return _REL['v']

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
def serve():
    handler=functools.partial(Quiet,directory=ROOT)
    srv=socketserver.ThreadingTCPServer(('127.0.0.1',0),handler);srv.daemon_threads=True
    threading.Thread(target=srv.serve_forever,daemon=True).start()
    return srv,f'http://127.0.0.1:{srv.server_address[1]}'

def load_data(pw,base):
    b=pw.chromium.launch();pg=b.new_page();pg.set_content('<html><body></body></html>')
    pg.add_script_tag(path=DATA)
    d=pg.evaluate('()=>JSON.parse(JSON.stringify(window.KorukGuideData))');b.close();return d

def new_page(pw,base,seed_js,scheme='light'):
    b=pw.chromium.launch(args=['--lang=tr'],env={**os.environ,'LANGUAGE':'tr','LANG':'tr_TR.UTF-8','LC_ALL':'tr_TR.UTF-8'})   # tarih alanları gg.aa.yyyy görünsün
    ctx=b.new_context(viewport={'width':VIEW[0],'height':VIEW[1]},device_scale_factor=DPR,has_touch=True,is_mobile=True,color_scheme=scheme,
                      locale='tr-TR',timezone_id='Europe/Istanbul',service_workers='block')
    ctx.add_init_script("try{sessionStorage.setItem('ka-permission-gate-session','1')}catch(e){}")   # izin hatırlatma penceresi ekran görüntüsünü kapatmasın
    ctx.route('**/firebase-storage-compat.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=STUB))
    rel=release_json()
    if rel:ctx.route('https://api.github.com/repos/okulyonetim/okulyonetim.github.io/releases**',lambda r:r.fulfill(status=200,content_type='application/json',headers={'access-control-allow-origin':'*'},body=rel if '/latest' in r.request.url else '['+rel+']'))
    pg=ctx.new_page();errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(base+'/index.html',wait_until='domcontentloaded');pg.wait_for_timeout(1200)
    pg.clock.set_fixed_time(FIXED_TIME)
    pg.evaluate(BOOT,scheme);pg.wait_for_timeout(300)
    pg.add_script_tag(content=seed_js)
    pg.evaluate('()=>window.__GUIDE_SEED__()')
    return b,pg,errs

def route(pg,rota,title=''):
    r=pg.evaluate("""async(a)=>{try{const ok=await ShellUI.routeModule(a.m,{page:a.p,title:a.t,bottom:'menu'});return String(ok)}catch(e){return 'ERR '+e.message}}""",{'m':rota[0],'p':rota[1] if len(rota)>1 else '','t':title})
    pg.wait_for_timeout(1200)
    if r!='true':raise RuntimeError(f'rota açılamadı {rota}: {r}')
    pg.evaluate('()=>window.__GUIDE_SEED__()');pg.wait_for_timeout(900)   # modül açılırken boş yüklenen koleksiyonları örnek veriyle yeniden doldur

def steps(pg,items):
    for st in items or []:
        op=st[0]
        if op=='tikla':pg.locator(st[1]).first.click(timeout=6000)
        elif op=='yaz':pg.locator(st[1]).first.fill(st[2],timeout=6000)
        elif op=='sec':pg.locator(st[1]).first.select_option(st[2],timeout=6000)
        elif op=='bekle':pg.wait_for_timeout(st[1])
        elif op=='kaydir':pg.evaluate(SCROLL,st[1])
        elif op=='js':pg.evaluate(st[1])
        elif op=='goster':pg.locator(st[1]).first.evaluate("el=>el.scrollIntoView({block:'center'})",timeout=6000)
        elif op=='rota':route(pg,st[1],st[2] if len(st)>2 else '')
        else:raise RuntimeError('bilinmeyen adım: '+op)
        pg.wait_for_timeout(450)

def split_sel(sel):
    """En üst düzeydeki virgüllere göre böler ([...], (...) ve tırnak içindekilere dokunmaz)."""
    out=[];depth=0;q='';cur=''
    for ch in sel:
        if q:
            cur+=ch
            if ch==q:q=''
            continue
        if ch in '"\'':q=ch;cur+=ch;continue
        if ch in '[(':depth+=1
        elif ch in '])':depth-=1
        if ch==',' and depth==0:out.append(cur.strip());cur='';continue
        cur+=ch
    if cur.strip():out.append(cur.strip())
    return out

def boxes(pg,marks,sid):
    out=[];missing=[]
    for m in marks:
        rects=[]
        for part in split_sel(m['sec']):
            try:
                loc=pg.locator(part).first;bb=loc.bounding_box(timeout=3000)
                # başka bir öğenin (alt çubuk, üst çubuk, pencere) altında kalan ya da ekrandan taşan öğeler işaretlenemez
                vis=bb and loc.evaluate("(el)=>{const r=el.getBoundingClientRect();const x=Math.min(innerWidth-2,Math.max(2,r.x+r.width/2)),y=Math.min(innerHeight-2,Math.max(2,r.y+Math.min(r.height/2,24)));const t=document.elementFromPoint(x,y);return !!t&&(el.contains(t)||t.contains(el))&&r.bottom<=innerHeight+1&&r.top>=-1}")
            except Exception:bb=None;vis=False
            if not bb or bb['width']<2 or bb['height']<2 or not vis:missing.append(f'{m["n"]}: {part}');rects=[];break
            rects.append(bb)
        if not rects:continue
        x0=min(r['x'] for r in rects);y0=min(r['y'] for r in rects)
        x1=max(r['x']+r['width'] for r in rects);y1=max(r['y']+r['height'] for r in rects)
        pad=5
        x=max(0,x0-pad);y=max(0,y0-pad);w=min(VIEW[0]-x,x1-x0+2*pad);h=min(VIEW[1]-y,y1-y0+2*pad)
        if w<4 or h<4:missing.append(f'{m["n"]} (görünür alanın dışında): {m["sec"]}');continue
        out.append([round(x/VIEW[0]*100,1),round(y/VIEW[1]*100,1),round(w/VIEW[0]*100,1),round(h/VIEW[1]*100,1)])
    if missing:raise RuntimeError(f'[{sid}] bulunamayan işaretler -> '+' | '.join(missing))
    return out

def shots(only):
    from playwright.sync_api import sync_playwright
    from PIL import Image
    seed_js=open(SEED,encoding='utf8').read()
    srv,base=serve();os.makedirs(OUT,exist_ok=True)
    geo={};fail=[]
    with sync_playwright() as pw:
        data=load_data(pw,base);geo=dict(data.get('geometri') or {})
        todo=[(t,e) for t in data['konular'] if not only or t['id'] in only for e in t.get('ekranlar',[]) if e.get('cekim')]
        todo.sort(key=lambda te:bool(te[1]['cekim'].get('sonra')))   # sonra:true olanlar (başka ekran görüntülerini içerenler) en sona
        for t,e in todo:
            c=e['cekim']
            sid=e['id'];t0=time.time()
            b,pg,errs=new_page(pw,base,seed_js,c.get('tema','light'))
            try:
                if c.get('ozel')=='giris':
                    pg.evaluate(LOGIN);pg.wait_for_timeout(700)
                else:route(pg,c.get('rota') or t['rota'],t['baslik'])
                steps(pg,c.get('adimlar'))
                if c.get('kaydir'):steps(pg,[['kaydir',c['kaydir']]])
                pg.wait_for_timeout(c.get('bekle',500))
                geo[sid]=boxes(pg,e.get('isaretler',[]),sid)
                png=pg.screenshot(type='png')
                im=Image.open(io.BytesIO(png)).convert('RGB')
                im.save(os.path.join(OUT,e['dosya']),'WEBP',quality=80,method=6)
                bad=[x for x in errs if not any(k in x for k in KNOWN_ERR)]
                print(f'OK   {sid:34} {os.path.getsize(os.path.join(OUT,e["dosya"]))//1024:4d} KB  {time.time()-t0:4.1f}s'+(f'  UYARI: {bad[:1]}' if bad else ''),flush=True)
            except Exception as ex:
                fail.append(sid);print(f'HATA {sid}: {str(ex)[:300]}',flush=True)
            finally:b.close()
    patch_geometry(geo)
    srv.shutdown()
    if fail:print('\nBaşarısız ekranlar:',', '.join(fail));sys.exit(1)

def patch_geometry(geo):
    src=open(DATA,encoding='utf8').read()
    body=json.dumps(geo,ensure_ascii=False,separators=(',',':'),sort_keys=True)
    new,n=re.subn(r'/\*GEO:BEGIN\*/.*?/\*GEO:END\*/','/*GEO:BEGIN*/'+body.replace('\\','\\\\')+'/*GEO:END*/',src,flags=re.S)
    if n!=1:raise SystemExit('guide-data.js içinde GEO:BEGIN/GEO:END bloğu bulunamadı')
    open(DATA,'w',encoding='utf8').write(new);print('geometri yazıldı:',len(geo),'ekran')

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('cmd',choices=['shots','pdf']);ap.add_argument('--only',default='')
    a=ap.parse_args();only=set(x for x in a.only.split(',') if x)
    if a.cmd=='shots':shots(only)
    else:
        import guide_pdf
        guide_pdf.build_pdf(ROOT)
