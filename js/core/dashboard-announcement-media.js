/* Okul Yönetim — ana sayfa duyuru medya deneyimi
 * Duyuru kartındaki resimleri yatay kaydırılabilir galeriye çevirir,
 * tam ekran pinch/double-tap zoom sağlar ve yönetici okuyan bilgisini
 * ana sayfadan ayrılmadan göz ikonuna bağlı küçük popover içinde gösterir.
 */
(function(global){
'use strict';
if(global.DashboardAnnouncementMedia)return;

const VERSION='921';
let scanQueued=false,activeHomeViewer=null,activeReaderPopup=null;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=key=>{const v=global.AppStore?.data?.(key);return Array.isArray(v)?v:[]};
const currentUser=()=>global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};
const isAdmin=()=>currentUser().admin===true;
function safeUrl(value){
  const raw=String(value||'').trim();
  if(!raw||!/^https?:\/\//i.test(raw)||/[\s"'<>]/.test(raw))return'';
  try{const u=new URL(raw);return(u.protocol==='https:'||u.protocol==='http:')?u.href:''}catch(_){return''}
}
function imagesOf(item){
  return(Array.isArray(item?.resimler)?item.resimler:[])
    .map((r,index)=>({index,url:safeUrl(r?.url)}))
    .filter(r=>r.url);
}
function readersOf(item){
  return Object.entries(item?.okuyanlar||{}).map(([uid,entry])=>({
    uid,
    ad:String(entry?.ad||'Kullanıcı').trim()||'Kullanıcı',
    tarih:String(entry?.tarih||'')
  })).sort((a,b)=>String(b.tarih).localeCompare(String(a.tarih)));
}
function readTime(value){
  if(!value)return'—';
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return String(value);
  return d.toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
function ensureStyles(){
  if(document.querySelector('link[data-dashboard-announcement-media-style]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=`css/dashboard-announcement-media.css?v=${VERSION}`;
  link.dataset.dashboardAnnouncementMediaStyle='';
  document.head.appendChild(link);
}
function closeReaderPopup(){
  activeReaderPopup?.remove?.();
  activeReaderPopup=null;
}
function openReaderPopup(anchor,item){
  closeReaderPopup();
  const readers=readersOf(item),popup=document.createElement('section');
  popup.className='kh-reader-popover';
  popup.dataset.homeReaderPopover='';
  popup.setAttribute('role','dialog');
  popup.setAttribute('aria-label','Duyuruyu okuyanlar');
  popup.innerHTML=`<div class="kh-reader-popover__head"><span class="kh-reader-popover__eye">👁</span><div><strong>${readers.length} kişi okudu</strong><small>Okunma bilgisi</small></div><button type="button" data-reader-popover-close aria-label="Kapat">×</button></div>${readers.length?`<div class="kh-reader-popover__list">${readers.map(r=>`<div class="kh-reader-popover__row"><span>${esc(r.ad.charAt(0).toLocaleUpperCase('tr')||'?')}</span><div><strong>${esc(r.ad)}</strong><small>${esc(readTime(r.tarih))}</small></div></div>`).join('')}</div>`:'<div class="kh-reader-popover__empty">Henüz okuyan yok.</div>'}`;
  document.body.appendChild(popup);
  const rect=anchor.getBoundingClientRect(),gap=8,margin=10;
  const width=Math.min(320,global.innerWidth-margin*2);
  popup.style.width=`${width}px`;
  let left=Math.max(margin,Math.min(global.innerWidth-width-margin,rect.right-width));
  popup.style.left=`${left}px`;
  popup.style.top=`${rect.bottom+gap}px`;
  const measured=popup.getBoundingClientRect();
  if(measured.bottom>global.innerHeight-margin)popup.style.top=`${Math.max(margin,rect.top-measured.height-gap)}px`;
  const arrow=Math.max(18,Math.min(width-18,rect.left+rect.width/2-left));
  popup.style.setProperty('--kh-reader-arrow-x',`${arrow}px`);
  popup.querySelector('[data-reader-popover-close]')?.addEventListener('click',closeReaderPopup);
  activeReaderPopup=popup;
}
function resetZoom(state){
  state.scale=1;state.tx=0;state.ty=0;
  state.img.style.transform='translate3d(0px,0px,0) scale(1)';
  state.img.classList.remove('is-zoomed');
  state.onScale?.(1);
}
function applyZoom(state){
  state.img.style.transform=`translate3d(${state.tx}px,${state.ty}px,0) scale(${state.scale})`;
  state.img.classList.toggle('is-zoomed',state.scale>1.01);
  state.onScale?.(state.scale);
}
function clampScale(v){return Math.max(1,Math.min(5,v))}
function attachZoomSurface(img,stage,{onSwipe,onScale}={}){
  if(!img||!stage||img.dataset.announcementZoomBound==='1')return null;
  img.dataset.announcementZoomBound='1';
  const state={img,stage,scale:1,tx:0,ty:0,pointers:new Map(),drag:null,pinch:null,onSwipe,onScale};
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const pointerPoint=e=>({x:e.clientX,y:e.clientY});
  img.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    img.setPointerCapture?.(e.pointerId);
    state.pointers.set(e.pointerId,pointerPoint(e));
    if(state.pointers.size===1){
      state.drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,tx:state.tx,ty:state.ty,moved:false};
    }else if(state.pointers.size===2){
      const pts=[...state.pointers.values()];
      state.pinch={distance:Math.max(1,distance(pts[0],pts[1])),scale:state.scale};
      state.drag=null;
    }
  });
  img.addEventListener('pointermove',e=>{
    if(!state.pointers.has(e.pointerId))return;
    state.pointers.set(e.pointerId,pointerPoint(e));
    if(state.pointers.size>=2&&state.pinch){
      const pts=[...state.pointers.values()],ratio=distance(pts[0],pts[1])/state.pinch.distance;
      state.scale=clampScale(state.pinch.scale*ratio);
      if(state.scale<=1.01){state.scale=1;state.tx=0;state.ty=0}
      applyZoom(state);e.preventDefault();return;
    }
    if(state.drag&&state.drag.id===e.pointerId){
      const dx=e.clientX-state.drag.startX,dy=e.clientY-state.drag.startY;
      if(Math.abs(dx)>4||Math.abs(dy)>4)state.drag.moved=true;
      if(state.scale>1){
        state.tx=state.drag.tx+dx;state.ty=state.drag.ty+dy;applyZoom(state);e.preventDefault();
      }
    }
  },{passive:false});
  const endPointer=e=>{
    const wasDrag=state.drag&&state.drag.id===e.pointerId?state.drag:null;
    state.pointers.delete(e.pointerId);
    if(state.pointers.size<2)state.pinch=null;
    if(wasDrag&&state.scale===1&&wasDrag.moved){
      const dx=e.clientX-wasDrag.startX,dy=e.clientY-wasDrag.startY;
      if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.35)state.onSwipe?.(dx<0?1:-1);
    }
    if(state.pointers.size===1){
      const [id,p]=[...state.pointers.entries()][0];
      state.drag={id,startX:p.x,startY:p.y,tx:state.tx,ty:state.ty,moved:false};
    }else if(!state.pointers.size)state.drag=null;
  };
  img.addEventListener('pointerup',endPointer);
  img.addEventListener('pointercancel',endPointer);
  img.addEventListener('dblclick',e=>{
    e.preventDefault();
    if(state.scale>1.01)resetZoom(state);
    else{state.scale=2.5;state.tx=0;state.ty=0;applyZoom(state)}
  });
  stage.addEventListener('wheel',e=>{
    if(e.target!==img&&!img.contains?.(e.target))return;
    e.preventDefault();
    state.scale=clampScale(state.scale+(e.deltaY<0?.35:-.35));
    if(state.scale===1){state.tx=0;state.ty=0}
    applyZoom(state);
  },{passive:false});
  return{
    reset:()=>resetZoom(state),
    zoomIn:()=>{state.scale=clampScale(state.scale+.5);applyZoom(state)},
    zoomOut:()=>{state.scale=clampScale(state.scale-.5);if(state.scale===1){state.tx=0;state.ty=0}applyZoom(state)},
    state
  };
}
function closeHomeViewer(){
  if(!activeHomeViewer)return;
  document.removeEventListener('keydown',activeHomeViewer.onKey);
  activeHomeViewer.box.remove();
  activeHomeViewer=null;
  if(!document.querySelector('[data-announcement-lightbox],[data-announcement-detail],[data-announcement-modal]'))document.body.classList.remove('ka-announcement-overlay-open');
}
function openHomeViewer(item,startIndex=0){
  const images=imagesOf(item);if(!images.length)return;
  closeHomeViewer();
  let index=Math.max(0,Math.min(Number(startIndex)||0,images.length-1));
  const box=document.createElement('div');
  box.className='ka-home-announcement-lightbox';
  box.dataset.homeAnnouncementLightbox='';
  box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  box.innerHTML=`<header class="ka-home-announcement-lightbox__head"><div><small>DUYURU GÖRSELLERİ</small><strong>${esc(item.baslik||'Duyuru')}</strong></div><span data-home-lightbox-counter></span><button type="button" data-home-lightbox-close aria-label="Kapat">×</button></header><div class="ka-home-announcement-lightbox__stage" data-home-lightbox-stage><button type="button" class="is-prev" data-home-lightbox-prev aria-label="Önceki görsel">‹</button><img data-home-lightbox-image alt=""><button type="button" class="is-next" data-home-lightbox-next aria-label="Sonraki görsel">›</button><div class="ka-announcement-zoom-controls"><button type="button" data-home-zoom-out aria-label="Uzaklaştır">−</button><button type="button" data-home-zoom-reset aria-label="Yakınlaştırmayı sıfırla"><span data-home-zoom-label>100%</span></button><button type="button" data-home-zoom-in aria-label="Yakınlaştır">＋</button></div></div>${images.length>1?`<footer class="ka-home-announcement-lightbox__thumbs">${images.map((r,i)=>`<button type="button" data-home-lightbox-thumb="${i}" aria-label="${i+1}. görsel"><img src="${esc(r.url)}" alt=""></button>`).join('')}</footer>`:''}`;
  document.body.appendChild(box);document.body.classList.add('ka-announcement-overlay-open');
  const img=box.querySelector('[data-home-lightbox-image]'),stage=box.querySelector('[data-home-lightbox-stage]'),counter=box.querySelector('[data-home-lightbox-counter]'),prev=box.querySelector('[data-home-lightbox-prev]'),next=box.querySelector('[data-home-lightbox-next]'),zoomLabel=box.querySelector('[data-home-zoom-label]');
  const go=delta=>{const target=index+delta;if(target<0||target>=images.length)return;index=target;paint()};
  const zoom=attachZoomSurface(img,stage,{onSwipe:go,onScale:s=>{if(zoomLabel)zoomLabel.textContent=`${Math.round(s*100)}%`}});
  const paint=()=>{const current=images[index];img.src=current.url;img.alt=`${item.baslik||'Duyuru'} — görsel ${index+1}`;counter.textContent=`${index+1} / ${images.length}`;prev.disabled=index===0;next.disabled=index===images.length-1;box.querySelectorAll('[data-home-lightbox-thumb]').forEach(b=>b.classList.toggle('is-active',Number(b.dataset.homeLightboxThumb)===index));zoom?.reset()};
  box.querySelector('[data-home-lightbox-close]')?.addEventListener('click',closeHomeViewer);
  box.addEventListener('click',e=>{if(e.target===box)closeHomeViewer()});
  prev.addEventListener('click',()=>go(-1));next.addEventListener('click',()=>go(1));
  box.querySelector('[data-home-zoom-in]')?.addEventListener('click',()=>zoom?.zoomIn());
  box.querySelector('[data-home-zoom-out]')?.addEventListener('click',()=>zoom?.zoomOut());
  box.querySelector('[data-home-zoom-reset]')?.addEventListener('click',()=>zoom?.reset());
  box.querySelectorAll('[data-home-lightbox-thumb]').forEach(b=>b.addEventListener('click',()=>{index=Number(b.dataset.homeLightboxThumb)||0;paint()}));
  const onKey=e=>{if(e.key==='Escape')closeHomeViewer();else if(e.key==='ArrowLeft')go(-1);else if(e.key==='ArrowRight')go(1);else if(e.key==='+'||e.key==='=')zoom?.zoomIn();else if(e.key==='-')zoom?.zoomOut()};
  document.addEventListener('keydown',onKey);
  activeHomeViewer={box,onKey};paint();
}
function bindGallery(gallery){
  if(!gallery||gallery.dataset.galleryBound==='1')return;
  gallery.dataset.galleryBound='1';
  const track=gallery.querySelector('[data-home-announcement-track]'),dots=[...gallery.querySelectorAll('[data-home-announcement-dot]')];
  if(!track||dots.length<2)return;
  let raf=0;
  track.addEventListener('scroll',()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const i=Math.max(0,Math.min(dots.length-1,Math.round(track.scrollLeft/Math.max(1,track.clientWidth))));dots.forEach((d,n)=>d.classList.toggle('is-active',n===i))})},{passive:true});
}
function renderGallery(item){
  const images=imagesOf(item);if(!images.length)return'';
  return `<section class="kh-announcement-media" data-home-announcement-gallery="${esc(item.id||'')}"><div class="kh-announcement-media__track" data-home-announcement-track>${images.map((r,i)=>`<button type="button" class="kh-announcement-media__slide" data-home-announcement-image="${esc(item.id||'')}" data-home-announcement-image-index="${i}" aria-label="Duyuru görseli ${i+1} tam ekran aç"><img src="${esc(r.url)}" alt="Duyuru görseli ${i+1}" loading="lazy">${images.length>1?`<span>${i+1}/${images.length}</span>`:''}</button>`).join('')}</div>${images.length>1?`<div class="kh-announcement-media__dots">${images.map((_,i)=>`<i data-home-announcement-dot class="${i===0?'is-active':''}"></i>`).join('')}</div>`:''}</section>`;
}
function enhanceDashboardCards(){
  const root=document.querySelector('[data-dashboard-module]');if(!root)return;
  root.querySelectorAll('.kh-announcement[data-duyuru-id]').forEach(card=>{
    const id=card.dataset.duyuruId,item=arr('duyurular').find(x=>String(x.id)===String(id));if(!item)return;
    const signature=imagesOf(item).map(x=>x.url).join('|');
    if(card.dataset.announcementMediaSignature!==signature){
      card.querySelector('[data-home-announcement-gallery]')?.remove();
      const html=renderGallery(item);
      if(html){
        const body=card.querySelector('.kh-announcement-body'),head=card.querySelector('.kh-announcement-head');
        (body||head)?.insertAdjacentHTML('afterend',html);
        bindGallery(card.querySelector('[data-home-announcement-gallery]'));
      }
      card.dataset.announcementMediaSignature=signature;
    }
    card.querySelector('.kh-home-readers')?.remove();
    const readerButton=card.querySelector('button.kh-read-count');
    if(readerButton&&isAdmin()){
      readerButton.dataset.homeAnnouncementReaders=id;
      readerButton.removeAttribute('data-dash-route');
      readerButton.removeAttribute('data-dash-page');
      readerButton.removeAttribute('data-dash-title');
      readerButton.setAttribute('aria-haspopup','dialog');
    }
  });
}
function enhanceCommunicationLightbox(box){
  if(!box||box.dataset.dashboardZoomEnhanced==='1')return;
  const stage=box.querySelector('.ka-announcement-lightbox__stage'),img=stage?.querySelector('[data-announcement-lightbox-image]');if(!stage||!img)return;
  box.dataset.dashboardZoomEnhanced='1';
  stage.insertAdjacentHTML('beforeend','<div class="ka-announcement-zoom-controls"><button type="button" data-comm-zoom-out aria-label="Uzaklaştır">−</button><button type="button" data-comm-zoom-reset aria-label="Yakınlaştırmayı sıfırla"><span data-comm-zoom-label>100%</span></button><button type="button" data-comm-zoom-in aria-label="Yakınlaştır">＋</button></div>');
  const label=stage.querySelector('[data-comm-zoom-label]'),zoom=attachZoomSurface(img,stage,{onScale:s=>{if(label)label.textContent=`${Math.round(s*100)}%`}});
  stage.querySelector('[data-comm-zoom-in]')?.addEventListener('click',e=>{e.stopPropagation();zoom?.zoomIn()});
  stage.querySelector('[data-comm-zoom-out]')?.addEventListener('click',e=>{e.stopPropagation();zoom?.zoomOut()});
  stage.querySelector('[data-comm-zoom-reset]')?.addEventListener('click',e=>{e.stopPropagation();zoom?.reset()});
  new MutationObserver(()=>zoom?.reset()).observe(img,{attributes:true,attributeFilter:['src']});
}
function scan(){
  scanQueued=false;
  ensureStyles();
  enhanceDashboardCards();
  document.querySelectorAll('[data-announcement-lightbox]').forEach(enhanceCommunicationLightbox);
}
function scheduleScan(){if(scanQueued)return;scanQueued=true;requestAnimationFrame(scan)}
function onDocumentClick(e){
  const reader=e.target.closest?.('[data-home-announcement-readers]');
  if(reader){
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const item=arr('duyurular').find(x=>String(x.id)===String(reader.dataset.homeAnnouncementReaders));
    if(item){
      if(activeReaderPopup){closeReaderPopup()}else openReaderPopup(reader,item);
    }
    return;
  }
  const image=e.target.closest?.('[data-home-announcement-image]');
  if(image){
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const item=arr('duyurular').find(x=>String(x.id)===String(image.dataset.homeAnnouncementImage));
    if(item)openHomeViewer(item,Number(image.dataset.homeAnnouncementImageIndex)||0);
    return;
  }
  if(activeReaderPopup&&!e.target.closest?.('[data-home-reader-popover]'))closeReaderPopup();
}
function start(){
  ensureStyles();scan();
  document.addEventListener('click',onDocumentClick,true);
  global.addEventListener('resize',closeReaderPopup,{passive:true});
  global.addEventListener('scroll',closeReaderPopup,{passive:true,capture:true});
  new MutationObserver(scheduleScan).observe(document.documentElement,{childList:true,subtree:true});
  global.AppStore?.subscribe?.('data.duyurular',scheduleScan);
}
global.DashboardAnnouncementMedia={scan,openHomeViewer,closeHomeViewer,openReaderPopup,closeReaderPopup,enhanceCommunicationLightbox,attachZoomSurface};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
