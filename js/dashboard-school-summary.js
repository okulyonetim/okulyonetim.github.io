/* Koruk Asistan — Okul Özeti düzeltmeleri */
(function(){
'use strict';
if(!window.matchMedia('(max-width:1023px)').matches)return;
const $=(s,r=document)=>r.querySelector(s);
function gv(n){try{return eval(`typeof ${n}!=='undefined'?${n}:null`)}catch(_){return null}}
function arr(n){const v=gv(n);return Array.isArray(v)?v:[]}
function level(s){return Number(s?.seviye||String(s?.ad||'').match(/\d+/)?.[0]||0)}
function totals(){
 const classes=arr('siniflar'), pupils=arr('veliler'); let pri=0,mid=0;
 if(classes.some(s=>Number(s.ogrenciSayisi||0)>0)) classes.forEach(s=>{const n=Number(s.ogrenciSayisi||0);if(level(s)>=1&&level(s)<=4)pri+=n;else if(level(s)>=5)mid+=n});
 else pupils.forEach(p=>{const s=classes.find(x=>x.id===p.sinifId),lv=level(s)||Number(String(p.sinif||p.sinifAdi||'').match(/\d+/)?.[0]||0);if(lv>=1&&lv<=4)pri++;else if(lv>=5)mid++});
 return {pri,mid,total:pri+mid};
}
function apply(){
 const root=$('#tab-panel.kh-home');if(!root)return;
 const stats=$('.kh-stats',root);if(!stats)return;
 const cards=Array.from(stats.querySelectorAll('.kh-stat'));if(cards.length<2)return;
 const teachers=arr('ogretmenler').filter(x=>x&&!['pasif','silindi'].includes(String(x.durum||'').toLocaleLowerCase('tr')));
 const tc=cards[0];
 const label=$('.kh-stat-label',tc),num=$('.kh-stat-number',tc),detail=$('.kh-stat-detail',tc);
 if(label)label.textContent='Öğretmen'; if(num)num.textContent=String(teachers.length); if(detail)detail.innerHTML='<span class="kh-summary-note">Aktif öğretmen sayısı</span>';
 tc.dataset.tab='ogretmenler';tc.classList.add('kh-stat-teacher');
 const st=totals(),sc=cards[1],sn=$('.kh-stat-number',sc),sd=$('.kh-stat-detail',sc);if(sn)sn.textContent=String(st.total);
 if(sd)sd.innerHTML=`<div class="kh-student-split"><div><span>İlkokul</span><b>${st.pri}</b></div><i></i><div><span>Ortaokul</span><b>${st.mid}</b></div></div>`;
 sc.classList.add('kh-stat-student');
}
let pending=false;const mo=new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;apply()})});
function start(){const p=$('#tab-panel');if(!p)return false;mo.observe(p,{childList:true,subtree:true});apply();return true}
let n=0,t=setInterval(()=>{if(start()||++n>100)clearInterval(t)},100);document.addEventListener('DOMContentLoaded',()=>setTimeout(start,0));
})();
