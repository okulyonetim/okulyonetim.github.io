/* ====================================================================
   Koruk Asistan — Okul Veri Tutarlılığı v4
   - Sınıf öğretmenliği için tek kaynak: siniflar[].sinifOgretmeniId
   - Öğrenci sayaçları için tek kaynak: varsa veliler/öğrenci kayıtları
   - Eski ogretmen.sorumluSinif ve sınıf sayaçları yalnız geriye uyumluluk
     amacıyla yerel görünümde türetilir; yeni bir ikinci veri modeli üretmez.
   ==================================================================== */
(function(){
'use strict';
if(window.__KORUK_SCHOOL_DATA_CONSISTENCY__) return;
window.__KORUK_SCHOOL_DATA_CONSISTENCY__ = true;

function gv(n){ try { return eval(`typeof ${n}!=='undefined'?${n}:null`); } catch(_){ return null; } }
function arr(n){ const v=gv(n); return Array.isArray(v)?v:[]; }
function norm(v){
  return String(v||'').toLocaleLowerCase('tr')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g')
    .replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').trim();
}
function cinsiyet(v){
  const n=norm(v);
  if(/^(k|kiz|kadin|bayan|female)$/.test(n)||n.includes('kiz')||n.includes('kadin')) return 'k';
  if(/^(e|erkek|bay|male)$/.test(n)||n.includes('erkek')) return 'e';
  return '';
}
function sinifAdiEsit(a,b){ return String(a||'').localeCompare(String(b||''),'tr',{sensitivity:'base'})===0; }
function ogrenciSinifaAitMi(v,s){
  if(!v||!s) return false;
  if(v.sinifId && v.sinifId===s.id) return true;
  const ad=v.sinif||v.sinifAdi||v.sube||'';
  return !!ad && sinifAdiEsit(ad,s.ad);
}
function sinifOgrencileri(s){ return arr('veliler').filter(v=>ogrenciSinifaAitMi(v,s)); }
function sinifOzet(s){
  const liste=sinifOgrencileri(s);
  if(!liste.length){
    const kiz=Number(s?.kizSayisi||0), erkek=Number(s?.erkekSayisi||0);
    return {gercekKayit:false, toplam:Number(s?.ogrenciSayisi||kiz+erkek||0), kiz, erkek};
  }
  let kiz=0,erkek=0;
  liste.forEach(v=>{ const c=cinsiyet(v?.cinsiyet??v?.cinsiyeti??v?.cins??v?.gender); if(c==='k')kiz++; else if(c==='e')erkek++; });
  return {gercekKayit:true, toplam:liste.length, kiz, erkek};
}
function ogretmeninSiniflari(id){
  return arr('siniflar').filter(s=>s&&s.sinifOgretmeniId===id).sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr'));
}
function ogretmeninSinifMetni(id){ return ogretmeninSiniflari(id).map(s=>s.ad).filter(Boolean).join(', '); }

let sonImza='';
function veriImzasi(){
  const sinifImza=arr('siniflar').map(s=>{ const o=sinifOzet(s); return `${s.id}:${s.sinifOgretmeniId||''}:${o.toplam}:${o.kiz}:${o.erkek}`; }).sort().join('|');
  const ogrImza=arr('ogretmenler').map(o=>`${o.id}:${ogretmeninSinifMetni(o.id)}`).sort().join('|');
  return sinifImza+'#'+ogrImza;
}
function turetilenVerileriUygula(){
  const siniflar=arr('siniflar'), ogretmenler=arr('ogretmenler');
  siniflar.forEach(s=>{
    const o=sinifOzet(s);
    if(o.gercekKayit){
      s.ogrenciSayisi=o.toplam;
      s.kizSayisi=o.kiz;
      s.erkekSayisi=o.erkek;
    }
  });
  ogretmenler.forEach(o=>{
    const metin=ogretmeninSinifMetni(o.id);
    if(metin) o.sorumluSinif=metin;
  });
  const imza=veriImzasi();
  if(imza!==sonImza){
    sonImza=imza;
    try{ window.dispatchEvent(new CustomEvent('koruk:data-consistency')); }catch(_){ }
  }
}
window.korukSinifOzet=sinifOzet;
window.korukOgretmeninSiniflari=ogretmeninSiniflari;
window.korukVeriTutarliliginiUygula=turetilenVerileriUygula;

let renderTazeleniyor=false;
function ogretmenBasliginiDuzelt(){
  const tbody=document.getElementById('ogretmenlerTablo');
  const ths=tbody?.closest('table')?.querySelectorAll('thead th');
  if(ths&&ths.length>=7) ths[6].textContent='Sınıf Öğretmenliği';
}
function ogretmenTablosunuTazele(){
  if(renderTazeleniyor) return;
  const fn=window.renderOgretmenler;
  if(typeof fn!=='function'||!document.getElementById('ogretmenlerTablo')) return;
  renderTazeleniyor=true;
  try{ fn(); ogretmenBasliginiDuzelt(); }catch(_){}finally{ renderTazeleniyor=false; }
}
function sinifTablosunuTazele(){
  if(renderTazeleniyor) return;
  const fn=window.renderSiniflar;
  if(typeof fn!=='function'||!document.getElementById('siniflarTablo')) return;
  renderTazeleniyor=true;
  try{ fn(); }catch(_){}finally{ renderTazeleniyor=false; }
}
function dashboardTazele(){
  const fn=window.renderDashboard;
  if(typeof fn!=='function') return;
  try{ fn(); }catch(_){ }
}

function fonksiyonSar(ad,once,sonra){
  const fn=window[ad];
  if(typeof fn!=='function'||fn.__korukTutarlilik) return false;
  const sarilan=function(){
    if(once) try{ once.apply(this,arguments); }catch(_){ }
    const r=fn.apply(this,arguments);
    if(sonra) try{ sonra.apply(this,arguments); }catch(_){ }
    return r;
  };
  sarilan.__korukTutarlilik=true;
  window[ad]=sarilan;
  return true;
}

function ogretmenModaliniDuzelt(id){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const sel=document.getElementById('f_sorumluSinif');
    if(!sel) return;
    const siniflar=id?ogretmeninSiniflari(id):[];
    const ogretmen=id?arr('ogretmenler').find(o=>o.id===id):null;
    const eski=ogretmen?.sorumluSinif||'';
    if(siniflar.length) sel.value=siniflar[0].ad||'';
    else if(eski) sel.value=eski;
    else sel.value='';
    sel.disabled=true;
    const grup=sel.closest('.form-group');
    const label=grup?.querySelector('label');
    if(label) label.textContent='Sınıf Öğretmenliği';
    if(grup&&!grup.querySelector('.koruk-sinif-kaynak-notu')){
      const not=document.createElement('div');
      not.className='koruk-sinif-kaynak-notu';
      not.style.cssText='margin-top:6px;font-size:11px;color:var(--ui-muted,var(--ink-muted));line-height:1.35;';
      not.textContent=siniflar.length>1
        ? `Sınıflar sayfasından yönetilir: ${siniflar.map(s=>s.ad).join(', ')}`
        : 'Sınıf öğretmeni ataması Sınıflar sayfasındaki sınıf kaydından yönetilir.';
      grup.appendChild(not);
    }
  }));
}
function sinifModaliniDuzelt(id){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(!id) return;
    const s=arr('siniflar').find(x=>x.id===id); if(!s) return;
    const o=sinifOzet(s); if(!o.gercekKayit) return;
    const kiz=document.getElementById('f_sKiz'), erkek=document.getElementById('f_sErkek');
    if(kiz){ kiz.value=o.kiz; kiz.disabled=true; }
    if(erkek){ erkek.value=o.erkek; erkek.disabled=true; }
    [kiz,erkek].forEach(el=>{
      const label=el?.closest('.form-group')?.querySelector('label');
      if(label&&!label.dataset.korukSayac){ label.dataset.korukSayac='1'; label.textContent += ' · otomatik'; }
    });
    const form=erkek?.closest('.form-row');
    if(form&&!form.nextElementSibling?.classList?.contains('koruk-ogrenci-sayac-notu')){
      const not=document.createElement('div');
      not.className='koruk-ogrenci-sayac-notu';
      not.style.cssText='margin:-4px 0 12px;font-size:11px;color:var(--ui-muted,var(--ink-muted));';
      not.textContent=`${o.toplam} öğrenci kaydından otomatik hesaplandı.`;
      form.insertAdjacentElement('afterend',not);
    }
  }));
}

let dashboardYenileniyor=false;
window.addEventListener('koruk:data-consistency',()=>{
  requestAnimationFrame(()=>{
    ogretmenBasliginiDuzelt();
    dashboardTazele();
    if(dashboardYenileniyor) return;
    const ozet=document.querySelector('#tab-panel.kh-home .kh-teacher-school-summary');
    if(!ozet) return;
    dashboardYenileniyor=true;
    ozet.remove();
    setTimeout(()=>{ dashboardYenileniyor=false; },80);
  });
});

function kur(){
  let tamam=0;
  tamam += fonksiyonSar('renderSiniflar',turetilenVerileriUygula,()=>requestAnimationFrame(ogretmenTablosunuTazele))?1:0;
  tamam += fonksiyonSar('renderOgretmenler',turetilenVerileriUygula,()=>requestAnimationFrame(ogretmenBasliginiDuzelt))?1:0;
  tamam += fonksiyonSar('renderDashboard',turetilenVerileriUygula,null)?1:0;
  tamam += fonksiyonSar('renderOgrenciler',turetilenVerileriUygula,()=>requestAnimationFrame(()=>{sinifTablosunuTazele();ogretmenTablosunuTazele();dashboardTazele();}))?1:0;
  tamam += fonksiyonSar('ogretmenDetayAc',turetilenVerileriUygula,null)?1:0;
  tamam += fonksiyonSar('ogretmenModalAc',turetilenVerileriUygula,function(id){ogretmenModaliniDuzelt(id);})?1:0;
  tamam += fonksiyonSar('sinifModalAc',turetilenVerileriUygula,function(id){sinifModaliniDuzelt(id);})?1:0;
  return tamam;
}

let deneme=0;
const timer=setInterval(()=>{
  kur(); turetilenVerileriUygula();
  if(++deneme>80) clearInterval(timer);
},100);
[0,250,800,1800,3500].forEach(ms=>setTimeout(()=>{
  kur();
  turetilenVerileriUygula();
  sinifTablosunuTazele();
  ogretmenTablosunuTazele();
  dashboardTazele();
},ms));
})();
