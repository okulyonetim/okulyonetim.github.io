/* Koruk Asistan — Ana Sayfa v4
 * Gerçek widget'ları yeni mobil bilgi mimarisinde birleştirir.
 * Açık/koyu tema, responsive mobil/masaüstü, sosyal bağlantılar ve canlı hava/zil.
 */
(function(){
'use strict';

const Q=(s,r=document)=>r.querySelector(s);
const QA=(s,r=document)=>Array.from(r.querySelectorAll(s));

function cssKur(){
  if(Q('#dashboard-v4-css')) return;
  const s=document.createElement('style'); s.id='dashboard-v4-css';
  s.textContent=`
#tab-panel.db4{
 --d-bg:#f4f7fb;--d-surface:#ffffff;--d-surface2:#f8fafc;--d-text:#102038;--d-muted:#69798f;
 --d-line:#dfe7ef;--d-accent:#079b98;--d-accent2:#087875;--d-soft:#e8f7f6;
 --d-shadow:0 8px 25px rgba(22,42,68,.08);--d-shadow2:0 3px 12px rgba(22,42,68,.06);
 background:var(--d-bg)!important;color:var(--d-text)!important;padding:10px 14px 100px!important;
}
[data-theme="dark"] #tab-panel.db4{
 --d-bg:#06192b;--d-surface:#0c2338;--d-surface2:#102940;--d-text:#f7f9fc;--d-muted:#a8b7c8;
 --d-line:#1e3c56;--d-accent:#13c7bf;--d-accent2:#31ded6;--d-soft:#0d353f;
 --d-shadow:0 10px 28px rgba(0,0,0,.25);--d-shadow2:0 4px 14px rgba(0,0,0,.20);
}
#tab-panel.db4>.page-header{display:none!important}
.db4 .db4-shell{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:17px}
.db4 .db4-hero{position:relative;overflow:hidden;border:1px solid var(--d-line);border-radius:27px;padding:22px;background:linear-gradient(145deg,var(--d-surface),var(--d-surface2));box-shadow:var(--d-shadow)}
.db4 .db4-hero:before{content:"";position:absolute;width:190px;height:190px;border-radius:50%;right:-60px;top:-80px;background:radial-gradient(circle,rgba(255,194,49,.42),rgba(255,194,49,.08) 52%,transparent 70%);animation:db4float 6s ease-in-out infinite;pointer-events:none}
[data-theme="dark"] .db4 .db4-hero:before{background:radial-gradient(circle,rgba(42,111,255,.31),rgba(25,210,198,.08) 53%,transparent 72%)}
.db4 .db4-greeting{position:relative;z-index:1;padding-right:68px}.db4 .db4-greeting .dash-hero-hi{font-size:clamp(26px,7vw,38px)!important;line-height:1.08!important;font-weight:850!important;letter-spacing:-.035em;color:var(--d-text)!important}.db4 .db4-greeting #panelTarih{margin-top:8px!important;font-size:13.5px!important;font-weight:650!important;color:var(--d-muted)!important}
.db4 .db4-live{position:relative;z-index:1;display:grid;grid-template-columns:.9fr 1.1fr;gap:10px;margin-top:19px}
.db4 .db4-weather,.db4 .db4-bell{min-width:0;border:1px solid var(--d-line);border-radius:20px;background:color-mix(in srgb,var(--d-surface) 91%,transparent);box-shadow:var(--d-shadow2);overflow:hidden;transition:transform .18s ease,border-color .18s ease}
.db4 .db4-weather:active,.db4 .db4-bell:active{transform:scale(.987);border-color:var(--d-accent)}
.db4 .db4-weather #heroHavaSatir,.db4 .db4-bell #zilWidget{display:flex!important;width:100%!important;min-height:112px!important;margin:0!important;padding:14px!important;border:0!important;background:transparent!important;box-shadow:none!important;color:var(--d-text)!important;align-items:center!important}
.db4 .db4-weather *,.db4 .db4-bell *{color:inherit}.db4 .db4-weather .hava-konum{color:var(--d-muted)!important}
.db4 .db4-section{display:flex;flex-direction:column;gap:10px}.db4 .db4-section-head{display:flex;align-items:center;justify-content:space-between;padding:0 2px}.db4 .db4-section-head h2{font:800 20px/1.2 inherit;color:var(--d-text);margin:0}.db4 .db4-more-btn{border:0;background:none;color:var(--d-accent);font:750 12.5px/1 inherit;padding:7px 2px;cursor:pointer}
.db4 .db4-quick{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}.db4 .db4-quick button{border:1px solid var(--d-line);background:var(--d-surface);box-shadow:var(--d-shadow2);border-radius:19px;min-width:0;min-height:96px;padding:10px 4px;color:var(--d-text);font:750 11.5px/1.25 inherit;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:.16s ease}.db4 .db4-quick button:active{transform:scale(.96);background:var(--d-soft)}.db4 .db4-quick .ico{font-size:27px;line-height:1;filter:saturate(1.08)}
.db4 .db4-today{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.db4 .db4-today button{position:relative;text-align:left;border:1px solid var(--d-line);background:var(--d-surface);border-radius:18px;padding:13px 10px 12px;color:var(--d-text);box-shadow:var(--d-shadow2);cursor:pointer;min-width:0;overflow:hidden}.db4 .db4-today button:after{content:"";position:absolute;left:0;bottom:0;height:3px;width:48%;background:var(--tile,var(--d-accent));border-radius:0 8px 0 0}.db4 .db4-today .n{font-size:24px;font-weight:850;line-height:1}.db4 .db4-today .l{font-size:10.8px;color:var(--d-muted);font-weight:700;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.db4 .db4-today .ti{font-size:18px;margin-right:4px}
.db4 .db4-upcoming-card{background:var(--d-surface);border:1px solid var(--d-line);border-radius:20px;box-shadow:var(--d-shadow2);overflow:hidden;padding:3px 14px}.db4 .db4-upcoming-card #dashAjanda,.db4 .db4-upcoming-card #dashHatirlaticilar{margin:0!important}.db4 .db4-upcoming-card>*:empty:after{content:"Yaklaşan kayıt bulunmuyor.";display:block;padding:18px 4px;color:var(--d-muted);font-size:12px}
.db4 .db4-summary-social{display:grid;grid-template-columns:1fr 1fr;gap:10px}.db4 .db4-mini-card{background:var(--d-surface);border:1px solid var(--d-line);border-radius:20px;box-shadow:var(--d-shadow2);padding:15px;min-width:0}.db4 .db4-mini-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.db4 .db4-mini-head strong{font-size:16px;color:var(--d-text)}.db4 .db4-mini-head span{font-size:11.5px;color:var(--d-accent);font-weight:750}
.db4 .db4-school #dashStats{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:4px!important;overflow:visible!important;padding:0!important}.db4 .db4-school #dashStats>*{min-width:0!important;width:auto!important;min-height:78px!important;padding:7px 3px!important;margin:0!important;border:0!important;border-right:1px solid var(--d-line)!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;text-align:center!important}.db4 .db4-school #dashStats>*:last-child{border-right:0!important}.db4 .db4-school #dashStats *{max-width:100%}
.db4 .db4-social #heroSosyalMedya{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px!important;margin:0!important;padding:0!important}.db4 .db4-social #heroSosyalMedya>*{min-width:0!important;margin:0!important;padding:8px 3px!important;border:1px solid var(--d-line)!important;border-radius:15px!important;background:var(--d-surface2)!important;color:var(--d-text)!important;box-shadow:none!important}.db4 .db4-social #heroSosyalMedya img{max-width:31px!important;max-height:31px!important}.db4 .db4-social #heroSosyalMedya span,.db4 .db4-social #heroSosyalMedya div{font-size:10px!important}
.db4 .db4-secondary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.db4 .db4-secondary>.card,.db4 .db4-secondary>[data-kart-id]{margin:0!important;padding:15px!important;background:var(--d-surface)!important;border:1px solid var(--d-line)!important;border-radius:20px!important;box-shadow:var(--d-shadow2)!important;color:var(--d-text)!important;min-width:0}.db4 .db4-secondary h3{color:var(--d-text)!important;font-size:15px!important}.db4 .db4-secondary .dash-tumu-link{color:var(--d-accent)!important}
.db4 .db4-hidden-source{display:none!important}.db4 [data-kart-id="bekleyenEvrak"],.db4 .dash-hizlibakis-card{display:none!important}
@keyframes db4float{50%{transform:translate(-4px,6px) scale(1.04)}}
@media(max-width:560px){#tab-panel.db4{padding:8px 12px 94px!important}.db4 .db4-shell{gap:16px}.db4 .db4-hero{padding:18px 14px;border-radius:24px}.db4 .db4-greeting{padding-right:55px}.db4 .db4-live{grid-template-columns:1fr 1.22fr;gap:8px;margin-top:16px}.db4 .db4-weather #heroHavaSatir,.db4 .db4-bell #zilWidget{min-height:105px!important;padding:10px!important}.db4 .db4-section-head h2{font-size:18px}.db4 .db4-quick{gap:7px}.db4 .db4-quick button{min-height:89px;border-radius:17px;font-size:10.5px}.db4 .db4-quick .ico{font-size:24px}.db4 .db4-today{gap:7px}.db4 .db4-today button{padding:11px 8px}.db4 .db4-today .n{font-size:21px}.db4 .db4-today .l{font-size:9.8px}.db4 .db4-summary-social{grid-template-columns:1fr}.db4 .db4-secondary{grid-template-columns:1fr}.db4 .db4-mini-card{padding:13px}}
@media(max-width:380px){.db4 .db4-live{grid-template-columns:1fr}.db4 .db4-quick{grid-template-columns:repeat(4,minmax(0,1fr));overflow-x:auto}.db4 .db4-quick button:last-child{display:none}.db4 .db4-today{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(min-width:900px){.db4 .db4-hero{padding:27px}.db4 .db4-live{grid-template-columns:.72fr 1.28fr}.db4 .db4-summary-social{grid-template-columns:.9fr 1.1fr}.db4 .db4-secondary{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(prefers-reduced-motion:reduce){.db4 *{animation:none!important;transition:none!important}}
`;
  document.head.appendChild(s);
}

function arr(ad){try{return eval('typeof '+ad+"!=='undefined' ? "+ad+" : []")||[];}catch(_){return[]}}
function tarihKey(v){if(!v)return'';try{const d=v?.toDate?v.toDate():new Date(v);if(isNaN(d))return'';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}catch(_){return''}}
function bugunKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function tamam(x){const s=String(x?.durum||x?.status||'').toLocaleLowerCase('tr');return x?.tamamlandi===true||x?.tamam===true||['tamamlandı','tamamlandi','arşivlendi','arsivlendi','kapalı','kapali'].includes(s)}
function sayilar(){
 const b=bugunKey();
 const nob=arr('nobetAtamalari').filter(x=>tarihKey(x.tarih)===b).length;
 const grv=arr('gorevler').filter(x=>!tamam(x)).length;
 const hat=arr('hatirlaticilar').filter(x=>{const t=tarihKey(x.tarih||x.baslangicTarihi||x.sonTarih);return !tamam(x)&&(!t||t===b)}).length;
 const izin=(arr('izinler').length?arr('izinler'):arr('ogretmenIzinleri')).filter(x=>{const a=tarihKey(x.tarih||x.baslangic||x.baslangicTarihi),z=tarihKey(x.bitis||x.bitisTarihi);return a===b||z===b||(a&&z&&a<=b&&z>=b)}).length;
 return{nob,grv,hat,izin};
}
function tabAc(tab){try{if(typeof sekmeAc==='function')sekmeAc(tab);else Q(`[data-tab="${tab}"]`)?.click();}catch(_){}}
function tumMenu(){try{if(window.AltNav?.menuAc)return AltNav.menuAc();if(window.AltNav?.kokAc)return AltNav.kokAc();Q('.bottom-nav .center,.bottom-nav-center,.bn-center,[data-alt-nav="menu"]')?.click();}catch(_){}}
window.db4Tab=tabAc;window.db4Tum=tumMenu;

function baslik(ad,tumuFn){const h=document.createElement('div');h.className='db4-section-head';h.innerHTML=`<h2>${ad}</h2>${tumuFn?`<button class="db4-more-btn" type="button" onclick="${tumuFn}">Tümü ›</button>`:''}`;return h}
function bolum(ad,tumuFn){const d=document.createElement('section');d.className='db4-section';d.append(baslik(ad,tumuFn));return d}

function kartKaynaklariniTemizle(p){
  Q('[data-kart-id="bekleyenEvrak"]',p)?.remove();
  Q('[data-kart-id="hizliBakis"]',p)?.classList.add('db4-hidden-source');
  Q('[data-kart-id="hizliIslemler"]',p)?.classList.add('db4-hidden-source');
  const statParent=Q('[data-kart-id="istatistikSeridi"]',p); if(statParent) statParent.classList.add('db4-hidden-source');
  const aj=Q('[data-kart-id="ajanda"]',p);if(aj)aj.classList.add('db4-hidden-source');
}

function bugunGuncelle(){const c=sayilar();const set=(id,v)=>{const e=Q(id);if(e)e.textContent=String(v)};set('#db4Nobet',c.nob);set('#db4Gorev',c.grv);set('#db4Hat',c.hat);set('#db4Izin',c.izin)}

function kur(){
 cssKur(); const p=Q('#tab-panel'); if(!p)return false;
 const greeting=Q('#heroSelamla',p),date=Q('#panelTarih',p),weather=Q('#heroHavaSatir',p),bell=Q('#zilWidget',p),social=Q('#heroSosyalMedya',p),stats=Q('#dashStats',p);
 if(!greeting||!date||!weather||!bell)return false;
 p.classList.remove('dmv2','dmv3');p.classList.add('db4');Q('#dashboard-daily-center-css')?.remove();Q('#dmv2-css')?.remove();Q('#dashboard-mobile-v3-css')?.remove();
 if(Q('.db4-shell',p)){bugunGuncelle();return true}
 kartKaynaklariniTemizle(p);
 const shell=document.createElement('div');shell.className='db4-shell';
 const hero=document.createElement('section');hero.className='db4-hero';
 const greetWrap=document.createElement('div');greetWrap.className='db4-greeting';greetWrap.append(greeting,date);
 const live=document.createElement('div');live.className='db4-live';
 const w=document.createElement('div');w.className='db4-weather';w.onclick=()=>{try{havaDurumuDetayAc()}catch(_){}};w.append(weather);
 const b=document.createElement('div');b.className='db4-bell';b.onclick=()=>{try{zilTiklandi()}catch(_){}};b.append(bell);live.append(w,b);hero.append(greetWrap,live);shell.append(hero);

 const quick=bolum('Hızlı İşlemler','db4Tum()');const q=document.createElement('div');q.className='db4-quick';q.innerHTML=`
 <button onclick="db4Tab('evrak')"><span class="ico">📄</span><span>Evrak Takibi</span></button>
 <button onclick="db4Tab('dokumanlar')"><span class="ico">📁</span><span>Dökümanlar</span></button>
 <button onclick="db4Tab('ogrenciler')"><span class="ico">👥</span><span>Öğrenciler</span></button>
 <button onclick="db4Tab('nobet')"><span class="ico">🛡️</span><span>Nöbetler</span></button>
 <button onclick="db4Tab('takvim')"><span class="ico">📅</span><span>Takvim</span></button>`;quick.append(q);shell.append(quick);

 const today=bolum('Bugün','');const tg=document.createElement('div');tg.className='db4-today';tg.innerHTML=`
 <button style="--tile:#2b8cff" onclick="db4Tab('nobet')"><div class="n"><span class="ti">🛡️</span><span id="db4Nobet">0</span></div><div class="l">Bugünkü Nöbet</div></button>
 <button style="--tile:#ff9d22" onclick="db4Tab('gorevler')"><div class="n"><span class="ti">📋</span><span id="db4Gorev">0</span></div><div class="l">Açık Görev</div></button>
 <button style="--tile:#9c62ef" onclick="db4Tab('takvim')"><div class="n"><span class="ti">📅</span><span id="db4Hat">0</span></div><div class="l">Hatırlatıcı</div></button>
 <button style="--tile:#15bfae" onclick="db4Tab('ogretmenler')"><div class="n"><span class="ti">🏥</span><span id="db4Izin">0</span></div><div class="l">İzinli Personel</div></button>`;today.append(tg);shell.append(today);

 const up=bolum('Yaklaşanlar',"db4Tab('takvim')");const uc=document.createElement('div');uc.className='db4-upcoming-card';const ajanda=Q('#dashAjanda',p)||Q('#dashHatirlaticilar',p);if(ajanda)uc.append(ajanda);up.append(uc);shell.append(up);

 const ss=document.createElement('section');ss.className='db4-summary-social';
 const school=document.createElement('div');school.className='db4-mini-card db4-school';school.innerHTML='<div class="db4-mini-head"><strong>Okul Özeti</strong><span>Detaylar ›</span></div>';if(stats)school.append(stats);ss.append(school);
 const soc=document.createElement('div');soc.className='db4-mini-card db4-social';soc.innerHTML='<div class="db4-mini-head"><strong>Sosyal & Bağlantılar</strong><span>Tümü ›</span></div>';if(social)soc.append(social);else soc.insertAdjacentHTML('beforeend','<div style="font-size:12px;color:var(--d-muted)">Bağlantılar yükleniyor…</div>');ss.append(soc);shell.append(ss);

 const secondary=document.createElement('section');secondary.className='db4-secondary';const kullanilan=new Set(['hizliIslemler','hizliBakis','istatistikSeridi','ajanda','bekleyenEvrak']);
 QA(':scope>[data-kart-id]',p).forEach(el=>{if(!kullanilan.has(el.dataset.kartId))secondary.append(el)});if(secondary.children.length)shell.append(secondary);
 const oldHero=Q('.dash-hero',p);if(oldHero)oldHero.remove();p.prepend(shell);bugunGuncelle();return true;
}

let deneme=0;const t=setInterval(()=>{if(kur()||++deneme>160)clearInterval(t)},100);
document.addEventListener('DOMContentLoaded',()=>setTimeout(kur,0));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)bugunGuncelle()});setInterval(bugunGuncelle,60000);
new MutationObserver(()=>{const p=Q('#tab-panel');if(p&&!Q('.db4-shell',p))setTimeout(kur,0)}).observe(document.documentElement,{childList:true,subtree:true});
})();
