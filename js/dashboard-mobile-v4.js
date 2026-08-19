/* Koruk Asistan — Ana Sayfa Mobil v4
 * Tek dashboard motoru: açık/koyu tema, kompakt kartlar, gerçek widget hedefleri.
 */
(function(){
'use strict';

function cssKur(){
  if(document.getElementById('dashboard-mobile-v4-css')) return;
  const s=document.createElement('style');
  s.id='dashboard-mobile-v4-css';
  s.textContent=`
#tab-panel.dmv4{
  --d4-bg:#f5f8fb;--d4-surface:#ffffff;--d4-surface2:#f8fbfd;--d4-text:#102039;--d4-muted:#687991;
  --d4-line:#e2e9f1;--d4-accent:#079e99;--d4-accent2:#18c6c0;--d4-shadow:0 7px 22px rgba(21,45,72,.08);
  --d4-blue:#2f86ff;--d4-orange:#ff9d22;--d4-purple:#9357f2;--d4-green:#20b77b;
  background:var(--d4-bg)!important;color:var(--d4-text)!important;padding:14px 14px calc(104px + env(safe-area-inset-bottom))!important;
}
[data-theme="dark"] #tab-panel.dmv4{
  --d4-bg:#061829;--d4-surface:#0c2237;--d4-surface2:#102941;--d4-text:#f5f8fc;--d4-muted:#9fb0c2;
  --d4-line:#1b3b56;--d4-accent:#16d0c7;--d4-accent2:#1ba6a3;--d4-shadow:0 9px 26px rgba(0,0,0,.24);
}
#tab-panel.dmv4>.page-header{display:none!important}
#tab-panel.dmv4>.dash-hero,#tab-panel.dmv4>[data-kart-id],#tab-panel.dmv4>#dashSayacKarti,#tab-panel.dmv4>#haberTicker,#tab-panel.dmv4>#havaDurumuKartWrap{display:none!important}
#tab-panel.dmv4>.dmv4-root{display:flex!important}
.dmv4-root{flex-direction:column;gap:17px;width:100%;max-width:1180px;margin:0 auto;box-sizing:border-box}
.dmv4-hero{position:relative;overflow:hidden;border:1px solid var(--d4-line);border-radius:24px;background:linear-gradient(145deg,var(--d4-surface),var(--d4-surface2));box-shadow:var(--d4-shadow);padding:20px 18px 16px;isolation:isolate}
.dmv4-hero:before{content:"";position:absolute;right:-30px;top:-52px;width:178px;height:178px;border-radius:50%;background:radial-gradient(circle,rgba(255,192,41,.32),rgba(7,158,153,.10) 48%,transparent 70%);z-index:-1;animation:d4-float 6s ease-in-out infinite}
[data-theme="dark"] .dmv4-hero:before{background:radial-gradient(circle,rgba(73,86,255,.24),rgba(22,208,199,.12) 50%,transparent 72%)}
@keyframes d4-float{50%{transform:translate(-5px,7px) scale(1.05)}}
.dmv4-greeting .dash-hero-hi{font-size:clamp(26px,7vw,34px)!important;line-height:1.08!important;font-weight:850!important;letter-spacing:-.035em;color:var(--d4-text)!important;margin:0!important;max-width:78%}
.dmv4-greeting #panelTarih{font-size:13px!important;font-weight:650!important;color:var(--d4-muted)!important;margin-top:8px!important}
.dmv4-now{display:grid;grid-template-columns:1fr;gap:10px;margin-top:17px}
.dmv4-now-card{background:color-mix(in srgb,var(--d4-surface) 92%,transparent);border:1px solid var(--d4-line);border-radius:18px;min-width:0;overflow:hidden;box-shadow:0 3px 12px rgba(20,50,75,.04);transition:transform .16s ease,border-color .16s ease}
.dmv4-now-card:active{transform:scale(.99);border-color:var(--d4-accent)}
.dmv4-now-card #heroHavaSatir,.dmv4-now-card #zilWidget{display:flex!important;width:100%!important;min-height:76px!important;margin:0!important;padding:12px 14px!important;background:none!important;border:0!important;box-shadow:none!important;color:var(--d4-text)!important;align-items:center!important;box-sizing:border-box!important}
.dmv4-now-card #heroHavaSatir *,.dmv4-now-card #zilWidget *{color:inherit!important}.dmv4-now-card .hava-konum{color:var(--d4-muted)!important}
.dmv4-section{display:flex;flex-direction:column;gap:9px}.dmv4-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 2px}.dmv4-section-head h2{margin:0;color:var(--d4-text);font-size:18px;line-height:1.2;font-weight:850}.dmv4-link{border:0;background:none;color:var(--d4-accent);font:inherit;font-size:12px;font-weight:800;padding:7px 3px;cursor:pointer}
.dmv4-quick{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;overflow:visible}.dmv4-quick button{min-width:0;min-height:91px;border:1px solid var(--d4-line);border-radius:18px;background:var(--d4-surface);box-shadow:var(--d4-shadow);color:var(--d4-text);font:inherit;font-size:10.5px;font-weight:750;padding:10px 4px;display:flex;flex-direction:column;gap:7px;justify-content:center;align-items:center;text-align:center;cursor:pointer;transition:transform .15s ease,border-color .15s ease}.dmv4-quick button:active{transform:scale(.96);border-color:var(--d4-accent)}.dmv4-qicon{font-size:26px;line-height:1;filter:saturate(1.08)}
.dmv4-today{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.dmv4-today-card{position:relative;overflow:hidden;border:1px solid var(--d4-line);border-radius:18px;background:var(--d4-surface);box-shadow:var(--d4-shadow);padding:13px 11px;min-height:82px;color:var(--d4-text)}.dmv4-today-card:after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--bar,var(--d4-accent))}.dmv4-today-top{display:flex;align-items:center;gap:8px}.dmv4-today-icon{font-size:19px}.dmv4-today-card strong{font-size:23px;line-height:1;color:var(--d4-text)}.dmv4-today-card span{display:block;margin-top:8px;color:var(--d4-muted);font-size:11px;font-weight:700}
.dmv4-card{border:1px solid var(--d4-line);border-radius:20px;background:var(--d4-surface);box-shadow:var(--d4-shadow);padding:13px 14px;min-width:0;color:var(--d4-text);overflow:hidden}.dmv4-card h3{color:var(--d4-text)!important}.dmv4-card .empty-state{color:var(--d4-muted)!important;padding:14px 6px!important}
.dmv4-upcoming #dashHatirlaticilar{max-height:255px;overflow:hidden}.dmv4-upcoming #dashHatirlaticilar>*{border-bottom-color:var(--d4-line)!important}
.dmv4-school-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--d4-line);border:1px solid var(--d4-line);border-radius:19px;overflow:hidden;box-shadow:var(--d4-shadow)}.dmv4-school-stat{background:var(--d4-surface);padding:15px 7px 14px;text-align:center;min-width:0}.dmv4-school-stat i{display:block;font-style:normal;font-size:22px}.dmv4-school-stat strong{display:block;color:var(--d4-text);font-size:21px;margin-top:5px}.dmv4-school-stat span{display:block;color:var(--d4-muted);font-size:10.5px;font-weight:700;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dmv4-links{padding:12px 12px 11px}.dmv4-links #heroSosyalMedya{display:flex!important;align-items:stretch!important;justify-content:space-around!important;gap:8px!important;flex-wrap:nowrap!important;margin:0!important}.dmv4-links #heroSosyalMedya>*{flex:1 1 0!important;min-width:0!important;max-width:none!important}.dmv4-links #heroSosyalMedya a,.dmv4-links #heroSosyalMedya button{width:100%!important;min-height:70px!important;border:1px solid var(--d4-line)!important;border-radius:15px!important;background:var(--d4-surface2)!important;color:var(--d4-text)!important;box-shadow:none!important;margin:0!important;padding:8px 4px!important}.dmv4-links #heroSosyalMedya img{max-width:34px!important;max-height:34px!important}
.dmv4-recent{display:flex;flex-direction:column;gap:0}.dmv4-recent #dashSonDokumanlar{max-height:205px;overflow:hidden}.dmv4-recent #dashSonDokumanlar>*{border-bottom-color:var(--d4-line)!important}
.dmv4-legacy-hidden{display:none!important}
@media(max-width:430px){#tab-panel.dmv4{padding-left:12px!important;padding-right:12px!important}.dmv4-hero{padding:18px 14px 14px}.dmv4-greeting .dash-hero-hi{font-size:27px!important}.dmv4-quick{gap:7px}.dmv4-quick button{min-height:84px;font-size:9.8px;padding-left:2px;padding-right:2px}.dmv4-qicon{font-size:23px}.dmv4-today{gap:7px}.dmv4-today-card{padding:12px 8px}.dmv4-school-stat{padding-left:4px;padding-right:4px}.dmv4-school-stat span{font-size:9.7px}}
@media(max-width:360px){.dmv4-quick{grid-template-columns:repeat(4,minmax(68px,1fr));overflow-x:auto;scrollbar-width:none;padding-bottom:3px}.dmv4-quick button:nth-child(5){display:none}.dmv4-today{grid-template-columns:repeat(3,minmax(90px,1fr));overflow-x:auto;scrollbar-width:none}.dmv4-school-grid{grid-template-columns:repeat(4,minmax(82px,1fr));overflow-x:auto}.dmv4-school-stat{min-width:82px}}
@media(min-width:800px){.dmv4-now{grid-template-columns:1fr 1fr}.dmv4-quick button{min-height:105px}.dmv4-root{gap:20px}.dmv4-bottom-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}}
@media(prefers-reduced-motion:reduce){.dmv4-hero:before{animation:none}.dmv4-root *{transition:none!important}}
`;
  document.head.appendChild(s);
}

function arr(name){try{return eval('typeof '+name+"!=='undefined'?"+name+":[]")||[];}catch(_){return[]}}
function tamam(x){const d=String(x?.durum||x?.status||'').toLocaleLowerCase('tr');return x?.tamam===true||x?.tamamlandi===true||['tamamlandı','tamamlandi','kapalı','kapali','arşivlendi','arsivlendi'].includes(d)}
function tarihDegeri(x){return String(x?.tarih||x?.date||x?.baslangicTarihi||x?.baslangic||'').slice(0,10)}
function bugunISO(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}
function openTab(tab){try{if(typeof sekmeAc==='function')sekmeAc(tab);else document.querySelector(`[data-tab="${tab}"]`)?.click()}catch(e){console.warn('[DMV4] sekme',tab,e)}}
window.dmv4Open=openTab;
function pdfMenu(){try{if(typeof pdfIslemleriAc==='function')pdfIslemleriAc();else if(typeof AltNav!=='undefined')AltNav.menuAc()}catch(_){}}
window.dmv4Pdf=pdfMenu;

function sayilar(){
  const today=bugunISO();
  const gorev=arr('gorevler').filter(x=>!tamam(x));
  const etkinlik=arr('hatirlaticilar').filter(x=>!tamam(x)&&tarihDegeri(x)===today);
  let nobet=0;
  ['nobetAtamalari','nobetProgrami','nobetler'].some(k=>{const a=arr(k);if(a.length){nobet=a.filter(x=>!x.tarih||tarihDegeri(x)===today).length;return true}return false});
  return {nobet,gorev:gorev.length,etkinlik:etkinlik.length,personel:arr('ogretmenler').length,ogrenci:arr('veliler').length,sinif:arr('siniflar').length,servis:arr('servisler').length};
}
function todayHTML(c){return `
 <div class="dmv4-today-card" style="--bar:var(--d4-blue)" onclick="dmv4Open('nobet')"><div class="dmv4-today-top"><b class="dmv4-today-icon">🛡️</b><strong>${c.nobet}</strong></div><span>Nöbet Kaydı</span></div>
 <div class="dmv4-today-card" style="--bar:var(--d4-orange)" onclick="dmv4Open('gorevler')"><div class="dmv4-today-top"><b class="dmv4-today-icon">📋</b><strong>${c.gorev}</strong></div><span>Açık Görev</span></div>
 <div class="dmv4-today-card" style="--bar:var(--d4-purple)" onclick="dmv4Open('takvim')"><div class="dmv4-today-top"><b class="dmv4-today-icon">📅</b><strong>${c.etkinlik}</strong></div><span>Bugünkü Etkinlik</span></div>`}
function schoolHTML(c){return `
 <div class="dmv4-school-stat"><i>👤</i><strong>${c.personel}</strong><span>Personel</span></div>
 <div class="dmv4-school-stat"><i>🎓</i><strong>${c.ogrenci}</strong><span>Öğrenci</span></div>
 <div class="dmv4-school-stat"><i>🏫</i><strong>${c.sinif}</strong><span>Sınıf</span></div>
 <div class="dmv4-school-stat"><i>🚌</i><strong>${c.servis}</strong><span>Servis</span></div>`}
function head(title,allFn){const h=document.createElement('div');h.className='dmv4-section-head';h.innerHTML=`<h2>${title}</h2>${allFn?`<button class="dmv4-link" type="button" onclick="${allFn}">Tümü ›</button>`:''}`;return h}
function section(title,allFn){const s=document.createElement('section');s.className='dmv4-section';s.append(head(title,allFn));return s}

function build(){
  cssKur();
  const panel=document.getElementById('tab-panel'); if(!panel) return false;
  const hero=panel.querySelector('.dash-hero');
  const greet=panel.querySelector('#heroSelamla'),date=panel.querySelector('#panelTarih'),weather=panel.querySelector('#heroHavaSatir'),bell=panel.querySelector('#zilWidget'),social=panel.querySelector('#heroSosyalMedya');
  const upcomingTarget=panel.querySelector('#dashHatirlaticilar'),recentTarget=panel.querySelector('#dashSonDokumanlar');
  if(!hero||!greet||!date||!weather||!bell) return false;
  panel.classList.remove('dmv2','dmv3'); panel.classList.add('dmv4');
  document.getElementById('dashboard-daily-center-css')?.remove();document.getElementById('dmv2-css')?.remove();document.getElementById('dashboard-mobile-v3-css')?.remove();
  if(panel.querySelector('.dmv4-root')){refresh();return true}

  const root=document.createElement('div');root.className='dmv4-root';
  const h=document.createElement('section');h.className='dmv4-hero';
  const g=document.createElement('div');g.className='dmv4-greeting';g.append(greet,date);h.append(g);
  const now=document.createElement('div');now.className='dmv4-now';
  const wc=document.createElement('div');wc.className='dmv4-now-card';wc.append(weather);
  const bc=document.createElement('div');bc.className='dmv4-now-card';bc.append(bell);now.append(wc,bc);h.append(now);root.append(h);

  const quick=section('Hızlı İşlemler',"if(typeof AltNav!=='undefined')AltNav.menuAc()");
  const q=document.createElement('div');q.className='dmv4-quick';q.innerHTML=`
   <button type="button" onclick="dmv4Open('dokumanlar')"><span class="dmv4-qicon">📁</span>Dökümanlar</button>
   <button type="button" onclick="dmv4Open('ogrenciler')"><span class="dmv4-qicon">👥</span>Öğrenciler</button>
   <button type="button" onclick="dmv4Open('nobet')"><span class="dmv4-qicon">🛡️</span>Nöbetler</button>
   <button type="button" onclick="dmv4Open('takvim')"><span class="dmv4-qicon">📅</span>Takvim</button>
   <button type="button" onclick="dmv4Pdf()"><span class="dmv4-qicon">📄</span>PDF İşlemleri</button>`;quick.append(q);root.append(quick);

  const today=section('Bugün','');const tg=document.createElement('div');tg.className='dmv4-today';today.append(tg);root.append(today);

  if(upcomingTarget){const up=section('Yaklaşanlar',"dmv4Open('takvim')");const card=document.createElement('div');card.className='dmv4-card dmv4-upcoming';card.append(upcomingTarget);up.append(card);root.append(up)}

  const bottom=document.createElement('div');bottom.className='dmv4-bottom-grid';
  const school=section('Okul Özeti',"dmv4Open('siniflar')");const sg=document.createElement('div');sg.className='dmv4-school-grid';school.append(sg);bottom.append(school);
  if(social){const links=section('Okul Bağlantıları','');const lc=document.createElement('div');lc.className='dmv4-card dmv4-links';lc.append(social);links.append(lc);bottom.append(links)}
  root.append(bottom);

  if(recentTarget){const rec=section('Son İşlemler',"dmv4Open('dokumanlar')");const rc=document.createElement('div');rc.className='dmv4-card dmv4-recent';rc.append(recentTarget);rec.append(rc);root.append(rec)}

  panel.insertBefore(root,panel.firstChild);
  // Ana sayfada problemli/tekrarlı eski kartları kökten gizle.
  ['bekleyenEvrak','hizliBakis','hizliIslemler','istatistikSeridi','etkinlikGorev','sonDokumanlar'].forEach(id=>panel.querySelectorAll(`[data-kart-id="${id}"]`).forEach(el=>el.classList.add('dmv4-legacy-hidden')));
  refresh();return true;
}
function refresh(){const p=document.getElementById('tab-panel');if(!p?.classList.contains('dmv4'))return;const c=sayilar();const t=p.querySelector('.dmv4-today');if(t)t.innerHTML=todayHTML(c);const sg=p.querySelector('.dmv4-school-grid');if(sg)sg.innerHTML=schoolHTML(c);const social=p.querySelector('#heroSosyalMedya');if(social&&social.children.length) social.style.display='flex'}
let tries=0;const timer=setInterval(()=>{if(build()||++tries>150)clearInterval(timer)},100);
document.addEventListener('DOMContentLoaded',()=>setTimeout(build,0));document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});setInterval(refresh,60000);
new MutationObserver(()=>{const p=document.getElementById('tab-panel');if(p&&!p.querySelector('.dmv4-root'))setTimeout(build,0)}).observe(document.documentElement,{childList:true,subtree:true});
})();
