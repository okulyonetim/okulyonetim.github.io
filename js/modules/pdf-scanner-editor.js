/* Koruk Asistan — CamScanner tarzı belge tarama editörü.
 * Canonical PDF scanner surface: corner selection + perspective + live filters.
 */
(function(global){
'use strict';
if(global.PdfScannerEditor)return;

const ID='kaPdfScanner';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let state=null, raf=0;

const MODES={
  original:{label:'Orijinal',brightness:0,contrast:0,whiten:0,shadow:0,denoise:0,sharpness:0,saturation:0,temperature:0,gray:false,threshold:0},
  auto:{label:'Otomatik',brightness:6,contrast:18,whiten:12,shadow:28,denoise:10,sharpness:22,saturation:0,temperature:0,gray:false,threshold:0},
  magic:{label:'Sihirli Renk',brightness:4,contrast:24,whiten:18,shadow:38,denoise:12,sharpness:28,saturation:12,temperature:2,gray:false,threshold:0},
  color:{label:'Renkli',brightness:0,contrast:8,whiten:4,shadow:8,denoise:4,sharpness:12,saturation:8,temperature:0,gray:false,threshold:0},
  gray:{label:'Gri',brightness:4,contrast:18,whiten:12,shadow:30,denoise:10,sharpness:24,saturation:0,temperature:0,gray:true,threshold:0},
  bw:{label:'Siyah-Beyaz',brightness:8,contrast:38,whiten:20,shadow:50,denoise:16,sharpness:35,saturation:0,temperature:0,gray:true,threshold:18},
  clear:{label:'Net Belge',brightness:7,contrast:30,whiten:22,shadow:52,denoise:22,sharpness:48,saturation:0,temperature:0,gray:true,threshold:8}
};

function close(){
  cancelAnimationFrame(raf); raf=0;
  const el=document.getElementById(ID); if(el)el.remove();
  try{global.KorukPlatformAdapter?.setPullToRefreshEnabled?.(true);}catch(_){}
  state?.pages?.forEach(p=>{try{URL.revokeObjectURL(p.url)}catch(_){} });
  state=null;
}
function imgFromFile(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file), im=new Image();
    im.onload=()=>resolve({
      file,url,img:im,width:im.naturalWidth,height:im.naturalHeight,
      corners:[{x:.035,y:.035},{x:.965,y:.035},{x:.965,y:.965},{x:.035,y:.965}],
      rotation:0,mode:'original',brightness:0,contrast:0,whiten:0,shadow:0,
      denoise:0,sharpness:0,saturation:0,temperature:0,gray:false,threshold:0
    });
    im.onerror=()=>reject(new Error('Görüntü okunamadı.'));
    im.src=url;
  });
}
function active(){return state?.pages?.[state.active]||null;}
function setMode(p,key){
  const m=MODES[key]||MODES.original;
  p.mode=key;p.brightness=m.brightness;p.contrast=m.contrast;p.whiten=m.whiten;p.shadow=m.shadow;
  p.denoise=m.denoise;p.sharpness=m.sharpness;p.saturation=m.saturation;p.temperature=m.temperature;
  p.gray=m.gray;p.threshold=m.threshold;
}
function resetPage(p){setMode(p,'original');p.rotation=0;p.corners=[{x:.035,y:.035},{x:.965,y:.035},{x:.965,y:.965},{x:.035,y:.965}];}
function sourceCanvas(p,max=1200){
  const rot=((p.rotation%360)+360)%360, rw=rot%180?p.height:p.width, rh=rot%180?p.width:p.height;
  const s=Math.min(1,max/Math.max(rw,rh)), c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(rw*s));c.height=Math.max(1,Math.round(rh*s));
  const ctx=c.getContext('2d');ctx.save();ctx.translate(c.width/2,c.height/2);ctx.rotate(rot*Math.PI/180);
  ctx.drawImage(p.img,-p.width*s/2,-p.height*s/2,p.width*s,p.height*s);ctx.restore();return c;
}
function solve8(A,b){
  for(let i=0;i<8;i++){
    let m=i;for(let r=i+1;r<8;r++)if(Math.abs(A[r][i])>Math.abs(A[m][i]))m=r;
    [A[i],A[m]]=[A[m],A[i]];[b[i],b[m]]=[b[m],b[i]];
    const piv=A[i][i]||1e-12;
    for(let j=i;j<8;j++)A[i][j]/=piv;b[i]/=piv;
    for(let r=0;r<8;r++){if(r===i)continue;const f=A[r][i];for(let j=i;j<8;j++)A[r][j]-=f*A[i][j];b[r]-=f*b[i];}
  }
  return b;
}
function homography(cw,ch,pts){
  const dst=[[0,0],[cw,0],[cw,ch],[0,ch]],A=[],b=[];
  for(let i=0;i<4;i++){
    const x=dst[i][0],y=dst[i][1],u=pts[i][0],v=pts[i][1];
    A.push([x,y,1,0,0,0,-x*u,-y*u]);b.push(u);
    A.push([0,0,0,x,y,1,-x*v,-y*v]);b.push(v);
  }
  const h=solve8(A,b);return [h[0],h[1],h[2],h[3],h[4],h[5],h[6],h[7],1];
}
function bilinear(data,w,h,x,y){
  if(x<0||y<0||x>w-1||y>h-1)return [255,255,255,255];
  const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(w-1,x0+1),y1=Math.min(h-1,y0+1),fx=x-x0,fy=y-y0;
  const idx=(xx,yy)=>(yy*w+xx)*4,a=idx(x0,y0),b=idx(x1,y0),c=idx(x0,y1),d=idx(x1,y1),out=[];
  for(let k=0;k<4;k++){const top=data[a+k]*(1-fx)+data[b+k]*fx,bot=data[c+k]*(1-fx)+data[d+k]*fx;out[k]=top*(1-fy)+bot*fy;}return out;
}
function perspective(p,max=1200){
  const s=sourceCanvas(p,1400),sw=s.width,sh=s.height,pts=p.corners.map(q=>[q.x*sw,q.y*sh]);
  const top=Math.hypot(pts[1][0]-pts[0][0],pts[1][1]-pts[0][1]),bot=Math.hypot(pts[2][0]-pts[3][0],pts[2][1]-pts[3][1]);
  const left=Math.hypot(pts[3][0]-pts[0][0],pts[3][1]-pts[0][1]),right=Math.hypot(pts[2][0]-pts[1][0],pts[2][1]-pts[1][1]);
  let ow=Math.max(180,Math.round((top+bot)/2)),oh=Math.max(180,Math.round((left+right)/2)),lim=max/Math.max(ow,oh);
  ow=Math.max(180,Math.round(ow*Math.min(1,lim)));oh=Math.max(180,Math.round(oh*Math.min(1,lim)));
  const src=s.getContext('2d').getImageData(0,0,sw,sh).data,out=document.createElement('canvas');out.width=ow;out.height=oh;
  const ctx=out.getContext('2d'),dst=ctx.createImageData(ow,oh),h=homography(ow,oh,pts);
  for(let y=0;y<oh;y++)for(let x=0;x<ow;x++){
    const den=h[6]*x+h[7]*y+1,sx=(h[0]*x+h[1]*y+h[2])/den,sy=(h[3]*x+h[4]*y+h[5])/den,i=(y*ow+x)*4,c=bilinear(src,sw,sh,sx,sy);
    dst.data[i]=c[0];dst.data[i+1]=c[1];dst.data[i+2]=c[2];dst.data[i+3]=255;
  }
  ctx.putImageData(dst,0,0);return out;
}
function filterCanvas(c,p){
  const ctx=c.getContext('2d',{willReadFrequently:true}),im=ctx.getImageData(0,0,c.width,c.height),d=im.data;
  const br=p.brightness*2.55,con=(p.contrast+100)/100,white=p.whiten*1.8,sat=1+p.saturation/100,temp=p.temperature*1.4;
  for(let i=0;i<d.length;i+=4){
    let r=d[i],g=d[i+1],b=d[i+2],lum=.299*r+.587*g+.114*b;
    if(p.shadow){const lift=p.shadow*(255-lum)/100*.58;r+=lift;g+=lift;b+=lift;}
    r=(r-128)*con+128+br+white;g=(g-128)*con+128+br+white;b=(b-128)*con+128+br+white;
    const l=.299*r+.587*g+.114*b;r=l+(r-l)*sat+temp;g=l+(g-l)*sat;b=l+(b-l)*sat-temp*.35;
    if(p.gray){const y=.299*r+.587*g+.114*b;r=g=b=y;}
    if(p.threshold){const y=.299*r+.587*g+.114*b,t=128+p.threshold*.9;r=g=b=y>t?255:0;}
    d[i]=clamp(r,0,255);d[i+1]=clamp(g,0,255);d[i+2]=clamp(b,0,255);
  }
  if(p.denoise){
    const copy=new Uint8ClampedArray(d),a=p.denoise/100;
    for(let y=1;y<c.height-1;y++)for(let x=1;x<c.width-1;x++){const i=(y*c.width+x)*4;
      for(let k=0;k<3;k++){let sum=0;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)sum+=copy[((y+yy)*c.width+x+xx)*4+k];d[i+k]=copy[i+k]*(1-a)+(sum/9)*a;}
    }
  }
  if(p.sharpness){
    const copy=new Uint8ClampedArray(d),a=p.sharpness/100*.85;
    for(let y=1;y<c.height-1;y++)for(let x=1;x<c.width-1;x++){const i=(y*c.width+x)*4;
      for(let k=0;k<3;k++){const blur=(copy[i-4+k]+copy[i+4+k]+copy[i-c.width*4+k]+copy[i+c.width*4+k])/4;d[i+k]=clamp(copy[i+k]+(copy[i+k]-blur)*a,0,255);}
    }
  }
  ctx.putImageData(im,0,0);return c;
}
function processed(p,max=1100){return filterCanvas(perspective(p,max),p);}
function blob(c,q=.94){return new Promise((r,j)=>c.toBlob(x=>x?r(x):j(new Error('Görüntü hazırlanamadı.')),'image/jpeg',q));}

function stageCanvasGeom(c,p){
  const pad=12,s=Math.min((c.width-pad*2)/p.width,(c.height-pad*2)/p.height),w=p.width*s,h=p.height*s,x=(c.width-w)/2,y=(c.height-h)/2;
  return {x,y,w,h};
}
function drawCornerStage(c,p){
  const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#151515';ctx.fillRect(0,0,c.width,c.height);
  const g=stageCanvasGeom(c,p);ctx.drawImage(p.img,g.x,g.y,g.w,g.h);
  const pts=p.corners.map(q=>({x:g.x+q.x*g.w,y:g.y+q.y*g.h}));
  ctx.save();ctx.fillStyle='rgba(0,0,0,.34)';ctx.fillRect(0,0,c.width,c.height);
  ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();ctx.clip();ctx.drawImage(p.img,g.x,g.y,g.w,g.h);ctx.restore();
  ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();ctx.strokeStyle='#ffc400';ctx.lineWidth=3;ctx.stroke();
  pts.forEach((q,i)=>{ctx.beginPath();ctx.arc(q.x,q.y,15,0,Math.PI*2);ctx.fillStyle='#ffc400';ctx.fill();ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#111';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),q.x,q.y);});
  c._geom=g;
}
function drawPreview(c,p){
  const pc=processed(p,1100),ctx=c.getContext('2d'),pad=10,s=Math.min((c.width-pad*2)/pc.width,(c.height-pad*2)/pc.height),w=pc.width*s,h=pc.height*s;
  ctx.fillStyle='#151515';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(pc,(c.width-w)/2,(c.height-h)/2,w,h);
}
function renderLabels(){
  const p=active();if(!p)return;
  document.querySelectorAll('#'+ID+' [data-val]').forEach(e=>e.textContent=String(Math.round(Number(p[e.dataset.val]||0))));
}
function schedule(){
  cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{
    const p=active();if(!p)return;
    const corner=document.querySelector('#'+ID+' [data-corner-canvas]'),prev=document.querySelector('#'+ID+' [data-preview-canvas]');
    if(corner){corner.width=Math.max(320,Math.min(900,corner.clientWidth*2));corner.height=Math.round(corner.width*.72);drawCornerStage(corner,p);}
    if(prev){prev.width=Math.max(320,Math.min(900,prev.clientWidth*2));prev.height=Math.round(prev.width*.72);drawPreview(prev,p);}
    renderLabels();
  });
}
function controls(){
  const p=active();
  return `<div class="ks-controls">
    <div class="ks-section-title">Tarama modu</div>
    <div class="ks-modes">${Object.entries(MODES).map(([k,m])=>`<button type="button" data-mode="${k}" class="${p.mode===k?'active':''}">${m.label}</button>`).join('')}</div>
    <div class="ks-section-title">Canlı ayarlar</div>
    ${[['brightness','Parlaklık',-100,100],['contrast','Kontrast',-100,100],['whiten','Beyazlık',0,100],['shadow','Gölge / Hare giderme',0,100],['denoise','Gürültü giderme',0,100],['sharpness','Netlik',0,100],['saturation','Doygunluk',-100,100],['temperature','Renk sıcaklığı',-40,40],['threshold','Siyah-Beyaz eşiği',0,100]].map(x=>`<label class="ks-range"><span>${x[1]} <output data-val="${x[0]}">${Math.round(p[x[0]]||0)}</output></span><input data-k="${x[0]}" type="range" min="${x[2]}" max="${x[3]}" value="${p[x[0]]||0}"></label>`).join('')}
    <div class="ks-tools"><button type="button" data-rotate>↻ Döndür</button><button type="button" data-reset>↺ Sıfırla</button></div>
  </div>`;
}
function style(){
  if(document.getElementById('ka-scan-style'))return;
  const s=document.createElement('style');s.id='ka-scan-style';s.textContent=`
#${ID}{position:fixed;inset:0;z-index:2147483000;background:var(--ka-bg,#f6f6f4);color:var(--ka-text,#111);display:flex;flex-direction:column;font-family:inherit}
#${ID} *{box-sizing:border-box}#${ID} button{font:inherit}
#${ID} .ks-head{height:62px;flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 12px;border-bottom:1px solid var(--ka-border,#ddd);background:var(--ka-surface,#fff)}
#${ID} .ks-title{display:flex;align-items:center;gap:9px}.ks-title strong{font-size:18px}.ks-title small{display:block;color:#777;font-size:11px}
#${ID} .ks-head-actions{display:flex;gap:7px}.ks-head button,#${ID} .ks-tools button{border:1px solid var(--ka-border,#d6d6d6);background:var(--ka-surface,#fff);color:inherit;border-radius:11px;padding:9px 11px;font-weight:700}
#${ID} .ks-primary{background:#ffc400!important;color:#111!important;border-color:#ffc400!important}.ks-icon{font-size:22px!important;min-width:42px}
#${ID} .ks-body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
#${ID} .ks-pages{display:flex;gap:8px;overflow-x:auto;padding:8px 10px;background:var(--ka-surface,#fff);border-bottom:1px solid var(--ka-border,#ddd);flex:none}
#${ID} .ks-thumb{position:relative;flex:0 0 66px;height:78px;border:2px solid transparent;border-radius:9px;overflow:hidden;background:#ddd;padding:0}
#${ID} .ks-thumb.active{border-color:#ffc400}.ks-thumb img{width:100%;height:100%;object-fit:cover}.ks-thumb b{position:absolute;left:4px;top:4px;background:#111;color:#fff;border-radius:7px;padding:2px 5px;font-size:10px}
#${ID} .ks-addpage{flex:0 0 66px;height:78px;border:1px dashed #aaa;background:transparent;border-radius:9px;font-size:24px}
#${ID} .ks-work{flex:1;min-height:0;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:10px}
#${ID} .ks-tabs{display:flex;gap:6px}.ks-tab{flex:1;border:1px solid var(--ka-border,#ddd);background:var(--ka-surface,#fff);color:inherit;border-radius:11px;padding:9px;font-weight:800}.ks-tab.active{background:#ffc400;color:#111;border-color:#ffc400}
#${ID} .ks-stage{background:#111;border-radius:14px;overflow:hidden;min-height:0}.ks-stage canvas{display:block;width:100%;height:auto;touch-action:none}
#${ID} .ks-help{text-align:center;color:#777;font-size:12px;padding:0 8px}.ks-controls{background:var(--ka-surface,#fff);border:1px solid var(--ka-border,#ddd);border-radius:14px;padding:12px}
#${ID} .ks-section-title{font-weight:900;font-size:14px;margin:2px 0 9px}.ks-modes{display:flex;gap:7px;overflow-x:auto;padding-bottom:5px}
#${ID} .ks-modes button{flex:0 0 auto;border:1px solid var(--ka-border,#d7d7d7);background:var(--ka-surface,#fff);color:inherit;border-radius:10px;padding:8px 10px;font-size:12px;font-weight:800}
#${ID} .ks-modes button.active{background:#ffc400;color:#111;border-color:#ffc400}
#${ID} .ks-range{display:block;margin:10px 0}.ks-range span{display:flex;justify-content:space-between;font-size:13px;font-weight:800}.ks-range output{font-weight:700;color:#777}
#${ID} .ks-range input{display:block;width:100%;margin-top:6px;accent-color:#ffc400}.ks-tools{display:flex;gap:8px;margin-top:10px}.ks-tools button{flex:1}
#${ID} .ks-footer{flex:none;display:flex;gap:8px;padding:9px 10px calc(9px + env(safe-area-inset-bottom));background:var(--ka-surface,#fff);border-top:1px solid var(--ka-border,#ddd)}
#${ID} .ks-footer button{flex:1;border:1px solid var(--ka-border,#d6d6d6);border-radius:12px;background:var(--ka-surface,#fff);color:inherit;padding:11px 8px;font-weight:900}
#${ID} .ks-footer .ks-primary{flex:1.5;background:#ffc400;color:#111;border-color:#ffc400}
@media(min-width:850px){#${ID} .ks-work{display:grid;grid-template-columns:minmax(0,1fr) 390px;align-items:start}.ks-stage-wrap{min-width:0}.ks-controls{max-height:calc(100vh - 200px);overflow:auto}.ks-footer{justify-content:flex-end}.ks-footer button{max-width:190px}}
`;
  document.head.appendChild(s);
}
function render(){
  const el=document.getElementById(ID);if(!el)return;
  const p=active();
  el.innerHTML=`
    <header class="ks-head"><div class="ks-title"><button class="ks-icon" data-close type="button">←</button><div><strong>Belge Tara</strong><small>CamScanner tarzı düzenleme</small></div></div>
      <div class="ks-head-actions"><button data-camera type="button">📷 Kamera</button><button data-gallery type="button">＋ Fotoğraf</button></div>
    </header>
    <div class="ks-body">
      <div class="ks-pages"><input data-files type="file" accept="image/*" multiple hidden>
        ${state.pages.map((x,i)=>`<button class="ks-thumb ${i===state.active?'active':''}" data-page="${i}" type="button"><img src="${x.url}"><b>${i+1}</b></button>`).join('')}
        <button class="ks-addpage" data-add type="button">＋</button>
      </div>
      <div class="ks-work">
        ${p?`<div class="ks-stage-wrap"><div class="ks-tabs"><button class="ks-tab ${state.tab==='corners'?'active':''}" data-tab="corners" type="button">✥ Köşeleri Seç</button><button class="ks-tab ${state.tab==='preview'?'active':''}" data-tab="preview" type="button">◉ Canlı Önizleme</button></div>
          <div class="ks-stage">${state.tab==='corners'?'<canvas data-corner-canvas></canvas>':'<canvas data-preview-canvas></canvas>'}</div>
          <div class="ks-help">${state.tab==='corners'?'Sarı noktaları belgenin dört köşesine sürükleyin. Perspektif otomatik düzeltilir.':'Filtre ve ayarlar belge önizlemesine anında uygulanır.'}</div></div>${controls()}`:'<div class="ks-help" style="padding:35px">Bir belge fotoğrafı ekleyin.</div>'}
      </div>
    </div>
    <footer class="ks-footer"><button data-delete type="button">🗑 Sil</button><button data-up type="button">← Önceki</button><button data-down type="button">Sonraki →</button><button class="ks-primary" data-export type="button">✓ PDF Oluştur</button></footer>`;
  bind();schedule();
}
function bind(){
  const el=document.getElementById(ID);if(!el)return;
  el.querySelector('[data-close]')?.addEventListener('click',close);
  const input=el.querySelector('[data-files]');
  const addFiles=()=>input?.click();
  el.querySelector('[data-add]')?.addEventListener('click',addFiles);
  el.querySelector('[data-gallery]')?.addEventListener('click',addFiles);
  el.querySelector('[data-camera]')?.addEventListener('click',()=>{if(input){input.setAttribute('capture','environment');input.removeAttribute('multiple');input.click();setTimeout(()=>{input.setAttribute('multiple','');input.removeAttribute('capture')},500)}});
  input?.addEventListener('change',async e=>{
    const files=[...(e.target.files||[])];if(!files.length)return;
    try{const pages=await Promise.all(files.map(imgFromFile));state.pages.push(...pages);state.active=state.pages.length-pages.length;state.tab='corners';render();}
    catch(err){global.toast?.('Fotoğraf yüklenemedi: '+err.message)}
    finally{e.target.value='';}
  });
  el.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{state.active=Number(b.dataset.page);state.tab='corners';render();}));
  el.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.tab;render();}));
  el.querySelector('[data-delete]')?.addEventListener('click',()=>{const p=active();if(!p)return;try{URL.revokeObjectURL(p.url)}catch(_){}state.pages.splice(state.active,1);state.active=Math.max(0,Math.min(state.active,state.pages.length-1));render();});
  el.querySelector('[data-up]')?.addEventListener('click',()=>{if(state.active>0){[state.pages[state.active-1],state.pages[state.active]]=[state.pages[state.active],state.pages[state.active-1]];state.active--;render();}});
  el.querySelector('[data-down]')?.addEventListener('click',()=>{if(state.active<state.pages.length-1){[state.pages[state.active+1],state.pages[state.active]]=[state.pages[state.active],state.pages[state.active+1]];state.active++;render();}});
  el.querySelector('[data-export]')?.addEventListener('click',exportPdf);
  el.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{setMode(active(),b.dataset.mode);render();}));
  el.querySelectorAll('[data-k]').forEach(i=>i.addEventListener('input',()=>{active()[i.dataset.k]=Number(i.value);state.tab='preview';schedule();}));
  el.querySelector('[data-rotate]')?.addEventListener('click',()=>{const p=active();p.rotation=(p.rotation+90)%360;render();});
  el.querySelector('[data-reset]')?.addEventListener('click',()=>{resetPage(active());render();});
  const c=el.querySelector('[data-corner-canvas]');if(c){
    let drag=-1;
    const hit=e=>{const r=c.getBoundingClientRect(),sx=c.width/r.width,sy=c.height/r.height,x=(e.clientX-r.left)*sx,y=(e.clientY-r.top)*sy,g=c._geom||stageCanvasGeom(c,active());
      let best=-1,dist=999;active().corners.forEach((q,i)=>{const px=g.x+q.x*g.w,py=g.y+q.y*g.h,d=Math.hypot(px-x,py-y);if(d<dist){dist=d;best=i;}});return dist<40?best:-1;};
    c.addEventListener('pointerdown',e=>{drag=hit(e);if(drag>=0){c.setPointerCapture(e.pointerId);e.preventDefault();}});
    c.addEventListener('pointermove',e=>{if(drag<0)return;const r=c.getBoundingClientRect(),sx=c.width/r.width,sy=c.height/r.height,x=(e.clientX-r.left)*sx,y=(e.clientY-r.top)*sy,g=c._geom||stageCanvasGeom(c,active());active().corners[drag]={x:clamp((x-g.x)/g.w,.001,.999),y:clamp((y-g.y)/g.h,.001,.999)};schedule();});
    c.addEventListener('pointerup',()=>{drag=-1;});c.addEventListener('pointercancel',()=>{drag=-1;});
  }
}
async function exportPdf(){
  if(!state?.pages?.length){global.toast?.('Önce belge ekleyin.');return}
  const btn=document.querySelector('#'+ID+' [data-export]');if(btn){btn.disabled=true;btn.textContent='Hazırlanıyor…'}
  try{
    const items=[];
    for(const p of state.pages){const c=processed(p,1800),b=await blob(c,.96),url=URL.createObjectURL(b);items.push({file:{type:'image/jpeg'},url,width:c.width,height:c.height,rotation:0,zoom:1,x:50,y:50,fit:'contain',orientation:c.width>c.height?'landscape':'portrait'});}
    if(!global.ReportEngine?.imagesToPdf)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');
    if(!global.ReportEngine?.imagesToPdf)throw new Error('PDF motoru yüklenemedi.');
    const pdf=await global.ReportEngine.imagesToPdf(items,{margin:4,orientation:'auto'});
    items.forEach(x=>URL.revokeObjectURL(x.url));
    global.ReportEngine.previewPdfBlob(pdf,{title:'Tarama Önizleme',fileName:'Taranan_Belge.pdf'});
    close();
  }catch(e){console.error('[PdfScanner]',e);global.toast?.('PDF oluşturulamadı: '+(e?.message||e));}
  finally{if(btn){btn.disabled=false;btn.textContent='✓ PDF Oluştur'}}
}
function open(){
  if(document.getElementById(ID))return;
  state={pages:[],active:0,tab:'corners'};style();
  const el=document.createElement('section');el.id=ID;document.body.appendChild(el);
  try{global.KorukPlatformAdapter?.setPullToRefreshEnabled?.(false)}catch(_){}
  render();
}
global.PdfScannerEditor={open,close};
})(window);
