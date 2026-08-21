/* Koruk Asistan — Mobil Rol Bazlı Ana Sayfa v5
 * Admin ve öğretmen için aynı tasarım dilinde, role göre farklı içerik akışı.
 * Alt navigasyona dokunmaz; mevcut veri/widget kaynaklarını yeniden kullanır.
 */
(function(){
'use strict';

const Q=(s,r=document)=>r.querySelector(s);
const QA=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function arr(name){
  try{return eval(`typeof ${name} !== 'undefined' ? ${name} : []`) || [];}catch(_){return[];}
}
function val(name){
  try{return eval(`typeof ${name} !== 'undefined' ? ${name} : null`);}catch(_){return null;}
}
function todayKey(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function dateKey(v){
  if(!v)return'';
  try{const d=v?.toDate?v.toDate():new Date(v);if(isNaN(d))return'';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}catch(_){return'';}
}
function done(x){
  const s=String(x?.durum||x?.status||'').toLocaleLowerCase('tr');
  return x?.tamamlandi===true||x?.tamam===true||['tamamlandı','tamamlandi','arşivlendi','arsivlendi','kapalı','kapali','teslim edildi','teslim_edildi'].includes(s);
}
function openTab(tab){
  try{
    if(typeof sekmeAc==='function') return sekmeAc(tab);
    Q(`[data-tab="${tab}"]`)?.click();
  }catch(_){ }
}
window.db5OpenTab=openTab;

function currentUser(){return val('AKTIF_KULLANICI')||window.AKTIF_KULLANICI||null;}
function currentTeacher(){
  try{if(typeof bagliOgretmenimGetir==='function') return bagliOgretmenimGetir();}catch(_){ }
  const u=currentUser();
  if(!u?.bagliOgretmenId)return null;
  return arr('ogretmenler').find(x=>x.id===u.bagliOgretmenId)||null;
}
function isAdmin(){return !!currentUser()?.admin;}
function displayName(){
  const t=currentTeacher();
  if(t) return `${t.ad||''} ${t.soyad||''}`.trim();
  const u=currentUser();
  return u?.ad||u?.kullaniciAdi||'Kullanıcı';
}
function greeting(){
  const h=new Date().getHours();
  if(h<11)return'Günaydın';
  if(h<18)return'Merhaba';
  return'İyi akşamlar';
}
function prettyDate(){
  return new Intl.DateTimeFormat('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
}

function css(){
 if(Q('#db5-css'))return;
 const s=document.createElement('style');s.id='db5-css';s.textContent=`
#tab-panel.db5{--bg:#f5f7fb;--card:#fff;--soft:#f8f9fc;--text:#14213d;--muted:#758198;--line:#e5e9f1;--brand:#5b36c9;--brand2:#724de0;--success:#17a673;--warn:#f59e0b;--danger:#e64d5f;--shadow:0 5px 20px rgba(27,39,67,.07);background:var(--bg)!important;color:var(--text)!important;padding:10px 12px 100px!important}
[data-theme="dark"] #tab-panel.db5{--bg:#071626;--card:#0d2135;--soft:#122a40;--text:#f6f8fc;--muted:#9fb0c2;--line:#203c55;--brand:#8a6bf0;--brand2:#9f86f5;--shadow:0 8px 24px rgba(0,0,0,.25)}
#tab-panel.db5>.page-header{display:none!important}.db5 .db5-shell{max-width:760px;margin:auto;display:flex;flex-direction:column;gap:12px}.db5 .db5-top{background:linear-gradient(135deg,#2f1b72,#6a42d5);color:white;border-radius:24px;padding:18px 16px;box-shadow:var(--shadow);overflow:hidden;position:relative}.db5 .db5-top:after{content:"";position:absolute;right:-42px;top:-60px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.08)}.db5 .db5-headrow{display:flex;align-items:center;justify-content:space-between;gap:12px;position:relative;z-index:1}.db5 .db5-brand{font-size:12px;font-weight:800;letter-spacing:.08em;opacity:.9}.db5 .db5-bell{border:0;background:rgba(255,255,255,.13);color:#fff;width:42px;height:42px;border-radius:14px;font-size:20px;position:relative}.db5 .db5-badge{position:absolute;right:-2px;top:-3px;background:#ef4444;color:#fff;font-size:10px;font-weight:800;min-width:18px;height:18px;border-radius:10px;display:flex;align-items:center;justify-content:center}.db5 .db5-greet{margin-top:16px;position:relative;z-index:1}.db5 .db5-greet h1{font-size:24px;line-height:1.15;margin:0 0 5px;font-weight:850;color:#fff}.db5 .db5-greet p{margin:0;font-size:12px;opacity:.8}.db5 .db5-topgrid{display:grid;grid-template-columns:1fr 1.18fr;gap:9px;margin-top:15px;position:relative;z-index:1}.db5 .db5-weather,.db5 .db5-clock{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.13);border-radius:18px;min-height:92px;overflow:hidden}.db5 .db5-weather #heroHavaSatir,.db5 .db5-clock #zilWidget{display:flex!important;align-items:center!important;width:100%!important;min-height:92px!important;margin:0!important;padding:10px!important;border:0!important;background:transparent!important;box-shadow:none!important;color:#fff!important}.db5 .db5-weather *,.db5 .db5-clock *{color:inherit!important}.db5 .db5-section{display:flex;flex-direction:column;gap:8px}.db5 .db5-title{display:flex;align-items:center;justify-content:space-between;padding:0 2px}.db5 .db5-title h2{margin:0;font-size:16px;font-weight:850;color:var(--text)}.db5 .db5-link{border:0;background:none;color:var(--brand);font-size:12px;font-weight:800;padding:6px}.db5 .db5-card{background:var(--card);border:1px solid var(--line);border-radius:19px;box-shadow:var(--shadow);overflow:hidden}.db5 .db5-pad{padding:13px}.db5 .db5-dynamic:empty,.db5 .db5-conditional:empty{display:none}.db5 .db5-ticker{display:flex;align-items:center;min-height:40px;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:var(--shadow)}.db5 .db5-ticker b{flex:0 0 auto;padding:0 10px;color:var(--brand);font-size:11px}.db5 .db5-ticker-track{overflow:hidden;white-space:nowrap;flex:1}.db5 .db5-ticker-track span{display:inline-block;padding-left:100%;animation:db5ticker 28s linear infinite;font-size:12px;color:var(--text)}@keyframes db5ticker{to{transform:translateX(-100%)}}.db5 .db5-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}.db5 .db5-stat{min-height:118px;padding:12px;background:var(--card);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow);text-align:left;color:var(--text);cursor:pointer}.db5 .db5-stat .k{font-size:11px;color:var(--muted);font-weight:800;text-transform:uppercase}.db5 .db5-stat .n{font-size:27px;font-weight:900;margin:5px 0}.db5 .db5-stat .sub{font-size:10.5px;color:var(--muted);line-height:1.5}.db5 .db5-links{display:flex;gap:8px;overflow:auto;padding-bottom:2px;scrollbar-width:none}.db5 .db5-links>*{flex:0 0 76px}.db5 .db5-links button{width:76px;min-height:72px;border:1px solid var(--line);background:var(--card);border-radius:16px;color:var(--text);font-size:10px;font-weight:700;box-shadow:var(--shadow)}.db5 .db5-list{display:flex;flex-direction:column}.db5 .db5-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px 12px;border-bottom:1px solid var(--line)}.db5 .db5-row:last-child{border-bottom:0}.db5 .db5-row strong{font-size:12.5px;display:block}.db5 .db5-row small{font-size:10.5px;color:var(--muted)}.db5 .db5-chip{font-size:10px;font-weight:800;border-radius:999px;padding:5px 8px;background:var(--soft);color:var(--brand);white-space:nowrap}.db5 .db5-teacher-hero{border:1px solid color-mix(in srgb,var(--brand) 35%,var(--line));background:linear-gradient(145deg,var(--card),color-mix(in srgb,var(--brand) 7%,var(--card)));padding:14px}.db5 .db5-teacher-hero .live{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}.db5 .db5-teacher-hero .live b{font-size:11px;color:var(--brand)}.db5 .db5-teacher-hero h3{font-size:19px;margin:0 0 4px}.db5 .db5-outcomes{margin-top:12px;padding-top:11px;border-top:1px solid var(--line)}.db5 .db5-outcomes strong{font-size:11px;color:var(--muted)}.db5 .db5-outcomes ul{margin:8px 0 0;padding-left:18px;font-size:12px;line-height:1.55}.db5 .db5-duty-check{display:flex;align-items:center;gap:9px;padding:12px;font-size:12px}.db5 .db5-duty-check input{width:19px;height:19px;accent-color:var(--brand)}.db5 .db5-quick{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.db5 .db5-quick button{border:1px solid var(--line);background:var(--card);border-radius:16px;min-height:76px;padding:8px 4px;color:var(--text);box-shadow:var(--shadow);font-size:10px;font-weight:750}.db5 .db5-quick i{display:block;font-style:normal;font-size:23px;margin-bottom:5px}.db5 .db5-calendar-strip{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;padding:10px}.db5 .db5-day{text-align:center;padding:7px 2px;border-radius:12px;font-size:10px;color:var(--muted)}.db5 .db5-day b{display:block;font-size:14px;color:var(--text);margin-top:3px}.db5 .db5-day.today{background:var(--brand);color:#fff}.db5 .db5-day.today b{color:#fff}.db5 .db5-backtop{position:fixed;right:14px;bottom:88px;width:42px;height:42px;border:0;border-radius:14px;background:var(--brand);color:white;box-shadow:0 8px 20px rgba(91,54,201,.3);font-size:20px;z-index:50;display:none}.db5 .db5-source{display:none!important}.db5 .db5-preserved>[data-kart-id],.db5 .db5-preserved>.card{margin:0!important}.db5 .db5-empty{padding:14px;color:var(--muted);font-size:12px;text-align:center}
@media(max-width:390px){.db5 .db5-topgrid{grid-template-columns:1fr}.db5 .db5-stats{gap:6px}.db5 .db5-stat{padding:10px;min-height:110px}.db5 .db5-quick{grid-template-columns:repeat(4,1fr);gap:6px}.db5 .db5-quick button{font-size:9.5px}}
@media(min-width:700px){#tab-panel.db5{padding-left:18px!important;padding-right:18px!important}.db5 .db5-stats{grid-template-columns:repeat(4,1fr)}.db5 .db5-stat{min-height:126px}}
@media(prefers-reduced-motion:reduce){.db5 .db5-ticker-track span{animation:none;padding-left:8px}}
`;
 document.head.appendChild(s);
}

function section(title,more){
 const s=document.createElement('section');s.className='db5-section';
 const h=document.createElement('div');h.className='db5-title';h.innerHTML=`<h2>${esc(title)}</h2>${more?`<button type="button" class="db5-link">${esc(more.label||'Tümü')} ›</button>`:''}`;
 if(more)Q('button',h).addEventListener('click',more.action);
 s.append(h);return s;
}
function card(html='',cls=''){const d=document.createElement('div');d.className=`db5-card ${cls}`;d.innerHTML=html;return d;}
function cardByTitle(root,needle){
 const low=needle.toLocaleLowerCase('tr');
 return QA('[data-kart-id],.card',root).find(el=>String(el.textContent||'').toLocaleLowerCase('tr').includes(low));
}
function lookupName(listName,id,fields=['ad']){
 const x=arr(listName).find(v=>v.id===id);if(!x)return'';
 return fields.map(f=>x[f]).filter(Boolean).join(' ').trim();
}

function notificationCount(){
 const b=todayKey();
 const hats=arr('hatirlaticilar').filter(x=>!done(x)&&(!dateKey(x.tarih||x.sonTarih)||dateKey(x.tarih||x.sonTarih)===b)).length;
 const tasks=arr('gorevler').filter(x=>!done(x)&&dateKey(x.sonTarih||x.tarih)===b).length;
 return hats+tasks;
}
function adminStats(){
 const teachers=arr('ogretmenler');
 const students=arr('ogrenciler').length?arr('ogrenciler'):arr('ogrenciVeliler');
 const classes=arr('siniflar');
 const buses=arr('servisler');
 const femaleT=teachers.filter(x=>['kadın','kadin','kız','kiz'].includes(String(x.cinsiyet||'').toLocaleLowerCase('tr'))).length;
 const maleT=Math.max(0,teachers.length-femaleT);
 const className=id=>lookupName('siniflar',id,['ad']);
 const primary=students.filter(x=>{const n=parseInt(className(x.sinifId)||x.sinifAdi);return n>=1&&n<=4});
 const middle=students.filter(x=>{const n=parseInt(className(x.sinifId)||x.sinifAdi);return n>=5&&n<=8});
 const girls=a=>a.filter(x=>['kız','kiz','kadın','kadin'].includes(String(x.cinsiyet||'').toLocaleLowerCase('tr'))).length;
 return [
  {k:'Personel',n:teachers.length,sub:`${femaleT} Kadın • ${maleT} Erkek`,tab:'ogretmenler'},
  {k:'Öğrenci',n:students.length,sub:`İlkokul ${primary.length} (${girls(primary)} Kız • ${primary.length-girls(primary)} Erkek)<br>Ortaokul ${middle.length} (${girls(middle)} Kız • ${middle.length-girls(middle)} Erkek)`,tab:'ogrenciler'},
  {k:'Sınıflar',n:classes.length,sub:'Aktif sınıf',tab:'siniflar'},
  {k:'Servisler',n:buses.length,sub:'Aktif servis',tab:'servisler'}
 ];
}
function todayDuties(includeAdmin=false){
 const b=todayKey();
 const places=arr('nobetYerleri');
 return arr('nobetAtamalari').filter(x=>dateKey(x.tarih)===b).filter(x=>includeAdmin||!x.nobetciAmir).map(x=>({
  name:x.ogretmenAdSoyad||lookupName('ogretmenler',x.ogretmenId,['ad','soyad'])||'Öğretmen',
  place:(places.find(y=>y.id===x.yerId)||{}).ad||x.yerAdi||'Nöbet'
 }));
}
function todayLeaves(){
 const b=todayKey();
 return (arr('izinler').length?arr('izinler'):arr('ogretmenIzinleri')).filter(x=>{const a=dateKey(x.tarih||x.baslangic||x.baslangicTarihi),z=dateKey(x.bitis||x.bitisTarihi);return a===b||z===b||(a&&z&&a<=b&&z>=b)});
}
function adminSections(shell){
 const links=section('Okul Bağlantıları');const lk=document.createElement('div');lk.className='db5-links';
 const source=Q('#heroSosyalMedya');if(source){source.classList.remove('db5-source');lk.append(source);}else{
   [['🌐','Web'],['🏫','MEB'],['📘','e-Okul'],['🗂️','MEBBİS']].forEach(([i,t])=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<span style="font-size:22px">${i}</span><br>${t}`;lk.append(b)});
 }links.append(lk);shell.append(links);

 const sum=section('Okul Özeti');const sg=document.createElement('div');sg.className='db5-stats';adminStats().forEach(x=>{const b=document.createElement('button');b.className='db5-stat';b.innerHTML=`<div class="k">${x.k}</div><div class="n">${x.n}</div><div class="sub">${x.sub}</div>`;b.addEventListener('click',()=>openTab(x.tab));sg.append(b)});sum.append(sg);shell.append(sum);

 const d=section('Bugünün Nöbetçileri',{label:'Tümü',action:()=>openTab('nobet')});const dc=card('', 'db5-list');const dl=todayDuties(false);dc.innerHTML=dl.length?dl.map(x=>`<div class="db5-row"><div><strong>${esc(x.name)}</strong><small>${esc(x.place)}</small></div><span class="db5-chip">Nöbet</span></div>`).join(''):'<div class="db5-empty">Bugün için nöbet kaydı bulunmuyor.</div>';d.append(dc);shell.append(d);

 const leaves=todayLeaves();if(leaves.length){const l=section('Bugün İzinli');const lc=card('', 'db5-list');lc.innerHTML=leaves.map(x=>`<div class="db5-row"><div><strong>${esc(x.ogretmenAdSoyad||x.ad||'Öğretmen')}</strong><small>${esc(x.tur||x.izinTipi||'İzinli')}</small></div><span class="db5-chip">İzinli</span></div>`).join('');l.append(lc);shell.append(l)}

 const preservedNames=['Yaklaşan','Bugünün Ders Programı','Nöbet Programı','Yazılı'];
 preservedNames.forEach(n=>{const src=cardByTitle(Q('#tab-panel'),n);if(src&&!src.closest('.db5-shell')){const s=section(n);s.append(src);shell.append(s)}});
}

function teacherSections(shell){
 const root=Q('#tab-panel');
 const today=cardByTitle(root,'Bugünkü Derslerim');
 const annual=cardByTitle(root,'Yıllık Planlarım');
 const currentSec=section('Dersim ve Bu Haftanın Kazanımları');
 const hero=card('', 'db5-teacher-hero');
 if(today){
   const firstActive=Q('.active,.current,.simdi,[data-current="true"]',today)||Q('li,.ders-satir,.row',today);
   const txt=(firstActive?.textContent||today.textContent||'').trim().replace(/\s+/g,' ');
   hero.innerHTML=`<div class="live"><b>● DERS AKIŞI</b><span class="db5-chip">Canlı</span></div><h3>${esc(txt.slice(0,90)||'Bugünkü dersleriniz')}</h3><div class="db5-outcomes"><strong>BU HAFTANIN KAZANIMLARI</strong><div id="db5AnnualSlot" style="margin-top:8px"></div></div>`;
 }else hero.innerHTML='<div class="db5-empty">Bugünkü ders programınız yükleniyor…</div>';
 currentSec.append(hero);shell.append(currentSec);
 const slot=Q('#db5AnnualSlot',hero);if(annual&&slot){annual.classList.remove('db5-source');slot.append(annual)}

 if(today){const s=section('Bugünkü Derslerim',{label:'Haftalık',action:()=>openTab('dersProgrami')});today.classList.remove('db5-source');s.append(today);shell.append(s)}

 const me=currentTeacher();const duties=todayDuties(true).filter(x=>!me||x.name.toLocaleLowerCase('tr').includes(String(me.ad||'').toLocaleLowerCase('tr')));
 if(duties.length){const s=section('Bugünkü Nöbetim');const c=card('', 'db5-list');const key=`nobetDefteri:${todayKey()}:${currentUser()?.uid||currentUser()?.id||'u'}`;let checked=false;try{checked=localStorage.getItem(key)==='1'}catch(_){}
 c.innerHTML=`<div class="db5-row"><div><strong>${esc(duties[0].place)}</strong><small>Bugünkü nöbet göreviniz</small></div><span class="db5-chip">Bugün</span></div><label class="db5-duty-check"><input id="db5DutyDone" type="checkbox" ${checked?'checked':''}> Nöbet defterini doldurdum</label>`;
 Q('#db5DutyDone',c)?.addEventListener('change',e=>{try{localStorage.setItem(key,e.target.checked?'1':'0')}catch(_){}});s.append(c);shell.append(s)}

 [['Sınavlarım','sınav'],['Teslim Edilecek Evraklar','teslim'],['Notlarım','not']].forEach(([title,needle])=>{const src=cardByTitle(root,needle);if(src&&!src.closest('.db5-shell')){const s=section(title,{label:'Tümü',action:()=>openTab(needle==='not'?'notlar':needle==='sınav'?'sinavlar':'evrak')});src.classList.remove('db5-source');s.append(src);shell.append(s)}});

 const quick=section('Hızlı İşlemler',{label:'Düzenle',action:()=>{try{if(typeof dashboardDuzenle==='function')dashboardDuzenle();}catch(_){}}});const q=document.createElement('div');q.className='db5-quick';[
  ['📝','Sınav Ekle',()=>openTab('sinavlar')],['🗒️','Not Ekle',()=>openTab('notlar')],['💬','Mesaj Gönder',()=>openTab('mesajlar')],['📚','Derslerim',()=>openTab('dersProgrami')]
 ].forEach(([i,t,a])=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<i>${i}</i>${t}`;b.addEventListener('click',a);q.append(b)});quick.append(q);shell.append(quick);

 const cal=section('Takvim',{label:new Intl.DateTimeFormat('tr-TR',{month:'long',year:'numeric'}).format(new Date()),action:()=>openTab('takvim')});const cc=card();const strip=document.createElement('div');strip.className='db5-calendar-strip';const now=new Date();for(let i=-3;i<=3;i++){const d=new Date(now);d.setDate(now.getDate()+i);const el=document.createElement('div');el.className='db5-day'+(i===0?' today':'');el.innerHTML=`${new Intl.DateTimeFormat('tr-TR',{weekday:'short'}).format(d)}<b>${d.getDate()}</b>`;strip.append(el)}cc.append(strip);cal.append(cc);shell.append(cal);
}

function dynamicArea(shell,root){
 const candidates=['Deneme','Duyuru','Anket'];const found=[];
 candidates.forEach(n=>{const c=cardByTitle(root,n);if(c&&!c.closest('.db5-shell'))found.push(c)});
 if(!found.length)return;
 const s=document.createElement('section');s.className='db5-section db5-dynamic';found.forEach(c=>{c.classList.remove('db5-source');s.append(c)});shell.append(s);
}
function ticker(shell){
 const news=arr('haberler');
 const text=news.length?news.slice(0,8).map(x=>x.baslik||x.ad||x.metin).filter(Boolean).join('   •   '):'Okul ve eğitim haberleri burada yayınlanacaktır.';
 const d=document.createElement('div');d.className='db5-ticker';d.innerHTML=`<b>HABERLER</b><div class="db5-ticker-track"><span>${esc(text)}</span></div>`;shell.append(d);
}

function build(){
 css();const root=Q('#tab-panel');if(!root)return false;if(Q('.db5-shell',root))return true;
 root.classList.remove('db4');root.classList.add('db5');
 // mevcut kartları kaynak olarak sakla; ihtiyaç olanlar role göre aşağıda taşınır
 QA(':scope>[data-kart-id],:scope>.card',root).forEach(x=>x.classList.add('db5-source'));
 const shell=document.createElement('main');shell.className='db5-shell';
 const top=document.createElement('section');top.className='db5-top';
 const count=notificationCount();top.innerHTML=`<div class="db5-headrow"><div class="db5-brand">KORUK ASİSTAN</div><button type="button" class="db5-bell" aria-label="Bildirimler">🔔${count?`<span class="db5-badge">${count}</span>`:''}</button></div><div class="db5-greet"><h1>${greeting()}, ${esc(displayName())} 👋</h1><p>${esc(prettyDate())}</p></div><div class="db5-topgrid"><div class="db5-weather"></div><div class="db5-clock"></div></div>`;
 Q('.db5-bell',top)?.addEventListener('click',()=>openTab('bildirimler'));
 const weather=Q('#heroHavaSatir',root);const bell=Q('#zilWidget',root);if(weather)Q('.db5-weather',top).append(weather);else Q('.db5-weather',top).innerHTML='<div style="padding:16px;font-size:12px">☀️ Hava durumu</div>';if(bell)Q('.db5-clock',top).append(bell);else Q('.db5-clock',top).innerHTML='<div style="padding:16px;font-size:12px">🔔 Zil sayacı yükleniyor…</div>';
 shell.append(top);
 dynamicArea(shell,root);ticker(shell);
 if(isAdmin())adminSections(shell);else teacherSections(shell);
 const preserved=document.createElement('div');preserved.className='db5-preserved';QA(':scope>[data-kart-id],:scope>.card',root).filter(x=>x.classList.contains('db5-source')).forEach(x=>preserved.append(x));if(preserved.children.length)shell.append(preserved);
 root.prepend(shell);
 const up=document.createElement('button');up.className='db5-backtop';up.type='button';up.textContent='↑';up.setAttribute('aria-label','Yukarı dön');up.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));document.body.append(up);window.addEventListener('scroll',()=>{up.style.display=window.scrollY>700?'block':'none'},{passive:true});
 return true;
}

let tries=0;const timer=setInterval(()=>{if(build()||++tries>250)clearInterval(timer)},160);
document.addEventListener('DOMContentLoaded',()=>setTimeout(build,0));
new MutationObserver(()=>{const r=Q('#tab-panel');if(r&&!Q('.db5-shell',r))setTimeout(build,0)}).observe(document.documentElement,{childList:true,subtree:true});
})();
