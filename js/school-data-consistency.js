/* ====================================================================
   Koruk Asistan — Okul Veri Tutarlılığı v6 / performans
   - Yerel türetilmiş görünüm korunur.
   - Açılışta 30 saniyelik polling ve otomatik üç-koleksiyon Firestore taraması kaldırıldı.
   - Kalıcı Firestore denetimi yalnız manuel çağrıda veya ilgili veri değişikliği sonrasında çalışır.
   ==================================================================== */
(function(){
'use strict';
if(window.__KORUK_SCHOOL_DATA_CONSISTENCY__) return;
window.__KORUK_SCHOOL_DATA_CONSISTENCY__ = true;

function gv(n){ try{return eval(`typeof ${n}!=='undefined'?${n}:null`)}catch(_){return null} }
function arr(n){ const v=gv(n); return Array.isArray(v)?v:[]; }
function norm(v){return String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').trim()}
function cinsiyet(v){const n=norm(v);if(/^(k|kiz|kadin|bayan|female)$/.test(n)||n.includes('kiz')||n.includes('kadin'))return'k';if(/^(e|erkek|bay|male)$/.test(n)||n.includes('erkek'))return'e';return''}
function sinifAdiEsit(a,b){return String(a||'').localeCompare(String(b||''),'tr',{sensitivity:'base'})===0}
function ogrenciSinifaAitMi(v,s){if(!v||!s)return false;if(v.sinifId&&v.sinifId===s.id)return true;const ad=v.sinif||v.sinifAdi||v.sube||'';return!!ad&&sinifAdiEsit(ad,s.ad)}
function sinifOgrencileri(s){return arr('veliler').filter(v=>ogrenciSinifaAitMi(v,s))}
function sinifOzet(s){
  const liste=sinifOgrencileri(s);
  if(!liste.length){const kiz=Number(s?.kizSayisi||0),erkek=Number(s?.erkekSayisi||0);return{gercekKayit:false,toplam:Number(s?.ogrenciSayisi||kiz+erkek||0),kiz,erkek}}
  let kiz=0,erkek=0;liste.forEach(v=>{const c=cinsiyet(v?.cinsiyet??v?.cinsiyeti??v?.cins??v?.gender);if(c==='k')kiz++;else if(c==='e')erkek++});
  return{gercekKayit:true,toplam:liste.length,kiz,erkek};
}
function ogretmeninSiniflari(id){return arr('siniflar').filter(s=>s&&s.sinifOgretmeniId===id).sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr'))}
function ogretmeninSinifMetni(id){return ogretmeninSiniflari(id).map(s=>s.ad).filter(Boolean).join(', ')}

let sonImza='';
function veriImzasi(){
  const s=arr('siniflar').map(x=>{const o=sinifOzet(x);return`${x.id}:${x.sinifOgretmeniId||''}:${o.toplam}:${o.kiz}:${o.erkek}`}).sort().join('|');
  const o=arr('ogretmenler').map(x=>`${x.id}:${ogretmeninSinifMetni(x.id)}`).sort().join('|');
  return s+'#'+o;
}
function turetilenVerileriUygula(){
  arr('siniflar').forEach(s=>{const o=sinifOzet(s);if(o.gercekKayit){s.ogrenciSayisi=o.toplam;s.kizSayisi=o.kiz;s.erkekSayisi=o.erkek}});
  arr('ogretmenler').forEach(o=>{o.sorumluSinif=ogretmeninSinifMetni(o.id)||''});
  const imza=veriImzasi();if(imza!==sonImza){sonImza=imza;try{window.dispatchEvent(new CustomEvent('koruk:data-consistency'))}catch(_){}}
}
window.korukSinifOzet=sinifOzet;
window.korukOgretmeninSiniflari=ogretmeninSiniflari;
window.korukVeriTutarliliginiUygula=turetilenVerileriUygula;

let fsCalisiyor=false,fsTimer=null;
function firestoreHazirMi(){
  if(!gv('db')||!gv('COL'))return false;
  try{if(typeof firebase==='undefined'||!firebase.auth().currentUser)return false}catch(_){return false}
  if(typeof duzenleyebilir!=='function')return false;
  return!!(duzenleyebilir('siniflar')&&duzenleyebilir('ogretmenler'));
}
function fsOgrenciSinifId(v,siniflar){
  if(v.sinifId&&siniflar.some(s=>s.id===v.sinifId))return v.sinifId;
  const ad=v.sinif||v.sinifAdi||v.sube||'';if(!ad)return'';
  return(siniflar.find(s=>sinifAdiEsit(s.ad,ad))||{}).id||'';
}
async function firestoreEsitle(neden){
  if(fsCalisiyor||!firestoreHazirMi())return false;fsCalisiyor=true;
  try{
    const dbx=gv('db'),col=gv('COL');
    const [ss,vs,os]=await Promise.all([dbx.collection(col.siniflar).get(),dbx.collection(col.veliler).get(),dbx.collection(col.ogretmenler).get()]);
    const siniflar=ss.docs.map(d=>({id:d.id,...d.data()})),ogrenciler=vs.docs.map(d=>({id:d.id,...d.data()})),ogretmenler=os.docs.map(d=>({id:d.id,...d.data()}));
    const sayac=new Map(siniflar.map(s=>[s.id,{toplam:0,kiz:0,erkek:0}]));
    ogrenciler.forEach(v=>{const sid=fsOgrenciSinifId(v,siniflar);if(!sid||!sayac.has(sid))return;const x=sayac.get(sid);x.toplam++;const c=cinsiyet(v.cinsiyet??v.cinsiyeti??v.cins??v.gender);if(c==='k')x.kiz++;else if(c==='e')x.erkek++});
    const ogretmenSiniflari=new Map();
    siniflar.forEach(s=>{if(!s.sinifOgretmeniId)return;if(!ogretmenSiniflari.has(s.sinifOgretmeniId))ogretmenSiniflari.set(s.sinifOgretmeniId,[]);ogretmenSiniflari.get(s.sinifOgretmeniId).push(s.ad||'')});
    ogretmenSiniflari.forEach(l=>l.sort((a,b)=>a.localeCompare(b,'tr')));
    const yazilar=[];let sinifFark=0,ogretmenFark=0;
    siniflar.forEach(s=>{const x=sayac.get(s.id)||{toplam:0,kiz:0,erkek:0};if(Number(s.ogrenciSayisi||0)!==x.toplam||Number(s.kizSayisi||0)!==x.kiz||Number(s.erkekSayisi||0)!==x.erkek){sinifFark++;yazilar.push({ref:dbx.collection(col.siniflar).doc(s.id),data:{ogrenciSayisi:x.toplam,kizSayisi:x.kiz,erkekSayisi:x.erkek}})}});
    ogretmenler.forEach(o=>{const metin=(ogretmenSiniflari.get(o.id)||[]).filter(Boolean).join(', ');if(String(o.sorumluSinif||'')!==metin){ogretmenFark++;yazilar.push({ref:dbx.collection(col.ogretmenler).doc(o.id),data:{sorumluSinif:metin}})}});
    for(let i=0;i<yazilar.length;i+=400){const batch=dbx.batch();yazilar.slice(i,i+400).forEach(w=>batch.set(w.ref,w.data,{merge:true}));await batch.commit()}
    window.__korukSonFirestoreDenetimi={tarih:new Date().toISOString(),neden:neden||'manuel',sinifSayisi:siniflar.length,ogrenciSayisi:ogrenciler.length,ogretmenSayisi:ogretmenler.length,sinifDuzeltme:sinifFark,ogretmenDuzeltme:ogretmenFark};
    console.info('[Koruk] Firestore veri denetimi tamamlandı:',window.__korukSonFirestoreDenetimi);return true;
  }catch(err){
    window.__korukSonFirestoreDenetimi={tarih:new Date().toISOString(),neden:neden||'manuel',hata:err?.message||String(err)};
    console.warn('[Koruk] Firestore veri denetimi yapılamadı:',err);return false;
  }finally{fsCalisiyor=false}
}
function firestoreEsitleZamanla(neden,bekleme){clearTimeout(fsTimer);fsTimer=setTimeout(()=>firestoreEsitle(neden),bekleme==null?1200:bekleme)}
window.korukFirestoreVeriEsitle=()=>firestoreEsitle('manuel');

let renderTazeleniyor=false;
function ogretmenBasliginiDuzelt(){const tbody=document.getElementById('ogretmenlerTablo'),ths=tbody?.closest('table')?.querySelectorAll('thead th');if(ths&&ths.length>=7)ths[6].textContent='Sınıf Öğretmenliği'}
function ogretmenTablosunuTazele(){if(renderTazeleniyor)return;const fn=window.renderOgretmenler;if(typeof fn!=='function'||!document.getElementById('ogretmenlerTablo'))return;renderTazeleniyor=true;try{fn();ogretmenBasliginiDuzelt()}catch(_){}finally{renderTazeleniyor=false}}
function sinifTablosunuTazele(){if(renderTazeleniyor)return;const fn=window.renderSiniflar;if(typeof fn!=='function'||!document.getElementById('siniflarTablo'))return;renderTazeleniyor=true;try{fn()}catch(_){}finally{renderTazeleniyor=false}}
function dashboardTazele(){const fn=window.renderDashboard;if(typeof fn==='function')try{fn()}catch(_){} }
function fonksiyonSar(ad,once,sonra){
  const fn=window[ad];if(typeof fn!=='function'||fn.__korukTutarlilik)return false;
  const sarilan=function(){if(once)try{once.apply(this,arguments)}catch(_){}const r=fn.apply(this,arguments);if(sonra)try{sonra.apply(this,arguments)}catch(_){}return r};
  sarilan.__korukTutarlilik=true;window[ad]=sarilan;return true;
}
function servisMetoduSar(ad){
  const svc=gv('SiniflarService');if(!svc||typeof svc[ad]!=='function'||svc[ad].__korukFsSync)return false;
  const eski=svc[ad];svc[ad]=function(){const r=eski.apply(this,arguments);if(r&&typeof r.then==='function')r.then(()=>firestoreEsitleZamanla(ad,1400)).catch(()=>{});return r};svc[ad].__korukFsSync=true;return true;
}
function ogretmenModaliniDuzelt(id){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const sel=document.getElementById('f_sorumluSinif');if(!sel)return;
    const s=id?ogretmeninSiniflari(id):[];sel.value=s.length?(s[0].ad||''):'';sel.disabled=true;
    const grup=sel.closest('.form-group'),label=grup?.querySelector('label');if(label)label.textContent='Sınıf Öğretmenliği';
    if(grup&&!grup.querySelector('.koruk-sinif-kaynak-notu')){const n=document.createElement('div');n.className='koruk-sinif-kaynak-notu';n.style.cssText='margin-top:6px;font-size:11px;color:var(--ui-muted,var(--ink-muted));line-height:1.35;';n.textContent=s.length>1?`Sınıflar sayfasından yönetilir: ${s.map(x=>x.ad).join(', ')}`:'Sınıf öğretmeni ataması Sınıflar sayfasındaki sınıf kaydından yönetilir.';grup.appendChild(n)}
  }));
}
function sinifModaliniDuzelt(id){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(!id)return;const s=arr('siniflar').find(x=>x.id===id);if(!s)return;const o=sinifOzet(s);if(!o.gercekKayit)return;
    const kiz=document.getElementById('f_sKiz'),erkek=document.getElementById('f_sErkek');if(kiz){kiz.value=o.kiz;kiz.disabled=true}if(erkek){erkek.value=o.erkek;erkek.disabled=true}
    [kiz,erkek].forEach(el=>{const l=el?.closest('.form-group')?.querySelector('label');if(l&&!l.dataset.korukSayac){l.dataset.korukSayac='1';l.textContent+=' · otomatik'}});
    const form=erkek?.closest('.form-row');if(form&&!form.nextElementSibling?.classList?.contains('koruk-ogrenci-sayac-notu')){const n=document.createElement('div');n.className='koruk-ogrenci-sayac-notu';n.style.cssText='margin:-4px 0 12px;font-size:11px;color:var(--ui-muted,var(--ink-muted));';n.textContent=`${o.toplam} öğrenci kaydından otomatik hesaplandı.`;form.insertAdjacentElement('afterend',n)}
  }));
}
let dashboardYenileniyor=false;
window.addEventListener('koruk:data-consistency',()=>requestAnimationFrame(()=>{ogretmenBasliginiDuzelt();dashboardTazele();if(dashboardYenileniyor)return;const o=document.querySelector('#tab-panel.kh-home .kh-teacher-school-summary');if(!o)return;dashboardYenileniyor=true;o.remove();setTimeout(()=>dashboardYenileniyor=false,80)}));
function kur(){
  fonksiyonSar('renderSiniflar',turetilenVerileriUygula,()=>requestAnimationFrame(ogretmenTablosunuTazele));
  fonksiyonSar('renderOgretmenler',turetilenVerileriUygula,()=>requestAnimationFrame(ogretmenBasliginiDuzelt));
  fonksiyonSar('renderDashboard',turetilenVerileriUygula,null);
  fonksiyonSar('renderOgrenciler',turetilenVerileriUygula,()=>requestAnimationFrame(()=>{sinifTablosunuTazele();ogretmenTablosunuTazele();dashboardTazele()}));
  fonksiyonSar('ogretmenDetayAc',turetilenVerileriUygula,null);
  fonksiyonSar('ogretmenModalAc',turetilenVerileriUygula,function(id){ogretmenModaliniDuzelt(id)});
  fonksiyonSar('sinifModalAc',turetilenVerileriUygula,function(id){sinifModaliniDuzelt(id)});
  ['sinifKaydet','sinifSil','veliKaydet','veliSil','ogrenciVeliListesiIceAktar','sinifListesiIceAktar','eOkulPlanlariniUygula'].forEach(servisMetoduSar);
}
let planli=false;
function yerelPlanla(){
  if(planli)return;planli=true;
  requestAnimationFrame(()=>{planli=false;kur();turetilenVerileriUygula()});
}
kur();yerelPlanla();
document.addEventListener('DOMContentLoaded',yerelPlanla,{once:true});
window.addEventListener('koruk:data-updated',yerelPlanla,{passive:true});
[500,1800].forEach(ms=>setTimeout(()=>{kur();yerelPlanla()},ms));
})();
