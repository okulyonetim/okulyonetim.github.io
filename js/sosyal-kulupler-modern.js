/* Koruk Asistan — Sosyal Kulüpler modern görünüm katmanı
 * Veri modeli / Firestore akışı değişmez. Mevcut _renderSosyalKulupler()
 * fonksiyonunu yalnızca UI tarafında genişletir.
 */
(function(){
'use strict';
if(window.__KH_SOSYAL_KULUP_MODERN__) return;
window.__KH_SOSYAL_KULUP_MODERN__=true;

let filtre='tumu';
let arama='';
let kuruldu=false;

const esc=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const trTarih=iso=>{
  if(!iso) return 'Belirlenmedi';
  const p=String(iso).split('-');
  return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:String(iso);
};
const ikon={
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  classes:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 10 9-5 9 5-9 5-9-5Z"/><path d="m7 12.5 5 2.8 5-2.8V17l-5 3-5-3v-4.5Z"/></svg>'
};

function kayitlar(){
  return (window.cizelgeVerileri&&Array.isArray(window.cizelgeVerileri.sosyalKulupler))
    ? window.cizelgeVerileri.sosyalKulupler
    : (typeof cizelgeVerileri!=='undefined'&&Array.isArray(cizelgeVerileri.sosyalKulupler)?cizelgeVerileri.sosyalKulupler:[]);
}
function ogrenciler(){ return typeof veliler!=='undefined'&&Array.isArray(veliler)?veliler:[]; }
function ogretmenAdi(id){ return typeof _ogretmenAdi==='function'?_ogretmenAdi(id):'—'; }
function sinifAdi(id){ return typeof _sinifAdi==='function'?_sinifAdi(id):'—'; }
function bagliOgretmen(){ try{return typeof bagliOgretmenimGetir==='function'?bagliOgretmenimGetir():null}catch(_){return null} }
function ogrenciEkleYetkisi(k){
  const ben=bagliOgretmen();
  return (typeof duzenleyebilir==='function'&&(duzenleyebilir('siniflar')||duzenleyebilir('ogrenciler')))
    ||(ben&&Array.isArray(k.ogretmenIdler)&&k.ogretmenIdler.includes(ben.id));
}
function kontrolDizisi(k){const a=[...(k.kontroller||[])];while(a.length<12)a.push(false);return a.slice(0,12)}
function durum(k){const t=kontrolDizisi(k).filter(Boolean).length;return t===12?'tamam':t>0?'eksik':'bos'}
function eslesir(k){
  const q=arama.trim().toLocaleLowerCase('tr');
  if(q){
    const metin=[k.ad,(k.ogretmenIdler||[]).map(ogretmenAdi).join(' '),(k.sinifIdler||[]).map(sinifAdi).join(' ')].join(' ').toLocaleLowerCase('tr');
    if(!metin.includes(q)) return false;
  }
  if(filtre==='aktif'&&k.aktif===false)return false;
  if(filtre==='pasif'&&k.aktif!==false)return false;
  if(filtre==='tamam'&&durum(k)!=='tamam')return false;
  if(filtre==='eksik'&&durum(k)==='tamam')return false;
  return true;
}
function ozet(veri){
  const aktif=veri.filter(k=>k.aktif!==false).length;
  const ogrTop=ogrenciler().filter(v=>v.kulupId).length;
  const toplamKontrol=veri.length*12;
  const tamam=veri.reduce((s,k)=>s+kontrolDizisi(k).filter(Boolean).length,0);
  const oran=toplamKontrol?Math.round(tamam/toplamKontrol*100):0;
  return `<div class="sk-summary">
    <div class="sk-stat sk-stat-primary"><b>${veri.length}</b><span>Toplam kulüp</span></div>
    <div class="sk-stat"><b>${aktif}</b><span>Aktif kulüp</span></div>
    <div class="sk-stat"><b>${ogrTop}</b><span>Kulüplü öğrenci</span></div>
    <div class="sk-stat"><b>%${oran}</b><span>Evrak tamamlanma</span></div>
  </div>`;
}
function aracCubugu(){
  const sayilar={tumu:kayitlar().length,aktif:kayitlar().filter(k=>k.aktif!==false).length,eksik:kayitlar().filter(k=>durum(k)!=='tamam').length,tamam:kayitlar().filter(k=>durum(k)==='tamam').length};
  return `<div class="sk-toolbar">
    <label class="sk-search">${ikon.search}<input id="skKulupAra" type="search" autocomplete="off" placeholder="Kulüp, öğretmen veya sınıf ara" value="${esc(arama)}" aria-label="Sosyal kulüplerde ara"></label>
    <div class="sk-filters" role="group" aria-label="Kulüp filtreleri">
      ${[['tumu','Tümü',sayilar.tumu],['aktif','Aktif',sayilar.aktif],['eksik','Eksik Evrak',sayilar.eksik],['tamam','Tamamlanan',sayilar.tamam],['pasif','Pasif',kayitlar().filter(k=>k.aktif===false).length]].map(([id,ad,n])=>`<button type="button" class="sk-filter ${filtre===id?'active':''}" data-sk-filter="${id}">${ad} · ${n}</button>`).join('')}
    </div>
  </div>`;
}
function kart(k){
  const k12=kontrolDizisi(k),t=k12.filter(Boolean).length,ogrSay=ogrenciler().filter(v=>v.kulupId===k.id).length,oran=Math.round(t/12*100);
  const ogrler=Array.isArray(k.ogretmenIdler)?k.ogretmenIdler:[];
  const siniflar=Array.isArray(k.sinifIdler)?k.sinifIdler:[];
  return `<article class="kulup-kart ${k.aktif===false?'kulup-pasif':''}" id="belge-${k.id}" data-sk-durum="${durum(k)}">
    <div class="kulup-kart-baslik"><span>${esc(k.ad||'Adsız Kulüp')}</span>${k.aktif===false?'<span class="badge badge-gray">Pasif</span>':'<span class="badge badge-sage">Aktif</span>'}</div>
    <div class="kulup-ogretmenler">${ogrler.length?ogrler.map(id=>`<span class="ogr-badge">${esc(ogretmenAdi(id))}</span>`).join(''):'<span style="color:var(--ink-muted);font-size:12px;">Danışman öğretmen atanmadı</span>'}</div>
    <div class="sk-meta">
      <span class="sk-meta-item">${ikon.users}<span>${ogrSay} öğrenci</span></span>
      <span class="sk-meta-item">${ikon.classes}<span>${siniflar.length?siniflar.map(sinifAdi).join(', '):'Tüm sınıflar'}</span></span>
    </div>
    <div class="sk-deadlines">
      <div class="sk-deadline"><span>Yıllık Plan</span><b>${esc(trTarih(k.yillikPlanTarihi))}</b></div>
      <div class="sk-deadline"><span>Toplum Hizmeti</span><b>${esc(trTarih(k.toplumHizmetiTarihi))}</b></div>
    </div>
    <div class="sk-progress-row"><div class="sk-progress" aria-label="Evrak tamamlanma oranı"><i style="width:${oran}%"></i></div><span class="belge-mini-sayac ${t===12?'tamam':t>0?'kismi':''}">${t}/12</span></div>
    <div class="sk-actions">
      ${ogrenciEkleYetkisi(k)?`<button class="btn btn-sm sk-main-action" onclick="kulupOgrenciEkleAc('${k.id}')">Öğrenci Ekle</button>`:''}
      <button class="btn btn-ghost btn-sm" onclick="kulupOgrenciListesiYazdir('${k.id}')">Öğrenciler (${ogrSay})</button>
      <button class="btn btn-ghost btn-sm" onclick="sosyalKulupModalAc('${k.id}')">Düzenle</button>
    </div>
    <div class="belge-kontroller">${KULUP_KONTROLLER.map((ad,i)=>`<label class="belge-kontrol-item ${k12[i]?'tamamlandi':''}"><input type="checkbox" ${k12[i]?'checked':''} onchange="belgeKontrolToggle('sosyalKulupler','${k.id}',${i},this.checked)"><span>${esc(ad)}</span></label>`).join('')}</div>
  </article>`;
}
function render(el,veri){
  const liste=veri.filter(eslesir);
  el.innerHTML=`<div class="sk-modern-shell">${ozet(veri)}${aracCubugu()}${liste.length?`<div class="kulup-grid">${liste.map(kart).join('')}</div>`:`<div class="sk-empty"><b>Eşleşen kulüp bulunamadı</b><span>Arama veya filtre seçimini değiştirin.</span></div>`}</div>`;
  bagla(el);
}
function bagla(root){
  const ar=root.querySelector('#skKulupAra');
  if(ar) ar.addEventListener('input',e=>{arama=e.target.value;yenile();const n=document.querySelector('#skKulupAra');if(n){n.focus();try{n.setSelectionRange(n.value.length,n.value.length)}catch(_){}}});
  root.querySelectorAll('[data-sk-filter]').forEach(b=>b.addEventListener('click',()=>{filtre=b.dataset.skFilter||'tumu';yenile()}));
}
function yenile(){
  const el=document.getElementById('sosyalKuluplerTablo');if(!el)return;
  render(el,kayitlar());
}
function kur(){
  if(kuruldu)return true;
  if(typeof window._renderSosyalKulupler!=='function'&&typeof _renderSosyalKulupler!=='function')return false;
  window._renderSosyalKulupler=function(el,veri){render(el,Array.isArray(veri)?veri:[])};
  kuruldu=true;
  const panel=document.getElementById('tab-sosyalKulupler');
  if(panel){
    panel.classList.add('sk-modern');
    const title=panel.querySelector('.page-title');if(title)title.textContent='Sosyal Kulüpler';
    const sub=panel.querySelector('.page-sub');if(sub)sub.textContent='Kulüp danışmanları, öğrenciler ve teslim edilmesi gereken evraklar';
  }
  yenile();
  return true;
}

if(!kur()){
  let deneme=0;const t=setInterval(()=>{deneme++;if(kur()||deneme>80)clearInterval(t)},100);
}
})();
