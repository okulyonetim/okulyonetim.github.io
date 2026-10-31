/* Koruk Asistan — Belge Tarayıcı çekirdeği
 * Saf görüntü işleme ve PDF yazıcı (DOM/Canvas gerektirmez; Node'da test edilir).
 * Görüntü = {width,height,data:Uint8ClampedArray(RGBA)} — tarayıcıdaki ImageData ile aynı biçim.
 *
 *  Köşe algılama ........ kenarBul (açık/koyu zemin, eşik çeşitlemesi, en büyük içbükey olmayan dörtgen)
 *  Perspektif ........... homografi + perspektif (ters eşleme, çift doğrusal örnekleme), hedefBoyut
 *  Filtreler ............ orijinal · sihirli renk · beyaz belge · siyah-beyaz (uyarlamalı eşik) · gri · canlı
 *  Ayarlar .............. parlaklık, kontrast, doygunluk, sıcaklık, gölge giderme, beyazlık, metin koyuluğu,
 *                         netlik, gürültü azaltma, hare (moiré) giderme, siyah-beyaz koyuluğu
 *  PDF .................. pdfYaz: JPEG sayfaları (DCTDecode) doğrudan gömer; A4/A3/A5/Letter/orijinal boyut,
 *                         dikey/yatay/otomatik, her sayfada üst-alt-yan boşluk (en az 5 mm)
 */
(function(global){
'use strict';
const K={};

/* ───────────────────────── görüntü yardımcıları ───────────────────────── */
const sinirla=(v,a,b)=>v<a?a:v>b?b:v;
function yeni(w,h){return{width:w,height:h,data:new Uint8ClampedArray(w*h*4)}}
function kopya(img){return{width:img.width,height:img.height,data:new Uint8ClampedArray(img.data)}}

function kutuKucult(img,f){
  const sw=img.width,w=Math.max(1,Math.floor(sw/f)),h=Math.max(1,Math.floor(img.height/f)),out=yeni(w,h),s=img.data,o=out.data,inv=1/(f*f);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let r=0,g=0,b=0;
    for(let yy=0;yy<f;yy++){let p=((y*f+yy)*sw+x*f)*4;for(let xx=0;xx<f;xx++,p+=4){r+=s[p];g+=s[p+1];b+=s[p+2]}}
    const q=(y*w+x)*4;o[q]=r*inv;o[q+1]=g*inv;o[q+2]=b*inv;o[q+3]=255;
  }
  return out;
}
function dogrusalBoyutla(img,W,H){
  const sw=img.width,sh=img.height,s=img.data,out=yeni(W,H),o=out.data,rx=sw/W,ry=sh/H;
  const x0=new Int32Array(W),x1=new Int32Array(W),wx=new Float32Array(W);
  for(let x=0;x<W;x++){let fx=(x+.5)*rx-.5;if(fx<0)fx=0;if(fx>sw-1)fx=sw-1;const a=fx|0;x0[x]=a;x1[x]=Math.min(sw-1,a+1);wx[x]=fx-a}
  for(let y=0;y<H;y++){
    let fy=(y+.5)*ry-.5;if(fy<0)fy=0;if(fy>sh-1)fy=sh-1;const y0=fy|0,y1=Math.min(sh-1,y0+1),wy=fy-y0;
    for(let x=0;x<W;x++){
      const a=(y0*sw+x0[x])*4,b=(y0*sw+x1[x])*4,c=(y1*sw+x0[x])*4,d=(y1*sw+x1[x])*4,q=(y*W+x)*4,u=wx[x];
      for(let k=0;k<3;k++){const top=s[a+k]*(1-u)+s[b+k]*u,bot=s[c+k]*(1-u)+s[d+k]*u;o[q+k]=top*(1-wy)+bot*wy}
      o[q+3]=255;
    }
  }
  return out;
}
/** Küçültürken önce tamsayı kutu ortalaması (kalite), sonra çift doğrusal ile tam boyut. */
function boyutla(img,W,H){
  W=Math.max(1,Math.round(W));H=Math.max(1,Math.round(H));
  if(img.width===W&&img.height===H)return img;
  let cur=img;const f=Math.floor(Math.min(cur.width/W,cur.height/H));
  if(f>=2)cur=kutuKucult(cur,f);
  if(cur.width===W&&cur.height===H)return cur;
  return dogrusalBoyutla(cur,W,H);
}
/** Uzun kenarı en çok maks piksel olacak biçimde küçültür (büyütmez). */
function kenarSinirla(img,maks){
  const m=Math.max(img.width,img.height);if(m<=maks)return img;
  const s=maks/m;return boyutla(img,img.width*s,img.height*s);
}
/** Saat yönünde çeyrek dönüş (0..3). */
function dondur(img,q){
  q=((q%4)+4)%4;if(!q)return img;
  const w=img.width,h=img.height,s=img.data,odd=q%2===1,W=odd?h:w,H=odd?w:h,out=yeni(W,H),o=out.data;
  for(let oy=0;oy<H;oy++)for(let ox=0;ox<W;ox++){
    let sx,sy;
    if(q===1){sx=oy;sy=h-1-ox}else if(q===2){sx=w-1-ox;sy=h-1-oy}else{sx=w-1-oy;sy=ox}
    const p=(sy*w+sx)*4,r=(oy*W+ox)*4;o[r]=s[p];o[r+1]=s[p+1];o[r+2]=s[p+2];o[r+3]=255;
  }
  return out;
}

/* ───────────────────────── geometri ───────────────────────── */
/** 4 noktayı sol-üst, sağ-üst, sağ-alt, sol-alt sırasına dizer (merkeze göre açı). */
function koseSirala(p){
  const cx=p.reduce((a,q)=>a+q.x,0)/4,cy=p.reduce((a,q)=>a+q.y,0)/4;
  const s=p.map(q=>({x:q.x,y:q.y,a:Math.atan2(q.y-cy,q.x-cx)})).sort((a,b)=>a.a-b.a);
  /* dizi saat yönünde döner; başlangıç, x+y en küçük köşe (açı sıçraması ±180° civarında kararsız olmasın) */
  let b=0;for(let i=1;i<4;i++)if(s[i].x+s[i].y<s[b].x+s[b].y)b=i;
  return[0,1,2,3].map(i=>{const q=s[(b+i)%4];return{x:q.x,y:q.y}});
}
/** Normalleştirilmiş köşeleri saat yönünde çeyrek dönüşle yeni çerçeveye taşır. */
function koseDondur(k,q){
  q=((q%4)+4)%4;let p=k.map(a=>({x:a.x,y:a.y}));
  for(let i=0;i<q;i++)p=p.map(a=>({x:1-a.y,y:a.x}));
  return koseSirala(p);
}
function gauss(A,B){
  const n=B.length;
  for(let i=0;i<n;i++){
    let m=i;for(let j=i+1;j<n;j++)if(Math.abs(A[j][i])>Math.abs(A[m][i]))m=j;
    [A[i],A[m]]=[A[m],A[i]];[B[i],B[m]]=[B[m],B[i]];
    const d=A[i][i]||1e-12;for(let j=i;j<n;j++)A[i][j]/=d;B[i]/=d;
    for(let r=0;r<n;r++){if(r===i)continue;const f=A[r][i];if(!f)continue;for(let j=i;j<n;j++)A[r][j]-=f*A[i][j];B[r]-=f*B[i]}
  }
  return B;
}
/** src[i] → dst[i] eşlemesini veren 3×3 homografi (satır sıralı, h8=1). */
function homografi(src,dst){
  const A=[],B=[];
  for(let i=0;i<4;i++){
    const x=src[i].x,y=src[i].y,u=dst[i].x,v=dst[i].y;
    A.push([x,y,1,0,0,0,-u*x,-u*y]);B.push(u);
    A.push([0,0,0,x,y,1,-v*x,-v*y]);B.push(v);
  }
  const h=gauss(A,B);return[h[0],h[1],h[2],h[3],h[4],h[5],h[6],h[7],1];
}
const uzak=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
/** Piksel cinsinden köşelerden (sol-üst, sağ-üst, sağ-alt, sol-alt) çıktı boyutu. oran:'a4' → A4 oranına yakınsa oturtur. */
function hedefBoyut(k,{maksKenar=3000,oran='serbest'}={}){
  let W=Math.max(uzak(k[0],k[1]),uzak(k[3],k[2])),H=Math.max(uzak(k[0],k[3]),uzak(k[1],k[2]));
  W=Math.max(8,W);H=Math.max(8,H);
  if(oran==='a4'){
    const r=Math.SQRT2;
    if(Math.abs(H/W-r)<.14)H=W*r;else if(Math.abs(W/H-r)<.14)W=H*r;
  }
  const m=Math.max(W,H);if(m>maksKenar){const s=maksKenar/m;W*=s;H*=s}
  return{w:Math.max(8,Math.round(W)),h:Math.max(8,Math.round(H))};
}
/** Kaynak görüntüde piksel cinsinden verilen dörtgeni W×H dikdörtgene düzleştirir (çift doğrusal). */
function perspektif(img,k,W,H){
  const sw=img.width,sh=img.height,s=img.data,out=yeni(W,H),o=out.data;
  const Hm=homografi([{x:0,y:0},{x:W-1,y:0},{x:W-1,y:H-1},{x:0,y:H-1}],k);
  const h0=Hm[0],h1=Hm[1],h2=Hm[2],h3=Hm[3],h4=Hm[4],h5=Hm[5],h6=Hm[6],h7=Hm[7];
  const mx=sw-1,my=sh-1;
  for(let y=0;y<H;y++){
    let nx=h1*y+h2,ny=h4*y+h5,nz=h7*y+1;
    for(let x=0;x<W;x++,nx+=h0,ny+=h3,nz+=h6){
      const z=nz||1e-9;let fx=nx/z,fy=ny/z;
      if(fx<0)fx=0;else if(fx>mx)fx=mx;if(fy<0)fy=0;else if(fy>my)fy=my;
      const x0=fx|0,y0=fy|0,x1=x0<mx?x0+1:x0,y1=y0<my?y0+1:y0,u=fx-x0,v=fy-y0;
      const a=(y0*sw+x0)*4,b=(y0*sw+x1)*4,c=(y1*sw+x0)*4,d=(y1*sw+x1)*4,q=(y*W+x)*4;
      const w00=(1-u)*(1-v),w10=u*(1-v),w01=(1-u)*v,w11=u*v;
      o[q]=s[a]*w00+s[b]*w10+s[c]*w01+s[d]*w11;
      o[q+1]=s[a+1]*w00+s[b+1]*w10+s[c+1]*w01+s[d+1]*w11;
      o[q+2]=s[a+2]*w00+s[b+2]*w10+s[c+2]*w01+s[d+2]*w11;
      o[q+3]=255;
    }
  }
  return out;
}

/* ───────────────────────── köşe (belge kenarı) algılama ───────────────────────── */
function griDizi(img){
  const n=img.width*img.height,g=new Uint8Array(n),d=img.data;
  for(let i=0,j=0;i<n;i++,j+=4)g[i]=(d[j]*77+d[j+1]*150+d[j+2]*29)>>8;
  return g;
}
function bulaniklastir3(g,w,h){
  const o=new Uint8Array(g.length);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let t=0,n=0;
    for(let dy=-1;dy<=1;dy++){const yy=y+dy;if(yy<0||yy>=h)continue;for(let dx=-1;dx<=1;dx++){const xx=x+dx;if(xx<0||xx>=w)continue;t+=g[yy*w+xx];n++}}
    o[y*w+x]=t/n;
  }
  return o;
}
function otsu(g){
  const hist=new Float64Array(256);for(let i=0;i<g.length;i++)hist[g[i]]++;
  let top=0;for(let i=0;i<256;i++)top+=i*hist[i];
  let wb=0,sb=0,best=-1,th=127;
  for(let i=0;i<256;i++){wb+=hist[i];if(!wb)continue;const wf=g.length-wb;if(!wf)break;sb+=i*hist[i];const mb=sb/wb,mf=(top-sb)/wf,v=wb*wf*(mb-mf)*(mb-mf);if(v>best){best=v;th=i}}
  return th;
}
function maske(g,t,koyu){const m=new Uint8Array(g.length);for(let i=0;i<g.length;i++)m[i]=(koyu?g[i]<t:g[i]>=t)?1:0;return m}
function asindir(m,w,h){
  const o=new Uint8Array(m.length);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let v=m[y*w+x];
    if(v)for(let dy=-1;dy<=1&&v;dy++){const yy=y+dy;if(yy<0||yy>=h)continue;for(let dx=-1;dx<=1;dx++){const xx=x+dx;if(xx<0||xx>=w)continue;if(!m[yy*w+xx]){v=0;break}}}
    o[y*w+x]=v;
  }
  return o;
}
function yay(m,w,h){
  const o=new Uint8Array(m.length);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let v=0;
    for(let dy=-1;dy<=1&&!v;dy++){const yy=y+dy;if(yy<0||yy>=h)continue;for(let dx=-1;dx<=1;dx++){const xx=x+dx;if(xx<0||xx>=w)continue;if(m[yy*w+xx]){v=1;break}}}
    o[y*w+x]=v;
  }
  return o;
}
function bilesenler(m,w,h){
  const lab=new Int32Array(w*h),st=new Int32Array(w*h),list=[];let n=0;
  for(let i=0;i<m.length;i++){
    if(!m[i]||lab[i])continue;
    n++;let sp=0,area=0;st[sp++]=i;lab[i]=n;
    while(sp){
      const p=st[--sp];area++;const x=p%w,y=(p/w)|0;
      if(x>0&&m[p-1]&&!lab[p-1]){lab[p-1]=n;st[sp++]=p-1}
      if(x<w-1&&m[p+1]&&!lab[p+1]){lab[p+1]=n;st[sp++]=p+1}
      if(y>0&&m[p-w]&&!lab[p-w]){lab[p-w]=n;st[sp++]=p-w}
      if(y<h-1&&m[p+w]&&!lab[p+w]){lab[p+w]=n;st[sp++]=p+w}
    }
    list.push({id:n,area});
  }
  return{lab,list};
}
function dis(a,b,c){return(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])}
function ucgenAlan(a,b,c){return Math.abs(dis(a,b,c))/2}
/** Monoton zincir dışbükey zarf (saat yönünün tersi). */
function zarf(pts){
  pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const u=[];for(const p of pts){while(u.length>1&&dis(u[u.length-2],u[u.length-1],p)<=0)u.pop();u.push(p)}
  const l=[];for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(l.length>1&&dis(l[l.length-2],l[l.length-1],p)<=0)l.pop();l.push(p)}
  u.pop();l.pop();return u.concat(l);
}
function cokgenAlan(P){let a=0;for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length];a+=p[0]*q[1]-q[0]*p[1]}return Math.abs(a)/2}
/** Dışbükey çokgene yazılı en büyük alanlı dörtgen (köşegen çifti + her iki yana en uzak nokta). */
function enBuyukDortgen(P){
  let n=P.length;if(n<4)return null;
  if(n>200){const r=[];for(let i=0;i<200;i++)r.push(P[Math.floor(i*n/200)]);P=r;n=P.length}
  let best=null,ba=0;
  for(let i=0;i<n;i++)for(let k=i+2;k<n;k++){
    let j=-1,aj=0;for(let t=i+1;t<k;t++){const a=ucgenAlan(P[i],P[t],P[k]);if(a>aj){aj=a;j=t}}
    let l=-1,al=0;for(let t=k+1;t<n+i;t++){const tt=t%n,a=ucgenAlan(P[i],P[tt],P[k]);if(a>al){al=a;l=tt}}
    if(j<0||l<0)continue;
    const s=aj+al;if(s>ba){ba=s;best=[P[i],P[j],P[k],P[l]]}
  }
  return best?{pts:best,alan:ba}:null;
}
function aciGecerli(q){
  for(let i=0;i<4;i++){
    const a=q[(i+3)%4],b=q[i],c=q[(i+1)%4];
    const v1x=a.x-b.x,v1y=a.y-b.y,v2x=c.x-b.x,v2y=c.y-b.y,l1=Math.hypot(v1x,v1y),l2=Math.hypot(v2x,v2y);
    if(l1<1e-6||l2<1e-6)return false;
    const cos=(v1x*v2x+v1y*v2y)/(l1*l2),ang=Math.acos(sinirla(cos,-1,1))*180/Math.PI;
    if(ang<45||ang>135)return false;
  }
  return true;
}
function adayDegerlendir(m,w,h,g){
  const{lab,list}=bilesenler(m,w,h),toplam=w*h;
  const adaylar=list.filter(c=>c.area>=toplam*.08).sort((a,b)=>b.area-a.area).slice(0,3);
  let en=null;
  for(const c of adaylar){
    /* belge ile çevresi arasında yeterli parlaklık farkı olmalı (düz/gürültülü sahnelerde sahte dörtgen çıkmasın) */
    let ic=0,dis_=0;for(let i=0;i<lab.length;i++){if(lab[i]===c.id)ic+=g[i];else dis_+=g[i]}
    const disN=lab.length-c.area;if(disN>0&&Math.abs(ic/c.area-dis_/disN)<22)continue;
    const pts=[];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=y*w+x;if(lab[p]!==c.id)continue;
      const kenar=x===0||y===0||x===w-1||y===h-1||lab[p-1]!==c.id||lab[p+1]!==c.id||lab[p-w]!==c.id||lab[p+w]!==c.id;
      if(kenar)pts.push([x,y],[x+1,y],[x,y+1],[x+1,y+1]);
    }
    if(pts.length<8)continue;
    const Z=zarf(pts),za=cokgenAlan(Z);if(za<=0)continue;
    const dq=enBuyukDortgen(Z);if(!dq)continue;
    const frac=dq.alan/toplam,recti=dq.alan/za,doluluk=Math.min(1,c.area/za*1.08);
    if(frac<.1)continue;
    const kose=koseSirala(dq.pts.map(p=>({x:p[0],y:p[1]})));
    if(!aciGecerli(kose))continue;
    const minKenar=Math.min(uzak(kose[0],kose[1]),uzak(kose[1],kose[2]),uzak(kose[2],kose[3]),uzak(kose[3],kose[0]));
    if(minKenar<.12*Math.min(w,h))continue;
    let skor=frac*Math.pow(recti,4)*(.6+.4*doluluk);
    if(frac>.965)skor*=.04;           /* neredeyse tüm çerçeve (ör. belgeyi çevreleyen masa): belge algılanmış sayılmaz */
    if(!en||skor>en.skor)en={skor,kose,frac};
  }
  return en;
}
/**
 * Belgenin dört köşesini bulur. Dönüş: {koseler:[{x,y}×4 (0..1), sol-üst→saat yönü], guven} ya da null.
 * secenek.hizli: canlı kamera önizlemesi için tek eşik.
 */
function kenarBul(img,secenek){
  const hizli=!!(secenek&&secenek.hizli),W0=img.width,H0=img.height,hedef=hizli?150:220;
  const k=hedef/Math.max(W0,H0),kucuk=k<1?boyutla(img,W0*k,H0*k):img,w=kucuk.width,h=kucuk.height;
  if(w<24||h<24)return null;
  const g=bulaniklastir3(griDizi(kucuk),w,h),t=otsu(g);
  const esikler=hizli?[t]:[Math.round(t*.85),t,Math.min(250,Math.round(t*1.15))];
  let en=null;
  for(const koyu of[false,true])for(const e of esikler){
    let m=maske(g,e,koyu);m=yay(asindir(m,w,h),w,h);
    const r=adayDegerlendir(m,w,h,g);
    if(r&&(!en||r.skor>en.skor))en=r;
  }
  if(!en||en.skor<.1)return null;
  return{koseler:en.kose.map(p=>({x:sinirla(p.x/w,0,1),y:sinirla(p.y/h,0,1)})),guven:sinirla(en.skor,0,1)};
}

/* ───────────────────────── renk / filtre ───────────────────────── */
const VARSAYILAN={filtre:'sihirli',parlaklik:0,kontrast:0,doygunluk:0,sicaklik:0,golge:0,beyazlik:0,metin:0,netlik:0,gurultu:0,hareli:0,esik:0};
function varsayilanAyar(){return Object.assign({},VARSAYILAN)}
const FILTRELER=[
  {id:'orijinal',ad:'Orijinal'},
  {id:'sihirli',ad:'Sihirli Renk'},
  {id:'belge',ad:'Beyaz Belge'},
  {id:'bw',ad:'Siyah-Beyaz'},
  {id:'gri',ad:'Gri Tonlama'},
  {id:'canli',ad:'Canlı'}
];
/** Gölge/aydınlatma düzeltmesi: blok bazlı arka plan (parlak yüzde) tahmini → böl. guc: 0..1 karışım. */
function duzAlan(img,guc){
  const w=img.width,h=img.height,s=img.data;
  const blok=Math.max(6,Math.round(Math.min(w,h)/48)),bw=Math.ceil(w/blok),bh=Math.ceil(h/blok);
  const bg=new Float32Array(bw*bh*3),parlak=new Float32Array(bw*bh),hist=new Uint32Array(64);
  for(let by=0;by<bh;by++)for(let bx=0;bx<bw;bx++){
    const x0=bx*blok,x1=Math.min(w,x0+blok),y0=by*blok,y1=Math.min(h,y0+blok);
    hist.fill(0);let cnt=0;
    for(let y=y0;y<y1;y++){let p=(y*w+x0)*4;for(let x=x0;x<x1;x++,p+=4){hist[((s[p]*77+s[p+1]*150+s[p+2]*29)>>8)>>2]++;cnt++}}
    let acc=0,t=63;for(;t>0;t--){acc+=hist[t];if(acc>=cnt*.12)break}
    let r=0,g=0,b=0,n=0;
    for(let y=y0;y<y1;y++){let p=(y*w+x0)*4;for(let x=x0;x<x1;x++,p+=4){if((((s[p]*77+s[p+1]*150+s[p+2]*29)>>8)>>2)>=t){r+=s[p];g+=s[p+1];b+=s[p+2];n++}}}
    n=n||1;const i=by*bw+bx;bg[i*3]=r/n;bg[i*3+1]=g/n;bg[i*3+2]=b/n;parlak[i]=.299*bg[i*3]+.587*bg[i*3+1]+.114*bg[i*3+2];
  }
  /* kalın metin/koyu bloklar için: komşular arasında en parlak blok (3×3) */
  const mx=new Float32Array(bw*bh*3);
  for(let by=0;by<bh;by++)for(let bx=0;bx<bw;bx++){
    let bi=by*bw+bx,bl=parlak[bi];
    for(let dy=-1;dy<=1;dy++){const yy=by+dy;if(yy<0||yy>=bh)continue;for(let dx=-1;dx<=1;dx++){const xx=bx+dx;if(xx<0||xx>=bw)continue;const j=yy*bw+xx;if(parlak[j]>bl){bl=parlak[j];bi=j}}}
    const i=by*bw+bx;mx[i*3]=bg[bi*3];mx[i*3+1]=bg[bi*3+1];mx[i*3+2]=bg[bi*3+2];
  }
  /* yumuşatma: 3×3 ortalama ×2 */
  let a=mx,b2=new Float32Array(mx.length);
  for(let pass=0;pass<2;pass++){
    for(let by=0;by<bh;by++)for(let bx=0;bx<bw;bx++){
      let r=0,g=0,b=0,n=0;
      for(let dy=-1;dy<=1;dy++){const yy=by+dy;if(yy<0||yy>=bh)continue;for(let dx=-1;dx<=1;dx++){const xx=bx+dx;if(xx<0||xx>=bw)continue;const j=(yy*bw+xx)*3;r+=a[j];g+=a[j+1];b+=a[j+2];n++}}
      const i=(by*bw+bx)*3;b2[i]=r/n;b2[i+1]=g/n;b2[i+2]=b/n;
    }
    const t=a;a=b2;b2=t;
  }
  const out=yeni(w,h),o=out.data;
  const x0s=new Int32Array(w),x1s=new Int32Array(w),wxs=new Float32Array(w);
  for(let x=0;x<w;x++){let f=(x+.5)/blok-.5;if(f<0)f=0;if(f>bw-1)f=bw-1;const i0=f|0;x0s[x]=i0;x1s[x]=Math.min(bw-1,i0+1);wxs[x]=f-i0}
  const HEDEF=252;
  for(let y=0;y<h;y++){
    let f=(y+.5)/blok-.5;if(f<0)f=0;if(f>bh-1)f=bh-1;const y0=f|0,y1=Math.min(bh-1,y0+1),wy=f-y0;
    for(let x=0;x<w;x++){
      const u=wxs[x],i00=(y0*bw+x0s[x])*3,i10=(y0*bw+x1s[x])*3,i01=(y1*bw+x0s[x])*3,i11=(y1*bw+x1s[x])*3,q=(y*w+x)*4;
      for(let k=0;k<3;k++){
        const top=a[i00+k]*(1-u)+a[i10+k]*u,bot=a[i01+k]*(1-u)+a[i11+k]*u,bgv=top*(1-wy)+bot*wy;
        const gain=Math.min(4,HEDEF/Math.max(bgv,1)),v=s[q+k],nv=v*gain;
        o[q+k]=guc>=1?nv:v*(1-guc)+nv*guc;
      }
      o[q+3]=255;
    }
  }
  return out;
}
function griYap(img){
  const d=img.data;
  for(let i=0;i<d.length;i+=4){const y=(d[i]*77+d[i+1]*150+d[i+2]*29)>>8;d[i]=d[i+1]=d[i+2]=y}
}
function parlaklikYuzdelik(img,oran){
  const d=img.data,hist=new Uint32Array(256);
  for(let i=0;i<d.length;i+=4)hist[(d[i]*77+d[i+1]*150+d[i+2]*29)>>8]++;
  const n=d.length/4,hedef=n*oran;let acc=0;
  for(let v=0;v<256;v++){acc+=hist[v];if(acc>=hedef)return v}
  return 255;
}
/** Otomatik seviye: koyu uç yüzdeliği siyaha çekilir; isteğe bağlı doygunluk/kontrast. */
function otomatikSeviye(img,{doygun=1,kontrast=1}={}){
  const d=img.data,lo=Math.min(90,parlaklikYuzdelik(img,.01))*.8,aralik=Math.max(40,255-lo);
  for(let i=0;i<d.length;i+=4){
    let r=(d[i]-lo)*255/aralik,g=(d[i+1]-lo)*255/aralik,b=(d[i+2]-lo)*255/aralik;
    if(doygun!==1){const y=.299*r+.587*g+.114*b;r=y+(r-y)*doygun;g=y+(g-y)*doygun;b=y+(b-y)*doygun}
    if(kontrast!==1){r=(r-128)*kontrast+128;g=(g-128)*kontrast+128;b=(b-128)*kontrast+128}
    d[i]=r;d[i+1]=g;d[i+2]=b;
  }
}
/** Beyaz belge eğrisi: sayfa beyazı korunur, mürekkep koyulaşır. */
function belgeEgri(img){
  const d=img.data,lut=new Uint8ClampedArray(256);
  for(let v=0;v<256;v++){const t=sinirla((v-24)/(238-24),0,1);lut[v]=255*Math.pow(t,1.35)}
  for(let i=0;i<d.length;i+=4){const y=lut[d[i]];d[i]=d[i+1]=d[i+2]=y}
}
/** Uyarlamalı (yerel ortalama) eşik: integral görüntü. koyuluk: -50..50 (yüksek = daha çok mürekkep). */
function uyarlamaliEsik(img,koyuluk){
  const w=img.width,h=img.height,d=img.data,I=new Float64Array((w+1)*(h+1));
  for(let y=0;y<h;y++){let satir=0;for(let x=0;x<w;x++){satir+=d[(y*w+x)*4];I[(y+1)*(w+1)+x+1]=I[y*(w+1)+x+1]+satir}}
  let r=Math.max(7,Math.round(Math.min(w,h)/20));
  const t=sinirla(.12-koyuluk*.004,0,.4);
  for(let y=0;y<h;y++){
    const y0=Math.max(0,y-r),y1=Math.min(h,y+r+1);
    for(let x=0;x<w;x++){
      const x0=Math.max(0,x-r),x1=Math.min(w,x+r+1),n=(x1-x0)*(y1-y0);
      const toplam=I[y1*(w+1)+x1]-I[y0*(w+1)+x1]-I[y1*(w+1)+x0]+I[y0*(w+1)+x0];
      const p=(y*w+x)*4,v=d[p]>toplam/n*(1-t)?255:0;
      d[p]=d[p+1]=d[p+2]=v;
    }
  }
}
function kutuBulanik(img,r){
  const w=img.width,h=img.height,s=img.data,tmp=new Float32Array(w*h*3),out=yeni(w,h),o=out.data;
  r=Math.max(1,Math.round(r));const n=2*r+1;
  for(let y=0;y<h;y++){
    let a0=0,a1=0,a2=0;
    for(let x=-r;x<=r;x++){const xx=sinirla(x,0,w-1),p=(y*w+xx)*4;a0+=s[p];a1+=s[p+1];a2+=s[p+2]}
    for(let x=0;x<w;x++){
      const q=(y*w+x)*3;tmp[q]=a0/n;tmp[q+1]=a1/n;tmp[q+2]=a2/n;
      const add=(y*w+sinirla(x+r+1,0,w-1))*4,sub=(y*w+sinirla(x-r,0,w-1))*4;
      a0+=s[add]-s[sub];a1+=s[add+1]-s[sub+1];a2+=s[add+2]-s[sub+2];
    }
  }
  for(let x=0;x<w;x++){
    let a0=0,a1=0,a2=0;
    for(let y=-r;y<=r;y++){const yy=sinirla(y,0,h-1),q=(yy*w+x)*3;a0+=tmp[q];a1+=tmp[q+1];a2+=tmp[q+2]}
    for(let y=0;y<h;y++){
      const p=(y*w+x)*4;o[p]=a0/n;o[p+1]=a1/n;o[p+2]=a2/n;o[p+3]=255;
      const add=(sinirla(y+r+1,0,h-1)*w+x)*3,sub=(sinirla(y-r,0,h-1)*w+x)*3;
      a0+=tmp[add]-tmp[sub];a1+=tmp[add+1]-tmp[sub+1];a2+=tmp[add+2]-tmp[sub+2];
    }
  }
  return out;
}
function karistir(a,b,oran){const d=a.data,e=b.data;for(let i=0;i<d.length;i+=4){d[i]=d[i]*(1-oran)+e[i]*oran;d[i+1]=d[i+1]*(1-oran)+e[i+1]*oran;d[i+2]=d[i+2]*(1-oran)+e[i+2]*oran}}
/** Kenar koruyan 3×3 gürültü azaltma (parlaklık farkına göre ağırlık). */
function kenarKoruyanBulanik(img,guc){
  const w=img.width,h=img.height,s=new Uint8ClampedArray(img.data),d=img.data,sigma=10+guc*28,inv=1/(2*sigma*sigma),agirlik=new Float32Array(256);
  for(let i=0;i<256;i++)agirlik[i]=Math.exp(-i*i*inv);
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const p=(y*w+x)*4,l0=(s[p]*77+s[p+1]*150+s[p+2]*29)>>8;
    let r=0,g=0,b=0,t=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const q=p+(dy*w+dx)*4,l=(s[q]*77+s[q+1]*150+s[q+2]*29)>>8,k=agirlik[Math.abs(l-l0)];
      r+=s[q]*k;g+=s[q+1]*k;b+=s[q+2]*k;t+=k;
    }
    d[p]=s[p]*(1-guc)+r/t*guc;d[p+1]=s[p+1]*(1-guc)+g/t*guc;d[p+2]=s[p+2]*(1-guc)+b/t*guc;
  }
}
/**
 * Tüm filtre ve ayarlar. Girdiyi değiştirmez; yeni görüntü döndürür.
 * ayar: varsayilanAyar() alanları. Sıra: gölge düzeltme → filtre tonu → parlaklık/kontrast/doygunluk/sıcaklık/beyazlık/metin → gürültü → hare → netlik.
 */
function isle(img,ayar){
  const a=Object.assign({},VARSAYILAN,ayar),f=a.filtre,w=img.width,h=img.height,px=Math.max(w,h);
  let o=kopya(img);
  if(f==='sihirli'||f==='belge'||f==='bw')o=duzAlan(o,1);
  else if(a.golge>0)o=duzAlan(o,sinirla(a.golge/100,0,1));
  if(f==='sihirli')otomatikSeviye(o,{doygun:1.22,kontrast:1.06});
  else if(f==='belge'){griYap(o);belgeEgri(o)}
  else if(f==='gri'){griYap(o);otomatikSeviye(o,{})}
  else if(f==='canli')otomatikSeviye(o,{doygun:1.5,kontrast:1.12});
  if(f==='bw'){
    griYap(o);
    const par=a.parlaklik;if(par){const d=o.data;for(let i=0;i<d.length;i+=4){const v=d[i]+par*1.2;d[i]=d[i+1]=d[i+2]=v}}
    uyarlamaliEsik(o,a.esik);return o;
  }
  /* parlaklık · kontrast · sıcaklık · beyazlık · metin → kanal başına tek LUT */
  const kn=sinirla(a.kontrast,-100,100)*1.6,kf=(259*(kn+255))/(255*(259-kn)),par=sinirla(a.parlaklik,-100,100)*1.2;
  const bey=sinirla(a.beyazlik,0,100),beyOlcek=255/(255-bey*.9),gama=1+sinirla(a.metin,0,100)/100*.9,sic=sinirla(a.sicaklik,-100,100)*.4;
  const lut=[new Uint8ClampedArray(256),new Uint8ClampedArray(256),new Uint8ClampedArray(256)],kanalKayma=[sic,0,-sic];
  for(let c=0;c<3;c++)for(let v=0;v<256;v++){
    let x=kf*(v-128)+128+par+kanalKayma[c];
    x*=beyOlcek;
    if(gama!==1)x=255*Math.pow(sinirla(x,0,255)/255,gama);
    lut[c][v]=x;
  }
  const doy=1+sinirla(a.doygunluk,-100,100)/100,d=o.data;
  for(let i=0;i<d.length;i+=4){
    let r=d[i],g=d[i+1],b=d[i+2];
    if(doy!==1){const y=.299*r+.587*g+.114*b;r=sinirla(y+(r-y)*doy,0,255);g=sinirla(y+(g-y)*doy,0,255);b=sinirla(y+(b-y)*doy,0,255)}
    d[i]=lut[0][r|0];d[i+1]=lut[1][g|0];d[i+2]=lut[2][b|0];
  }
  const rs=Math.max(1,px/1000);
  if(a.gurultu>0)kenarKoruyanBulanik(o,sinirla(a.gurultu/100,0,1)*.85);
  if(a.hareli>0){const b=kutuBulanik(o,rs*1.5);karistir(o,b,sinirla(a.hareli/100,0,1)*.85)}
  if(a.netlik>0){
    const b=kutuBulanik(o,rs),q=sinirla(a.netlik/100,0,1)*1.6,dd=o.data,bb=b.data;
    for(let i=0;i<dd.length;i+=4){dd[i]+=(dd[i]-bb[i])*q;dd[i+1]+=(dd[i+1]-bb[i+1])*q;dd[i+2]+=(dd[i+2]-bb[i+2])*q}
  }
  return o;
}

/* ───────────────────────── JPEG bilgisi ve PDF yazıcı ───────────────────────── */
function jpegBilgi(b){
  if(!b||b.length<4||b[0]!==0xFF||b[1]!==0xD8)throw new Error('JPEG verisi geçersiz.');
  let p=2;
  while(p+9<b.length){
    if(b[p]!==0xFF){p++;continue}
    const m=b[p+1];
    if(m===0xFF){p++;continue}
    if(m>=0xC0&&m<=0xCF&&m!==0xC4&&m!==0xC8&&m!==0xCC)return{h:(b[p+5]<<8)|b[p+6],w:(b[p+7]<<8)|b[p+8],nf:b[p+9]};
    if(m===0xD8||m===0x01||(m>=0xD0&&m<=0xD7)){p+=2;continue}
    p+=2+((b[p+2]<<8)|b[p+3]);
  }
  throw new Error('JPEG boyutu okunamadı.');
}
const SAYFA_MM={a4:[210,297],a3:[297,420],a5:[148,210],letter:[215.9,279.4]};
const MM_PT=72/25.4;
/** Görüntü boyutu (px) için PDF sayfa yerleşimi: sayfa (pt), görüntü konumu/boyutu (pt). */
function sayfaYerlesim(iw,ih,sec){
  sec=sec||{};
  const kenar=Math.max(5,Number(sec.kenarMm)||8)*MM_PT;
  let PW,PH;
  if(sec.boyut==='orijinal'){const dpi=sinirla(Number(sec.dpi)||150,72,600);PW=iw/dpi*72+2*kenar;PH=ih/dpi*72+2*kenar}
  else{
    const[bw,bh]=SAYFA_MM[sec.boyut]||SAYFA_MM.a4;PW=bw*MM_PT;PH=bh*MM_PT;
    const yatay=sec.yon==='yatay'||((!sec.yon||sec.yon==='otomatik')&&iw>ih);
    if(yatay){const t=PW;PW=PH;PH=t}
  }
  const olcek=Math.min((PW-2*kenar)/iw,(PH-2*kenar)/ih),dw=iw*olcek,dh=ih*olcek;
  return{pw:PW,ph:PH,x:(PW-dw)/2,y:(PH-dh)/2,w:dw,h:dh,kenar};
}
const sayi=n=>String(Math.round(n*100)/100);
function asciiBayt(s){const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i)&255;return b}
function utf16Hex(s){let h='FEFF';for(let i=0;i<s.length;i++)h+=s.charCodeAt(i).toString(16).padStart(4,'0').toUpperCase();return'<'+h+'>'}
/**
 * JPEG sayfalardan PDF üretir. sayfalar: [{jpeg:Uint8Array}]; sec: {boyut:'a4'|'a3'|'a5'|'letter'|'orijinal', yon:'otomatik'|'dikey'|'yatay', kenarMm, dpi, baslik}.
 * Dönüş: Uint8Array (PDF 1.4).
 */
function pdfYaz(sayfalar,sec){
  if(!sayfalar||!sayfalar.length)throw new Error('PDF için en az bir sayfa gerekir.');
  const parcalar=[],ofset=[];let uzunluk=0;
  const yaz=b=>{const u=typeof b==='string'?asciiBayt(b):b;parcalar.push(u);uzunluk+=u.length};
  const nesne=(no,icerik)=>{ofset[no]=uzunluk;yaz(no+' 0 obj\n');yaz(icerik);yaz('\nendobj\n')};
  const n=sayfalar.length,toplamNesne=3+3*n;
  yaz('%PDF-1.4\n%âãÏÓ\n');
  nesne(1,'<< /Type /Catalog /Pages 2 0 R >>');
  const kids=[];for(let i=0;i<n;i++)kids.push((4+3*i)+' 0 R');
  nesne(2,'<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+n+' >>');
  nesne(3,'<< /Producer (Koruk Asistan Belge Tarayici) /Title '+utf16Hex(String((sec&&sec.baslik)||'Taranan Belge'))+' >>');
  for(let i=0;i<n;i++){
    const jpeg=sayfalar[i].jpeg,bilgi=jpegBilgi(jpeg);
    if(bilgi.nf!==1&&bilgi.nf!==3)throw new Error('Desteklenmeyen JPEG renk kanalı sayısı.');
    const y=sayfaYerlesim(bilgi.w,bilgi.h,sec),sayfaNo=4+3*i,icerikNo=5+3*i,resimNo=6+3*i;
    nesne(sayfaNo,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+sayi(y.pw)+' '+sayi(y.ph)+'] /Resources << /XObject << /Im0 '+resimNo+' 0 R >> >> /Contents '+icerikNo+' 0 R >>');
    const akis='q '+sayi(y.w)+' 0 0 '+sayi(y.h)+' '+sayi(y.x)+' '+sayi(y.y)+' cm /Im0 Do Q';
    nesne(icerikNo,'<< /Length '+akis.length+' >>\nstream\n'+akis+'\nendstream');
    ofset[resimNo]=uzunluk;
    yaz(resimNo+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+bilgi.w+' /Height '+bilgi.h+' /ColorSpace /'+(bilgi.nf===1?'DeviceGray':'DeviceRGB')+' /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n');
    yaz(jpeg);yaz('\nendstream\nendobj\n');
  }
  const xref=uzunluk;
  let tablo='xref\n0 '+(toplamNesne+1)+'\n0000000000 65535 f \n';
  for(let i=1;i<=toplamNesne;i++)tablo+=String(ofset[i]).padStart(10,'0')+' 00000 n \n';
  yaz(tablo+'trailer\n<< /Size '+(toplamNesne+1)+' /Root 1 0 R /Info 3 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
  const out=new Uint8Array(uzunluk);let p=0;for(const u of parcalar){out.set(u,p);p+=u.length}
  return out;
}

/* ───────────────────────── dışa aktarım ───────────────────────── */
Object.assign(K,{
  yeni,kopya,boyutla,kenarSinirla,dondur,koseSirala,koseDondur,homografi,hedefBoyut,perspektif,
  kenarBul,isle,varsayilanAyar,FILTRELER,jpegBilgi,sayfaYerlesim,pdfYaz,SAYFA_MM,
  _t:{duzAlan,uyarlamaliEsik,kutuBulanik,otsu,zarf,enBuyukDortgen}
});
global.BelgeTarayiciCore=K;
if(typeof module!=='undefined'&&module.exports)module.exports=K;
})(typeof window!=='undefined'?window:globalThis);
