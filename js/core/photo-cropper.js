/* Koruk Asistan — PROFİL FOTOĞRAFI KIRPMA EKRANI
   Fotoğraf yüklenmeden önce, uygulamada GERÇEKTE görüneceği daire kadrajıyla kırpılır:
   sürükle (iki parmakla yakınlaştır / fare tekerleği / kaydırıcı), 90° döndür, sıfırla; altta yan menü, Ben sekmesi kartı ve
   profil sayfası önizlemesi canlı güncellenir. Çıkış kare PNG'dir (tek kayıplı kodlama auth.js'te WEBP'e yapılır).
   Görünüm css/design-system-base.css içindeki "PROFİL FOTOĞRAFI · KIRPMA EKRANI" bölümünden (TEMA MERKEZİ belirteçleri) gelir.
   API: PhotoCropper.open(file,{badge}) → Promise<File|null>  (null = vazgeçildi; hata → reddedilir). */
(function(global){
'use strict';
if(global.PhotoCropper)return;
const doc=global.document;
const TYPES=new Set(['image/jpeg','image/png','image/webp']);
const INPUT_LIMIT=8*1024*1024;      // auth.js ile aynı giriş sınırı
const WORK_EDGE=2048;               // çalışma tuvali: telefonda bellek/akıcılık için en uzun kenar sınırı
const OUT_MAX=512,OUT_MIN=64;       // çıkış kenarı (auth.js de 512 px'e sınırlar)
const ZOOM_MAX=4,KEY_PAN=.03,KEY_ZOOM=1.08;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

/* ── saf geometri (testlenebilir) ──
   Birimler: kaydırma değerleri kadraj çapına (D) oranlıdır; z=1 görüntünün kadrajı tam kapladığı en küçük ölçektir. */
function rotated(w,h,rot){return(((rot%360)+360)%360)%180===0?{w,h}:{w:h,h:w}}
function maxOffset(w,h,rot,z){const r=rotated(w,h,rot),m=Math.min(r.w,r.h);return{x:Math.max(0,(r.w/m*z-1)/2),y:Math.max(0,(r.h/m*z-1)/2)}}
function clampView(v,w,h){const z=clamp(v.z,1,ZOOM_MAX),m=maxOffset(w,h,v.rot,z);return{rot:v.rot,z,nx:clamp(v.nx,-m.x,m.x),ny:clamp(v.ny,-m.y,m.y)}}
function baseScale(w,h,rot,D){const r=rotated(w,h,rot);return D/Math.min(r.w,r.h)}
function outputSize(w,h,v){const D=1,s=baseScale(w,h,v.rot,D)*v.z;return clamp(Math.round(1/s),OUT_MIN,OUT_MAX)}
/* kaynak kadrajı hedef tuvale çizer: size=hedef kenarı, D=hedefte kadraj çapı */
function paint(ctx,src,view,size,D,dpr=1){
  const w=src.width,h=src.height,s=baseScale(w,h,view.rot,D)*view.z;
  ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size,size);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.translate(size/2+view.nx*D,size/2+view.ny*D);ctx.rotate(view.rot*Math.PI/180);ctx.scale(s,s);ctx.drawImage(src,-w/2,-h/2);ctx.restore();
}

function readFile(file){
  if(!file||!TYPES.has(String(file.type||'').toLowerCase()))return Promise.reject(new Error('JPG, PNG veya WEBP biçiminde bir fotoğraf seçin.'));
  if(!file.size||file.size>INPUT_LIMIT)return Promise.reject(new Error('Fotoğraf en fazla 8 MB olabilir.'));
  const url=URL.createObjectURL(file);
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      try{
        const w=Number(img.naturalWidth||img.width)||0,h=Number(img.naturalHeight||img.height)||0;
        if(!w||!h)throw new Error('Fotoğraf boyutları okunamadı.');
        const k=Math.min(1,WORK_EDGE/Math.max(w,h)),c=doc.createElement('canvas');c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));
        const ctx=c.getContext('2d');if(!ctx)throw new Error('Fotoğraf işlenemedi.');ctx.imageSmoothingQuality='high';ctx.drawImage(img,0,0,c.width,c.height);
        resolve(c);
      }catch(e){reject(e)}finally{URL.revokeObjectURL(url)}
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Fotoğraf okunamadı.'))};
    img.src=url;
  });
}

function open(file,opts={}){
  return readFile(file).then(src=>new Promise(resolve=>{
    const badge=String(opts.badge||'').trim(),prevFocus=doc.activeElement;
    const chip=badge?`<b class="ka-avatar-chip">${esc(badge)}</b>`:'';
    const ov=doc.createElement('div');ov.className='ka-modal-backdrop ka-photo-crop-backdrop';ov.setAttribute('data-photo-crop','');
    ov.innerHTML=`<section class="ka-modal ka-photo-crop" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="kaPhotoCropTitle" aria-describedby="kaPhotoCropHint">
<div class="ka-modal__header"><div><h2 id="kaPhotoCropTitle">Fotoğrafı Kırp</h2><p id="kaPhotoCropHint">Fotoğrafı sürükleyerek yerleştirin, kaydırıcı veya iki parmakla yakınlaştırın.</p></div><button class="ka-icon-button" type="button" data-pc-cancel aria-label="Kapat">×</button></div>
<div class="ka-modal__body">
<div class="ka-photo-crop__stage" data-pc-stage tabindex="0" role="group" aria-label="Kırpma alanı. Ok tuşlarıyla kaydırın, artı ve eksi tuşlarıyla yakınlaştırın."><canvas class="ka-photo-crop__canvas" data-pc-canvas></canvas><span class="ka-photo-crop__mask" data-pc-mask aria-hidden="true"></span></div>
<div class="ka-photo-crop__zoom"><span aria-hidden="true">−</span><input type="range" min="1" max="${ZOOM_MAX}" step="0.01" value="1" data-pc-zoom aria-label="Yakınlaştır"><span aria-hidden="true">+</span></div>
<div class="ka-photo-crop__tools"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-pc-rot="-90"><span aria-hidden="true">↺</span> Sola Çevir</button><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-pc-rot="90"><span aria-hidden="true">↻</span> Sağa Çevir</button><button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-pc-reset>Sıfırla</button></div>
<div class="ka-photo-crop__pvs" role="group" aria-label="Gerçek görünüm önizlemesi">
<figure class="ka-photo-crop__pv"><span class="ka-photo-crop__pvav ka-photo-crop__pvav--sm"><canvas data-pc-pv></canvas></span><figcaption>Yan menü</figcaption></figure>
<figure class="ka-photo-crop__pv"><span class="ka-photo-crop__pvav ka-photo-crop__pvav--md"><canvas data-pc-pv></canvas>${chip}</span><figcaption>Ben kartı</figcaption></figure>
<figure class="ka-photo-crop__pv"><span class="ka-photo-crop__pvav ka-photo-crop__pvav--lg"><canvas data-pc-pv></canvas>${chip}</span><figcaption>Profil sayfası</figcaption></figure>
</div></div>
<div class="ka-modal__footer"><button class="ka-btn ka-btn--secondary" type="button" data-pc-cancel>Vazgeç</button><button class="ka-btn" type="button" data-pc-save>Kaydet</button></div></section>`;
    doc.body.appendChild(ov);
    const $=s=>ov.querySelector(s),stage=$('[data-pc-stage]'),canvas=$('[data-pc-canvas]'),mask=$('[data-pc-mask]'),zoom=$('[data-pc-zoom]'),save=$('[data-pc-save]'),pvs=[...ov.querySelectorAll('[data-pc-pv]')];
    const ctx=canvas.getContext('2d'),mid=doc.createElement('canvas'),midSize=192;mid.width=midSize;mid.height=midSize;const mctx=mid.getContext('2d');
    let view={rot:0,z:1,nx:0,ny:0},raf=0,done=false,dpr=1,side=0,D=0;
    const fit=()=>{
      dpr=Math.min(3,global.devicePixelRatio||1);side=stage.clientWidth||1;D=mask.offsetWidth||side*.84;   // yerleşim ölçüsü (dönüşümlerden etkilenmez)
      const px=Math.round(side*dpr);if(canvas.width!==px||canvas.height!==px){canvas.width=px;canvas.height=px}
      pvs.forEach(c=>{const r=Math.round((c.clientWidth||42)*dpr);if(c.width!==r||c.height!==r){c.width=r;c.height=r}});
    };
    const draw=()=>{
      raf=0;if(done)return;
      paint(ctx,src,view,side,D,dpr);
      mctx.setTransform(1,0,0,1,0,0);paint(mctx,src,view,midSize,midSize,1);
      pvs.forEach(c=>{const p=c.getContext('2d');p.setTransform(1,0,0,1,0,0);p.clearRect(0,0,c.width,c.height);p.imageSmoothingEnabled=true;p.imageSmoothingQuality='high';p.drawImage(mid,0,0,c.width,c.height)});
    };
    const queue=()=>{if(!raf)raf=global.requestAnimationFrame(draw)};
    const set=patch=>{view=clampView({...view,...patch},src.width,src.height);zoom.value=String(view.z);queue()};
    const close=value=>{
      if(done)return;done=true;if(raf)global.cancelAnimationFrame(raf);
      global.removeEventListener('resize',onResize);doc.removeEventListener('keydown',onKey,true);ov.remove();
      try{prevFocus?.focus?.({preventScroll:true})}catch(_){}
      resolve(value);
    };
    const onResize=()=>{fit();queue()};
    const focusables=()=>[...ov.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex="0"]')].filter(x=>x.offsetParent!==null||x===stage);
    function onKey(e){
      if(done)return;
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(null);return}
      if(e.key==='Tab'){const f=focusables();if(!f.length)return;const first=f[0],last=f[f.length-1];if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first.focus()}else if(!ov.contains(doc.activeElement)){e.preventDefault();first.focus()}}
    }
    /* sürükle + iki parmakla yakınlaştır */
    const pts=new Map();let pinch=0;
    const dist=()=>{const a=[...pts.values()];return a.length<2?0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)};
    stage.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button>0)return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});try{stage.setPointerCapture(e.pointerId)}catch(_){}pinch=dist();e.preventDefault()});
    stage.addEventListener('pointermove',e=>{
      const p=pts.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
      if(pts.size>=2){const d=dist();if(pinch>0&&d>0)set({z:view.z*d/pinch});pinch=d}
      else set({nx:view.nx+dx/D,ny:view.ny+dy/D});
    });
    const up=e=>{pts.delete(e.pointerId);pinch=dist();try{stage.releasePointerCapture(e.pointerId)}catch(_){}};
    stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
    stage.addEventListener('wheel',e=>{e.preventDefault();set({z:view.z*Math.exp(-e.deltaY*.0015)})},{passive:false});
    stage.addEventListener('keydown',e=>{
      const k=e.key,step=KEY_PAN*(e.shiftKey?3:1);
      if(k==='ArrowLeft')set({nx:view.nx-step});else if(k==='ArrowRight')set({nx:view.nx+step});else if(k==='ArrowUp')set({ny:view.ny-step});else if(k==='ArrowDown')set({ny:view.ny+step});
      else if(k==='+'||k==='=')set({z:view.z*KEY_ZOOM});else if(k==='-'||k==='_')set({z:view.z/KEY_ZOOM});else return;
      e.preventDefault();
    });
    zoom.addEventListener('input',()=>set({z:Number(zoom.value)||1}));
    ov.querySelectorAll('[data-pc-rot]').forEach(b=>b.addEventListener('click',()=>set({rot:(view.rot+Number(b.dataset.pcRot)+360)%360,nx:0,ny:0})));
    $('[data-pc-reset]').addEventListener('click',()=>{view={rot:0,z:1,nx:0,ny:0};zoom.value='1';queue()});
    ov.querySelectorAll('[data-pc-cancel]').forEach(b=>b.addEventListener('click',()=>close(null)));
    save.addEventListener('click',()=>{
      if(done)return;save.disabled=true;save.setAttribute('aria-busy','true');
      try{
        const size=outputSize(src.width,src.height,view),out=doc.createElement('canvas');out.width=size;out.height=size;
        const c=out.getContext('2d');if(!c)throw new Error('Fotoğraf işlenemedi.');paint(c,src,view,size,size,1);
        out.toBlob(blob=>{
          if(!blob){save.disabled=false;save.removeAttribute('aria-busy');global.toast?.('Fotoğraf hazırlanamadı.');return}
          let f;try{f=new File([blob],'profil.png',{type:'image/png'})}catch(_){f=blob;f.name='profil.png'}
          close(f);
        },'image/png');
      }catch(e){console.error('[PhotoCropper]',e);save.disabled=false;save.removeAttribute('aria-busy');global.toast?.(e?.message||'Fotoğraf hazırlanamadı.')}
    });
    global.addEventListener('resize',onResize);doc.addEventListener('keydown',onKey,true);
    fit();draw();try{$('.ka-photo-crop').focus({preventScroll:true})}catch(_){}
  }));
}

global.PhotoCropper={open,math:{rotated,maxOffset,clampView,baseScale,outputSize,ZOOM_MAX,OUT_MAX,OUT_MIN}};
})(typeof window!=='undefined'?window:globalThis);
