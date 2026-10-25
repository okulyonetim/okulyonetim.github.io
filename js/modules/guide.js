/* Koruk Asistan — Kullanım Kılavuzu
 * 1) Merkezi kılavuz sayfası (arama, kategori, rehber kartları, SSS, sorun giderme)
 * 2) Bağlama duyarlı "Nasıl Kullanılır?" penceresi (üst çubuktaki "?" düğmesi → açık sayfanın rehberi)
 * 3) Uygulama Hakkında sayfası (sürüm, güncelleme notları, web / Android / Optik Okuyucu bağlantıları)
 * İçerik js/modules/guide-data.js dosyasında tek yerde tutulur; PDF kılavuzu da aynı veriden üretilir.
 * Firestore kullanmaz, dinleyici eklemez. Rehber penceresi açık sayfayı yeniden çizmez: form ve liste durumu korunur. */
(function(global){
'use strict';
if(global.KorukGuide)return;
const doc=global.document;
const IMG='assets/guide/';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rich=v=>esc(v).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
const norm=v=>String(v??'').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i');
const toast=(m,o)=>{try{global.toast?.(m,o)}catch(_){}};
const data=()=>global.KorukGuideData||{kategoriler:[],konular:[],sss:[],sorunlar:[],surumNotlari:[],baglantilar:{},geometri:{}};
const topics=()=>data().konular||[];
const byId=id=>topics().find(t=>t.id===id)||null;
const catOf=t=>(data().kategoriler||[]).find(c=>c.id===t.kategori)||{ad:''};
const links=()=>data().baglantilar||{};
let layer=null,layerOpener=null,keyHandler=null;

/* ---------- görünürlük: kılavuz hiçbir yetkiyi aşmaz; kullanıcının menüde göremediği modülün rehberi de listelenmez ---------- */
function canOpen(route){
  if(!Array.isArray(route)||!route[0])return true;
  try{return global.ShellUI?.canOpen?.(route[0],route[1]||'')!==false}catch(_){return true}
}
const visible=t=>t.herkes===true||canOpen(t.rota);
const visibleTopics=()=>topics().filter(visible);

/* ---------- arama (yalnız yerel içerik; Firestore sorgusu yok) ---------- */
const haystack=new Map();
function hay(t){
  if(haystack.has(t.id))return haystack.get(t.id);
  const parts=[t.baslik,t.ozet,t.anahtar,t.ne,t.kayit,(t.yol||[]).join(' '),catOf(t).ad,
    ...(t.adimlar||[]).flatMap(s=>[s.baslik,s.metin]),...(t.uyarilar||[]),...(t.sorunlar||[]).flatMap(x=>[x.s,x.c]),
    ...(t.ekranlar||[]).flatMap(e=>[e.baslik,...(e.isaretler||[]).flatMap(m=>[m.baslik,m.aciklama])])];
  const text=norm(parts.filter(Boolean).join(' '));
  haystack.set(t.id,text);return text;
}
function search(query,{cat='all'}={}){
  const words=norm(query).split(/\s+/).filter(Boolean);
  return visibleTopics().filter(t=>(cat==='all'||t.kategori===cat)&&words.every(w=>hay(t).includes(w)))
    .map((t,i)=>({t,i,rank:words.length&&words.every(w=>norm(t.baslik).includes(w))?0:1}))
    .sort((a,b)=>a.rank-b.rank||a.i-b.i).map(x=>x.t);
}
/* üst çubuktaki "?" için: açık ekranın anahtarı → rehber. Alt ekran varsa (ekran.baglam) o ekran öne çıkar. */
function contextKey(view){
  if(!view)return'dashboard:';
  return view.kind==='route'?`${view.name}:${view.page||''}`:`view:${view.kind}`;
}
function topicFor(key){
  const list=topics();
  return list.find(t=>(t.eslesme||[]).includes(key))||list.find(t=>(t.eslesme||[]).includes(String(key).split(':')[0]+':*'))||null;
}
function currentScreenOf(t){
  for(const e of t.ekranlar||[]){
    if(!e.baglam)continue;
    try{const el=doc.querySelector(`#v2ModuleRoot ${e.baglam}`);if(el&&(el.offsetWidth||el.offsetHeight||el.getClientRects().length))return e.id}catch(_){}
  }
  return'';
}

/* ---------- ortak parçalar (uygulama + PDF aynı işaretlemeyi kullanır) ---------- */
function marksHTML(e){
  const g=(data().geometri||{})[e.id]||[];
  return(e.isaretler||[]).map((m,i)=>{const r=g[i];return r?`<i class="ka-guide-mark" data-n="${m.n}" style="--x:${r[0]}%;--y:${r[1]}%;--w:${r[2]}%;--h:${r[3]}%"><b>${m.n}</b></i>`:''}).join('');
}
function legendHTML(e){
  return`<ol class="ka-guide-legend">${(e.isaretler||[]).map(m=>`<li data-n="${m.n}"><b class="ka-guide-n">${m.n}</b><div><strong>${esc(m.baslik)}</strong><span>${rich(m.aciklama)}</span></div></li>`).join('')}</ol>`;
}
function shotHTML(e,{zoom=true}={}){
  if(!e.dosya)return`<p class="ka-guide-missing">Bu ekranın gerçek görüntüsü henüz eklenmedi.</p>`;
  const [w,h]=e.boyut||data().gorselBoyut||[780,1688];
  const inner=`<img class="ka-guide-img" src="${esc(IMG+e.dosya)}" width="${w}" height="${h}" alt="${esc(e.alt||e.baslik)}" loading="lazy" decoding="async">${marksHTML(e)}`;
  return zoom?`<button class="ka-guide-shot" type="button" data-guide-zoom="${esc(e.id)}" aria-label="Görseli büyüt: ${esc(e.baslik)}">${inner}</button>`:`<div class="ka-guide-shot">${inner}</div>`;
}
function screenHTML(e,{current=false,zoom=true}={}){
  return`<section class="ka-guide-screen${current?' is-current':''}" data-screen="${esc(e.id)}"><h4>${esc(e.baslik)}${current?' <span class="ka-badge">Şu an bu ekrandasınız</span>':''}</h4><div class="ka-guide-fig">${shotHTML(e,{zoom})}${legendHTML(e)}</div></section>`;
}
function pathText(t){return['Menü',...(t.yol||[])].join(' › ')}

/* ---------- rehber gövdesi ---------- */
function stepsHTML(t,step){
  const s=t.adimlar||[];if(!s.length)return'';
  const i=Math.max(0,Math.min(step,s.length-1)),cur=s[i];
  return`<section class="ka-guide-sec ka-guide-steps" data-guide-steps><h3>İşlem adımları</h3>
  <div class="ka-guide-step" aria-live="polite"><div class="ka-guide-step__head"><b>Adım ${i+1} / ${s.length}</b><strong>${esc(cur.baslik)}</strong></div><p>${rich(cur.metin)}</p>${cur.isaret?`<p class="ka-guide-step__ref">Görselde <b>${cur.isaret}</b> numaralı alana bakın.</p>`:''}</div>
  <div class="ka-guide-step__nav"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-guide-step="prev"${i<=0?' disabled':''}>‹ Önceki adım</button><button class="ka-btn ka-btn--sm" type="button" data-guide-step="next"${i>=s.length-1?' disabled':''}>Sonraki adım ›</button></div>
  <div class="ka-guide-jump" role="group" aria-label="Adıma git">${s.map((x,k)=>`<button type="button" class="ka-guide-jump__n${k===i?' is-on':''}" data-guide-step="${k}" aria-label="Adım ${k+1}: ${esc(x.baslik)}"${k===i?' aria-current="step"':''}>${k+1}</button>`).join('')}</div></section>`;
}
function topicHTML(t,{step=0,currentScreen='',modal=false}={}){
  const related=(t.iliskili||[]).map(byId).filter(x=>x&&visible(x));
  const faq=(t.sorunlar||[]);
  return`<article class="ka-guide-topic" data-guide-topic="${esc(t.id)}">
  ${modal?'':`<header class="ka-guide-topic__head"><span class="ka-guide-topic__icon" aria-hidden="true">${esc(t.ikon||'📘')}</span><div><small>${esc(catOf(t).ad)}</small><h2>${esc(t.baslik)}</h2></div></header>`}
  ${t.ozet?`<p class="ka-guide-lead">${esc(t.ozet)}</p>`:''}
  ${t.ne?`<section class="ka-guide-sec"><h3>Modül ne işe yarar?</h3><p>${rich(t.ne)}</p></section>`:''}
  ${t.yol?.length?`<section class="ka-guide-sec"><h3>Modüle nasıl ulaşılır?</h3><p class="ka-guide-path">${esc(pathText(t))}</p>${t.yolNot?`<p class="ka-muted">${rich(t.yolNot)}</p>`:''}</section>`:(t.yolNot?`<section class="ka-guide-sec"><h3>Nasıl ulaşılır?</h3><p>${rich(t.yolNot)}</p></section>`:'')}
  ${(t.ekranlar||[]).length?`<section class="ka-guide-sec"><h3>Ekranın tanıtımı</h3>${t.ekranlar.map(e=>screenHTML(e,{current:e.id===currentScreen})).join('')}</section>`:''}
  ${stepsHTML(t,step)}
  ${t.kayit?`<section class="ka-guide-sec"><h3>Kaydetme ve sonuç</h3><p>${rich(t.kayit)}</p></section>`:''}
  ${(t.uyarilar||[]).length?`<section class="ka-guide-sec"><h3>Önemli uyarılar</h3><ul class="ka-guide-list">${t.uyarilar.map(x=>`<li>${rich(x)}</li>`).join('')}</ul></section>`:''}
  ${faq.length?`<section class="ka-guide-sec"><h3>Sık karşılaşılan sorunlar</h3>${faq.map(x=>`<details class="ka-guide-faq"><summary>${esc(x.s)}</summary><p>${rich(x.c)}</p></details>`).join('')}</section>`:''}
  ${related.length?`<section class="ka-guide-sec"><h3>Diğer rehberler</h3><div class="ka-guide-chips">${related.map(x=>`<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-guide-open="${esc(x.id)}">${esc(x.ikon||'')} ${esc(x.baslik)}</button>`).join('')}</div></section>`:''}
  </article>`;
}
function goButton(t){
  return t.rota&&canOpen(t.rota)?`<button class="ka-btn" type="button" data-guide-go="${esc(t.id)}">${esc(t.ikon||'')} ${esc(t.baslik)} sayfasına git</button>`:'';
}

/* ---------- modül ekranına gitme ---------- */
async function go(t){
  if(!t?.rota||!canOpen(t.rota))return false;
  close();
  try{return await global.ShellUI?.routeModule?.(t.rota[0],{page:t.rota[1]||'',title:t.baslik})}
  catch(e){console.error('[Guide/go]',e);toast('Sayfa açılamadı.');return false}
}

/* ---------- ortak etkileşim: kök elemana bir kez bağlanır ---------- */
function bindTopic(host,state,rerender){
  host.addEventListener('click',e=>{
    const stepBtn=e.target.closest('[data-guide-step]');
    if(stepBtn&&!stepBtn.disabled){
      const t=byId(state.id),n=(t?.adimlar||[]).length,v=stepBtn.dataset.guideStep;
      state.step=v==='prev'?Math.max(0,state.step-1):v==='next'?Math.min(n-1,state.step+1):Math.max(0,Math.min(n-1,Number(v)||0));
      const box=host.querySelector('[data-guide-steps]');
      if(box){box.outerHTML=stepsHTML(t,state.step);focusMark(host,t,state.step)}
      return;
    }
    const zoom=e.target.closest('[data-guide-zoom]');
    if(zoom){openZoom(byId(state.id),zoom.dataset.guideZoom,zoom);return}
    const open=e.target.closest('[data-guide-open]');
    if(open){state.id=open.dataset.guideOpen;state.step=0;state.screen='';rerender(true)}
  });
  host.addEventListener('error',e=>{
    const img=e.target;if(!img||img.tagName!=='IMG'||!img.classList.contains('ka-guide-img'))return;
    const shot=img.closest('.ka-guide-shot');
    if(shot)shot.replaceWith(Object.assign(doc.createElement('p'),{className:'ka-guide-missing',textContent:'Bu ekranın görüntüsü yüklenemedi. Bağlantınızı kontrol edip sayfayı yeniden açın.'}));
  },true);
}
function focusMark(host,t,step){
  host.querySelectorAll('.is-focus').forEach(x=>x.classList.remove('is-focus'));
  const s=(t.adimlar||[])[step];if(!s?.isaret)return;
  const screen=(s.ekran?host.querySelector(`[data-screen="${CSS.escape(String(s.ekran))}"]`):null)||host.querySelector('.ka-guide-screen');
  if(!screen)return;
  screen.querySelectorAll(`[data-n="${s.isaret}"]`).forEach(x=>x.classList.add('is-focus'));
}

/* ---------- görsel büyütme (geri dönüş: Kapat düğmesi, Esc veya cihazın geri tuşu) ---------- */
function openZoom(t,screenId,opener){
  const e=(t?.ekranlar||[]).find(x=>x.id===screenId);if(!e?.dosya)return;
  doc.getElementById('kaGuideZoom')?.remove();
  const ov=doc.createElement('div');
  ov.id='kaGuideZoom';ov.className='ka-modal-backdrop ka-guide-zoom';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label','Büyütülmüş ekran görüntüsü');
  ov.innerHTML=`<section class="ka-modal ka-guide-zoom__panel"><div class="ka-modal__header"><strong>${esc(e.baslik)}</strong><span class="ka-guide-zoom__tools"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-zoom-size aria-pressed="false">Daha büyük</button><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" aria-label="Kapat" data-zoom-close>Kapat</button></span></div><div class="ka-modal__body ka-guide-zoom__body"><div class="ka-guide-zoom__fig">${shotHTML(e,{zoom:false})}</div>${legendHTML(e)}</div></section>`;
  doc.body.appendChild(ov);
  /* Kılavuz sayfasında (pencere dışında) açılan büyütmeyi Esc de kapatır; pencere açıkken Esc'i trapKeys yönetir. */
  const onKey=ev=>{if(!ov.isConnected){doc.removeEventListener('keydown',onKey,true);return}if(ev.key==='Escape'&&!layer){ev.preventDefault();closeZoom()}};
  doc.addEventListener('keydown',onKey,true);
  const closeZoom=()=>{doc.removeEventListener('keydown',onKey,true);ov.remove();opener?.focus?.()};
  ov.querySelector('[data-zoom-close]').addEventListener('click',closeZoom);
  ov.addEventListener('click',ev=>{if(ev.target===ov)closeZoom()});
  ov.querySelector('[data-zoom-size]').addEventListener('click',ev=>{const big=ov.classList.toggle('is-big');ev.currentTarget.setAttribute('aria-pressed',String(big));ev.currentTarget.textContent=big?'Sığdır':'Daha büyük'});
  ov.querySelector('[data-zoom-close]').focus();
}

/* ---------- "Nasıl Kullanılır?" penceresi ---------- */
function close(){
  doc.getElementById('kaGuideZoom')?.remove();
  if(layer){layer.remove();layer=null}
  doc.documentElement.classList.remove('ka-guide-lock');
  if(keyHandler){doc.removeEventListener('keydown',keyHandler,true);keyHandler=null}
  const o=layerOpener;layerOpener=null;try{o?.focus?.()}catch(_){}
}
function trapKeys(e){
  if(!layer)return;
  if(e.key==='Escape'){
    const z=doc.getElementById('kaGuideZoom');
    e.preventDefault();e.stopPropagation();
    if(z){z.remove();return}
    close();return;
  }
  if(e.key!=='Tab')return;
  const scope=doc.getElementById('kaGuideZoom')||layer;
  const f=[...scope.querySelectorAll('button:not([disabled]),a[href],summary,input,[tabindex]:not([tabindex="-1"])')].filter(x=>x.offsetWidth||x.offsetHeight);
  if(!f.length)return;
  const first=f[0],last=f[f.length-1];
  if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first.focus()}
}
function layerShell(){
  const ov=doc.createElement('div');
  ov.id='kaGuideLayer';ov.className='ka-modal-backdrop ka-guide-layer';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-labelledby','kaGuideLayerTitle');
  ov.innerHTML=`<section class="ka-modal ka-guide-modal"><div class="ka-modal__header"><div class="ka-guide-modal__title"><small>Nasıl Kullanılır?</small><strong id="kaGuideLayerTitle" data-guide-title></strong></div><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" aria-label="Kapat" data-guide-close>Kapat</button></div><div class="ka-modal__body ka-guide-modal__body" data-guide-body></div><div class="ka-modal__footer ka-guide-modal__foot" data-guide-foot></div></section>`;
  return ov;
}
function openLayer(topicId,{screen=''}={}){
  if(!data().konular?.length)return false;
  const opener=doc.activeElement&&doc.activeElement!==doc.body?doc.activeElement:null;
  if(!layer){
    layer=layerShell();layerOpener=opener;
    doc.body.appendChild(layer);doc.documentElement.classList.add('ka-guide-lock');
    keyHandler=trapKeys;doc.addEventListener('keydown',keyHandler,true);
    layer.addEventListener('click',e=>{
      if(e.target===layer||e.target.closest('[data-guide-close]')){close();return}
      if(e.target.closest('[data-guide-all]')){close();openCentral();return}
      const g=e.target.closest('[data-guide-go]');if(g){go(byId(g.dataset.guideGo))}
    });
    bindTopic(layer,state,rerenderLayer);
  }
  state.id=topicId||'';state.step=0;state.screen=screen;
  rerenderLayer(true);
  layer.querySelector('[data-guide-close]')?.focus();
  return true;
}
const state={id:'',step:0,screen:''};
function rerenderLayer(resetScroll){
  if(!layer)return;
  const t=byId(state.id),body=layer.querySelector('[data-guide-body]'),foot=layer.querySelector('[data-guide-foot]'),title=layer.querySelector('[data-guide-title]');
  if(!t||!visible(t)){
    title.textContent='Bu ekran için rehber bulunamadı';
    body.innerHTML=`<p class="ka-guide-lead">Bu ekran için ayrıntılı bir rehber henüz hazırlanmadı. Tüm kılavuzdan diğer modüllerin rehberlerine ulaşabilirsiniz.</p>`;
    foot.innerHTML=`<button class="ka-btn" type="button" data-guide-all>Tüm Kılavuzu Aç</button>`;
    return;
  }
  title.textContent=t.baslik;
  body.innerHTML=topicHTML(t,{step:state.step,currentScreen:state.screen,modal:true});
  const here=global.ShellUI?.currentView?.(),same=here?.kind==='route'&&t.rota&&here.name===t.rota[0]&&(here.page||'')===(t.rota[1]||'');
  foot.innerHTML=`<button class="ka-btn ka-btn--secondary" type="button" data-guide-all>Tüm Kılavuz</button>${same?'':goButton(t)}`;
  focusMark(body,t,state.step);
  if(resetScroll)body.scrollTop=0;
  if(state.screen){const el=body.querySelector('.ka-guide-screen.is-current');el?.scrollIntoView?.({block:'start'})}
}

/* ---------- üst çubuk "?" düğmesi ---------- */
function openContext(){
  const view=global.ShellUI?.currentView?.(),key=contextKey(view),t=topicFor(key);
  if(t&&visible(t))return openLayer(t.id,{screen:currentScreenOf(t)});
  return openLayer('',{});
}
function openTopic(id){return openLayer(id,{})}

/* ---------- merkezi kılavuz sayfası ---------- */
async function openCentral(id){
  try{return await global.ShellUI?.routeModule?.('dashboard',{page:'guide',title:'Kullanım Kılavuzu'})}
  catch(e){console.error('[Guide/open]',e);toast('Kılavuz açılamadı.');return false}
}
function pageHead(){
  const l=links();
  return`<article class="ka-card ka-guide-hero"><div class="ka-card__body ka-stack"><div><small>YARDIM</small><h2>Kullanım Kılavuzu</h2><p class="ka-muted">Koruk Asistan'daki modüllerin gerçek ekran görüntüleriyle hazırlanmış kullanım rehberleri. Modülü seçin, numaralı ekranı ve adım adım anlatımı izleyin.</p></div>
  <label class="ka-field"><span class="ka-field__label">Modül ara</span><input class="ka-input" type="search" data-guide-search placeholder="Örn. nöbet, PDF, öğretmen, kaydetme" autocomplete="off" enterkeyhint="search"></label>
  <div class="ka-guide-chips" role="group" aria-label="Kategoriler" data-guide-cats></div>
  ${l.pdf?`<div class="ka-row ka-guide-pdf"><span class="ka-grow"><strong>PDF kullanım kılavuzu</strong><small class="ka-muted">${esc(l.pdfAciklama||'Tüm rehberleri tek belgede, yazdırmaya uygun A4 düzeninde indirin.')}</small></span><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-guide-pdf>PDF indir</button></div>`:''}
  </div></article>`;
}
function catsHTML(cat){
  const list=visibleTopics(),cats=(data().kategoriler||[]).filter(c=>list.some(t=>t.kategori===c.id));
  const chip=(id,label,n)=>`<button class="ka-btn ka-btn--sm${id===cat?'':' ka-btn--secondary'}" type="button" data-guide-cat="${esc(id)}" aria-pressed="${id===cat}">${esc(label)} <span class="ka-muted">${n}</span></button>`;
  return chip('all','Tümü',list.length)+cats.map(c=>chip(c.id,`${c.ikon||''} ${c.ad}`.trim(),list.filter(t=>t.kategori===c.id).length)).join('');
}
function cardHTML(t){
  return`<article class="ka-card ka-guide-card"><div class="ka-card__body ka-stack"><div class="ka-guide-card__top"><span class="ka-guide-card__icon" aria-hidden="true">${esc(t.ikon||'📘')}</span><div class="ka-grow"><strong>${esc(t.baslik)}</strong><small class="ka-muted">${esc(catOf(t).ad)}</small></div></div><p class="ka-muted">${esc(t.ozet||'')}</p><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-guide-open="${esc(t.id)}" aria-label="${esc(t.baslik)} rehberini aç">Rehberi Aç</button></div></article>`;
}
function faqBlock(title,items){
  if(!items?.length)return'';
  return`<details class="ka-card ka-guide-faqs"><summary class="ka-card__body"><strong>${esc(title)}</strong> <span class="ka-muted">· ${items.length}</span></summary><div class="ka-card__body ka-stack">${items.map(x=>`<details class="ka-guide-faq"><summary>${esc(x.s)}</summary><p>${rich(x.c)}</p></details>`).join('')}</div></details>`;
}
function resultsHTML(q,cat){
  const list=search(q,{cat});
  if(!list.length)return`<article class="ka-card"><div class="ka-card__body"><p class="ka-muted">Aramanızla eşleşen rehber bulunamadı. Başka bir sözcük deneyin veya kategoriyi “Tümü” yapın.</p></div></article>`;
  return`<p class="ka-muted ka-guide-count" role="status">${list.length} rehber</p><div class="ka-guide-grid">${list.map(cardHTML).join('')}</div>`;
}
async function downloadPdf(btn){
  const l=links();if(!l.pdf)return;
  const old=btn.textContent;btn.disabled=true;btn.textContent='Hazırlanıyor…';
  try{
    const r=await fetch(l.pdf);if(!r.ok)throw new Error('PDF dosyası alınamadı ('+r.status+')');
    const blob=await r.blob(),name=l.pdf.split('/').pop();
    if(typeof global.uygulamaDosyaKaydet==='function'){
      const b64=await new Promise((ok,no)=>{const fr=new FileReader();fr.onload=()=>ok(String(fr.result||'').split(',')[1]||'');fr.onerror=()=>no(new Error('Dosya okunamadı.'));fr.readAsDataURL(blob)});
      await global.uygulamaDosyaKaydet(b64,name,'application/pdf',false);toast('PDF İndirilenler klasörüne kaydedildi.');
    }else{
      const u=URL.createObjectURL(blob),a=doc.createElement('a');a.href=u;a.download=name;a.rel='noopener';doc.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast('PDF indirildi.');
    }
  }catch(err){console.error('[Guide/pdf]',err);toast('PDF indirilemedi: '+(err?.message||'bilinmeyen hata'),{tur:'hata'})}
  finally{btn.disabled=false;btn.textContent=old}
}
function mountPage(root,{topic=''}={}){
  if(!root)return false;
  if(!data().konular?.length){root.innerHTML='<section class="ka-page ka-stack"><article class="ka-card"><div class="ka-card__body"><strong>Kılavuz içeriği yüklenemedi.</strong><p class="ka-muted">Sayfayı yenileyip tekrar deneyin. Uygulamanın diğer bölümleri etkilenmez.</p></div></article></section>';return true}
  close();
  const view={q:'',cat:'all'},st={id:topic&&byId(topic)&&visible(byId(topic))?topic:'',step:0,screen:''};
  root.replaceChildren();
  const page=doc.createElement('section');page.className='ka-page ka-stack ka-guide-page';page.setAttribute('data-guide-page','');
  root.appendChild(page);
  function draw(){
    const t=st.id?byId(st.id):null;
    if(t&&visible(t)){
      page.innerHTML=`<div class="ka-row ka-guide-bar"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-guide-back>‹ Tüm rehberler</button></div><article class="ka-card"><div class="ka-card__body">${topicHTML(t,{step:st.step})}</div><div class="ka-card__footer ka-guide-modal__foot">${goButton(t)}</div></article>`;
      focusMark(page,t,st.step);return;
    }
    page.innerHTML=`${pageHead()}<div data-guide-results></div>${faqBlock('Sık sorulan sorular',data().sss)}${faqBlock('Sorun giderme',data().sorunlar)}<article class="ka-card"><div class="ka-card__body ka-row"><span class="ka-grow"><strong>Uygulama Hakkında</strong><small class="ka-muted">Sürüm, güncelleme notları, web ve Android bağlantıları</small></span><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-guide-about>Aç</button></div></article>`;
    paintList();
    const input=page.querySelector('[data-guide-search]');input.value=view.q;
  }
  function paintList(){
    page.querySelector('[data-guide-cats]').innerHTML=catsHTML(view.cat);
    page.querySelector('[data-guide-results]').innerHTML=resultsHTML(view.q,view.cat);
  }
  page.addEventListener('input',e=>{if(e.target.matches('[data-guide-search]')){view.q=e.target.value;paintList()}});
  page.addEventListener('click',e=>{
    const cat=e.target.closest('[data-guide-cat]');if(cat){view.cat=cat.dataset.guideCat;paintList();return}
    if(e.target.closest('[data-guide-back]')){st.id='';st.step=0;draw();global.scrollTo?.(0,0);return}
    const g=e.target.closest('[data-guide-go]');if(g){go(byId(g.dataset.guideGo));return}
    if(e.target.closest('[data-guide-about]')){global.ShellUI?.routeModule?.('dashboard',{page:'about',title:'Uygulama Hakkında'});return}
    const p=e.target.closest('[data-guide-pdf]');if(p){downloadPdf(p)}
  });
  bindTopic(page,st,()=>{draw();global.scrollTo?.(0,0);doc.querySelector('.ka-app-content')?.scrollTo?.(0,0)});
  draw();
  return true;
}

/* ---------- Uygulama Hakkında ---------- */
const fmtDate=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?String(v||''):d.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})};
function aboutHTML(){
  const l=links(),o=l.optik||{},notes=data().surumNotlari||[];
  const linkBtn=(href,label,primary)=>href?`<a class="ka-btn${primary?'':' ka-btn--secondary'}" href="${esc(href)}" target="_blank" rel="noopener noreferrer" data-guide-ext>${esc(label)}</a>`:'';
  return`<header class="ka-card ka-guide-hero"><div class="ka-card__body ka-guide-about-head"><img class="ka-guide-about-logo" src="assets/icon-192.png" width="72" height="72" alt="Koruk İlk-Ortaokulu"><div><small>UYGULAMA HAKKINDA</small><h2>Koruk Asistan</h2><p class="ka-muted">Koruk İlk-Ortaokulu okul yönetim uygulaması</p></div></div></header>
  <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Uygulama nedir?</strong><p>Koruk Asistan; öğretmen, sınıf ve öğrenci kayıtlarını, ders ve nöbet programlarını, duyuru ve haberleri, evrak takibini, taşıma ve yemek işlemlerini, raporları ve personel işlerini tek yerden yönetmek için kullanılır. Hangi bölümleri görebileceğiniz, okul yönetiminin verdiği yetkilere bağlıdır.</p><div class="ka-row"><button class="ka-btn" type="button" data-about-guide>📖 Kullanım Kılavuzu</button>${l.pdf?'<button class="ka-btn ka-btn--secondary" type="button" data-guide-pdf>PDF kılavuz</button>':''}</div></div></article>
  <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Sürüm</strong><dl class="ka-guide-facts"><div><dt>Bu cihazdaki sürüm</dt><dd data-about-current>Okunuyor…</dd></div><div><dt>Yayınlanan son Android sürümü</dt><dd data-about-latest>Okunuyor…</dd></div></dl><p class="ka-muted" data-about-note></p><div class="ka-row"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-about-check>Güncellemeleri Kontrol Et</button></div></div></article>
  <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Web ve Android uygulaması</strong><p><b>Web uygulaması</b> tarayıcıdan açılır, kurulum gerektirmez. <b>Android uygulaması (APK)</b> telefona kurulur; yeni sürümler uygulama içinden (Ayarlar › Güncellemeleri Kontrol Et) ya da aşağıdaki bağlantıdan alınır.</p><div class="ka-row ka-guide-links">${linkBtn(l.web,'🌐 Web uygulamasını aç',true)}${linkBtn(l.apk,'📱 Android uygulamasını indir (APK)')}</div></div></article>
  ${o.apk||o.depo?`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>${esc(o.ad||'Optik Okuyucu')}</strong><p>${esc(o.aciklama||'Okul yönetim uygulamasının verilerini kullanan, ayrı bir Android uygulamasıdır.')}</p><div class="ka-row ka-guide-links">${linkBtn(o.apk,'📷 Optik Okuyucu\'yu indir (APK)',true)}${linkBtn(o.depo,'Sürümler ve ayrıntılar')}</div>${o.not?`<p class="ka-muted">${esc(o.not)}</p>`:''}</div></article>`:''}
  <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Güncelleme notları</strong>${notes.length?notes.map(n=>`<section class="ka-guide-note"><div class="ka-row ka-row--between"><b>${esc(n.surum?'Sürüm '+n.surum:n.baslik||'')}</b><small class="ka-muted">${esc(fmtDate(n.tarih))}</small></div><ul class="ka-guide-list">${(n.maddeler||[]).map(x=>`<li>${rich(x)}</li>`).join('')}</ul></section>`).join(''):'<p class="ka-muted">Güncelleme notu bulunamadı.</p>'}<p class="ka-muted">${esc(data().surumNotKaynagi||'')}</p>${linkBtn(l.degisiklikler,'Tüm değişiklikler (GitHub)')}</div></article>
  <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Destek</strong><p>Kılavuzda çözüm bulamadığınız durumlarda okulunuzdaki uygulama yöneticisine (admin veya yönetici rolündeki kullanıcıya) başvurun.</p></div></article>`;
}
async function webLatestRelease(){
  /* Web'de güncelleme yöneticisi yüklü olmadığı için GitHub'daki son yayın bilgisi (yalnızca okuma) doğrudan alınır. */
  const ctl=typeof AbortController==='function'?new AbortController():null,timer=ctl?setTimeout(()=>ctl.abort(),10000):null;
  try{
    const r=await fetch('https://api.github.com/repos/okulyonetim/okulyonetim.github.io/releases/latest',{headers:{Accept:'application/vnd.github+json'},signal:ctl?.signal});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const j=await r.json(),build=Number((String(j?.tag_name||j?.name||'').match(/\d+/g)||[]).pop())||0;
    if(!build)throw new Error('Sürüm okunamadı');
    return{name:String(j.name||j.tag_name),build,publishedAt:j.published_at||''};
  }finally{if(timer)clearTimeout(timer)}
}
async function fillAbout(page){
  const um=global.KorukAppUpdateManager,cur=page.querySelector('[data-about-current]'),lat=page.querySelector('[data-about-latest]'),note=page.querySelector('[data-about-note]');
  let current=null;
  try{current=await um?.currentBuild?.()}catch(_){}
  if(!page.isConnected)return;
  cur.textContent=current?`${current.name} (yapı ${current.build})`:'Web sürümü — sürüm numarası yalnızca Android uygulamasında gösterilir.';
  let latest=null;
  try{latest=um?.latestRelease?await um.latestRelease():await webLatestRelease()}catch(err){if(page.isConnected)lat.textContent='Okunamadı (çevrimdışı olabilirsiniz).'}
  if(!page.isConnected)return;
  if(latest){
    lat.textContent=`${latest.name}${latest.publishedAt?' · '+fmtDate(latest.publishedAt):''}`;
    if(current)note.textContent=latest.build>current.build?'Yeni bir Android sürümü yayınlanmış. “Güncellemeleri Kontrol Et” ile yükleyebilirsiniz.':'Bu cihazdaki sürüm güncel.';
  }
}
function mountAbout(root){
  if(!root)return false;
  close();root.replaceChildren();
  const page=doc.createElement('section');page.className='ka-page ka-stack ka-guide-page';page.setAttribute('data-guide-about-page','');
  page.innerHTML=aboutHTML();root.appendChild(page);
  page.addEventListener('click',e=>{
    const ext=e.target.closest('[data-guide-ext]');
    /* Harici bağlantılar uygulamanın diğer yerlerindeki gibi window.open ile açılır (Android'de sistem tarayıcısı) */
    if(ext){e.preventDefault();global.open(ext.getAttribute('href'),'_blank','noopener,noreferrer');return}
    if(e.target.closest('[data-about-guide]')){openCentral();return}
    const p=e.target.closest('[data-guide-pdf]');if(p){downloadPdf(p);return}
    if(e.target.closest('[data-about-check]')){
      const um=global.KorukAppUpdateManager;
      if(um?.check)um.check({manual:true});else toast('Güncelleme kontrolü Android uygulamasında kullanılabilir.');
    }
  });
  fillAbout(page);
  return true;
}

global.KorukGuide={mountPage,mountAbout,openContext,openTopic,openCentral,close,topicFor,contextKey,search,visibleTopics,
  html:{topic:topicHTML,screen:screenHTML,legend:legendHTML,marks:marksHTML,shot:shotHTML,steps:stepsHTML,path:pathText}};
})(window);
