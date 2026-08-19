/* Navigasyon Düzeni — öğeleri akordeon alt menülere taşıma kontrolleri */
(function(){
'use strict';
let kuruldu=false;
function veri(){return typeof window._ndVerisiOku==='function'?window._ndVerisiOku():{};}
function liste(){return typeof window._ndTumListeyiGetir==='function'?window._ndTumListeyiGetir():[];}
function menuSecicileriEkle(grupAnahtari){
  const kap=document.getElementById('ndOgeAltListe'); if(!kap)return;
  const g=liste().find(x=>x.anahtar===grupAnahtari); if(!g||!g.altGrup)return;
  const nd=veri(), menus=(nd.altMenuler||[]).filter(m=>m.grup===grupAnahtari&&!m.gizli).sort((a,b)=>(a.sira||0)-(b.sira||0));
  const satirlar=Array.from(kap.children).filter(x=>x.tagName==='DIV');
  (g.altGrup.ogeler||[]).forEach((o,i)=>{
    const satir=satirlar[i]; if(!satir||satir.querySelector('.nd-altmenu-sec'))return;
    const sel=document.createElement('select'); sel.className='nd-altmenu-sec'; sel.title='Alt menü'; sel.style.cssText='font-size:11px;max-width:125px;';
    sel.appendChild(new Option('Alt menü…',''));
    menus.forEach(m=>sel.appendChild(new Option(m.ad,m.anahtar)));
    const y=(nd.ogeYerlesimi||{})[o.anahtar]||{};
    if(y.altMenuAnahtar)sel.value=y.altMenuAnahtar;
    else if(o.anahtar.indexOf('g7alt_')===0)sel.value='g7alt';
    else if(o.anahtar.indexOf('g8alt_')===0)sel.value='g8alt';
    sel.onchange=()=>{
      const yeni=veri(); yeni.ogeYerlesimi=yeni.ogeYerlesimi||{};
      const once=yeni.ogeYerlesimi[o.anahtar]||{};
      yeni.ogeYerlesimi[o.anahtar]=Object.assign({},once,{grup:grupAnahtari,altGrupMu:true,sira:Number.isFinite(once.sira)?once.sira:i});
      if(sel.value)yeni.ogeYerlesimi[o.anahtar].altMenuAnahtar=sel.value; else delete yeni.ogeYerlesimi[o.anahtar].altMenuAnahtar;
      if(typeof window._ndKaydetSessiz==='function')window._ndKaydetSessiz(yeni,()=>{if(typeof toast==='function')toast('Öğe alt menüye taşındı.');setTimeout(()=>menuSecicileriEkle(grupAnahtari),0);});
    };
    satir.appendChild(sel);
  });
}
function kur(){
  if(kuruldu||typeof window._ndOgeAltListeCiz!=='function')return false;
  const eski=window._ndOgeAltListeCiz;
  window._ndOgeAltListeCiz=function(grup,bolum){const r=eski.apply(this,arguments);if(bolum==='alt')setTimeout(()=>menuSecicileriEkle(grup),0);return r;};
  kuruldu=true; return true;
}
let n=0;const t=setInterval(()=>{n++;if(kur()||n>100)clearInterval(t);},100);
window.NavAkordeonEditor={kur,menuSecicileriEkle};
})();
