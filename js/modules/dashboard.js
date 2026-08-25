/* Koruk Asistan v2 — Dashboard
   Ana ekran yalnız AppStore/IndexedDB verisini kullanır.
   Firestore doğrudan okunmaz; Core SyncEngine arka planda günceller. */
(function(){
'use strict';
if(window.DashboardModule)return;
let mounted=false,unsubs=[];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=window.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
function isoToday(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}
function date(v){if(!v)return'—';try{if(typeof v.toDate==='function')return v.toDate().toLocaleDateString('tr-TR');const d=new Date(String(v).length===10?v+'T00:00:00':v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('tr-TR')}catch(_){return String(v)}}
function user(){return window.AppStore?.get?.('session.user')||window.AKTIF_KULLANICI||{}}
function firstName(){const u=user(),ad=u.ad||u.adSoyad||u.displayName||u.kullaniciAdi||'';return String(ad).trim().split(/\s+/)[0]||'Kullanıcı'}
function greeting(){const h=new Date().getHours();return h<6?'İyi geceler':h<12?'Günaydın':h<18?'İyi günler':'İyi akşamlar'}
function upcoming(list,field,days=14){const now=new Date(isoToday()+'T00:00:00'),max=new Date(now.getTime()+days*86400000);return list.filter(x=>{if(!x?.[field])return false;const d=new Date(x[field]+'T00:00:00');return d>=now&&d<=max}).sort((a,b)=>String(a[field]).localeCompare(String(b[field])))}
function shell(){return `<section class="ka-stack" data-dashboard-module>
  <div class="ka-card"><div class="ka-card__body ka-stack"><span class="ka-muted">${greeting()}</span><h2>${esc(firstName())}</h2><div class="ka-row"><span class="ka-badge" id="dashLocalStatus">Cihaz verisi</span><span class="ka-badge" id="dashSyncStatus">Senkron hazır</span></div></div></div>
  <div class="ka-grid" id="dashStats"></div>
  <div class="ka-grid">
    <section class="ka-card"><div class="ka-card__header"><h3>Yaklaşanlar</h3></div><div class="ka-card__body ka-stack" id="dashUpcoming"></div></section>
    <section class="ka-card"><div class="ka-card__header"><h3>Duyurular</h3></div><div class="ka-card__body ka-stack" id="dashAnnouncements"></div></section>
  </div>
  <section class="ka-card"><div class="ka-card__header"><h3>Bugünün Nöbeti</h3></div><div class="ka-card__body ka-stack" id="dashDuty"></div></section>
</section>`}
function stat(label,value,sub){return `<article class="ka-card"><div class="ka-card__body ka-stack"><span class="ka-muted">${esc(label)}</span><strong style="font-size:var(--ka-font-size-2xl)">${value}</strong>${sub?`<small class="ka-muted">${esc(sub)}</small>`:''}</div></article>`}
function renderStats(){const el=document.getElementById('dashStats');if(!el)return;const teachers=arr('ogretmenler'),classes=arr('siniflar'),students=arr('veliler'),pending=arr('hatirlaticilar').filter(x=>!x.tamamlandi),tasks=arr('gorevler').filter(x=>!['Tamamlandı','Tamamlandi'].includes(x.durum));el.innerHTML=[stat('Öğretmen',teachers.length),stat('Sınıf',classes.length),stat('Öğrenci',students.length),stat('Bekleyen',pending.length+tasks.length,'görev ve hatırlatıcı')].join('')}
function renderUpcoming(){const el=document.getElementById('dashUpcoming');if(!el)return;const exams=upcoming([...arr('sinavlar'),...arr('denemeSinavlari')],'tarih',14).slice(0,5),reminders=upcoming(arr('hatirlaticilar'),'tarih',14).filter(x=>!x.tamamlandi).slice(0,5),tasks=upcoming(arr('gorevler'),'sonTarih',14).filter(x=>!['Tamamlandı','Tamamlandi'].includes(x.durum)).slice(0,5);const rows=[...exams.map(x=>({title:x.ad||x.ders||'Sınav',meta:`${date(x.tarih)} · Sınav`})),...reminders.map(x=>({title:x.baslik||'Hatırlatıcı',meta:`${date(x.tarih)} · Hatırlatıcı`})),...tasks.map(x=>({title:x.baslik||'Görev',meta:`${date(x.sonTarih)} · Görev`}))].slice(0,8);el.innerHTML=rows.length?rows.map(r=>`<div class="ka-row ka-row--between"><div class="ka-grow"><strong>${esc(r.title)}</strong><div class="ka-muted">${esc(r.meta)}</div></div></div>`).join(''):'<div class="ka-empty">Yaklaşan kayıt yok.</div>'}
function renderAnnouncements(){const el=document.getElementById('dashAnnouncements');if(!el)return;const list=arr('duyurular').filter(x=>!x.arsivlendi).sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||''))).slice(0,5);el.innerHTML=list.length?list.map(x=>`<div class="ka-stack"><strong>${esc(x.baslik||'Duyuru')}</strong><div class="ka-muted">${esc(String(x.icerik||x.aciklama||'').replace(/<[^>]*>/g,'').slice(0,120))}</div></div>`).join(''):'<div class="ka-empty">Aktif duyuru yok.</div>'}
function renderDuty(){const el=document.getElementById('dashDuty');if(!el)return;const today=isoToday(),assign=arr('nobetAtamalari').filter(x=>x.tarih===today),places=arr('nobetYerleri');el.innerHTML=assign.length?assign.map(x=>{const place=places.find(p=>p.id===x.yerId);return `<div class="ka-row ka-row--between"><div class="ka-grow"><strong>${esc(x.ogretmenAdSoyad||x.ogretmenAdi||'Nöbetçi')}</strong><div class="ka-muted">${esc(x.yerAdi||place?.ad||'Nöbet yeri')}</div></div>${x.defterDolduruldu?'<span class="ka-badge ka-badge--success">Defter tamam</span>':''}</div>`}).join(''):'<div class="ka-empty">Bugün için nöbet kaydı yok.</div>'}
function renderStatus(){const local=document.getElementById('dashLocalStatus'),sync=document.getElementById('dashSyncStatus');if(local)local.textContent=AppStore?.state?.meta?.hydrated?'Cihaz verisi hazır':'Cihaz verisi hazırlanıyor';if(sync){const ui=AppStore?.state?.ui||{};sync.textContent=ui.syncing?'Senkronize ediliyor':(ui.pendingWrites?`${ui.pendingWrites} bekleyen işlem`:'Senkron hazır')}}
function render(){if(!mounted)return;renderStats();renderUpcoming();renderAnnouncements();renderDuty();renderStatus()}
function subscribe(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];['data.ogretmenler','data.siniflar','data.veliler','data.hatirlaticilar','data.gorevler','data.sinavlar','data.denemeSinavlari','data.duyurular','data.nobetAtamalari','data.nobetYerleri','ui.syncing','ui.pendingWrites','meta.hydrated','session.user'].forEach(p=>{const u=AppStore?.subscribe?.(p,()=>requestAnimationFrame(render));if(u)unsubs.push(u)})}
function mount(root=document.getElementById('v2ModuleRoot')){if(!root)return false;mounted=true;root.innerHTML=shell();subscribe();render();return true}
function unmount(){mounted=false;unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}
window.DashboardModule={mount,unmount,render};
/* auth.js geçiş uyumluluğu: eski uygulamaBaslat çağrısı v2'de dashboard'u açar. */
window.uygulamaBaslat=function(){window.AppLoader?.load?.('dashboard').then(()=>mount()).catch(e=>console.warn('[Dashboard]',e?.message||e))};
window.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='dashboard')mount()});
window.addEventListener('koruk:app-ready',()=>{if(document.getElementById('v2ModuleRoot'))window.AppLoader?.load?.('dashboard').catch(()=>{})});
})();
