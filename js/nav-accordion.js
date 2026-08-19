/* Koruk Asistan — Navigasyon çoklu akordeon alt menüleri */
(function(){
'use strict';
const PDF_MENU='pdf_islemleri';
const PDF_RESIM='sistem_pdf_resimden';
const PDF_BIRLESTIR='sistem_pdf_birlestir';
const ACIK=new Set();
let sarildi=false, editorSarildi=false, gozlemci=null, cizimKilit=false;

function kopya(v){ try{return JSON.parse(JSON.stringify(v||{}));}catch(_){return Object.assign({},v||{});} }
function anahtarUret(){ return 'alt_'+Date.now().toString(36)+'_'+Math.floor(Math.random()*10000).toString(36); }
function menuVarsayilanlari(nd){
  nd=kopya(nd); nd.ekOgeler=Array.isArray(nd.ekOgeler)?nd.ekOgeler:[]; nd.altMenuler=Array.isArray(nd.altMenuler)?nd.altMenuler:[]; nd.ogeYerlesimi=nd.ogeYerlesimi||{};
  // Eski tek tıklamalı PDF İşlemleri öğesini kaldır; gerçek çocukları alt menüye taşı.
  nd.ekOgeler=nd.ekOgeler.filter(x=>x&&x.anahtar!=='sistem_pdf_islemleri');
  if(!nd.ekOgeler.some(x=>x&&x.anahtar===PDF_RESIM)) nd.ekOgeler.push({anahtar:PDF_RESIM,ad:'Resimden PDF Oluştur',sekmeAd:'@ozellik:pdf_resimden',grup:'g7',altGrupMu:true});
  if(!nd.ekOgeler.some(x=>x&&x.anahtar===PDF_BIRLESTIR)) nd.ekOgeler.push({anahtar:PDF_BIRLESTIR,ad:'PDF Birleştir',sekmeAd:'@ozellik:pdf_birlestir',grup:'g7',altGrupMu:true});
  if(!nd.altMenuler.some(x=>x&&x.anahtar==='g7alt')) nd.altMenuler.push({anahtar:'g7alt',grup:'g7',ad:'Raporlar',ikon:'rapor',sira:0});
  if(!nd.altMenuler.some(x=>x&&x.anahtar===PDF_MENU)) nd.altMenuler.push({anahtar:PDF_MENU,grup:'g7',ad:'PDF İşlemleri',ikon:'dosya',sira:1});
  if(!nd.altMenuler.some(x=>x&&x.anahtar==='g8alt')) nd.altMenuler.push({anahtar:'g8alt',grup:'g8',ad:'Diploma İşlemleri',ikon:'imza',sira:0});
  ['g7alt_maarifRapor','g7alt_belirliGunler','g7alt_sok','g7alt_zumre','g7alt_sosyalKulupler','g7alt_rehberlik','g7alt_bepPlani','g7alt_digerEvrak'].forEach((a,i)=>{
    const y=nd.ogeYerlesimi[a]||{}; if(!y.altMenuAnahtar) nd.ogeYerlesimi[a]=Object.assign({},y,{grup:'g7',altGrupMu:true,altMenuAnahtar:'g7alt',sira:Number.isFinite(y.sira)?y.sira:i});
  });
  ['g8alt_diplomaKayit','g8alt_diplomaCevap'].forEach((a,i)=>{const y=nd.ogeYerlesimi[a]||{};if(!y.altMenuAnahtar)nd.ogeYerlesimi[a]=Object.assign({},y,{grup:'g8',altGrupMu:true,altMenuAnahtar:'g8alt',sira:Number.isFinite(y.sira)?y.sira:i});});
  [PDF_RESIM,PDF_BIRLESTIR].forEach((a,i)=>{const y=nd.ogeYerlesimi[a]||{};nd.ogeYerlesimi[a]=Object.assign({},y,{grup:'g7',altGrupMu:true,altMenuAnahtar:PDF_MENU,sira:Number.isFinite(y.sira)?y.sira:100+i});});
  return nd;
}
function veri(){ const v=typeof window._navDuzeniVerisiGetir==='function'?window._navDuzeniVerisiGetir():{}; return menuVarsayilanlari(v); }
function menuler(grup,g){
  const nd=veri(); let arr=nd.altMenuler.filter(m=>m&&m.grup===grup&&!m.gizli).sort((a,b)=>(a.sira||0)-(b.sira||0));
  if(g&&g.altGrup&&!arr.some(m=>m.anahtar===g.altGrup.anahtar)) arr.unshift({anahtar:g.altGrup.anahtar,grup,ad:g.altGrup.ad,ikon:g.altGrup.ikon,sira:-1});
  return arr;
}
function menuBul(oge,g,nd){
  const y=(nd.ogeYerlesimi||{})[oge.anahtar]||{}; if(y.altMenuAnahtar) return y.altMenuAnahtar;
  if(oge.anahtar&&oge.anahtar.indexOf('g7alt_')===0) return 'g7alt';
  if(oge.anahtar&&oge.anahtar.indexOf('g8alt_')===0) return 'g8alt';
  return g&&g.altGrup?g.altGrup.anahtar:'';
}
function okSvg(acik){return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="'+(acik?'m6 9 6 6 6-6':'m9 6 6 6-6 6')+'"/></svg>';}
function akordeonCiz(){
  if(cizimKilit) return; const govde=document.getElementById('anListeGovde'), bas=document.getElementById('anListeBaslikMetin'); if(!govde||!bas) return;
  const liste=typeof window._navDuzeniTumGruplarGetir==='function'?window._navDuzeniTumGruplarGetir():[]; const g=liste.find(x=>x.ad===bas.textContent); if(!g||!g.altGrup) return;
  const eskiListe=govde.querySelector('.an-alt-grup-listesi'); const eskiBas=govde.querySelector('.an-alt-grup-baslik'); if(!eskiListe||eskiListe.dataset.akordeonIslendi==='1') return;
  const butonlar=Array.from(eskiListe.querySelectorAll('.an-liste-ogesi')); const ogeler=(g.altGrup.ogeler||[]).filter(o=>!o._gizliMi); if(!butonlar.length) return;
  cizimKilit=true; const nd=veri(), ms=menuler(g.anahtar,g), frag=document.createDocumentFragment();
  ms.forEach(m=>{
    const eslesen=[]; ogeler.forEach((o,i)=>{if(menuBul(o,g,nd)===m.anahtar&&butonlar[i])eslesen.push(butonlar[i]);}); if(!eslesen.length)return;
    const acik=ACIK.has(g.anahtar+'|'+m.anahtar); const kutu=document.createElement('div'); kutu.className='an-akordeon'; kutu.style.cssText='margin:8px 0;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg-card);';
    const h=document.createElement('button'); h.type='button'; h.className='an-akordeon-baslik'; h.setAttribute('aria-expanded',acik?'true':'false'); h.style.cssText='width:100%;display:flex;align-items:center;gap:9px;padding:11px 13px;border:0;background:var(--nm-bg);color:var(--ink);font-weight:800;text-align:left;cursor:pointer;'; h.innerHTML='<span style="flex:1">'+String(m.ad||'Alt Menü').replace(/[<>&]/g,s=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[s]))+'</span><span class="an-akordeon-ok">'+okSvg(acik)+'</span>';
    const ic=document.createElement('div'); ic.className='an-akordeon-icerik'; ic.style.display=acik?'block':'none'; eslesen.forEach(b=>ic.appendChild(b));
    h.onclick=()=>{const yeni=ic.style.display==='none';ic.style.display=yeni?'block':'none';h.setAttribute('aria-expanded',yeni?'true':'false');h.querySelector('.an-akordeon-ok').innerHTML=okSvg(yeni);const k=g.anahtar+'|'+m.anahtar;yeni?ACIK.add(k):ACIK.delete(k);};
    kutu.append(h,ic); frag.appendChild(kutu);
  });
  // Atanmamış alt öğeler kaybolmasın.
  const kalan=butonlar.filter(b=>b.parentNode===eskiListe); if(kalan.length){const k=document.createElement('div');k.className='an-akordeon';k.style.cssText='margin:8px 0;border:1px solid var(--border);border-radius:12px;overflow:hidden;';const h=document.createElement('button');h.type='button';h.style.cssText='width:100%;padding:11px 13px;border:0;text-align:left;font-weight:800;background:var(--nm-bg);color:var(--ink);';h.textContent='Diğer';const ic=document.createElement('div');kalan.forEach(b=>ic.appendChild(b));h.onclick=()=>ic.hidden=!ic.hidden;k.append(h,ic);frag.appendChild(k);}
  if(eskiBas)eskiBas.remove(); eskiListe.dataset.akordeonIslendi='1'; eskiListe.replaceWith(frag); cizimKilit=false;
}
function gozlemKur(){const g=document.getElementById('anListeGovde');if(!g||gozlemci)return;gozlemci=new MutationObserver(()=>setTimeout(akordeonCiz,0));gozlemci.observe(g,{childList:true});setTimeout(akordeonCiz,0);}

function editoruSar(){
  if(editorSarildi||typeof window._ndVerisiOku!=='function'||typeof window._ndOgeleriYonetAc!=='function')return false;
  const eskiOku=window._ndVerisiOku; window._ndVerisiOku=function(){return menuVarsayilanlari(eskiOku());};
  const eskiYonet=window._ndOgeleriYonetAc; window._ndOgeleriYonetAc=function(grup){eskiYonet(grup);setTimeout(()=>editorKontrolleriEkle(grup),0);}; editorSarildi=true; return true;
}
function editorKontrolleriEkle(grup){
  const modal=document.getElementById('modalIcerik')||document.getElementById('modalBody')||document.querySelector('#modalOverlay .modal-content'); if(!modal||document.getElementById('ndAltMenuYonetim'))return;
  const alan=document.createElement('div'); alan.id='ndAltMenuYonetim'; alan.style.cssText='margin:12px 0;padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--nm-bg);'; alan.innerHTML='<div style="display:flex;align-items:center;gap:8px"><strong style="flex:1">Akordeon Alt Menüler</strong><button type="button" class="btn btn-amber btn-sm" id="ndAltMenuEkle">➕ Alt Menü Ekle</button></div><div id="ndAltMenuListe" style="margin-top:8px"></div>';
  const hedef=document.getElementById('ndYeniOgeEkleBtn'); hedef?.parentNode?.insertBefore(alan,hedef); document.getElementById('ndAltMenuEkle').onclick=()=>altMenuEkle(grup); altMenuListeCiz(grup);
}
function altMenuListeCiz(grup){const kap=document.getElementById('ndAltMenuListe');if(!kap)return;const nd=veri(), ms=nd.altMenuler.filter(m=>m.grup===grup).sort((a,b)=>(a.sira||0)-(b.sira||0));kap.innerHTML=ms.length?'':'<span style="font-size:12px;color:var(--ink-muted)">Alt menü yok.</span>';ms.forEach((m,i)=>{const r=document.createElement('div');r.style.cssText='display:flex;align-items:center;gap:5px;padding:6px 0;border-top:1px solid var(--border);';r.innerHTML='<span style="flex:1;font-size:12.5px;font-weight:700">'+m.ad+'</span>';const duz=document.createElement('button');duz.className='btn btn-ghost btn-sm';duz.textContent='✏️';duz.onclick=()=>altMenuDuzenle(grup,m);const sil=document.createElement('button');sil.className='btn btn-ghost btn-sm';sil.textContent='🗑';sil.onclick=()=>altMenuSil(grup,m);r.append(duz,sil);kap.appendChild(r);});}
function altMenuEkle(grup){const ad=prompt('Alt menü adı:');if(!ad||!ad.trim())return;const nd=veri();nd.altMenuler.push({anahtar:anahtarUret(),grup,ad:ad.trim(),ikon:'pano',sira:nd.altMenuler.filter(m=>m.grup===grup).length});window._ndKaydet(nd,'Alt menü eklendi.');setTimeout(()=>{editorKontrolleriEkle(grup);altMenuListeCiz(grup);},0);}
function altMenuDuzenle(grup,m){const ad=prompt('Alt menü adı:',m.ad);if(!ad||!ad.trim())return;const nd=veri(),x=nd.altMenuler.find(a=>a.anahtar===m.anahtar);if(x)x.ad=ad.trim();window._ndKaydet(nd,'Alt menü güncellendi.');setTimeout(()=>altMenuListeCiz(grup),0);}
function altMenuSil(grup,m){if(!confirm('“'+m.ad+'” alt menüsü silinsin mi? İçindeki öğeler ana alt bölüme taşınır.'))return;const nd=veri();nd.altMenuler=nd.altMenuler.filter(x=>x.anahtar!==m.anahtar);Object.keys(nd.ogeYerlesimi||{}).forEach(k=>{if(nd.ogeYerlesimi[k].altMenuAnahtar===m.anahtar)delete nd.ogeYerlesimi[k].altMenuAnahtar;});window._ndKaydet(nd,'Alt menü silindi.');setTimeout(()=>altMenuListeCiz(grup),0);}

function kur(){
  if(!sarildi&&typeof window._navDuzeniYerelUygula==='function'){
    const eski=window._navDuzeniYerelUygula; window._navDuzeniYerelUygula=function(v,c){return eski(menuVarsayilanlari(v),c);}; sarildi=true; const v=typeof window._navDuzeniVerisiGetir==='function'?window._navDuzeniVerisiGetir():{}; window._navDuzeniYerelUygula(v,false);
  }
  editoruSar(); gozlemKur();
  return sarildi&&editorSarildi;
}
let n=0;const t=setInterval(()=>{n++;if(kur()||n>100)clearInterval(t);},100);document.addEventListener('DOMContentLoaded',()=>setTimeout(kur,0));
window.NavAkordeon={kur,varsayilanlariUygula:menuVarsayilanlari};
})();
