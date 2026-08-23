/* Koruk Asistan — Arama eşleşme düzeltmesi v1
 * Arama Modern v1'in mevcut UI/veri modelini korur.
 * Metin araması kelime başlangıcında bitişik eşleşir; öğrenci numarası da aranır.
 */
(function(){
'use strict';
if(window.__KORUK_ARAMA_ESLESME_FIX_V1__) return;
window.__KORUK_ARAMA_ESLESME_FIX_V1__=true;

const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const norm=v=>String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').trim();
function gv(n){try{return eval(`typeof ${n}!=='undefined'?${n}:null`)}catch(_){return null}}
function arr(n){const v=gv(n);return Array.isArray(v)?v:[]}
function words(v){return norm(v).split(/[^a-z0-9]+/).filter(Boolean)}
function match(q,vals){
  if(!q) return true;
  return (vals||[]).some(v=>words(v).some(w=>w.startsWith(q)));
}
function className(id){return arr('siniflar').find(x=>x.id===id)?.ad||'—'}
function serviceName(id,fallback=''){const s=arr('servisler').find(x=>x.id===id);return s?.servisAdi||s?.guzergah||fallback||'—'}
function initials(a,b){return `${String(a||'').trim()[0]||''}${String(b||'').trim()[0]||''}`.toLocaleUpperCase('tr')||'?'}
function teacherName(o){return `${o?.ad||''} ${o?.soyad||''}`.trim()||'Öğretmen'}
function personName(o){return `${o?.ad||''} ${o?.soyad||''}`.trim()||o?.adSoyad||'Personel'}
function selectedIds(sel){return new Set($$(sel+' .arama-filtre-chip.secili').map(x=>x.dataset.id).filter(Boolean))}
function avatarTeacher(o){const url=String(o?.profilFotoUrl||'');return url&&/^https?:\/\//i.test(url)?`<span class="ka-avatar"><img src="${esc(url)}" alt=""></span>`:`<span class="ka-avatar">${esc(initials(o.ad,o.soyad))}</span>`}
function row(main,sub,action,avatar,side=''){return `<button type="button" class="ka-row" data-action="${esc(action)}">${avatar}<span class="ka-row-main"><b>${esc(main)}</b><small>${esc(sub)}</small></span><span class="ka-row-side">${side?`<span class="ka-badge">${esc(side)}</span>`:''}<span class="ka-arrow">›</span></span></button>`}
function group(title,emoji,list,render,max){if(!list.length)return'';const shown=list.slice(0,max);return `<section class="ka-group"><div class="ka-group-head"><div class="ka-group-title"><span class="ka-group-icon">${emoji}</span>${esc(title)}</div><span class="ka-count">${list.length} sonuç</span></div>${shown.map(render).join('')}${list.length>shown.length?`<div class="ka-more">+${list.length-shown.length} kayıt daha · Aramayı daraltabilirsiniz</div>`:''}</section>`}
function bindRows(){$$('.ka-row[data-action]').forEach(b=>b.onclick=()=>{const [type,id]=String(b.dataset.action||'').split(':');try{if(type==='ogrenci')ogrenciDetayModalAc(id);else if(type==='ogretmen')ogretmenDetayAc(id);else if(type==='personel')personelDetayAc(id);else if(type==='servis')sekmeAc('tasima');else if(type==='evrak')sekmeAc('evrak');else if(type==='not')sekmeAc('notlar')}catch(_){}})}

function render(){
  const root=$('#tab-arama'); if(!root?.classList.contains('active')) return;
  const input=$('#globalAramaInput'), out=$('#globalAramaSonuclar'); if(!input||!out) return;
  const q=norm(input.value), kat=$('.ka-cat.aktif')?.dataset.kat||'hepsi';
  const servisSet=selectedIds('#aramaServisSecenekleri'), sinifSet=selectedIds('#aramaSinifSecenekleri'), kulupSet=selectedIds('#aramaKulupSecenekleri');
  const cins=$('#aramaCinsiyetFiltre')?.value||'';

  const st=arr('veliler').filter(v=>{
    if(servisSet.size&&!servisSet.has(String(v.servisId||'')))return false;
    if(sinifSet.size&&!sinifSet.has(String(v.sinifId||'')))return false;
    if(kulupSet.size&&!kulupSet.has(String(v.kulupId||'')))return false;
    const g=norm(v.cinsiyet); if(cins==='kiz'&&!['k','kiz','kadin'].includes(g))return false; if(cins==='erkek'&&!['e','erkek'].includes(g))return false;
    return match(q,[v.ogrenciAdi,v.ogrenciNo,v.veliAdi,v.telefon,v.telefon1,v.telefon2,v.eposta,className(v.sinifId),serviceName(v.servisId,v.servisAdi),v.kulupAdi]);
  });
  const te=arr('ogretmenler').filter(o=>match(q,[o.ad,o.soyad,o.brans,o.unvan,o.telefon,o.eposta]));
  const pe=arr('personelListesi').filter(o=>match(q,[o.ad,o.soyad,o.adSoyad,o.gorev,o.unvan,o.telefon]));
  const bu=arr('servisler').filter(s=>match(q,[s.servisAdi,s.guzergah,s.soforAdi,s.soforTelefon,s.plaka]));
  const ev=arr('evrakTakibi').filter(e=>match(q,[e.baslik,e.konu,e.aciklama,e.tur,e.durum,e.sayi]));
  const no=arr('notlar').filter(n=>match(q,[n.baslik,n.icerik,n.not]));

  const sum=$('#kaSearchSummary'); if(sum)sum.innerHTML=[['Öğrenci',st.length],['Öğretmen',te.length],['Personel',pe.length],['Servis',bu.length]].map(x=>`<div class="ka-summary-card"><small>${x[0]}</small><b>${x[1]}</b></div>`).join('');
  let html='',total=0,max=q?50:8;
  if(kat==='hepsi'||kat==='ogrenci'){total+=st.length;html+=group('Öğrenciler','🎓',st,v=>row(v.ogrenciAdi||'Öğrenci',[className(v.sinifId),v.ogrenciNo?`No: ${v.ogrenciNo}`:'',v.veliAdi||'Veli bilgisi yok'].filter(Boolean).join(' · '),`ogrenci:${v.id}`,`<span class="ka-avatar">${esc(String(v.ogrenciAdi||'?')[0].toLocaleUpperCase('tr'))}</span>`,serviceName(v.servisId,v.servisAdi)!=='—'?serviceName(v.servisId,v.servisAdi):''),max)}
  if(kat==='hepsi'||kat==='ogretmen'){total+=te.length;html+=group('Öğretmenler','👩‍🏫',te,o=>row(teacherName(o),[o.brans,o.unvan].filter(Boolean).join(' · ')||'Öğretmen',`ogretmen:${o.id}`,avatarTeacher(o)),max)}
  if(kat==='hepsi'||kat==='personel'){total+=pe.length;html+=group('Personel','🧑‍💼',pe,p=>row(personName(p),p.gorev||p.unvan||'Personel',`personel:${p.id}`,`<span class="ka-avatar">${esc(initials(p.ad,p.soyad))}</span>`),max)}
  if(kat==='hepsi'||kat==='servis'){total+=bu.length;html+=group('Servisler','🚌',bu,s=>row(s.servisAdi||s.guzergah||'Servis',[s.plaka,s.soforAdi,s.guzergah].filter(Boolean).join(' · '),`servis:${s.id}`,`<span class="ka-avatar">🚌</span>`),max)}
  if(kat==='hepsi'||kat==='evrak'){total+=ev.length;html+=group('Evraklar','📄',ev,e=>row(e.baslik||e.konu||'Evrak',[e.tur,e.durum,e.tarih].filter(Boolean).join(' · '),`evrak:${e.id}`,`<span class="ka-avatar">📄</span>`,e.durum||''),max)}
  if(kat==='hepsi'||kat==='not'){total+=no.length;html+=group('Notlar','🗒️',no,n=>row(n.baslik||n.not||n.icerik||'Not',n.tarih||n.olusturmaTarihi||'Kişisel not',`not:${n.id}`,`<span class="ka-avatar">🗒️</span>`),max)}
  const title=$('#kaResultTitle'),meta=$('#kaResultMeta'); if(title)title.textContent=q?`“${input.value.trim()}” sonuçları`:'Tüm kayıtlar'; if(meta)meta.textContent=`${total} eşleşme`;
  out.innerHTML=html||'<div class="ka-empty"><div class="ka-empty-icon">🔎</div><b>Sonuç bulunamadı</b><span>Arama ifadesini veya filtreleri değiştirin.</span></div>'; bindRows();
}

function install(){if(typeof window.globalAramaYap!=='function')return false;window.globalAramaYap=render;return true}
let n=0,t=setInterval(()=>{if(install()||++n>60)clearInterval(t)},100);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();