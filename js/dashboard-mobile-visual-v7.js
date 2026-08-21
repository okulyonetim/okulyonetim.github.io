/* Koruk Asistan — Mobil Dashboard Görsel/Etkinlik Katmanı v7 */
(function(){
'use strict';
if(window.__db7Visual)return;window.__db7Visual=true;
if(!window.matchMedia('(max-width:1023px)').matches)return;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
function gv(n){try{return eval(`typeof ${n}!=='undefined'?${n}:null`)}catch(_){return null}}
function list(n){const v=gv(n);return Array.isArray(v)?v:[]}
function css(){if($('#db7-visual-css'))return;const s=document.createElement('style');s.id='db7-visual-css';s.textContent=`
.db6 .db6-title h2{display:flex;align-items:center;gap:8px;font-size:18px!important}.db6 .db6-title h2:before{font-size:20px}
.db6 .db6-section[data-db7="summary"] .db6-title h2:before{content:'📊'}
.db6 .db6-section[data-db7="social"] .db6-title h2:before{content:'🌐'}
.db6 .db6-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
.db6 .db6-stat{position:relative;min-height:126px!important;padding:14px!important;border-radius:22px!important;overflow:hidden;background:linear-gradient(145deg,var(--card),color-mix(in srgb,var(--brand) 5%,var(--card)))!important}
.db6 .db6-stat:after{content:'';position:absolute;width:76px;height:76px;border-radius:50%;right:-24px;top:-24px;background:color-mix(in srgb,var(--brand) 12%,transparent)}
.db6 .db6-stat .db7-stat-icon{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;font-size:22px;background:color-mix(in srgb,var(--brand) 12%,var(--card));margin-bottom:8px}
.db6 .db6-stat .k{font-size:10px!important;letter-spacing:.04em}.db6 .db6-stat .n{font-size:30px!important;margin:2px 0 5px!important}.db6 .db6-stat .sub{font-size:10px!important;line-height:1.38!important}
.db6 .db7-social-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.db6 .db7-social-btn{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:18px;min-height:88px;padding:10px 4px;box-shadow:var(--shadow);font-size:10px;font-weight:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px}
.db6 .db7-social-btn .ico{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:var(--soft);font-size:23px}
.db6 .db6-ticker{cursor:pointer;min-height:46px!important}.db6 .db6-ticker b{font-size:12px!important}.db6 .db6-ticker-track{overflow:hidden;position:relative}
.db6 .db7-news-run{display:inline-flex;align-items:center;gap:22px;white-space:nowrap;padding-left:100%;animation:db7news 36s linear infinite}
.db6 .db7-news-item{border:0;background:none;color:var(--text);font:inherit;font-size:12px;font-weight:700;padding:12px 0;cursor:pointer}.db6 .db7-news-item:before{content:'📰';margin-right:6px}
@keyframes db7news{to{transform:translateX(-100%)}}
.db6 .db6-row strong:before{margin-right:7px}.db6 .db6-row[data-db7-type="duty"] strong:before{content:'🛡️'}.db6 .db6-row[data-db7-type="lesson"] strong:before{content:'📚'}.db6 .db6-row[data-db7-type="exam"] strong:before{content:'📝'}.db6 .db6-row[data-db7-type="task"] strong:before{content:'📌'}
.db6 .db6-weekday-head:before{content:'📅';margin-right:6px}.db6 .db6-exam-row:before{content:'📝';font-size:18px}.db6 .db6-note-row:before{content:'🗒️';margin-right:7px}
@media(max-width:390px){.db6 .db7-social-btn{min-height:80px}.db6 .db7-social-btn .ico{width:38px;height:38px;font-size:21px}}
`;document.head.appendChild(s)}
function openTab(name){try{if(typeof sekmeAc==='function')return sekmeAc(name)}catch(_){}document.querySelector(`[data-tab="${name}"]`)?.click()}
function decorateSummary(){const sections=$$('.db6-section');const sec=sections.find(s=>$('.db6-title h2',s)?.textContent.trim()==='Okul Özeti');if(!sec)return;sec.dataset.db7='summary';const icons=['👥','🎓','🏫','🚌'];$$('.db6-stat',sec).forEach((b,i)=>{if(!$('.db7-stat-icon',b)){const d=document.createElement('div');d.className='db7-stat-icon';d.textContent=icons[i]||'📌';b.prepend(d)}})}
function socialSection(){const sections=$$('.db6-section');let sec=sections.find(s=>['Okul Bağlantıları','Sosyal Medya'].includes($('.db6-title h2',s)?.textContent.trim()));if(!sec)return;$('.db6-title h2',sec).textContent='Sosyal Medya';sec.dataset.db7='social';const source=$('#heroSosyalMedya');if(source&&source.children.length){source.style.display='';return}
 let wrap=$('.db7-social-grid',sec);if(wrap)return;const old=$('.db6-links',sec);if(old)old.remove();wrap=document.createElement('div');wrap.className='db7-social-grid';
 const items=[['📸','Instagram','instagram'],['𝕏','X','x'],['▶️','YouTube','youtube'],['🌐','Web','web']];items.forEach(([ico,label,key])=>{const b=document.createElement('button');b.type='button';b.className='db7-social-btn';b.innerHTML=`<span class="ico">${ico}</span><span>${label}</span>`;b.addEventListener('click',()=>{const o=gv('okulBilgileri')||{};const url=o[key]||o[key+'Url']||o['sosyal'+label.replace(/[^A-Za-z]/g,'')];if(url)window.open(url,'_blank');else openTab('okulBilgileri')});wrap.append(b)});sec.append(wrap)}
function renderNews(){const ticker=$('.db6-ticker');if(!ticker)return;const track=$('.db6-ticker-track',ticker);if(!track)return;const news=list('haberler').filter(x=>x&&x.baslik).slice(0,12);if(!news.length)return;track.innerHTML='';const run=document.createElement('div');run.className='db7-news-run';news.forEach(h=>{const b=document.createElement('button');b.type='button';b.className='db7-news-item';b.textContent=h.baslik;b.addEventListener('click',e=>{e.stopPropagation();if(h.link)window.open(h.link,'_blank');else openTab('haberler')});run.append(b)});track.append(run);ticker.onclick=()=>openTab('haberler')}
function decorateRows(){const mappings=[['Bugünün Nöbetçileri','duty'],['Bugünkü Nöbetim','duty'],['Bugünkü Derslerim','lesson'],['Şu Anki Dersler','lesson'],['Ders Programım','lesson'],['Sınavlarım','exam'],['Yaklaşan Yazılı Sınavlar','exam'],['Yaklaşan Etkinlik ve Görevler','task']];$$('.db6-section').forEach(sec=>{const t=$('.db6-title h2',sec)?.textContent.trim()||'';const type=mappings.find(x=>x[0]===t)?.[1];if(type)$$('.db6-row',sec).forEach(r=>r.dataset.db7Type=type)})}
function apply(){if(!$('.db6-shell'))return false;css();decorateSummary();socialSection();renderNews();decorateRows();return true}
let n=0;const timer=setInterval(()=>{if(apply()&&++n>5)clearInterval(timer);if(n>40)clearInterval(timer)},500);document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,0));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(apply,100)});new MutationObserver(()=>requestAnimationFrame(apply)).observe(document.documentElement,{childList:true,subtree:true});
})();