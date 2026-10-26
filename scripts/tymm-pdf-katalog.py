#!/usr/bin/env python3
"""TYMM ilkokul ölçekleri kataloğunu üretir (data/tymm/{sinif}.json).

Kaynak: evrakburada'dan alınan "N/A SINIFI X DERSİ ... GÖZLEM FORMU" PDF çıktıları (her sayfa bir form).
Kullanım:  python3 -B scripts/tymm-pdf-katalog.py --donem 1 --yil 2026-2027 --cikti data/tymm KLASOR [KLASOR ...]
Aynı sınıf için daha önce üretilmiş dosya varsa yalnız verilen dönem yenilenir, diğer dönemler korunur.
Gereken: pdfplumber ve pdftotext (poppler). Uygulama bu betiği çalıştırmaz; katalog depoya düz JSON olarak girer.
"""
import re,sys,json,subprocess,logging,glob,os,argparse
import pdfplumber
logging.getLogger('pdfminer').setLevel(logging.ERROR)
logging.getLogger('pdfminer').setLevel(logging.ERROR)
CODE=re.compile(r'\(([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü0-9]*(?:\.[A-Za-zÇĞİÖŞÜçğıöşü0-9]+)+(?:\s*/\s*[A-Za-zÇĞİÖŞÜçğıöşü0-9]*(?:\.[A-Za-zÇĞİÖŞÜçğıöşü0-9]+)+)*)\)')
def raw_pages(path):
    out=subprocess.run(['pdftotext','-raw',path,'-'],capture_output=True,text=True,check=True).stdout
    return out.split('\f')[:-1] if out.endswith('\f') or '\f' in out else [out]

def parse_title(title):
    tm=re.match(r'^(.*?)\s*GÖZLEM FORMU(?:\s+\((\d+)/(\d+)\))?(?:\s+\(([^)]+)\))?$',title)
    assert tm,('başlık çözülemedi',title)
    rest=tm.group(1).strip()
    segs=[x.strip() for x in re.split(r'\s+–\s+|\s+–$',rest+' ' if rest.endswith('–') else rest)]
    segs=[x for x in segs if x]
    head=segs[0];extra=segs[1:]
    form={}
    h=re.match(r'^(\d+)\.\s+(TEMA|ÜNİTE)\s+“(.+)”$',head)
    h2=re.match(r'^“(.+)”\s+(TEMASI|ÜNİTESİ)$',head)
    h3=re.match(r'^([A-ZÇĞİÖŞÜ]|\d+)\.\s+(ÖĞRENME ALANI|KONU)\s+“(.+)”$',head)
    if h3:
        ilk=h3.group(1)
        form.update(tur='alan' if h3.group(2)=='ÖĞRENME ALANI' else 'konu',no=int(ilk) if ilk.isdigit() else 0,ad=h3.group(3))
        if not ilk.isdigit():form['harf']=ilk
    elif h:form.update(tur='tema' if h.group(2)=='TEMA' else 'ünite',no=int(h.group(1)),ad=h.group(3))
    elif h2:form.update(tur='tema' if h2.group(2)=='TEMASI' else 'ünite',no=0,ad=h2.group(1))
    elif 'KAZANIMLARI' in head:form.update(tur='kazanım',no=1,ad=head)
    else:form.update(tur='hazırlık',no=0,ad=head)
    for x in extra:
        if x.startswith('“'):form['alt']=x
        else:form['parcaAd']=x
    if tm.group(2):form['parca']=[int(tm.group(2)),int(tm.group(3))]
    if tm.group(4):form['not']=tm.group(4)
    return form

def parse_page(raw,plumb_page):
    lines=[l.strip() for l in raw.split('\n') if l.strip()]
    meta={}
    i=0
    for k,l in enumerate(lines):
        m=re.match(r'^(\d)/([A-ZÇĞİÖŞÜ]) SINIFI (.+) DERSİ$',l)
        if m:meta={'sinif':int(m.group(1)),'sube':m.group(2),'ders':m.group(3)};i=k+1;break
    # form başlığı: "GÖZLEM FORMU" satırına kadar birleştir
    t=[]
    while i<len(lines):
        t.append(lines[i]);
        if 'GÖZLEM FORMU' in lines[i]:
            i+=1
            if i<len(lines) and lines[i].startswith('(') and not CODE.match(lines[i]):t.append(lines[i]);i+=1
            break
        i+=1
    title=' '.join(t)
    form=parse_title(title)
    # ölçüt bölgesi
    while i<len(lines) and not lines[i].startswith('1 Geliştirilmeli'):i+=1
    i+=1
    while i<len(lines) and lines[i]!='Adı Soyadı':i+=1
    body=' '.join(lines[i+1:])
    body=re.sub(r'\s+',' ',body)
    # grup başlıkları (pdfplumber ilk satır)
    tabs=plumb_page.extract_tables()
    groups=[]
    if tabs and len(tabs[0])>1 and (tabs[0][1][3] or '').strip():
        r0=tabs[0][0][3:-2]
        cur=None
        for c in r0:
            c=(c or '').strip()
            if c:cur=[c,1];groups.append(cur)
            elif cur:cur[1]+=1
    names=[g[0] for g in groups]
    if names:
        head=' '.join(names)
        assert body.startswith(head),('grup başlıkları bölgede yok',head,body[:80])
        body=body[len(head):].strip()
    body=re.sub(r'^Ortalama Değerlendirme\s*','',body)
    crit=[];pos=0
    last_end=0
    for m in CODE.finditer(body):
        text=body[pos:m.start()].strip()
        crit.append({'kod':m.group(1),'metin':re.sub(r'\s+',' ',text)})
        pos=m.end();last_end=pos
    rest=body[last_end:]
    form['olcutler']=crit
    if groups:
        sizes=[g[1] for g in groups]
        assert sum(sizes)==len(crit),('grup toplamı ölçüt sayısına eşit değil',sizes,len(crit),meta,form['ad'])
        k=0;gl=[]
        for n,s in [(g[0],g[1]) for g in groups]:
            gl.append({'ad':n,'olcutler':crit[k:k+s]});k+=s
        form['gruplar']=gl;del form['olcutler']
    return meta,form,rest
def extract(path):
    raws=raw_pages(path)
    pl=pdfplumber.open(path)
    res=[]
    for rp,pp in zip(raws,pl.pages):
        meta,form,rest=parse_page(rp,pp)
        res.append((meta,form,rest))
    return res


DERS_SIRA=[
 ('TÜRKÇE','turkce','Türkçe'),('MATEMATİK','matematik','Matematik'),('HAYAT BİLGİSİ','hayat-bilgisi','Hayat Bilgisi'),
 ('FEN BİLİMLERİ','fen-bilimleri','Fen Bilimleri'),('SOSYAL BİLGİLER','sosyal-bilgiler','Sosyal Bilgiler'),('İNGİLİZCE','ingilizce','İngilizce'),
 ('DİN KÜLTÜRÜ VE AHLAK BİLGİSİ','din-kulturu','Din Kültürü ve Ahlak Bilgisi'),
 ('İNSAN HAKLARI, YURTTAŞLIK VE DEMOKRASİ','insan-haklari','İnsan Hakları, Yurttaşlık ve Demokrasi'),
 ('TRAFİK GÜVENLİĞİ','trafik','Trafik Güvenliği'),('GÖRSEL SANATLAR','gorsel-sanatlar','Görsel Sanatlar'),
 ('MÜZİK','muzik','Müzik'),('BEDEN EĞİTİMİ VE OYUN','beden-egitimi','Beden Eğitimi ve Oyun')]
DERS_MAP={a:(k,ad,i) for i,(a,k,ad) in enumerate(DERS_SIRA)}

def form_key(f):
    t=f['tur']
    if t=='hazırlık':k='hazirlik'
    elif t=='alan':k='alan-'+(f['harf'].lower() if f.get('harf') else str(f['no']))
    elif t=='kazanım':k='kazanim-%d'%f['no']
    elif t=='ünite':k='unite-%d'%f['no'] if f['no'] else 'unite-s%d'%f['sira']
    else:k='%s-%d'%(t,f['no']) if f['no'] else '%s-s%d'%(t,f['sira'])
    if f.get('parca'):k+='-p%d'%f['parca'][0]
    return k

def katalog_formu(f):
    if 'gruplar' in f:
        olcut=[c for g in f['gruplar'] for c in g['olcutler']]
        gruplar=[{'ad':g['ad'],'say':len(g['olcutler'])} for g in f['gruplar']]
    else:
        olcut=f['olcutler'];gruplar=None
    o={'key':form_key(f),'tur':f['tur'],'no':f['no'],'ad':f['ad']}
    if f.get('harf'):o['harf']=f['harf']
    for k in ('alt','parcaAd','not'):
        if f.get(k):o[k]=f[k]
    if f.get('parca'):o['parca']=f['parca']
    o['olcutler']=[{'kod':c['kod'],'metin':c['metin']} for c in olcut]
    if gruplar:o['gruplar']=gruplar
    return o

def sirala_numarasiz(formlar):
    """Başlığında numara yazmayan temalar (1. sınıf Matematik) numara almaz; anahtar için PDF'teki ilk görünme sırası (sira) kullanılır."""
    sira={}
    for f in formlar:
        if f['tur'] in('tema','ünite') and f['no']==0:
            f['sira']=sira.setdefault((f['tur'],f['ad']),len(sira)+1)
    return formlar

def uret(klasorler,donem,yil,cikti):
    sinif_ders={}
    for kl in klasorler:
        for yol in sorted(glob.glob(os.path.join(kl,'*.pdf'))):
            for meta,form,_ in extract(yol):
                if meta['ders'] not in DERS_MAP:raise SystemExit('Bilinmeyen ders: %s (%s)'%(meta['ders'],yol))
                sinif_ders.setdefault(meta['sinif'],{}).setdefault(meta['ders'],[]).append(form)
    os.makedirs(cikti,exist_ok=True)
    for sinif,dersler in sorted(sinif_ders.items()):
        liste=[]
        for ad in sorted(dersler,key=lambda a:DERS_MAP[a][2]):
            formlar=sirala_numarasiz(dersler[ad])
            gorulen={};temiz=[]
            for f in formlar:
                k=katalog_formu(f)
                if k['key'] in gorulen:
                    if gorulen[k['key']]!=k:raise SystemExit('Aynı anahtarlı farklı form: %s %s'%(ad,k['key']))
                    continue
                gorulen[k['key']]=k;temiz.append(k)
            key,gosterim,_=DERS_MAP[ad]
            liste.append({'key':key,'ad':gosterim,'formlar':temiz})
        yol=os.path.join(cikti,'%d.json'%sinif)
        mevcut=json.load(open(yol,encoding='utf-8')) if os.path.exists(yol) else {'sinif':sinif,'donemler':{}}
        mevcut['sinif']=sinif;mevcut['yil']=yil
        mevcut['donemler'][str(donem)]={'dersler':liste}
        mevcut['donemler']=dict(sorted(mevcut['donemler'].items()))
        with open(yol,'w',encoding='utf-8') as fh:
            json.dump(mevcut,fh,ensure_ascii=False,separators=(',',':'));fh.write('\n')
        print('%d. sınıf: %d ders, %d form, %d ölçüt -> %s'%(sinif,len(liste),sum(len(d['formlar']) for d in liste),sum(len(f['olcutler']) for d in liste for f in d['formlar']),yol))

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('klasorler',nargs='+')
    ap.add_argument('--donem',type=int,default=1)
    ap.add_argument('--yil',default='2026-2027')
    ap.add_argument('--cikti',default='data/tymm')
    a=ap.parse_args()
    uret(a.klasorler,a.donem,a.yil,a.cikti)
