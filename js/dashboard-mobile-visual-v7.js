/* Koruk Asistan — Mobil Dashboard Görsel/Etkinlik Katmanı v7.1 */
(function(){
'use strict';
if(window.__db7VisualV71)return;window.__db7VisualV71=true;
if(!window.matchMedia('(max-width:1023px)').matches)return;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
function gv(n){try{return eval(`typeof ${n}!=='undefined'?${n}:null`)}catch(_){return null}}
function list(n){const v=gv(n);return Array.isArray(v)?v:[]}
function openTab(name){try{if(typeof sekmeAc==='function')return sekmeAc(name)}catch(_){}document.querySelector(`[data-tab="${name}"]`)?.click()}
function css(){if($('#db7-visual-css'))return;const s=document.createElement('style');s.id='db7-visual-css';s.textContent=`
.db6 .db6-title h2{display:flex;align-items:center;gap:8px;font-size:18px!important}.db6 .db6-title h2 .db7-title-ico{font-size:20px;line-height:1}
.db6 .db6-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}.db6 .db6-stat{position:relative;min-height:126px!important;padding:14px!important;border-radius:22px!important;overflow:hidden;background:linear-gradient(145deg,var(--card),color-mix(in srgb,var(--brand) 5%,var(--card)))!important}.db6 .db6-stat:after{content:'';position:absolute;width:76px;height:76px;border-radius:50%;right:-24px;top:-24px;background:color-mix(in srgb,var(--brand) 12%,transparent)}.db6 .db7-stat-icon{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;font-size:22px;background:color-mix(in srgb,var(--brand) 12%,var(--card));margin-bottom:8px}.db6 .db6-stat .k{font-size:10px!important;letter-spacing:.04em}.db6 .db6-stat .n{font-size:30px!important;margin:2px 0 5px!important}.db6 .db6-stat .sub{font-size:10px!important;line-height:1.42!important}
.db6 .db7-social-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.db6 .db7-social-btn{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:18px;min-height:88px;padding:10px 4px;box-shadow:var(--shadow);font-size:10px;font-weight:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px}.db6 .db7-social-btn .ico{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:var(--soft);font-size:23px}
.db6 .db6-ticker{cursor:pointer;min-height:46px!important}.db6 .db6-ticker b{font-size:12px!important;z-index:2;background:var(--card)}.db6 .db6-ticker-track{overflow:hidden;position:relative;min-width:0}.db6 .db7-news-run{display:inline-flex;align-items:center;gap:30px;white-space:nowrap;padding-left:100%;width:max-content;animation:db7news 42s linear infinite;will-change:transform}.db6 .db7-news-item{border:0;background:none;color:var(--text);font:inherit;font-size:12px;font-weight:700;padding:12px 0;cursor:pointer;white-space:nowrap}.db6 .db7-news-item:before{content:'📰';margin-right:6px}@keyframes db7news{from{transform:translateX(0)}to{transform:translateX(-100%)}}
.db6 .db6-chip{writing-mode:horizontal-tb!important;white-space:nowrap!important;min-width:62px!important;text-align:center!important;line-height:1.2!important;word-break:normal!important}.db6 .db6-row{grid-template-columns:minmax(0,1fr) auto!important}.db6 .db6-row strong{display:flex!important;align-items:center;min-width:0}.db6 .db6-row strong .db7-row-ico{margin-right:7px;flex:0 0 auto}
.db6 .db6-weekday-head{display:flex!important;align-items:center!important}.db6 .db6-weekday-head .db7-row-ico{margin-right:6px}.db6 .db6-note-row{display:flex;align-items:flex-start;gap:7px}
@media(max-width:390px){.db6 .db7-social-btn{min-height:80px}.db6 .db7-social-btn .ico{width:38px;height:38px;font-size:21px}}
`;document.head.appendChild(s)}
function titleIcon(title){const map={
 'Okul Özeti':'📊','Sosyal Medya':'🌐','Bugünün Nöbetçileri':'🛡️','Bugün İzinli':'🏥','Yaklaşan Etkinlik ve Görevler':'📌','Şu Anki Dersler':'📚','Haftanın Nöbet Programı':'📅','Yaklaşan Yazılı Sınavlar':'📝','Ders Programım':'📖','Notlarım':'🗒️','Bugünkü Derslerim':'📚','Sınavlarım':'📝','Teslim Edilecek Evraklar':'📂','Hızlı İşlemler':'⚡','Takvim':'🗓️','Bugünkü Nöbetim':'🛡️','Dersim ve Bu Haftanın Kazanımları':'🎯'
};return map[title]||'✨'}
function decorateTitles(){ $$('.db6-section .db6-title h2').forEach(h=>{if($('.db7-title-ico',h))return;const ico=document.createElement('span');ico.className='db7-title-ico';ico.textContent=titleIcon(h.textContent.trim());h.prepend(ico)}) }
function summaryNumbers(){
 const classes=list('siniflar'), pupils=list('veliler'), services=list('servisler');
 const teacherList=list('ogretmenler');
 const women=teacherList.filter(x=>String(x.cinsiyet||'').toLocaleLowerCase('tr').includes('kadın')||String(x.cinsiyet||'').toLocaleLowerCase('tr').includes('kız')).length;
 const men=teacherList.filter(x=>String(x.cinsiyet||'').toLocaleLowerCase('tr').includes('erkek')).length;
 const byClass=id=>classes.find(s=>s.id===id)||null;
 function levelOf(p){const s=byClass(p.sinifId);return Number(s?.seviye||String(s?.ad||'').match(/\d+/)?.[0]||0)}
 let primary={t:0,k:0,e:0},middle={t:0,k:0,e:0};
 if(pupils.length){pupils.forEach(p=>{const target=levelOf(p)<=4?primary:middle;target.t++;const c=String(p.cinsiyet||'').toLocaleLowerCase('tr');if(c.includes('kız'))target.k++;else if(c.includes('erkek'))target.e++})}
 else classes.forEach(s=>{const target=Number(s.seviye||String(s.ad||'').match(/\d+/)?.[0]||0)<=4?primary:middle;target.t+=Number(s.ogrenciSayisi||0);target.k+=Number(s.kizSayisi||0);target.e+=Number(s.erkekSayisi||0)});
 const activeServices=services.filter(s=>String(s.durum||'Aktif').toLocaleLowerCase('tr')!=='pasif').length;
 return {personel:teacherList.length,women,men,ogrenci:primary.t+middle.t,primary,middle,sinif:classes.length,servis:activeServices};
}
function decorateSummary(){
 const sec=$$('.db6-section').find(s=>$('.db6-title h2',s)?.textContent.replace(/^\S+\s*/,'').trim()==='Okul Özeti'||$('.db6-title h2',s)?.textContent.includes('Okul Özeti'));if(!sec)return;
 const nums=summaryNumbers(), cards=$$('.db6-stat',sec), icons=['👥','🎓','🏫','🚌'];
 cards.forEach((b,i)=>{let ico=$('.db7-stat-icon',b);if(!ico){ico=document.createElement('div');ico.className='db7-stat-icon';b.prepend(ico)}ico.textContent=icons[i]||'📌'});
 if(cards[0]){const n=$('.n',cards[0]),sub=$('.sub',cards[0]);if(n)n.textContent=nums.personel;if(sub)sub.textContent=`${nums.women} Kadın • ${nums.men} Erkek`}
 if(cards[1]){const n=$('.n',cards[1]),sub=$('.sub',cards[1]);if(n)n.textContent=nums.ogrenci;if(sub)sub.innerHTML=`İlkokul ${nums.primary.t} (${nums.primary.k} Kız • ${nums.primary.e} Erkek)<br>Ortaokul ${nums.middle.t} (${nums.middle.k} Kız • ${nums.middle.e} Erkek)`}
 if(cards[2]){const n=$('.n',cards[2]),sub=$('.sub',cards[2]);if(n)n.textContent=nums.sinif;if(sub)sub.textContent='Aktif sınıf'}
 if(cards[3]){const n=$('.n',cards[3]),sub=$('.sub',cards[3]);if(n)n.textContent=nums.servis;if(sub)sub.textContent='Aktif servis'}
}
function socialSection(){
 const sec=$$('.db6-section').find(s=>{const t=$('.db6-title h2',s)?.textContent||'';return t.includes('Okul Bağlantıları')||t.includes('Sosyal Medya')});if(!sec)return;
 const h=$('.db6-title h2',sec);if(h){h.textContent='Sosyal Medya'};sec.dataset.db7='social';$$('.db6-links,.db7-social-grid',sec).forEach(x=>x.remove());
 const wrap=document.createElement('div');wrap.className='db7-social-grid';
 const items=[['📸','Instagram',['instagram','instagramUrl','instagramLink']],['𝕏','X',['x','xUrl','twitter','twitterUrl']],['▶️','YouTube',['youtube','youtubeUrl']],['📘','Facebook',['facebook','facebookUrl']]];
 const o=gv('okulBilgileri')||{};
 items.forEach(([ico,label,keys])=>{const b=document.createElement('button');b.type='button';b.className='db7-social-btn';b.innerHTML=`<span class="ico">${ico}</span><span>${label}</span>`;b.onclick=()=>{const url=keys.map(k=>o[k]).find(Boolean);if(url)window.open(url,'_blank');else openTab('okulBilgileri')};wrap.append(b)});sec.append(wrap)
}
let newsSig='';
function renderNews(){
 const ticker=$('.db6-ticker'),track=ticker&&$('.db6-ticker-track',ticker);if(!ticker||!track)return;
 const news=list('haberler').filter(x=>x&&x.baslik).slice(0,15);if(!news.length)return;
 const sig=news.map(h=>`${h.id||''}|${h.baslik}|${h.link||''}`).join('§');if(sig===newsSig&&$('.db7-news-run',track))return;newsSig=sig;
 track.innerHTML='';const run=document.createElement('div');run.className='db7-news-run';
 news.forEach(h=>{const b=document.createElement('button');b.type='button';b.className='db7-news-item';b.textContent=h.baslik;b.onclick=e=>{e.stopPropagation();if(h.link)window.open(h.link,'_blank');else openTab('haberler')};run.append(b)});track.append(run);ticker.onclick=()=>openTab('haberler')
}
function decorateRows(){const map=[['Bugünün Nöbetçileri','🛡️'],['Bugünkü Nöbetim','🛡️'],['Bugünkü Derslerim','📚'],['Şu Anki Dersler','📚'],['Ders Programım','📖'],['Sınavlarım','📝'],['Yaklaşan Yazılı Sınavlar','📝'],['Yaklaşan Etkinlik ve Görevler','📌']];$$('.db6-section').forEach(sec=>{const title=$('.db6-title h2',sec)?.textContent||'';const ico=map.find(x=>title.includes(x[0]))?.[1];if(!ico)return;$$('.db6-row strong',sec).forEach(st=>{if($('.db7-row-ico',st))return;const i=document.createElement('span');i.className='db7-row-ico';i.textContent=ico;st.prepend(i)})});$$('.db6-weekday-head').forEach(h=>{if($('.db7-row-ico',h))return;const i=document.createElement('span');i.className='db7-row-ico';i.textContent='📅';h.prepend(i)})}
function liveWidgets(){const weather=$('#heroHavaSatir'),bell=$('#zilWidget');if(weather&&/Hava durumu$/i.test(weather.textContent.trim())){try{if(typeof konumIsteVeBaslat==='function')konumIsteVeBaslat()}catch(_){}}if(bell&&/yükleniyor/i.test(bell.textContent)){try{if(typeof renderZilSayaci==='function')renderZilSayaci()}catch(_){}}}
function apply(){if(!$('.db6-shell'))return false;css();decorateTitles();decorateSummary();socialSection();renderNews();decorateRows();liveWidgets();return true}
let busy=false;const mo=new MutationObserver(()=>{if(busy)return;busy=true;requestAnimationFrame(()=>{try{apply()}finally{busy=false}})});mo.observe(document.documentElement,{childList:true,subtree:true});
setInterval(apply,1200);document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,0));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(apply,100)});apply();
})();