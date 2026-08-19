/* Koruk Asistan — Dashboard mobil son düzeltme katmanı */
(function(){
'use strict';
const PREF_KEY='oyDashboardV4KartDuzeni_v2';
function css(){if(document.getElementById('db4-final-hotfix-css'))return;const s=document.createElement('style');s.id='db4-final-hotfix-css';s.textContent=`
/* Açık tema: metinler ve sınırlar net */
#tab-panel.db4.db41{--d-text:#071b2f!important;--d-muted:#40546a!important;--d-line:#cbd6e1!important;--d-surface:#fff!important;--d-surface2:#f5f8fc!important;}
[data-theme="dark"] #tab-panel.db4.db41{--d-text:#f8fbff!important;--d-muted:#c0ccd8!important;--d-line:#31516a!important;--d-surface:#0d2438!important;--d-surface2:#122c43!important;}
.db41 .db41-info,.db41 .db41-info *{text-shadow:none!important}.db41 .db41-info .a{display:block!important;text-align:center!important;width:100%!important;color:var(--d-muted)!important;font-weight:750!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;line-height:1.2!important}.db41 .db41-info .v{text-align:center!important;color:var(--d-text)!important}.db41 .db41-info .i{text-align:center!important}.db41 .db41-info:not(.dbx-rich){display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;min-height:102px!important;padding:12px 8px!important}.db41 .db41-info.dbx-rich>.a{text-align:left!important}
/* Zil: dikey dev boşluğu kaldır, bilgiyi kartın tamamına yay */
.db41 .db4-bell{position:relative!important;min-height:0!important;overflow:hidden!important}.db41 .db4-bell #zilWidget{box-sizing:border-box!important;min-height:132px!important;height:132px!important;max-height:132px!important;padding:13px 16px!important;overflow:hidden!important;align-content:center!important}.db41 .db4-bell #zilWidget>*,.db41 .db4-bell #zilWidget>*>*{min-height:0!important;max-height:100%!important}.db41 .db4-bell:after{content:"Program ›";position:absolute;right:15px;bottom:12px;padding:5px 9px;border-radius:999px;background:var(--d-soft);color:var(--d-accent);font-size:11px;font-weight:800;pointer-events:none}
/* Hava ile zil aynı görsel ritimde */
.db41 .db4-weather #heroHavaSatir{min-height:96px!important}.db41 .db4-weather,.db41 .db4-bell{border-width:1px!important}
/* Bilgi kartı başlığı ve düzenle butonu */
.db41 .db41-head{align-items:center!important}.db41 .db41-head h2{flex:1;text-align:left;color:var(--d-text)!important}.db41 .db41-edit{color:var(--d-accent)!important;border-color:var(--d-line)!important;background:var(--d-surface2)!important}
@media(max-width:560px){.db41 .db4-bell #zilWidget{height:126px!important;min-height:126px!important;max-height:126px!important}.db41 .db41-info-grid{align-items:stretch!important}.db41 .db41-info{border-color:var(--d-line)!important}.db41 .dbx-break b,.db41 .dbx-break small{color:var(--d-muted)!important}}
`;document.head.appendChild(s)}
function ensureDefaults(){try{const raw=localStorage.getItem(PREF_KEY);if(!raw)return;const p=JSON.parse(raw);if(!p||!Array.isArray(p.info)||p.info.length===0)localStorage.removeItem(PREF_KEY);}catch(_){try{localStorage.removeItem(PREF_KEY)}catch(__){}}}
function serviceFallback(){const cards=[...document.querySelectorAll('#db41InfoGrid .db41-info')];const c=cards.find(x=>x.querySelector('.a')?.textContent?.trim()==='Servisler');if(!c)return;const out=c.querySelector('.v');if(!out||Number(out.textContent)>0)return;const legacy=document.getElementById('dashStats');if(legacy){for(const k of [...legacy.children]){const t=(k.textContent||'').replace(/\s+/g,' ').trim();if(!/Servis/i.test(t))continue;const n=(t.match(/\b\d+\b/)||[])[0];if(n!=null&&Number(n)>0){out.textContent=n;return}}}
/* Taşıma ekranında render edilmiş satırlar varsa onları da güvenli fallback olarak say. */
const rows=document.querySelectorAll('#servislerListesi .evrak-row');if(rows.length)out.textContent=String(rows.length)}
function bellPolish(){const z=document.getElementById('zilWidget');if(!z)return;z.querySelectorAll('[style]').forEach(e=>{if(/min-height|height|max-height/i.test(e.getAttribute('style')||'')){e.style.minHeight='0';e.style.maxHeight='100%'}})}
function run(){css();ensureDefaults();serviceFallback();bellPolish();if(typeof window.dashboardBilgiKartlariYenile==='function')window.dashboardBilgiKartlariYenile()}
document.addEventListener('DOMContentLoaded',()=>setTimeout(run,250));let n=0;const t=setInterval(()=>{run();if(++n>60)clearInterval(t)},500);let raf=0;new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{serviceFallback();bellPolish()})}).observe(document.documentElement,{childList:true,subtree:true});
})();
