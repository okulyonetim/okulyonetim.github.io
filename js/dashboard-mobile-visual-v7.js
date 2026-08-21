/* Koruk Asistan — Mobil Dashboard Görsel/Etkinlik Katmanı v7.2 */
(function(){
'use strict';
if(window.__db7VisualV72)return;window.__db7VisualV72=true;
if(!window.matchMedia('(max-width:1023px)').matches)return;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
function gv(n){try{return eval(`typeof ${n}!=='undefined'?${n}:null`)}catch(_){return null}}
function list(n){const v=gv(n);return Array.isArray(v)?v:[]}
function openTab(name){try{if(typeof sekmeAc==='function')return sekmeAc(name)}catch(_){}document.querySelector(`[data-tab="${name}"]`)?.click()}

const remote={ogretmenler:null,siniflar:null,veliler:null,servisler:null};
let remoteStarted=false;
function startRemote(){
 if(remoteStarted)return;const db=gv('db');if(!db||typeof db.collection!=='function')return;
 remoteStarted=true;
 const defs=[['ogretmenler','oy_ogretmenler'],['siniflar','oy_siniflar'],['veliler','oy_veliler'],['servisler','oy_servisler']];
 defs.forEach(([key,col])=>{try{db.collection(col).onSnapshot(s=>{remote[key]=s.docs.map(d=>({id:d.id,...d.data()}));scheduleApply()},e=>console.warn('[DB7]',col,e))}catch(e){console.warn('[DB7]',col,e)}});
}
function data(name){return Array.isArray(remote[name])?remote[name]:list(name)}

function css(){if($('#db7-visual-css'))return;const s=document.createElement('style');s.id='db7-visual-css';s.textContent=`
.db6 .db6-title h2{display:flex;align-items:center;gap:8px;font-size:18px!important}.db6 .db6-title h2 .db7-title-ico{font-size:20px;line-height:1}
.db6 .db6-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}.db6 .db6-stat{position:relative;min-height:126px!important;padding:14px!important;border-radius:22px!important;overflow:hidden;background:linear-gradient(145deg,var(--card),color-mix(in srgb,var(--brand) 5%,var(--card)))!important}.db6 .db6-stat:after{content:'';position:absolute;width:76px;height:76px;border-radius:50%;right:-24px;top:-24px;background:color-mix(in srgb,var(--brand) 12%,transparent)}.db6 .db7-stat-icon{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;font-size:22px;background:color-mix(in srgb,var(--brand) 12%,var(--card));margin-bottom:8px}.db6 .db6-stat .k{font-size:10px!important;letter-spacing:.04em}.db6 .db6-stat .n{font-size:30px!important;margin:2px 0 5px!important}.db6 .db6-stat .sub{font-size:10px!important;line-height:1.42!important}
.db6 .db7-social-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-auto-flow:column!important;gap:8px!important;width:100%!important;align-items:stretch!important}.db6 .db7-social-grid>*{min-width:0!important;width:auto!important;margin:0!important}.db6 .db7-social-btn{border:1px solid var(--line)!important;background:var(--card)!important;color:var(--text)!important;border-radius:18px!important;min-height:88px!important;padding:10px 3px!important;box-shadow:var(--shadow)!important;font-size:10px!important;font-weight:800!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:7px!important}.db6 .db7-social-btn .ico{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:var(--soft);font-size:23px}.db6 #heroSosyalMedya{display:none!important}
.db6 .db6-ticker{cursor:pointer;min-height:46px!important}.db6 .db6-ticker b{font-size:12px!important;z-index:2;background:var(--card);flex:0 0 auto!important}.db6 .db6-ticker-track{overflow:hidden!important;position:relative!important;min-width:0!important;flex:1!important;height:46px!important}.db6 .db7-news-run{position:absolute!important;left:0;top:0;height:46px;display:flex!important;align-items:center!important;gap:30px!important;white-space:nowrap!important;width:max-content!important;will-change:transform}.db6 .db7-news-item{border:0!important;background:none!important;color:var(--text)!important;font:inherit!important;font-size:12px!important;font-weight:700!important;padding:12px 0!important;cursor:pointer!important;white-space:nowrap!important}.db6 .db7-news-item:before{content:'📰';margin-right:6px}
.db6 .db6-chip{writing-mode:horizontal-tb!important;white-space:nowrap!important;min-width:62px!important;text-align:center!important;line-height:1.2!important;word-break:normal!important}.db6 .db6-row{grid-template-columns:minmax(0,1fr) auto!important}.db6 .db6-row strong{display:flex!important;align-items:center;min-width:0}.db6 .db6-row strong .db7-row-ico{margin-right:7px;flex:0 0 auto}.db6 .db6-weekday-head{display:flex!important;align-items:center!important}.db6 .db6-weekday-head .db7-row-ico{margin-right:6px}.db6 .db6-note-row{display:flex;align-items:flex-start;gap:7px}
.db6 .db6-headrow{justify-content:space-between!important}.db6 .db6-headrow .db6-bell{display:none!important}.db6 .db7-settings{border:1px solid rgba(255,255,255,.18)!important;background:rgba(255,255,255,.14)!important;color:#fff!important;width:44px!important;height:44px!important;border-radius:14px!important;display:grid!important;place-items:center!important;font-size:21px!important;position:relative!important;z-index:3!important}
@media(max-width:390px){.db6 .db7-social-btn{min-height:78px!important}.db6 .db7-social-btn .ico{width:37px;height:37px;font-size:20px}.db6 .db7-social-grid{gap:6px!important}}
`;document.head.appendChild(s)}

function titleIcon(title){const map={'Okul Özeti':'📊','Sosyal Medya':'🌐','Bugünün Nöbetçileri':'🛡️','Bugün İzinli':'🏥','Yaklaşan Etkinlik ve Görevler':'📌','Şu Anki Dersler':'📚','Haftanın Nöbet Programı':'📅','Yaklaşan Yazılı Sınavlar':'📝','Ders Programım':'📖','Notlarım':'🗒️','Bugünkü Derslerim':'📚','Sınavlarım':'📝','Teslim Edilecek Evraklar':'📂','Hızlı İşlemler':'⚡','Takvim':'🗓️','Bugünkü Nöbetim':'🛡️','Dersim ve Bu Haftanın Kazanımları':'🎯'};return map[title]||'✨'}
function decorateTitles(){$$('.db6-section .db6-title h2').forEach(h=>{if($('.db7-title-ico',h))return;const raw=h.textContent.trim(),ico=document.createElement('span');ico.className='db7-title-ico';ico.textContent=titleIcon(raw);h.prepend(ico)})}

function summaryNumbers(){
 const classes=data('siniflar'),pupils=data('veliler'),services=data('servisler'),teachers=data('ogretmenler');
 const women=teachers.filter(x=>{const c=String(x.cinsiyet||'').toLocaleLowerCase('tr');return c.includes('kadın')||c.includes('kız')}).length;
 const men=teachers.filter(x=>String(x.cinsiyet||'').toLocaleLowerCase('tr').includes('erkek')).length;
 const byClass=id=>classes.find(s=>s.id===id)||null;
 function levelFromClass(s){return Number(s?.seviye||String(s?.ad||'').match(/\d+/)?.[0]||0)}
 function levelOf(p){return levelFromClass(byClass(p.sinifId))||Number(String(p.sinif||p.sinifAdi||'').match(/\d+/)?.[0]||0)}
 let primary={t:0,k:0,e:0},middle={t:0,k:0,e:0};
 if(pupils.length){pupils.forEach(p=>{const lvl=levelOf(p),target=lvl&&lvl<=4?primary:middle;target.t++;const c=String(p.cinsiyet||'').toLocaleLowerCase('tr');if(c.includes('kız'))target.k++;else if(c.includes('erkek'))target.e++})}
 else classes.forEach(s=>{const target=levelFromClass(s)<=4?primary:middle;const k=Number(s.kizSayisi||0),e=Number(s.erkekSayisi||0),t=Number(s.ogrenciSayisi||k+e||0);target.t+=t;target.k+=k;target.e+=e});
 const activeServices=services.filter(s=>!['pasif','iptal','silindi'].includes(String(s.durum||'aktif').toLocaleLowerCase('tr'))).length;
 return {personel:teachers.length,women,men,ogrenci:primary.t+middle.t,primary,middle,sinif:classes.length,servis:activeServices};
}
function decorateSummary(){
 const sec=$$('.db6-section').find(s=>($('.db6-title h2',s)?.textContent||'').includes('Okul Özeti'));if(!sec)return;
 const nums=summaryNumbers(),cards=$$('.db6-stat',sec),icons=['👥','🎓','🏫','🚌'];
 cards.forEach((b,i)=>{let ico=$('.db7-stat-icon',b);if(!ico){ico=document.createElement('div');ico.className='db7-stat-icon';b.prepend(ico)}ico.textContent=icons[i]||'📌'});
 if(cards[0]){const n=$('.n',cards[0]),sub=$('.sub',cards[0]);if(n)n.textContent=nums.personel;if(sub)sub.textContent=`${nums.women} Kadın • ${nums.men} Erkek`}
 if(cards[1]){const n=$('.n',cards[1]),sub=$('.sub',cards[1]);if(n)n.textContent=nums.ogrenci;if(sub)sub.innerHTML=`İlkokul ${nums.primary.t} (${nums.primary.k} Kız • ${nums.primary.e} Erkek)<br>Ortaokul ${nums.middle.t} (${nums.middle.k} Kız • ${nums.middle.e} Erkek)`}
 if(cards[2]){const n=$('.n',cards[2]);if(n)n.textContent=nums.sinif}
 if(cards[3]){const n=$('.n',cards[3]);if(n)n.textContent=nums.servis}
}

function socialSection(){
 const sec=$$('.db6-section').find(s=>{const t=$('.db6-title h2',s)?.textContent||'';return t.includes('Okul Bağlantıları')||t.includes('Sosyal Medya')});if(!sec)return;
 const h=$('.db6-title h2',sec);if(h&&!h.textContent.includes('Sosyal Medya'))h.textContent='Sosyal Medya';sec.dataset.db7='social';
 $$('.db6-links,.db7-social-grid',sec).forEach(x=>x.remove());
 const wrap=document.createElement('div');wrap.className='db7-social-grid';
 const items=[['📸','Instagram',['instagram','instagramUrl','instagramLink']],['𝕏','X',['x','xUrl','twitter','twitterUrl']],['▶️','YouTube',['youtube','youtubeUrl']],['📘','Facebook',['facebook','facebookUrl']]];
 const o=gv('okulBilgileri')||{};
 items.forEach(([ico,label,keys])=>{const b=document.createElement('button');b.type='button';b.className='db7-social-btn';b.innerHTML=`<span class="ico">${ico}</span><span>${label}</span>`;b.onclick=()=>{const url=keys.map(k=>o[k]).find(Boolean);if(url)window.open(url,'_blank');else openTab('okulBilgileri')};wrap.append(b)});sec.append(wrap)
}

let newsSig='',newsRaf=0,newsRun=null,newsTrack=null,newsX=0,newsLast=0;
function stopNews(){if(newsRaf)cancelAnimationFrame(newsRaf);newsRaf=0;newsRun=null;newsTrack=null;newsLast=0}
function animateNews(ts){if(!newsRun||!newsTrack||!document.documentElement.contains(newsRun)){stopNews();return}if(!newsLast)newsLast=ts;const dt=Math.min(50,ts-newsLast);newsLast=ts;newsX-=dt*0.045;const width=newsRun.scrollWidth;if(newsX<-width)newsX=newsTrack.clientWidth;newsRun.style.transform=`translate3d(${newsX}px,0,0)`;newsRaf=requestAnimationFrame(animateNews)}
function startNews(run,track){stopNews();newsRun=run;newsTrack=track;requestAnimationFrame(()=>{newsX=Math.max(10,track.clientWidth);newsLast=0;newsRaf=requestAnimationFrame(animateNews)})}
function renderNews(){
 const ticker=$('.db6-ticker'),track=ticker&&$('.db6-ticker-track',ticker);if(!ticker||!track)return;
 const news=list('haberler').filter(x=>x&&x.baslik).slice(0,15);if(!news.length)return;
 const sig=news.map(h=>`${h.id||''}|${h.baslik}|${h.link||''}`).join('§');
 if(sig===newsSig&&$('.db7-news-run',track)){if(!newsRaf)startNews($('.db7-news-run',track),track);return}
 newsSig=sig;track.innerHTML='';const run=document.createElement('div');run.className='db7-news-run';
 news.forEach(h=>{const b=document.createElement('button');b.type='button';b.className='db7-news-item';b.textContent=h.baslik;b.onclick=e=>{e.stopPropagation();if(h.link)window.open(h.link,'_blank');else openTab('haberler')};run.append(b)});track.append(run);ticker.onclick=()=>openTab('haberler');startNews(run,track)
}

function heroActions(){
 const head=$('.db6-headrow');if(!head)return;$$('.db6-bell',head).forEach(x=>x.style.display='none');
 let gear=$('.db7-settings',head);if(!gear){gear=document.createElement('button');gear.type='button';gear.className='db7-settings';gear.setAttribute('aria-label','Ana sayfayı düzenle');gear.textContent='⚙️';gear.onclick=()=>{try{if(typeof dashboardOzellestirModalAc==='function')return dashboardOzellestirModalAc();if(typeof dashboardV41Duzenle==='function')return dashboardV41Duzenle()}catch(_){}openTab('ayarlar')};head.append(gear)}
}
function decorateRows(){const map=[['Bugünün Nöbetçileri','🛡️'],['Bugünkü Nöbetim','🛡️'],['Bugünkü Derslerim','📚'],['Şu Anki Dersler','📚'],['Ders Programım','📖'],['Sınavlarım','📝'],['Yaklaşan Yazılı Sınavlar','📝'],['Yaklaşan Etkinlik ve Görevler','📌']];$$('.db6-section').forEach(sec=>{const title=$('.db6-title h2',sec)?.textContent||'';const ico=map.find(x=>title.includes(x[0]))?.[1];if(!ico)return;$$('.db6-row strong',sec).forEach(st=>{if($('.db7-row-ico',st))return;const i=document.createElement('span');i.className='db7-row-ico';i.textContent=ico;st.prepend(i)})});$$('.db6-weekday-head').forEach(h=>{if($('.db7-row-ico',h))return;const i=document.createElement('span');i.className='db7-row-ico';i.textContent='📅';h.prepend(i)})}
function liveWidgets(){const weather=$('#heroHavaSatir'),bell=$('#zilWidget');if(weather&&/Hava durumu$/i.test(weather.textContent.trim())){try{if(typeof konumIsteVeBaslat==='function')konumIsteVeBaslat()}catch(_){}}if(bell&&/yükleniyor/i.test(bell.textContent)){try{if(typeof renderZilSayaci==='function')renderZilSayaci()}catch(_){}}}

let applyQueued=false;
function apply(){applyQueued=false;if(!$('.db6-shell'))return false;css();startRemote();decorateTitles();decorateSummary();socialSection();renderNews();heroActions();decorateRows();liveWidgets();return true}
function scheduleApply(){if(applyQueued)return;applyQueued=true;requestAnimationFrame(apply)}
const mo=new MutationObserver(scheduleApply);mo.observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>{startRemote();apply()},1500);document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,0));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(apply,100)});apply();
})();