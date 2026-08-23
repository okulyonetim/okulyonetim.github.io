/* Koruk Asistan — Öğretmen detay modern katmanı v5
 * Eski ogretmenDetayAc veri/yetki üretimini korur; oluşturulan DOM'u öğrenci detayıyla aynı mobil dile taşır.
 */
(function(){'use strict';
if(window.__OGD_MODERN_V5__)return;window.__OGD_MODERN_V5__=true;
let sonId=null,isleniyor=false;
const esc=s=>typeof escapeHtml==='function'?escapeHtml(s||''):String(s||'').replace(/[&<>"']/g,'');
const I={
 phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.7.5 2.6.6a2 2 0 0 1 2 2.3Z"/></svg>',
 wa:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20.7 11.6a8.7 8.7 0 0 1-12.8 7.7L3 20.7l1.4-4.7A8.7 8.7 0 1 1 20.7 11.6Z"/><path d="M8.8 8.3c.2-.4.4-.5.7-.5h.5c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.6.7c-.2.2-.2.4 0 .7.5.9 1.2 1.6 2.1 2.1.3.2.5.2.7 0l.9-.9c.2-.2.4-.3.7-.2l1.8.9c.3.1.4.3.4.5 0 .4-.2 1.1-.8 1.6-.6.5-1.4.7-2.2.5-1.2-.3-2.8-1-4.4-2.4-1.3-1.2-2.2-2.6-2.6-3.7-.3-.8-.2-1.6.2-2.2Z"/></svg>',
 msg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></svg>',
 cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
 book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5Z"/><path d="M4 6v13.5A2.5 2.5 0 0 0 6.5 22H20"/></svg>',
 shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>',
 users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/></svg>',
 doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>',
 user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'};
function avatar(o){const src=o.fotograf||o.foto||o.photoURL||o.profilFoto||o.profilFotoUrl||'';return src?`<img src="${esc(src)}" alt="">`:esc(((o.ad||'?')[0]+(o.soyad||'')[0]).toLocaleUpperCase('tr'))}
function ikon(b){const t=(b||'').toLocaleLowerCase('tr');if(t.includes('temel'))return I.user;if(t.includes('ders'))return I.book;if(t.includes('nöbet'))return I.shield;if(t.includes('kulüp')||t.includes('rehber'))return I.users;if(t.includes('belirli')||t.includes('izin'))return I.cal;return I.doc}
function waTel(t){const p=String(t||'').replace(/\D/g,'');return p.startsWith('0')?'90'+p.slice(1):p}
function kartlariHazirla(body){body.querySelectorAll('.detay-card').forEach(c=>{c.classList.remove('ogd-hidden');c.style.display='';const h=c.querySelector('h4');if(!h)return;const bas=(h.textContent||'').trim();if(!h.querySelector('.ogd-sec-icon'))h.insertAdjacentHTML('afterbegin',`<span class="ogd-sec-icon">${ikon(bas)}</span>`);});}
function programaGit(body){const card=[...body.querySelectorAll('.detay-card')].find(c=>/ders program/i.test(c.querySelector('h4')?.textContent||''));if(card)card.scrollIntoView({behavior:'smooth',block:'start'});}
function duzenle(id){if(isleniyor||!id)return;const body=document.getElementById('detayBody'),ov=document.getElementById('detayOverlay');if(!body||!ov||!ov.classList.contains('active'))return;const o=(typeof ogretmenler!=='undefined'?ogretmenler:[]).find(x=>x.id===id);if(!o)return;if(body.querySelector('.ogd-hero-v5')){kartlariHazirla(body);ov.classList.add('ogd-modern','ogd-v5');return}isleniyor=true;
 try{
  body.querySelectorAll('.ogd-hero,.ogd-quick,.ogd-stats,.ogd-tabs').forEach(x=>x.remove());
  const ders=(typeof dersProgrami!=='undefined'&&Array.isArray(dersProgrami)?dersProgrami:[]).filter(d=>d.ogretmenId===id);
  const bugun=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'][new Date().getDay()];
  const bugunDers=ders.filter(d=>d.gun===bugun).length;
  const nb=(typeof nobetAtamalari!=='undefined'&&Array.isArray(nobetAtamalari)?nobetAtamalari:[]).filter(n=>n.ogretmenId===id).length;
  let kulup=0,rehber=0;try{kulup=(cizelgeVerileri.sosyalKulupler||[]).filter(k=>Array.isArray(k.ogretmenIdler)&&k.ogretmenIdler.includes(id)).length;const ad=((o.ad||'')+' '+(o.soyad||'')).toLocaleLowerCase('tr');rehber=(cizelgeVerileri.rehberlik||[]).filter(r=>r.ogretmenId===id||String(r.danisman||'').toLocaleLowerCase('tr').includes(ad)).length}catch(_){ }
  const tel=o.telefon||o.telefon1||'',adSoyad=((o.ad||'')+' '+(o.soyad||'')).trim();
  const hero=document.createElement('section');hero.className='ogd-hero ogd-hero-v5';hero.innerHTML=`<div class="ogd-hero-main"><div class="ogd-hero-avatar">${avatar(o)}</div><div class="ogd-hero-text"><div class="ogd-hero-name">${esc(adSoyad||'Öğretmen')}</div><div class="ogd-hero-role">${esc([o.unvan||'Öğretmen',o.brans].filter(Boolean).join(' · '))}</div><span class="ogd-status">Aktif Personel</span></div><div class="ogd-hero-mark">${I.book}</div></div>`;
  const quick=document.createElement('div');quick.className='ogd-quick';quick.innerHTML=`<button class="wa ${tel?'':'disabled'}" ${tel?'data-wa="'+esc(tel)+'"':'disabled'}><span>${I.wa}</span><b>WhatsApp</b></button><button class="call ${tel?'':'disabled'}" ${tel?'data-call="'+esc(tel)+'"':'disabled'}><span>${I.phone}</span><b>Ara</b></button><button class="msg" data-msg="1"><span>${I.msg}</span><b>Mesaj</b></button><button class="program" data-program="1"><span>${I.cal}</span><b>Program</b></button>`;
  const stats=document.createElement('div');stats.className='ogd-stats';stats.innerHTML=`<div class="ogd-stat"><small>Haftalık Ders</small><b>${ders.length}</b><span>Ders kaydı</span></div><div class="ogd-stat"><small>Bugün</small><b>${bugunDers}</b><span>Ders</span></div><div class="ogd-stat"><small>Nöbet</small><b>${nb}</b><span>Kayıt</span></div><div class="ogd-stat"><small>Sorumluluk</small><b>${kulup+rehber}</b><span>Kulüp / sınıf</span></div>`;
  body.prepend(stats);body.prepend(quick);body.prepend(hero);kartlariHazirla(body);
  quick.querySelector('[data-call]')?.addEventListener('click',e=>location.href='tel:'+String(e.currentTarget.dataset.call).replace(/\s+/g,''));
  quick.querySelector('[data-wa]')?.addEventListener('click',e=>window.open('https://wa.me/'+waTel(e.currentTarget.dataset.wa),'_blank'));
  quick.querySelector('[data-program]')?.addEventListener('click',()=>programaGit(body));
  quick.querySelector('[data-msg]')?.addEventListener('click',()=>{const b=document.getElementById('detayMesajBtn')||document.querySelector('#detayOverlay [data-action="mesaj"]');if(b)b.click();});
  ov.classList.remove('ogd-v4');ov.classList.add('ogd-modern','ogd-v5');sonId=id;
 }finally{isleniyor=false}
}
function uygula(){const ov=document.getElementById('detayOverlay');if(!ov?.classList.contains('active'))return;const id=window._acikOgretmenDetayId||sonId;if(id)requestAnimationFrame(()=>duzenle(id))}
function kur(){const ov=document.getElementById('detayOverlay'),body=document.getElementById('detayBody');if(!ov||!body){setTimeout(kur,250);return}let q=false;const tetik=()=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;uygula()})};new MutationObserver(tetik).observe(ov,{attributes:true,attributeFilter:['class']});new MutationObserver(tetik).observe(body,{childList:true,subtree:false});document.addEventListener('click',e=>{if(e.target.closest('.ogm-card,.ogm-action,.ogm-more'))setTimeout(uygula,30)},true);uygula()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',kur,{once:true});else kur();
})();