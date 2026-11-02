/* Belge Tarayıcı çekirdeği: köşe algılama, perspektif, filtreler, PDF yazıcı. Node'da (Canvas olmadan) çalışır. */
const assert=require('assert');
const K=require('../js/modules/belge-tarayici-core.js');

/* ── sentetik sahneler ── */
let tohum=12345;const rnd=()=>{tohum=(tohum*1664525+1013904223)>>>0;return tohum/4294967296};
function sahne(W,H,kose,{golge=.35,masa=[70,58,48],mürekkep=true,gurultu=5}={}){
  const img=K.yeni(W,H),d=img.data;
  const inv=kose?K.homografi(kose,[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]):null;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const p=(y*W+x)*4;let r,g,b;
    let u=-1,v=-1;
    if(inv){const z=inv[6]*x+inv[7]*y+1;u=(inv[0]*x+inv[1]*y+inv[2])/z;v=(inv[3]*x+inv[4]*y+inv[5])/z}
    if(inv&&u>=0&&u<=1&&v>=0&&v<=1){
      const k=1-golge*u;let c=232*k;
      if(mürekkep&&u>.1&&u<.9&&v>.1&&v<.9){const satir=Math.floor(v*30),fr=v*30-satir;if(fr>.3&&fr<.7&&((satir*7+Math.floor(u*40)*13)%10)>2)c=30*k}
      r=c;g=c;b=c*.97;
    }else{r=masa[0]+(x/W)*12;g=masa[1];b=masa[2]}
    const n=(rnd()-.5)*2*gurultu;d[p]=r+n;d[p+1]=g+n;d[p+2]=b+n;d[p+3]=255;
  }
  return img;
}
const norm=(k,W,H)=>k.map(p=>({x:p.x/W,y:p.y/H}));
function hata(a,b){let m=0;for(let i=0;i<4;i++)m=Math.max(m,Math.hypot(a[i].x-b[i].x,a[i].y-b[i].y));return m}
function dondurNokta(cx,cy,hw,hh,aci){const a=aci*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(([x,y])=>({x:cx+x*c-y*s,y:cy+x*s+y*c}))}

/* ── geometri ── */
{
  const kare=[{x:0,y:0},{x:9,y:0},{x:9,y:9},{x:0,y:9}],hedef=[{x:3,y:2},{x:40,y:5},{x:44,y:50},{x:1,y:47}];
  const h=K.homografi(kare,hedef);
  kare.forEach((p,i)=>{const z=h[6]*p.x+h[7]*p.y+1;assert(Math.abs((h[0]*p.x+h[1]*p.y+h[2])/z-hedef[i].x)<1e-6&&Math.abs((h[3]*p.x+h[4]*p.y+h[5])/z-hedef[i].y)<1e-6,'homografi köşeleri eşlemeli')});
  /* dönüş: 4 çeyrek = özdeşlik; piksel yerleşimi */
  const t=K.yeni(3,2);for(let i=0;i<6;i++){t.data[i*4]=i*10;t.data[i*4+3]=255}
  const r1=K.dondur(t,1);assert.strictEqual(r1.width,2);assert.strictEqual(r1.height,3);
  assert.strictEqual(r1.data[(0*2+1)*4],0,'sol-üst piksel 90° saat yönünde sağ-üste gider');
  assert.strictEqual(r1.data[(0*2+0)*4],30,'sol-alt piksel sol-üste gider');
  let r4=t;for(let i=0;i<4;i++)r4=K.dondur(r4,1);assert.deepStrictEqual(Array.from(r4.data),Array.from(t.data));
  assert.deepStrictEqual(Array.from(K.dondur(K.dondur(t,1),3).data),Array.from(t.data),'1+3 = özdeşlik');
  /* köşe dönüşü: sol-üst köşe 90° sonra sağ-üst olur, sıra yine sol-üst→saat yönü */
  const k=[{x:.1,y:.1},{x:.9,y:.1},{x:.9,y:.9},{x:.1,y:.9}],kd=K.koseDondur(k,1);
  assert(Math.abs(kd[0].x-.1)<1e-9&&Math.abs(kd[0].y-.1)<1e-9,'kare köşeler dönünce simetrik kalır');
  const ks=K.koseDondur([{x:.1,y:.2},{x:.8,y:.1},{x:.9,y:.9},{x:.2,y:.8}],1);
  assert(ks[0].x<ks[1].x&&ks[0].y<ks[3].y,'dönüş sonrası sıra sol-üst, sağ-üst, sağ-alt, sol-alt kalır');
}
/* perspektif: gradyan görüntüde köşe ve merkez eşlemesi */
{
  const g=K.yeni(200,100);for(let y=0;y<100;y++)for(let x=0;x<200;x++){const p=(y*200+x)*4;g.data[p]=x*255/199;g.data[p+1]=y*255/99;g.data[p+2]=0;g.data[p+3]=255}
  const q=[{x:20,y:10},{x:180,y:10},{x:180,y:90},{x:20,y:90}],o=K.perspektif(g,q,160,80);
  assert(Math.abs(o.data[0]-20*255/199)<2&&Math.abs(o.data[1]-10*255/99)<2,'sol-üst köşe kaynağın sol-üstüne eşlenmeli');
  const m=((40*160)+80)*4;assert(Math.abs(o.data[m]-100*255/199)<3&&Math.abs(o.data[m+1]-50*255/99)<3,'merkez kaynağın merkezine eşlenmeli');
  const sk=[{x:30,y:5},{x:190,y:20},{x:170,y:95},{x:10,y:80}],s=K.perspektif(g,sk,100,60);
  const e=(59*100+99)*4;assert(Math.abs(s.data[e]-170*255/199)<4&&Math.abs(s.data[e+1]-95*255/99)<4,'çarpık dörtgende sağ-alt köşe doğru eşlenmeli');
  const bs=K.hedefBoyut([{x:0,y:0},{x:300,y:0},{x:300,y:420},{x:0,y:420}],{oran:'a4'});
  assert(Math.abs(bs.h/bs.w-Math.SQRT2)<.01,'A4 oranına oturtulmalı');
  assert(Math.max(K.hedefBoyut([{x:0,y:0},{x:9000,y:0},{x:9000,y:6000},{x:0,y:6000}],{maksKenar:3000}).w)<=3000,'azami kenar uygulanmalı');
}
/* ── köşe algılama ── */
{
  const W=480,H=360;
  const durumlar=[
    ['hafif çarpık ve döner',[{x:80,y:50},{x:400,y:70},{x:420,y:320},{x:60,y:300}]],
    ['neredeyse tüm çerçeve',[{x:14,y:12},{x:466,y:10},{x:470,y:350},{x:10,y:348}]],
    ['35° döner',dondurNokta(240,180,140,95,35)],
    ['küçük belge',[{x:150,y:100},{x:330,y:110},{x:335,y:260},{x:145,y:255}]]
  ];
  for(const[ad,k]of durumlar){
    const r=K.kenarBul(sahne(W,H,k));
    assert(r,ad+': köşeler bulunmalı');
    const sira=norm(K.koseSirala(k),W,H),h=hata(r.koseler,sira);
    assert(h<.05,ad+': köşe hatası %'+(h*100).toFixed(1)+' (en çok %5) bulunan='+JSON.stringify(r.koseler.map(p=>[+(p.x*W).toFixed(0),+(p.y*H).toFixed(0)]))+' beklenen='+JSON.stringify(sira.map(p=>[+(p.x*W).toFixed(0),+(p.y*H).toFixed(0)])));
    const hz=K.kenarBul(sahne(W,H,k),{hizli:true});assert(hz&&hata(hz.koseler,sira)<.07,ad+': hızlı kip de bulmalı');
  }
  assert.strictEqual(K.kenarBul(sahne(W,H,null)),null,'belge yoksa algılama yapılmamalı');
  /* algılanan köşelerle düzleştirilen sayfa masa rengi sızdırmamalı */
  const k=durumlar[0][1],img=sahne(W,H,k),r=K.kenarBul(img),px=r.koseler.map(p=>({x:p.x*W,y:p.y*H})),b=K.hedefBoyut(px),duz=K.perspektif(img,px,b.w,b.h);
  let masa=0,n=0;for(let y=4;y<b.h-4;y+=3)for(let x=4;x<b.w-4;x+=3){const p=(y*b.w+x)*4;n++;if(duz.data[p]<110&&duz.data[p+1]<110&&Math.abs(duz.data[p]-duz.data[p+2])>8)masa++}
  assert(masa/n<.01,'düzleştirilmiş sayfada masa kalmamalı (%'+(masa/n*100).toFixed(2)+')');
}
/* ── filtreler ── */
{
  const W=300,H=400,kagit=sahne(W,H,[{x:0,y:0},{x:W-1,y:0},{x:W-1,y:H-1},{x:0,y:H-1}],{golge:.5,gurultu:3});
  const sol=(im,x0,x1)=>{let toplam=0,n=0;for(let y=40;y<H-40;y+=2)for(let x=x0;x<x1;x++){const p=(y*W+x)*4,v=im.data[p];toplam+=v;n++}return toplam/n};
  const ozdes=K.isle(kagit,{filtre:'orijinal'});
  assert.deepStrictEqual(Array.from(ozdes.data),Array.from(kagit.data),'orijinal + sıfır ayar özdeş olmalı');
  assert.notStrictEqual(ozdes,kagit,'girdi değiştirilmemeli (yeni görüntü)');
  /* gölge: orijinalde sağ taraf belirgin karanlık */
  const o1=sol(kagit,5,60),o2=sol(kagit,W-60,W-5);assert(o1-o2>50,'sentetik gölge yeterince güçlü olmalı');
  for(const f of['sihirli','belge']){
    const s=K.isle(kagit,{filtre:f}),a=sol(s,5,60),b=sol(s,W-60,W-5);
    assert(a>205&&b>205,f+': sayfa her yerde açık olmalı ('+a.toFixed(0)+'/'+b.toFixed(0)+')');
    assert(Math.abs(a-b)<18,f+': gölge giderilmeli (fark '+Math.abs(a-b).toFixed(1)+')');
    let koyu=0,toplam=0;for(let y=H*.2|0;y<H*.8;y++)for(let x=W*.15|0;x<W*.85;x++){const p=(y*W+x)*4;if(kagit.data[p]<95*(1-.5*x/W)+10){toplam++;if(s.data[p]<150)koyu++}}
    assert(toplam>200&&koyu/toplam>.9,f+': yazı koyu kalmalı');
  }
  const bw=K.isle(kagit,{filtre:'bw'});let ikili=true,beyaz=0,say=0;for(let i=0;i<bw.data.length;i+=4){const v=bw.data[i];if(v!==0&&v!==255){ikili=false;break}}
  for(let y=5;y<H-5;y+=3)for(let x=5;x<W-5;x+=3){say++;if(bw.data[(y*W+x)*4]===255)beyaz++}
  assert(ikili,'siyah-beyaz yalnız 0/255 içermeli');assert(beyaz/say>.8&&beyaz/say<.99,'siyah-beyaz: sayfa beyaz, yazı siyah (beyaz oranı '+(beyaz/say).toFixed(2)+')');
  const gri=K.isle(kagit,{filtre:'gri'});for(let i=0;i<gri.data.length;i+=4)if(gri.data[i]!==gri.data[i+1]||gri.data[i]!==gri.data[i+2]){assert.fail('gri: kanallar eşit olmalı')}
  /* ayarlar tek tek */
  const ort=im=>{let t=0;for(let i=0;i<im.data.length;i+=4)t+=im.data[i]+im.data[i+1]+im.data[i+2];return t/(im.data.length/4*3)};
  const taban=ort(ozdes);
  assert(ort(K.isle(kagit,{filtre:'orijinal',parlaklik:40}))>taban+10,'parlaklık artmalı');
  assert(ort(K.isle(kagit,{filtre:'orijinal',parlaklik:-40}))<taban-10,'parlaklık azalmalı');
  const doyuk=K.yeni(4,4);for(let i=0;i<16;i++){doyuk.data.set([220,80,40,255],i*4)}
  const sifirDoy=K.isle(doyuk,{filtre:'orijinal',doygunluk:-100});assert(Math.abs(sifirDoy.data[0]-sifirDoy.data[1])<2&&Math.abs(sifirDoy.data[1]-sifirDoy.data[2])<2,'doygunluk -100 → gri');
  const sic=K.isle(doyuk,{filtre:'orijinal',sicaklik:100});assert(sic.data[0]>doyuk.data[0]&&sic.data[2]<doyuk.data[2],'sıcaklık + kırmızıyı artırıp maviyi azaltmalı');
  const beyk=K.isle(ozdes,{filtre:'orijinal',beyazlik:60});assert(ort(beyk)>ort(ozdes),'beyazlık artmalı');
  const kon=K.isle(kagit,{filtre:'orijinal',kontrast:60}),varyans=im=>{const m=ort(im);let v=0,n=0;for(let i=0;i<im.data.length;i+=4){const d=im.data[i]-m;v+=d*d;n++}return v/n};
  assert(varyans(kon)>varyans(ozdes),'kontrast farkı büyütmeli');
  const nl=K.isle(kagit,{filtre:'orijinal',netlik:80});assert(varyans(nl)>=varyans(ozdes)*.98,'netlik yerel kontrastı artırmalı');
  const gur=K.isle(kagit,{filtre:'orijinal',gurultu:100});let fark=0;for(let y=10;y<30;y++)for(let x=10;x<30;x++){fark+=Math.abs(gur.data[(y*W+x)*4]-gur.data[(y*W+x+1)*4])}
  let farkAsil=0;for(let y=10;y<30;y++)for(let x=10;x<30;x++){farkAsil+=Math.abs(kagit.data[(y*W+x)*4]-kagit.data[(y*W+x+1)*4])}
  assert(fark<farkAsil,'gürültü azaltma komşu farkını azaltmalı');
  const gl=K.isle(kagit,{filtre:'orijinal',golge:100}),a=sol(gl,5,60),b=sol(gl,W-60,W-5);assert(Math.abs(a-b)<25,'gölge giderme kaydırıcısı orijinal filtrede de çalışmalı');
  for(const f of K.FILTRELER){const r=K.isle(kagit,{filtre:f.id});assert.strictEqual(r.width,W);assert.strictEqual(r.height,H)}
  assert(K.kenarSinirla(kagit,150).width===113||K.kenarSinirla(kagit,150).height===150,'kenar sınırlama uzun kenarı azami değere indirmeli');
}
/* ── önizleme (düşük çözünürlük) ile PDF çıktısı (yüksek çözünürlük) aynı görüntüyü vermeli ── */
{
  /* aynı sahne iki çözünürlükte: ince mürekkep çizgileri, işaretleyici lekeleri, gölge eğimi, sıcak ışık */
  const sayfa=W=>{
    const H=Math.round(W*.58),img=K.yeni(W,H),d=img.data,SS=3;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      let R=0,G=0,B=0;
      for(let sy=0;sy<SS;sy++)for(let sx=0;sx<SS;sx++){   /* alt örnekleme: her çözünürlük aynı sürekli sahnenin alan ortalamasıdır */
        const u=(x+(sx+.5)/SS)/W,v=(y+(sy+.5)/SS)/H,k=.8+.2*u;let r=238*k,g=228*k,b=205*k;
        const sari=Math.exp(-(((u-.3)/.12)**2+((v-.4)/.07)**2)),mavi=Math.exp(-(((u-.7)/.1)**2+((v-.65)/.06)**2));
        r*=1-.05*sari-.35*mavi;g*=1-.02*sari-.1*mavi;b*=1-.45*sari-.02*mavi;
        const satir=v*34,fr=satir-Math.floor(satir);   /* çizgi kalınlığı satır aralığıyla (yani çözünürlükle) orantılı */
        if(u>.1&&u<.9&&v>.1&&v<.9&&fr>.4&&fr<.54&&((Math.floor(satir)*5+Math.floor(u*60)*11)%10)>2){r=40*k;g=50*k;b=150*k}
        R+=r;G+=g;B+=b;
      }
      const p=(y*W+x)*4;d[p]=R/(SS*SS);d[p+1]=G/(SS*SS);d[p+2]=B/(SS*SS);d[p+3]=255;
    }
    return img;
  };
  const kucuk=sayfa(600),buyuk=sayfa(1500);
  for(const f of['sihirli','belge','gri','canli']){
    const a=K.isle(kucuk,{filtre:f}),b=K.boyutla(K.isle(buyuk,{filtre:f}),a.width,a.height);
    let fark=0;for(let i=0;i<a.data.length;i+=4)fark+=Math.abs(a.data[i]-b.data[i])+Math.abs(a.data[i+1]-b.data[i+1])+Math.abs(a.data[i+2]-b.data[i+2]);
    fark/=a.data.length/4*3;
    assert(fark<4,f+': önizleme ile yüksek çözünürlüklü çıktı farklı görünüyor (ort. fark '+fark.toFixed(2)+')');
  }
}
/* ── PDF yazıcı ── */
{
  const b64=s=>Uint8Array.from(Buffer.from(s,'base64'));
  const rgb=b64('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAAYABADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDJooorxD7oKKKKAP/Z'),gri=b64('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/wAALCAAQACABAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/AOqooooooor/2Q==');
  const bilgi=K.jpegBilgi(rgb);assert.deepStrictEqual([bilgi.w,bilgi.h,bilgi.nf],[16,24,3]);
  const bg=K.jpegBilgi(gri);assert.deepStrictEqual([bg.w,bg.h,bg.nf],[32,16,1]);
  assert.throws(()=>K.jpegBilgi(new Uint8Array([1,2,3,4])),/geçersiz/);
  const pdf=K.pdfYaz([{jpeg:rgb},{jpeg:gri}],{boyut:'a4',yon:'otomatik',kenarMm:8,baslik:'Çalışma Kağıdı'});
  const metin=Buffer.from(pdf).toString('latin1');
  assert(metin.startsWith('%PDF-1.4')&&metin.trimEnd().endsWith('%%EOF'));
  assert(metin.includes('/Count 2')&&metin.includes('/DeviceRGB')&&metin.includes('/DeviceGray')&&metin.includes('/DCTDecode'));
  /* xref: her ofset "N 0 obj" gösterir */
  const x=metin.lastIndexOf('\nxref\n')+1,satirlar=metin.slice(x).split('\n'),adet=Number(satirlar[1].split(' ')[1]);
  for(let i=1;i<adet;i++){const of=Number(satirlar[2+i].slice(0,10));assert(metin.slice(of).startsWith(i+' 0 obj'),'xref '+i+' doğru ofseti göstermeli')}
  assert.strictEqual(Number(metin.slice(metin.lastIndexOf('startxref')+10).split('\n')[0]),x,'startxref doğru olmalı');
  /* sayfa yerleşimi: her boyut/yönde her kenarda ≥5 mm boşluk, görüntü sayfaya sığar */
  for(const boyut of['a4','a3','a5','letter','orijinal'])for(const yon of['otomatik','dikey','yatay'])for(const[w,h]of[[800,1100],[1100,800],[500,500]]){
    const y=K.sayfaYerlesim(w,h,{boyut,yon,kenarMm:0}),mm=72/25.4;
    assert(y.x>=5*mm-.01&&y.y>=5*mm-.01&&y.pw-(y.x+y.w)>=5*mm-.01&&y.ph-(y.y+y.h)>=5*mm-.01,boyut+'/'+yon+': kenar boşluğu en az 5 mm olmalı');
    assert(Math.abs(y.w/y.h-w/h)<1e-6,'oran korunmalı');
  }
  const a4=K.sayfaYerlesim(1000,500,{boyut:'a4',yon:'otomatik'});assert(a4.pw>a4.ph,'geniş görüntü → otomatik yatay');
  assert.throws(()=>K.pdfYaz([],{}),/en az bir sayfa/);
}
console.log('Belge Tarayıcı çekirdeği testleri başarılı.');
