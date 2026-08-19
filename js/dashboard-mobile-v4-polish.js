/* Koruk Asistan — Ana Sayfa v4.1 Mobil İnce Ayar + Kart Havuzu
 * v4 üstüne güvenli iyileştirme katmanı:
 * - açık/koyu tema kontrastı
 * - kompakt hava/zil/hero
 * - sosyal medya/okul bağlantılarını görünür bölüme taşıma
 * - eski karmaşık istatistik kartlarını sade kart havuzuyla değiştirme
 * - rol/yetki uyumlu kart ekle/çıkar/sırala
 */
(function(){
'use strict';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const PREF_KEY='oyDashboardV4KartDuzeni_v2';

function globalArray(names){
  for(const n of names){
    try{
      const v=window[n];
      if(Array.isArray(v)) return v;
    }catch(_){}
  }
  return [];
}
function count(names){return globalArray(names).length;}
function tamam(x){
  const s=String(x?.durum||x?.status||'').toLocaleLowerCase('tr-TR');
  return x?.tamamlandi===true||x?.tamam===true||['tamamlandı','tamamlandi','kapalı','kapali','arşivlendi','arsivlendi'].includes(s);
}
function activeCount(names){return globalArray(names).filter(x=>!tamam(x)).length;}
function allowed(modul){
  if(!modul) return true;
  try{if(typeof window.gorebilir==='function') return !!window.gorebilir(modul);}catch(_){}
  const node=document.querySelector(`[data-yetki-modul="${modul}"]`);
  if(!node) return true;
  if(node.classList.contains('yetki-gizli')) return false;
  return true;
}
function go(tab){try{if(typeof window.sekmeAc==='function')window.sekmeAc(tab);else document.querySelector(`[data-tab="${tab}"]`)?.click();}catch(_){}}
window.db41Go=go;

const INFO_CARDS=[
  {id:'personel',ad:'Personel',icon:'👨‍🏫',modul:'ogretmenler',tab:'ogretmenler',value:()=>count(['ogretmenler'])},
  {id:'ogrenci',ad:'Öğrenciler',icon:'🎓',modul:'ogrenciler',tab:'ogrenciler',value:()=>count(['ogrenciler'])},
  {id:'sinif',ad:'Sınıflar',icon:'🏫',modul:'siniflar',tab:'siniflar',value:()=>count(['siniflar'])},
  {id:'servis',ad:'Servisler',icon:'🚌',modul:'servisler',tab:'servisler',value:()=>count(['servisler'])},
  {id:'dokuman',ad:'Dökümanlar',icon:'📁',modul:'dokumanlar',tab:'dokumanlar',value:()=>count(['dokumanlar','dokumanListesi','dokumanlarCache'])},
  {id:'gorev',ad:'Açık Görev',icon:'📋',modul:'gorevler',tab:'gorevler',value:()=>activeCount(['gorevler'])},
  {id:'hatirlatici',ad:'Hatırlatıcı',icon:'⏰',modul:'hatirlaticilar',tab:'hatirlaticilar',value:()=>activeCount(['hatirlaticilar'])},
  {id:'not',ad:'Notlar',icon:'📝',modul:'notlar',tab:'notlar',value:()=>count(['notlar'])},
  {id:'sinav',ad:'Sınavlar',icon:'🧪',modul:'sinavIslemleri',tab:'yaziliSinavlar',value:()=>count(['sinavlar','yaziliSinavlar'])},
  {id:'duyuru',ad:'Duyurular',icon:'📢',modul:'duyurular',tab:'duyurular',value:()=>count(['duyurular'])},
  {id:'mesaj',ad:'Mesajlar',icon:'💬',modul:'mesajlasma',tab:'mesajlasma',value:()=>count(['mesajlar','mesajlarim'])},
  {id:'nobet',ad:'Nöbetler',icon:'🛡️',modul:'nobet',tab:'nobet',value:()=>count(['nobetAtamalari'])}
];

function css(){
  if($('#dashboard-v41-polish-css'))return;
  const s=document.createElement('style');
  s.id='dashboard-v41-polish-css';
  s.textContent=`
#tab-panel.db4.db41{
 --d-bg:#f3f6fa;--d-surface:#ffffff;--d-surface2:#f7f9fc;--d-text:#0b1f33;--d-muted:#53657a;
 --d-line:#d7e0e9;--d-accent:#087f7b;--d-accent2:#056b68;--d-soft:#e8f6f5;
}
[data-theme="dark"] #tab-panel.db4.db41{
 --d-bg:#061827;--d-surface:#0d2438;--d-surface2:#112b42;--d-text:#f6f9fc;--d-muted:#b6c4d2;
 --d-line:#27455d;--d-accent:#2bd3ca;--d-accent2:#62e8e1;--d-soft:#103942;
}
#tab-panel.db4.db41{background:var(--d-bg)!important;color:var(--d-text)!important}
.db41 .db4-shell{gap:14px!important}
.db41 .db4-hero{padding:17px!important;border-radius:22px!important;background:var(--d-surface)!important;border-color:var(--d-line)!important}
.db41 .db4-greeting{padding-right:44px!important}.db41 .db4-greeting .dash-hero-hi{font-size:clamp(26px,7vw,34px)!important;color:var(--d-text)!important}.db41 .db4-greeting #panelTarih{font-size:13px!important;color:var(--d-muted)!important}
.db41 .db4-live{gap:9px!important;margin-top:14px!important}
.db41 .db4-weather,.db41 .db4-bell{background:var(--d-surface2)!important;border-color:var(--d-line)!important;border-radius:17px!important;box-shadow:none!important}
.db41 .db4-weather #heroHavaSatir,.db41 .db4-bell #zilWidget{min-height:0!important;height:auto!important;padding:12px 13px!important;color:var(--d-text)!important;background:transparent!important}
.db41 .db4-weather #heroHavaSatir *,.db41 .db4-bell #zilWidget *{color:var(--d-text)!important;text-shadow:none!important}
.db41 .db4-weather #heroHavaSatir .hava-konum,.db41 .db4-weather #heroHavaSatir small,.db41 .db4-bell #zilWidget small{color:var(--d-muted)!important}
.db41 .db4-bell #zilWidget>*,.db41 .db4-weather #heroHavaSatir>*{min-height:0!important;height:auto!important;max-height:none!important}
.db41 .db4-section-head h2,.db41 .db41-title{color:var(--d-text)!important}.db41 .db4-more-btn,.db41 .db41-link{color:var(--d-accent)!important}
.db41 .db4-quick{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}.db41 .db4-quick button{min-height:82px!important;padding:9px 4px!important;border-radius:16px!important;background:var(--d-surface)!important;border-color:var(--d-line)!important;color:var(--d-text)!important;box-shadow:none!important}.db41 .db4-quick .ico{font-size:24px!important}
.db41 .db4-today{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}.db41 .db4-today button{min-height:78px!important;padding:12px!important;background:var(--d-surface)!important;color:var(--d-text)!important;border-color:var(--d-line)!important;box-shadow:none!important}.db41 .db4-today .l{color:var(--d-muted)!important;font-size:11px!important}.db41 .db4-today .n{font-size:25px!important}
.db41 .db4-upcoming-card{min-height:0!important;padding:10px 12px!important;background:var(--d-surface)!important;border-color:var(--d-line)!important;box-shadow:none!important}.db41 .db4-upcoming-card .empty-state{min-height:72px!important;padding:24px 8px!important;color:var(--d-muted)!important}
.db41 .db4-school{display:none!important}
.db41 .db41-cardzone{display:flex;flex-direction:column;gap:12px}
.db41 .db41-card{background:var(--d-surface)!important;border:1px solid var(--d-line)!important;border-radius:19px!important;padding:14px!important;color:var(--d-text)!important;box-shadow:none!important;min-width:0}
.db41 .db41-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px}.db41 .db41-head h2{font-size:18px;line-height:1.2;margin:0;color:var(--d-text)!important}.db41 .db41-edit{border:1px solid var(--d-line);background:var(--d-surface2);color:var(--d-accent);border-radius:12px;padding:7px 10px;font-weight:750;font-size:12px}
.db41 .db41-info-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.db41 .db41-info{min-width:0;border:1px solid var(--d-line);background:var(--d-surface2);border-radius:16px;padding:12px 8px;text-align:center;color:var(--d-text);cursor:pointer}.db41 .db41-info .i{font-size:25px;line-height:1.1}.db41 .db41-info .v{font-size:24px;font-weight:850;margin-top:7px;line-height:1;color:var(--d-text)}.db41 .db41-info .a{font-size:10.5px;font-weight:700;margin-top:7px;color:var(--d-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.db41 .db41-social #heroSosyalMedya{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important;margin:0!important;padding:0!important}.db41 .db41-social #heroSosyalMedya>*{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;min-height:72px!important;margin:0!important;padding:7px 3px!important;border:1px solid var(--d-line)!important;background:var(--d-surface2)!important;border-radius:15px!important;color:var(--d-text)!important;opacity:1!important;visibility:visible!important}.db41 .db41-social #heroSosyalMedya img{width:31px!important;height:31px!important;object-fit:contain}.db41 .db41-social #heroSosyalMedya span,.db41 .db41-social #heroSosyalMedya div{color:var(--d-text)!important;font-size:10px!important}
.db41 .db41-social-empty{padding:8px 2px;color:var(--d-muted);font-size:12px}
.db41 .db4-secondary{grid-template-columns:1fr!important;gap:10px!important}.db41 .db4-secondary>.card,.db41 .db4-secondary>[data-kart-id]{padding:13px!important;border-radius:17px!important;background:var(--d-surface)!important;border-color:var(--d-line)!important;color:var(--d-text)!important;box-shadow:none!important}.db41 .db4-secondary *{text-shadow:none!important}.db41 .db4-secondary h3,.db41 .db4-secondary strong{color:var(--d-text)!important}.db41 .db4-secondary .muted,.db41 .db4-secondary small,.db41 .db4-secondary .empty-state{color:var(--d-muted)!important}
.db41 [data-kart-id="bekleyenEvrak"]{display:none!important}
@media(max-width:560px){
 #tab-panel.db4.db41{padding:7px 11px 92px!important}.db41 .db4-shell{gap:13px!important}.db41 .db4-hero{padding:15px 12px!important}.db41 .db4-live{grid-template-columns:1fr!important}.db41 .db4-weather #heroHavaSatir{min-height:76px!important}.db41 .db4-bell #zilWidget{min-height:84px!important}.db41 .db41-info-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.db41 .db41-info{min-height:88px}.db41 .db41-social #heroSosyalMedya{grid-template-columns:repeat(4,minmax(0,1fr))!important}.db41 .db41-card{padding:12px!important}.db41 .db41-head h2{font-size:17px}}
@media(min-width:900px){.db41 .db4-live{grid-template-columns:.95fr 1.05fr!important}.db41 .db41-info-grid{grid-template-columns:repeat(6,minmax(0,1fr))}}
`;
  document.head.appendChild(s);
}

function readPref(){
  try{
    const x=JSON.parse(localStorage.getItem(PREF_KEY)||'null');
    if(x&&Array.isArray(x.info)) return x;
  }catch(_){}
  return null;
}
function defaultInfo(){return INFO_CARDS.filter(x=>allowed(x.modul)).slice(0,8).map(x=>x.id);}
function writePref(info){try{localStorage.setItem(PREF_KEY,JSON.stringify({info}));}catch(_){}}
function selectedInfo(){
  const p=readPref();
  const valid=new Set(INFO_CARDS.filter(x=>allowed(x.modul)).map(x=>x.id));
  const src=p?p.info:defaultInfo();
  return src.filter(id=>valid.has(id));
}

function infoCardHtml(def){
  let v=0;try{v=def.value();}catch(_){}
  return `<button type="button" class="db41-info" onclick="db41Go('${def.tab}')"><div class="i">${def.icon}</div><div class="v">${Number.isFinite(Number(v))?Number(v):0}</div><div class="a">${def.ad}</div></button>`;
}
function renderInfo(){
  const grid=$('#db41InfoGrid');if(!grid)return;
  const ids=selectedInfo();
  grid.innerHTML=ids.map(id=>INFO_CARDS.find(x=>x.id===id)).filter(Boolean).map(infoCardHtml).join('');
  if(!grid.innerHTML)grid.innerHTML='<div class="db41-social-empty">Gösterilecek bilgi kartı seçilmedi.</div>';
}

function socialMount(shell){
  let src=$('#heroSosyalMedya');
  try{if(typeof window.renderSosyalMedyaIkonlari==='function')window.renderSosyalMedyaIkonlari();}catch(_){}
  src=$('#heroSosyalMedya');
  let card=$('#db41SocialCard');
  if(!card){
    card=document.createElement('section');card.id='db41SocialCard';card.className='db41-card db41-social';
    card.innerHTML='<div class="db41-head"><h2>Okul Bağlantıları</h2></div><div id="db41SocialHost"></div>';
    const zone=$('#db41CardZone',shell)||shell;zone.appendChild(card);
  }
  const host=$('#db41SocialHost',card);
  if(src&&src!==host&&src.children.length){host.innerHTML='';host.appendChild(src);src.style.display='grid';}
  if(!host.children.length&&!$('#db41SocialEmpty',host)){
    const e=document.createElement('div');e.id='db41SocialEmpty';e.className='db41-social-empty';e.textContent='Sosyal medya ve okul sitesi bağlantıları okul bilgilerinden yüklenecek.';host.appendChild(e);
  }
}

function mountInfo(shell){
  if($('#db41InfoCard',shell))return;
  const zone=$('#db41CardZone',shell)||shell;
  const card=document.createElement('section');card.id='db41InfoCard';card.className='db41-card';
  card.innerHTML='<div class="db41-head"><h2>Bilgi Kartlarım</h2><button type="button" class="db41-edit" onclick="dashboardV41Duzenle()">✏️ Düzenle</button></div><div class="db41-info-grid" id="db41InfoGrid"></div>';
  zone.appendChild(card);renderInfo();
}

function setupCardZone(shell){
  if($('#db41CardZone',shell))return;
  const zone=document.createElement('div');zone.id='db41CardZone';zone.className='db41-cardzone';
  const secondary=$('.db4-secondary',shell);
  if(secondary)shell.insertBefore(zone,secondary);else shell.appendChild(zone);
}

function cleanOldStats(panel){
  const school=$('.db4-school',panel);if(school)school.style.display='none';
  const raw=$('[data-kart-id="istatistikSeridi"]',panel);if(raw)raw.classList.add('db4-hidden-source');
  $$('[data-kart-id="bekleyenEvrak"]',panel).forEach(x=>x.remove());
}

window.dashboardV41Duzenle=function(){
  const available=INFO_CARDS.filter(x=>allowed(x.modul));
  window._db41Temp=selectedInfo().slice();
  const draw=()=>{
    const body=document.getElementById('modalBody');if(!body)return;
    const sel=window._db41Temp||[];
    const chosen=sel.map((id,i)=>{
      const d=available.find(x=>x.id===id);if(!d)return'';
      return `<div style="display:flex;align-items:center;gap:7px;padding:9px 10px;margin-bottom:7px;border:1px solid var(--border);border-radius:12px;background:var(--nm-bg);"><span style="font-size:20px">${d.icon}</span><span style="flex:1;font-weight:650">${d.ad}</span><button class="btn btn-ghost btn-sm" ${i===0?'disabled':''} onclick="db41Move('${id}',-1)">⬆</button><button class="btn btn-ghost btn-sm" ${i===sel.length-1?'disabled':''} onclick="db41Move('${id}',1)">⬇</button><button class="btn btn-ghost btn-sm" onclick="db41Remove('${id}')">✕</button></div>`;
    }).join('')||'<div class="empty-state">Seçili bilgi kartı yok.</div>';
    const rest=available.filter(x=>!sel.includes(x.id)).map(d=>`<button type="button" class="btn btn-ghost" style="display:flex;width:100%;justify-content:flex-start;gap:8px;margin-bottom:6px" onclick="db41Add('${d.id}')"><span>${d.icon}</span><span>+ ${d.ad}</span></button>`).join('')||'<div class="empty-state">Eklenebilir başka kart yok.</div>';
    body.innerHTML=`<div style="font-size:12px;color:var(--ink-muted);margin-bottom:10px">Rolünüzün izin verdiği bilgi kartlarını seçebilir ve sıralayabilirsiniz.</div><div style="font-weight:800;margin-bottom:7px">Gösterilen Kartlar</div><div style="max-height:280px;overflow:auto">${chosen}</div><div style="font-weight:800;margin:14px 0 7px">Eklenebilir Kartlar</div><div style="max-height:190px;overflow:auto">${rest}</div>`;
  };
  window._db41Draw=draw;
  if(typeof window.modalAc==='function'){
    window.modalAc('🏠 Ana Sayfa Bilgi Kartları','<div class="empty-state">Yükleniyor…</div>',()=>{writePref(window._db41Temp||[]);if(typeof window.modalKapat==='function')window.modalKapat();renderInfo();if(typeof window.toast==='function')window.toast('Ana sayfa kartları güncellendi.');},null,'💾 Kaydet');
    draw();
  }
};
window.db41Move=(id,dir)=>{const a=window._db41Temp||[];const i=a.indexOf(id),j=i+dir;if(i<0||j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];window._db41Draw?.();};
window.db41Remove=id=>{window._db41Temp=(window._db41Temp||[]).filter(x=>x!==id);window._db41Draw?.();};
window.db41Add=id=>{const a=window._db41Temp||[];if(!a.includes(id))a.push(id);window._db41Temp=a;window._db41Draw?.();};

function overrideMainEditor(){
  window.dashboardOzellestirModalAc=window.dashboardV41Duzenle;
}

function apply(){
  css();
  const panel=$('#tab-panel.db4');if(!panel)return false;
  const shell=$('.db4-shell',panel);if(!shell)return false;
  panel.classList.add('db41');
  cleanOldStats(panel);
  setupCardZone(shell);
  mountInfo(shell);
  socialMount(shell);
  overrideMainEditor();
  renderInfo();
  return true;
}

let tries=0;const t=setInterval(()=>{if(apply()||++tries>180)clearInterval(t);},100);
document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,0));
const mo=new MutationObserver(()=>{const p=$('#tab-panel.db4');if(p&&(!p.classList.contains('db41')||!$('#db41InfoCard',p)))setTimeout(apply,0);});
mo.observe(document.documentElement,{childList:true,subtree:true});
})();
