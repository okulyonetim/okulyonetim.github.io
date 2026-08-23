/* Koruk Asistan — Ana sayfa canlı deneme kartı v4
 * Tek DOM sahibi. Local stop-state hazır olmadan aktif kart çizmez.
 */
(function(){
'use strict';
if(window.__KH_LIVE_EXAM_CARD_V4__)return;window.__KH_LIVE_EXAM_CARD_V4__=true;
if(!matchMedia('(max-width:1023px)').matches)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function exams(){const a=window.KorukRuntimeState?.get('denemeSinavlari');if(Array.isArray(a)&&a.length)return a;return Array.isArray(window.KorukDashboardCache?.denemeSinavlari)?window.KorukDashboardCache.denemeSinavlari:[]}
function stopped(id){return !!window.KorukExamStopState?.isStopped?.(id)}
function fmt(sn){sn=Math.max(0,Math.floor(+sn||0));let h=Math.floor(sn/3600),m=Math.floor(sn%3600/60),s=sn%60;return[h,m,s].map(x=>String(x).padStart(2,'0')).join(':')}
function dk(n){n=Math.max(0,Math.round(+n||0));let h=Math.floor(n/60),m=n%60;return h?`${h} sa${m?' '+m+' dk':''}`:`${m} dk`}
function toplam(d){return d?.oturumTuru==='İki Oturum'?(+d.sozelSuresiDk||0)+(+d.araSureDk||0)+(+d.sayisalSuresiDk||0):(+d?.sinavSuresiDk||0)}
function sinif(d){let v=d?.sinflar??d?.siniflar;return Array.isArray(v)?v.join(', '):(v||'—')}
function durum(d){try{return typeof _sayacDurum==='function'?_sayacDurum(d):null}catch(_){return null}}
function sec(){
 if(window.KorukExamStopState&&!window.KorukExamStopState.ready)return null;
 return exams().map(d=>({d,ds:durum(d)})).filter(x=>x.d?.id&&!stopped(x.d.id)&&x.d?.sayacDurumu?.aktif&&x.ds&&['aktif','ara','tamam'].includes(x.ds.durum)).sort((a,b)=>(a.ds.durum==='tamam')-(b.ds.durum==='tamam')||((+a.ds.toplamKalan||+a.ds.kalanSn||9e15)-(+b.ds.toplamKalan||+b.ds.kalanSn||9e15)))[0]||null;
}
function markup(a){let d=a.d,s=a.ds||{},tam=s.durum==='tamam',ara=s.durum==='ara',p=tam?100:(s.durum==='aktif'?Math.max(0,Math.min(100,(1-(+s.oran||0))*100)):50),k=tam?'00:00:00':s.kalanSn!=null?fmt(s.kalanSn):'--:--:--',seg=tam?'Sınav tamamlandı':ara?'Ara':(s.segAd||'Sınav'),bit=s.bitisStr||s.toplam?.bit||d.bitisSaati||d.sayisalBitis||'—',bas=s.toplam?.bas||(d.oturumTuru==='İki Oturum'?(d.sozelBaslama||'—'):(d.baslamaSaati||'—'));return `<div class="klx-top"><div><div class="klx-kicker">${tam?'SON SINAV':'CANLI SINAV'}</div><div class="klx-name">${esc(d.ad||d.baslik||'Deneme Sınavı')}</div></div><span class="klx-status">${tam?'TAMAMLANDI':ara?'ARA':'DEVAM EDİYOR'}</span></div><div class="klx-main"><div class="klx-ring" style="--p:${p.toFixed(1)}"><div class="klx-ring-inner"><small>${tam?'BİTTİ':'KALAN'}</small><b class="klx-time">${k}</b></div></div><div><div class="klx-session">${tam?'✅':ara?'⏸️':'⏱️'} ${esc(seg)}</div><div class="klx-pills"><span class="klx-pill">⏰ Bitiş ${esc(bit)}</span><span class="klx-pill">👥 ${esc(sinif(d))}</span><span class="klx-pill">📋 ${esc(dk(toplam(d)))}</span><span class="klx-pill">▶ ${esc(bas)}</span></div><div class="klx-progress"><i style="width:${p.toFixed(1)}%"></i></div></div></div><div class="klx-foot"><span>${tam?'Sınav tamamlandı':'Canlı ilerleme'}</span><b>Detayları İzle ›</b></div>`}
function clean(dyn,keep){Array.from(dyn.querySelectorAll('.kh-live-exam-card')).forEach((x,i)=>{if(x!==keep||i>0)x.remove()});Array.from(dyn.children).forEach(el=>{if(el===keep)return;const t=(el.querySelector('.kh-chip')?.textContent||'').trim().toLocaleUpperCase('tr-TR');if(t==='CANLI')el.remove()})}
function sync(){const dyn=document.querySelector('#tab-panel.kh-home .kh-dynamic');if(!dyn)return false;let current=dyn.querySelector('.kh-live-exam-card'),a=sec();if(!a){if(current)current.remove();clean(dyn,null);return true}const id=String(a.d.id||'');if(stopped(id)){if(current)current.remove();return true}if(!current){current=document.createElement('article');current.className='kh-live-exam-card';dyn.prepend(current)}current.dataset.denemeId=id;current.innerHTML=markup(a);current.onclick=()=>{try{typeof denemeSayacAc==='function'?denemeSayacAc(id):typeof sekmeAc==='function'&&sekmeAc('denemeSinavlari')}catch(_){}};clean(dyn,current);return true}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})}
let tries=0;function boot(){if(sync())return;if(++tries<120)setTimeout(boot,50)}
['koruk:dashboard-render','koruk:data-updated','koruk:deneme-sayac-local','koruk:exam-stop-state','focus'].forEach(ev=>window.addEventListener(ev,schedule));document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});setInterval(()=>{if(!document.hidden&&document.querySelector('.kh-live-exam-card'))schedule()},1000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();