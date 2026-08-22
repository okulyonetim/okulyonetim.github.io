/* Koruk Asistan — mobil ana sayfa dinamik kart sahibi
 * Duyuru + canlı deneme sayacı tek DOM akışında yönetilir.
 * dashboard-home.js içindeki eski özet kartlar burada kaldırılır; veri modeli değişmez.
 */
(function(){
'use strict';
if(!window.matchMedia('(max-width:1023px)').matches)return;
if(window.__KH_DUYURU_COMPONENT__)return;
window.__KH_DUYURU_COMPONENT__=true;

const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').toLocaleUpperCase('tr-TR');
function fmt(sn){sn=Math.max(0,Math.floor(Number(sn)||0));const h=Math.floor(sn/3600),m=Math.floor((sn%3600)/60),s=sn%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
function dkMetin(dk){dk=Math.max(0,Math.round(Number(dk)||0));const h=Math.floor(dk/60),m=dk%60;return h?(h+' sa'+(m?' '+m+' dk':'')):(m+' dk');}
function toplamDk(d){return d&&d.oturumTuru==='İki Oturum'?(Number(d.sozelSuresiDk)||0)+(Number(d.araSureDk)||0)+(Number(d.sayisalSuresiDk)||0):(Number(d&&d.sinavSuresiDk)||0);}

function aktifDuyuru(){
  try{
    if(typeof duyurular==='undefined'||!Array.isArray(duyurular))return null;
    return duyurular.filter(d=>d&&!d.arsivlendi&&d.aktif!==false&&!d.pasif).sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||'')))[0]||null;
  }catch(_){return null}
}
function aktifDeneme(){
  try{
    if(typeof denemeSinavlari==='undefined'||!Array.isArray(denemeSinavlari))return null;
    const aktif=denemeSinavlari.filter(d=>d&&d.sayacDurumu&&d.sayacDurumu.aktif);
    if(aktif.length){
      const d=aktif[0];
      const ds=typeof _sayacDurum==='function'?_sayacDurum(d):null;
      return {d,ds};
    }
    return null;
  }catch(_){return null}
}
function tarihMetni(v){
  if(!v)return'';
  try{if(typeof isoYereleCevir==='function'){const x=isoYereleCevir(v);return[x.tarih,x.saat].filter(Boolean).join(' · ')}return new Date(v).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}catch(_){return''}
}
function okudumMu(d){try{return typeof DuyurularService!=='undefined'&&DuyurularService.benOkudumMu(d)}catch(_){return false}}
function adminMi(){try{return !!(typeof AKTIF_KULLANICI!=='undefined'&&AKTIF_KULLANICI?.admin)}catch(_){return false}}
function detayAc(id){try{if(typeof duyuruDetayAc==='function')return duyuruDetayAc(id)}catch(_){}try{if(typeof sekmeAc==='function')sekmeAc('duyurular')}catch(_){}}

function kartHtml(d){
  const okundu=okudumMu(d),okuyan=Object.keys(d.okuyanlar||{}).length,icerik=String(d.icerik||d.aciklama||'').trim(),kisa=icerik.length>180?icerik.slice(0,180).trim()+'…':icerik;
  return `<article class="kh-announcement ${okundu?'is-read':'is-unread'}" data-duyuru-id="${esc(d.id)}">
    <div class="kh-announcement-accent"></div>
    <div class="kh-announcement-head"><div class="kh-announcement-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3Z"/><path d="M11.6 16.5 13 21H7l-1.2-6"/></svg></div><div class="kh-announcement-title-wrap"><div class="kh-announcement-kicker">DUYURU</div><h3>${esc(d.baslik||d.ad||'Duyuru')}</h3><div class="kh-announcement-meta">${esc(d.olusturanAdi||'Yönetim')}${d.tarih?' · '+esc(tarihMetni(d.tarih)):''}</div></div><span class="kh-announcement-status ${okundu?'read':'new'}">${okundu?'✓ OKUNDU':'YENİ'}</span></div>
    ${kisa?`<button type="button" class="kh-announcement-body" data-action="detail">${esc(kisa)}</button>`:''}
    <div class="kh-announcement-footer"><label class="kh-read-check ${okundu?'checked':''}"><input type="checkbox" data-action="read" ${okundu?'checked disabled':''} style="position:absolute!important;opacity:0!important;pointer-events:none!important;width:1px!important;height:1px!important;min-width:1px!important;min-height:1px!important;margin:0!important;clip-path:inset(50%)!important;"><span class="kh-read-box" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg></span><span>${okundu?'Okundu olarak işaretlendi':'Okudum'}</span></label>${adminMi()?`<button type="button" class="kh-read-count" data-action="readers"><span>👁</span><b>${okuyan}</b> kişi okudu <span class="arrow">›</span></button>`:''}</div>
  </article>`;
}
function sayacHtml(a){
  const d=a.d,ds=a.ds||{};
  const kalan=ds.kalanSn!=null?fmt(ds.kalanSn):'00:00:00';
  const p=ds.durum==='aktif'?Math.max(0,Math.min(100,(1-(Number(ds.oran)||0))*100)):0;
  const session=ds.durum==='ara'?'ARA':(ds.segAd||'SINAV');
  const bit=ds.bitisStr||(ds.toplam&&ds.toplam.bit)||d.bitisSaati||d.sayisalBitis||'—';
  const bas=(ds.toplam&&ds.toplam.bas)||(d.oturumTuru==='İki Oturum'?d.sozelBaslama:d.baslamaSaati)||'—';
  const durum=ds.durum==='tamam'?'TAMAMLANDI':ds.durum==='ara'?'ARA':'CANLI';
  return `<article class="dn4-home-card kh-live-exam" data-deneme-id="${esc(d.id)}" style="position:relative;overflow:hidden;padding:15px;border-radius:22px;background:linear-gradient(145deg,var(--dn4-surface),var(--dn4-surface-2));border:1px solid var(--dn4-line);box-shadow:var(--dn4-shadow);color:var(--dn4-text);">
    <div class="dn4-home-top"><div><div class="dn4-home-kicker">CANLI SINAV</div><div class="dn4-home-name">${esc(d.ad||d.baslik||'Deneme Sınavı')}</div></div><span class="dn4-home-live">${durum}</span></div>
    <div class="dn4-home-main" style="display:grid;grid-template-columns:92px minmax(0,1fr);gap:13px;align-items:center;margin-top:13px;">
      <div class="dn4-home-ring" style="--p:${p.toFixed(1)}"><div><small>KALAN</small><b>${kalan}</b></div></div>
      <div><div class="dn4-home-session">⏱️ ${esc(String(session).toLocaleUpperCase('tr-TR'))}</div><div class="dn4-home-detail"><span class="dn4-home-pill">⏰ Bitiş ${esc(bit)}</span><span class="dn4-home-pill">👥 ${esc(d.sinflar||'—')}</span><span class="dn4-home-pill">📋 ${esc(dkMetin(toplamDk(d)))}</span><span class="dn4-home-pill">▶ ${esc(bas)}</span></div><div class="dn4-home-progress"><i style="width:${p.toFixed(1)}%"></i></div></div>
    </div><div class="dn4-home-foot"><span>Canlı ilerlemeyi görüntüle</span><span class="dn4-home-open">Detayları İzle ›</span></div>
  </article>`;
}

function eskiOzetleriTemizle(dyn){
  Array.from(dyn.querySelectorAll(':scope > .kh-dyn-item')).forEach(el=>{
    const t=norm(el.textContent);
    if(t.includes('DUYURU')||t.includes('CANLI'))el.remove();
  });
}
function olaylariBagla(dyn,d){
  const a=$('.kh-announcement',dyn);
  if(a&&!a.dataset.bound){
    a.dataset.bound='1';
    const read=$('[data-action="read"]',a);if(read&&!read.disabled)read.addEventListener('change',async e=>{if(!e.target.checked)return;e.target.disabled=true;try{if(typeof DuyurularService==='undefined')throw new Error('Duyuru servisi hazır değil');await DuyurularService.okunduIsaretle(d.id);setTimeout(yerlestir,80)}catch(err){e.target.checked=false;e.target.disabled=false;try{toast('Okundu bilgisi kaydedilemedi: '+err.message)}catch(_){}}});
    $('[data-action="detail"]',a)?.addEventListener('click',()=>detayAc(d.id));$('[data-action="readers"]',a)?.addEventListener('click',()=>detayAc(d.id));
  }
  const s=$('.kh-live-exam',dyn);if(s&&!s.dataset.bound){s.dataset.bound='1';s.addEventListener('click',()=>{const id=s.dataset.denemeId;try{if(typeof window.denemeSayacAc==='function')window.denemeSayacAc(id);else if(typeof sekmeAc==='function')sekmeAc('denemeSinavlari')}catch(_){}})}
}
function yerlestir(){
  const root=$('#tab-panel.kh-home .kh-shell');if(!root)return false;const dyn=$('.kh-dynamic',root);if(!dyn)return false;
  eskiOzetleriTemizle(dyn);
  const d=aktifDuyuru(),a=aktifDeneme();
  const mevcutD=$('.kh-announcement',dyn),mevcutS=$('.kh-live-exam',dyn);
  if(d){const imza=`${d.id}|${Object.keys(d.okuyanlar||{}).length}|${okudumMu(d)?1:0}|${d.baslik||''}|${d.icerik||''}`;if(!mevcutD||mevcutD.dataset.signature!==imza){const w=document.createElement('div');w.innerHTML=kartHtml(d);const yeni=w.firstElementChild;yeni.dataset.signature=imza;if(mevcutD)mevcutD.replaceWith(yeni);else dyn.prepend(yeni)}}else if(mevcutD)mevcutD.remove();
  if(a){const html=sayacHtml(a);if(mevcutS){const w=document.createElement('div');w.innerHTML=html;mevcutS.replaceWith(w.firstElementChild)}else{const w=document.createElement('div');w.innerHTML=html;const ann=$('.kh-announcement',dyn);if(ann)ann.after(w.firstElementChild);else dyn.prepend(w.firstElementChild)}}else if(mevcutS)mevcutS.remove();
  if(d)olaylariBagla(dyn,d);else olaylariBagla(dyn,{id:''});
  return true;
}
let bekle=false;const mo=new MutationObserver(()=>{if(bekle)return;bekle=true;requestAnimationFrame(()=>{bekle=false;yerlestir()})});
function baslat(){const p=$('#tab-panel');if(!p)return false;mo.observe(p,{childList:true,subtree:true});yerlestir();return true}
let n=0,t=setInterval(()=>{if(baslat()||++n>20)clearInterval(t)},100);
document.addEventListener('DOMContentLoaded',()=>setTimeout(baslat,0));window.addEventListener('focus',()=>setTimeout(yerlestir,40));
setInterval(()=>{try{yerlestir()}catch(_){}},1000);
})();
