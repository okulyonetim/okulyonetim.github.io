/* Koruk Asistan — çoklu akordeon alt menü motoru */
(function(){
'use strict';
const PDF_MENU='pdf_islemleri', PDF_RESIM='sistem_pdf_resimden', PDF_BIR='sistem_pdf_birlestir';
const ACIK=new Set(); let navSar=false, edSar=false, obs=null, kilit=false;
const cp=v=>{try{return JSON.parse(JSON.stringify(v||{}));}catch(_){return Object.assign({},v||{});}};
function hazir(v){
  const n=cp(v); n.ekOgeler=Array.isArray(n.ekOgeler)?n.ekOgeler:[]; n.altMenuler=Array.isArray(n.altMenuler)?n.altMenuler:[]; n.ogeYerlesimi=n.ogeYerlesimi||{};
  n.ekOgeler=n.ekOgeler.filter(x=>x&&x.anahtar!=='sistem_pdf_islemleri');
  if(!n.ekOgeler.some(x=>x.anahtar===PDF_RESIM))n.ekOgeler.push({anahtar:PDF_RESIM,ad:'Resimden PDF Oluştur',sekmeAd:'@ozellik:pdf_resimden',grup:'g7',altGrupMu:true});
  if(!n.ekOgeler.some(x=>x.anahtar===PDF_BIR))n.ekOgeler.push({anahtar:PDF_BIR,ad:'PDF Birleştir',sekmeAd:'@ozellik:pdf_birlestir',grup:'g7',altGrupMu:true});
  const ekMenu=(a,g,ad,ikon,s)=>{if(!n.altMenuler.some(x=>x.anahtar===a))n.altMenuler.push({anahtar:a,grup:g,ad,ikon,sira:s});};
  ekMenu('g7alt','g7','Raporlar','rapor',0); ekMenu(PDF_MENU,'g7','PDF İşlemleri','dosya',1); ekMenu('g8alt','g8','Diploma İşlemleri','imza',0);
  const ata=(a,g,m,s,zor)=>{const y=n.ogeYerlesimi[a]||{};if(zor||!y.altMenuAnahtar)n.ogeYerlesimi[a]=Object.assign({},y,{grup:g,altGrupMu:true,altMenuAnahtar:m,sira:Number.isFinite(y.sira)?y.sira:s});};
  ['g7alt_maarifRapor','g7alt_belirliGunler','g7alt_sok','g7alt_zumre','g7alt_sosyalKulupler','g7alt_rehberlik','g7alt_bepPlani','g7alt_digerEvrak'].forEach((a,i)=>ata(a,'g7','g7alt',i,false));
  ['g8alt_diplomaKayit','g8alt_diplomaCevap'].forEach((a,i)=>ata(a,'g8','g8alt',i,false));
  [PDF_RESIM,PDF_BIR].forEach((a,i)=>ata(a,'g7',PDF_MENU,100+i,true)); return n;
}
function veri(){return hazir(typeof _navDuzeniVerisiGetir==='function'?_navDuzeniVerisiGetir():{});}
function menuKey(o,g,n){const y=(n.ogeYerlesimi||{})[o.anahtar]||{};if(y.altMenuAnahtar)return y.altMenuAnahtar;if(o.anahtar?.startsWith('g7alt_'))return'g7alt';if(o.anahtar?.startsWith('g8alt_'))return'g8alt';return g.altGrup?.anahtar||'';}
function ok(acik){return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="'+(acik?'m6 9 6 6 6-6':'m9 6 6 6-6 6')+'"/></svg>';}
function ciz(){
  if(kilit)return;const gov=document.getElementById('anListeGovde'),bas=document.getElementById('anListeBaslikMetin');if(!gov||!bas)return;
  const gs=typeof _navDuzeniTumGruplarGetir==='function'?_navDuzeniTumGruplarGetir():[],g=gs.find(x=>x.ad===bas.textContent);if(!g?.altGrup)return;
  const eski=gov.querySelector('.an-alt-grup-listesi'),etiket=gov.querySelector('.an-alt-grup-baslik');if(!eski)return;
  const btn=Array.from(eski.querySelectorAll('.an-liste-ogesi')),og=(g.altGrup.ogeler||[]).filter(o=>!o._gizliMi);if(!btn.length)return;
  kilit=true;const n=veri(),ms=n.altMenuler.filter(m=>m.grup===g.anahtar&&!m.gizli).sort((a,b)=>(a.sira||0)-(b.sira||0)),frag=document.createDocumentFragment();
  ms.forEach(m=>{const bs=[];og.forEach((o,i)=>{if(menuKey(o,g,n)===m.anahtar&&btn[i])bs.push(btn[i]);});if(!bs.length)return;const k=g.anahtar+'|'+m.anahtar,ac=ACIK.has(k),box=document.createElement('div'),h=document.createElement('button'),ic=document.createElement('div');box.className='an-akordeon';box.style.cssText='margin:8px 0;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg-card);';h.type='button';h.className='an-akordeon-baslik';h.setAttribute('aria-expanded',ac?'true':'false');h.style.cssText='width:100%;display:flex;align-items:center;gap:9px;padding:11px 13px;border:0;background:var(--nm-bg);color:var(--ink);font-weight:800;text-align:left;cursor:pointer;';h.innerHTML='<span style="flex:1"></span><span class="an-akordeon-ok">'+ok(ac)+'</span>';h.firstChild.textContent=m.ad;ic.className='an-akordeon-icerik';ic.style.display=ac?'block':'none';bs.forEach(b=>ic.appendChild(b));h.onclick=()=>{const a=ic.style.display==='none';ic.style.display=a?'block':'none';h.setAttribute('aria-expanded',a?'true':'false');h.querySelector('.an-akordeon-ok').innerHTML=ok(a);a?ACIK.add(k):ACIK.delete(k);};box.append(h,ic);frag.appendChild(box);});
  const kalan=btn.filter(b=>b.parentNode===eski);if(kalan.length){const box=document.createElement('div'),h=document.createElement('button'),ic=document.createElement('div');box.className='an-akordeon';h.type='button';h.textContent='Diğer';h.style.cssText='width:100%;padding:11px 13px;border:0;text-align:left;font-weight:800;background:var(--nm-bg);color:var(--ink);';kalan.forEach(b=>ic.appendChild(b));h.onclick=()=>ic.hidden=!ic.hidden;box.append(h,ic);frag.appendChild(box);}
  etiket?.remove();eski.replaceWith(frag);kilit=false;
}
function obsKur(){const g=document.getElementById('anListeGovde');if(!g||obs)return;obs=new MutationObserver(()=>setTimeout(ciz,0));obs.observe(g,{childList:true});setTimeout(ciz,0);}
function mini(t){const b=document.createElement('button');b.type='button';b.className='btn btn-ghost btn-sm';b.textContent=t;b.style.cssText='font-size:11px;padding:4px 7px;';return b;}
function menuList(grup){const k=document.getElementById('ndAltMenuListe');if(!k)return;const n=veri(),ms=n.altMenuler.filter(m=>m.grup===grup).sort((a,b)=>(a.sira||0)-(b.sira||0));k.innerHTML='';ms.forEach((m,i)=>{const r=document.createElement('div');r.style.cssText='display:flex;align-items:center;gap:5px;padding:6px 0;border-top:1px solid var(--border);';const ad=document.createElement('span');ad.style.cssText='flex:1;font-size:12.5px;font-weight:700;';ad.textContent=m.ad;const up=mini('⬆'),dn=mini('⬇'),ed=mini('✏️'),del=mini('🗑');up.disabled=i===0;dn.disabled=i===ms.length-1;up.onclick=()=>menuTasi(grup,m,-1);dn.onclick=()=>menuTasi(grup,m,1);ed.onclick=()=>menuDuzenle(grup,m);del.onclick=()=>menuSil(grup,m);r.append(ad,up,dn,ed,del);k.appendChild(r);});}
function kaydet(n,msg,cb){if(typeof _ndKaydetSessiz==='function')_ndKaydetSessiz(n,()=>{if(msg&&typeof toast==='function')toast(msg);cb?.();});else if(typeof _ndKaydet==='function')_ndKaydet(n,msg);}
function menuEkle(g){const ad=prompt('Alt menü adı:');if(!ad?.trim())return;const n=veri();n.altMenuler.push({anahtar:'alt_'+Date.now().toString(36),grup:g,ad:ad.trim(),ikon:'pano',sira:n.altMenuler.filter(x=>x.grup===g).length});kaydet(n,'Alt menü eklendi.',()=>menuList(g));}
function menuDuzenle(g,m){const ad=prompt('Alt menü adı:',m.ad);if(!ad?.trim())return;const n=veri(),x=n.altMenuler.find(a=>a.anahtar===m.anahtar);if(x)x.ad=ad.trim();kaydet(n,'Alt menü güncellendi.',()=>menuList(g));}
function menuSil(g,m){if(!confirm('“'+m.ad+'” alt menüsü silinsin mi? İçindeki öğeler alt bölümde kalır.'))return;const n=veri();n.altMenuler=n.altMenuler.filter(x=>x.anahtar!==m.anahtar);Object.values(n.ogeYerlesimi||{}).forEach(y=>{if(y.altMenuAnahtar===m.anahtar)delete y.altMenuAnahtar;});kaydet(n,'Alt menü silindi.',()=>menuList(g));}
function menuTasi(g,m,yon){const n=veri(),ms=n.altMenuler.filter(x=>x.grup===g).sort((a,b)=>(a.sira||0)-(b.sira||0)),i=ms.findIndex(x=>x.anahtar===m.anahtar),j=i+yon;if(j<0||j>=ms.length)return;[ms[i],ms[j]]=[ms[j],ms[i]];ms.forEach((x,z)=>{const a=n.altMenuler.find(q=>q.anahtar===x.anahtar);if(a)a.sira=z;});kaydet(n,null,()=>menuList(g));}
function seciciler(g){const kap=document.getElementById('ndOgeAltListe');if(!kap)return;const grup=(typeof _ndTumListeyiGetir==='function'?_ndTumListeyiGetir():[]).find(x=>x.anahtar===g);if(!grup?.altGrup)return;const n=veri(),ms=n.altMenuler.filter(m=>m.grup===g&&!m.gizli).sort((a,b)=>(a.sira||0)-(b.sira||0)),rows=Array.from(kap.children).filter(x=>x.tagName==='DIV');(grup.altGrup.ogeler||[]).forEach((o,i)=>{const r=rows[i];if(!r||r.querySelector('.nd-altmenu-sec'))return;const s=document.createElement('select');s.className='nd-altmenu-sec';s.style.cssText='font-size:11px;max-width:125px;';s.appendChild(new Option('Alt menü…',''));ms.forEach(m=>s.appendChild(new Option(m.ad,m.anahtar)));s.value=menuKey(o,grup,n);s.onchange=()=>{const x=veri(),y=x.ogeYerlesimi[o.anahtar]||{};x.ogeYerlesimi[o.anahtar]=Object.assign({},y,{grup:g,altGrupMu:true,sira:Number.isFinite(y.sira)?y.sira:i});if(s.value)x.ogeYerlesimi[o.anahtar].altMenuAnahtar=s.value;else delete x.ogeYerlesimi[o.anahtar].altMenuAnahtar;kaydet(x,'Öğe alt menüye taşındı.',()=>setTimeout(()=>seciciler(g),0));};r.appendChild(s);});}
function editorAlan(g){const hedef=document.getElementById('ndYeniOgeEkleBtn');if(!hedef||document.getElementById('ndAltMenuYonetim')){seciciler(g);return;}const a=document.createElement('div');a.id='ndAltMenuYonetim';a.style.cssText='margin:12px 0;padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--nm-bg);';a.innerHTML='<div style="display:flex;align-items:center;gap:8px"><strong style="flex:1">Akordeon Alt Menüler</strong><button type="button" class="btn btn-amber btn-sm" id="ndAltMenuEkle">➕ Alt Menü Ekle</button></div><div id="ndAltMenuListe" style="margin-top:8px"></div>';hedef.parentNode.insertBefore(a,hedef);document.getElementById('ndAltMenuEkle').onclick=()=>menuEkle(g);menuList(g);seciciler(g);}
function editorSar(){if(edSar||typeof _ndVerisiOku!=='function'||typeof _ndOgeleriYonetAc!=='function'||typeof _ndOgeAltListeCiz!=='function')return false;const oku=_ndVerisiOku;window._ndVerisiOku=()=>hazir(oku());const yonet=_ndOgeleriYonetAc;window._ndOgeleriYonetAc=function(g){yonet(g);setTimeout(()=>editorAlan(g),0);};const lc=_ndOgeAltListeCiz;window._ndOgeAltListeCiz=function(g,b){const r=lc.apply(this,arguments);if(b==='alt')setTimeout(()=>seciciler(g),0);return r;};edSar=true;return true;}
function kur(){if(!navSar&&typeof _navDuzeniYerelUygula==='function'){const f=_navDuzeniYerelUygula;window._navDuzeniYerelUygula=(v,c)=>f(hazir(v),c);navSar=true;window._navDuzeniYerelUygula(typeof _navDuzeniVerisiGetir==='function'?_navDuzeniVerisiGetir():{},false);}editorSar();obsKur();return navSar&&edSar;}
let n=0,t=setInterval(()=>{if(kur()||++n>100)clearInterval(t);},100);document.addEventListener('DOMContentLoaded',()=>setTimeout(kur,0));window.NavAkordeon={kur,varsayilanlariUygula:hazir};
})();

/* XLSM görüntüleme desteğini mevcut DokumanOkuyucu hazır olduktan sonra yükle. */
(function xlsmDesteginiYukle(){
  if(document.querySelector('script[data-xlsm-viewer]'))return;
  const s=document.createElement('script');
  s.src='js/xlsm-viewer-support.js';
  s.async=false;
  s.dataset.xlsmViewer='1';
  document.head.appendChild(s);
})();
