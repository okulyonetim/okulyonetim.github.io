/* Koruk Asistan — öğretmen ana sayfasında Okul Özeti
   dashboard-home.js içindeki gerçek veri alanlarını kullanır; yeni veri modeli oluşturmaz. */
(function(){
'use strict';
if(window.__KH_TEACHER_SCHOOL_SUMMARY__)return;window.__KH_TEACHER_SCHOOL_SUMMARY__=true;
if(!window.matchMedia('(max-width:1023px)').matches)return;
const norm=v=>String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').trim();
function gv(n){try{return eval(`typeof ${n}!=='undefined'?${n}:null`)}catch(_){return null}}
function arr(n){const v=gv(n);return Array.isArray(v)?v:[]}
function gender(v){const n=norm(v);if(/^(k|kadin|bayan|female|kiz)$/.test(n)||n.includes('kadin')||n.includes('kiz'))return'k';if(/^(e|erkek|bay|male)$/.test(n)||n.includes('erkek'))return'e';return''}
function genderOf(x){return gender(x?.cinsiyet??x?.cinsiyeti??x?.cins??x?.gender??'')}
function isAdmin(){const u=gv('AKTIF_KULLANICI')||window.AKTIF_KULLANICI;return !!u?.admin}
function svg(path){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`}
const I={
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 student:'<path d="m3 10 9-5 9 5-9 5-9-5Z"/><path d="M7 12v5c3 2 7 2 10 0v-5"/>',
 school:'<path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h2M13 10h2M9 14h2M13 14h2"/>',
 bus:'<path d="M6 17h12M6 17v2M18 17v2M5 17a2 2 0 0 1-2-2V7c0-3 2-4 9-4s9 1 9 4v8a2 2 0 0 1-2 2"/><path d="M3 10h18M7 14h.01M17 14h.01"/>',
 book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z"/>'
};
function stats(){
 const teachers=arr('ogretmenler'),classes=arr('siniflar'),pupils=arr('veliler'),services=arr('servisler');
 const k=teachers.filter(x=>genderOf(x)==='k').length,e=teachers.filter(x=>genderOf(x)==='e').length;
 const cls=id=>classes.find(s=>s.id===id),level=s=>Number(s?.seviye||String(s?.ad||'').match(/\d+/)?.[0]||0);
 let pri={t:0,k:0,e:0},mid={t:0,k:0,e:0};
 const classGenderTotal=classes.reduce((n,s)=>n+Number(s.kizSayisi||0)+Number(s.erkekSayisi||0),0);
 if(classGenderTotal>0){classes.forEach(s=>{const g=level(s)>0&&level(s)<=4?pri:mid,kk=Number(s.kizSayisi||0),ee=Number(s.erkekSayisi||0),tt=Number(s.ogrenciSayisi||kk+ee||0);g.t+=tt;g.k+=kk;g.e+=ee})}
 else if(pupils.length){pupils.forEach(p=>{const lv=level(cls(p.sinifId))||Number(String(p.sinif||p.sinifAdi||'').match(/\d+/)?.[0]||0),g=lv>0&&lv<=4?pri:mid;g.t++;const c=genderOf(p);if(c==='k')g.k++;if(c==='e')g.e++})}
 else{classes.forEach(s=>{const g=level(s)>0&&level(s)<=4?pri:mid;g.t+=Number(s.ogrenciSayisi||0)})}
 let activeServices=services.filter(x=>!['pasif','iptal','silindi'].includes(norm(x.durum||'aktif'))).length;
 if(!activeServices)activeServices=new Set(pupils.map(x=>x.servisId||x.servisAdi).filter(Boolean)).size;
 return {ogretmen:teachers.length,k,e,ogr:pri.t+mid.t,pri,mid,sinif:classes.length,servis:activeServices};
}
function section(){
 const d=stats(),s=document.createElement('section');s.className='kh-section kh-teacher-school-summary';
 s.innerHTML=`<div class="kh-section-head"><div class="kh-section-title">${svg(I.school)}<span>Okul Özeti</span></div></div><div class="kh-stats">
 <button class="kh-stat" type="button" data-tab="ogretmenler"><div class="kh-stat-icon">${svg(I.users)}</div><div class="kh-stat-label">Öğretmen</div><div class="kh-stat-number">${d.ogretmen}</div><div class="kh-stat-detail"><span class="kh-gender female">♀</span> ${d.k} Kadın <span class="kh-gender-sep">·</span> <span class="kh-gender male">♂</span> ${d.e} Erkek</div></button>
 <button class="kh-stat" type="button" data-tab="siniflar"><div class="kh-stat-icon">${svg(I.student)}</div><div class="kh-stat-label">Öğrenci</div><div class="kh-stat-number">${d.ogr}</div><div class="kh-stat-detail"><div class="kh-student-split"><div><span class="kh-level-icon primary">${svg(I.school)}</span><span>İLKOKUL</span><b>${d.pri.t}</b><span class="kh-gender-line"><em class="female">♀ ${d.pri.k}</em><em class="male">♂ ${d.pri.e}</em></span></div><i></i><div><span class="kh-level-icon middle">${svg(I.book)}</span><span>ORTAOKUL</span><b>${d.mid.t}</b><span class="kh-gender-line"><em class="female">♀ ${d.mid.k}</em><em class="male">♂ ${d.mid.e}</em></span></div></div></div></button>
 <button class="kh-stat" type="button" data-tab="siniflar"><div class="kh-stat-icon">${svg(I.school)}</div><div class="kh-stat-label">Sınıf</div><div class="kh-stat-number">${d.sinif}</div><div class="kh-stat-detail">Aktif sınıf / şube</div></button>
 <button class="kh-stat" type="button" data-tab="tasima"><div class="kh-stat-icon">${svg(I.bus)}</div><div class="kh-stat-label">Servis</div><div class="kh-stat-number">${d.servis}</div><div class="kh-stat-detail">Aktif servis</div></button>
 </div>`;
 s.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{try{if(typeof sekmeAc==='function')sekmeAc(b.dataset.tab)}catch(_){}}));return s;
}
function ensure(){
 if(isAdmin())return;
 const shell=document.querySelector('#tab-panel.kh-home .kh-shell');if(!shell||shell.querySelector('.kh-teacher-school-summary'))return;
 const news=shell.querySelector('.kh-news');const newsSection=news?.closest('.kh-section');
 const target=newsSection?.nextElementSibling||shell.children[1]||null;
 shell.insertBefore(section(),target);
}
const mo=new MutationObserver(()=>requestAnimationFrame(ensure));
function start(){const root=document.getElementById('tab-panel')||document.body;mo.observe(root,{childList:true,subtree:true});ensure();[100,400,1000,2000].forEach(t=>setTimeout(ensure,t))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();