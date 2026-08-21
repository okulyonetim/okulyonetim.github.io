/* Koruk Asistan — Mobil Rol Bazlı Ana Sayfa v6 İnce Ayar
 * - Ana sayfa kartlarını gizle/sırala
 * - Rol bazlı, 4 öğeli düzenlenebilir Hızlı İşlemler
 * - Öğretmen teslim evraklarını salt okunur biçimde ana sayfaya taşı
 * - Alt navigasyon yapısına dokunmaz
 */
(function(){
'use strict';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const LAYOUT_KEY='oyDashboardV6Layout';
const QUICK_KEY='oyDashboardV6Quick';
let shellObserver=null;
let applying=false;

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function gv(n){try{return window[n]!==undefined?window[n]:eval(n)}catch(_){return null}}
function user(){return gv('AKTIF_KULLANICI')||null}
function adminMi(){return !!user()?.admin}
function teacher(){try{const f=gv('bagliOgretmenimGetir');return typeof f==='function'?f():null}catch(_){return null}}
function openTab(tab){try{const f=gv('sekmeAc');if(typeof f==='function')return f(tab);$(`[data-tab="${tab}"]`)?.click()}catch(_){}}
function toast(s){try{const f=gv('toast');if(typeof f==='function')f(s)}catch(_){}}
function readJson(k,fallback){try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??fallback}catch(_){return fallback}}
function writeJson(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}

const SECTION_KEYS={
 'Okul Özeti':'okulOzeti','Okul Bağlantıları':'okulBaglantilari','Bugünün Nöbetçileri':'bugunNobet','Bugün İzinli':'izinli',
 'Yaklaşan Etkinlik ve Görevler':'yaklasan','Şu Anki Dersler':'anlikDers','Haftanın Nöbet Programı':'haftalikNobet',
 'Yaklaşan Yazılı Sınavlar':'yazililar','Ders Programım':'programim','Notlarım':'notlar','Hızlı İşlemler':'hizli','Takvim':'takvim',
 'Şu Anki Dersim':'dersim','Sonraki Dersim':'dersim','Bugünkü Derslerim':'bugunDersler','Bugünkü Nöbetim':'nobetim',
 'Sınavlarım':'sinavlarim','Teslim Edilecek Evraklar':'teslimEvrak'
};
const FIXED_KEYS=new Set(['dersim']);

function sectionTitle(sec){return $('.db6-title h2',sec)?.textContent?.trim()||''}
function sectionKey(sec){
 if(sec.dataset.db6Key)return sec.dataset.db6Key;
 const title=sectionTitle(sec);
 const key=SECTION_KEYS[title]||('sec_'+title.toLocaleLowerCase('tr').replace(/[^a-z0-9çğıöşü]+/g,'_').replace(/^_|_$/g,''));
 sec.dataset.db6Key=key;return key;
}
function currentSections(shell){return $$(':scope > .db6-section',shell).filter(s=>!s.classList.contains('db6-dynamic'))}
function layoutDefault(shell){return currentSections(shell).map(s=>sectionKey(s))}
function layoutRead(shell){
 const raw=readJson(LAYOUT_KEY,null),all=layoutDefault(shell),valid=new Set(all);
 if(!raw||!Array.isArray(raw.order))return{order:all,hidden:[]};
 const order=raw.order.filter(x=>valid.has(x));all.forEach(x=>{if(!order.includes(x))order.push(x)});
 const hidden=Array.isArray(raw.hidden)?raw.hidden.filter(x=>valid.has(x)&&!FIXED_KEYS.has(x)):[];
 return{order,hidden};
}
function layoutApply(){
 const shell=$('.db6-shell');if(!shell||applying)return;applying=true;
 try{
  const pref=layoutRead(shell),map=new Map(currentSections(shell).map(s=>[sectionKey(s),s]));
  pref.order.forEach(k=>{const s=map.get(k);if(s)shell.appendChild(s)});
  map.forEach((s,k)=>{s.style.display=pref.hidden.includes(k)?'none':''});
 }finally{applying=false}
}

function overlay(title,body,onSave){
 const ov=document.createElement('div');ov.className='db6x-overlay';
 ov.innerHTML=`<div class="db6x-sheet"><div class="db6x-head"><strong>${esc(title)}</strong><button type="button" data-close>✕</button></div><div class="db6x-body">${body}</div><button type="button" class="db6x-save">Kaydet</button></div>`;
 document.body.appendChild(ov);$('[data-close]',ov).onclick=()=>ov.remove();ov.onclick=e=>{if(e.target===ov)ov.remove()};$('.db6x-save',ov).onclick=()=>onSave(ov);return ov
}
function layoutEditor(){
 const shell=$('.db6-shell');if(!shell)return;const pref=layoutRead(shell),map=new Map(currentSections(shell).map(s=>[sectionKey(s),s]));
 const rows=pref.order.map((k,i)=>{const sec=map.get(k);if(!sec)return'';const fixed=FIXED_KEYS.has(k);return `<div class="db6x-layout-row" data-key="${esc(k)}"><label><input type="checkbox" ${pref.hidden.includes(k)?'':'checked'} ${fixed?'disabled':''}><span>${esc(sectionTitle(sec))}</span></label><div><button type="button" data-up ${i===0?'disabled':''}>↑</button><button type="button" data-down ${i===pref.order.length-1?'disabled':''}>↓</button></div></div>`}).join('');
 const ov=overlay('Ana Sayfayı Düzenle',`<p class="db6x-help">Kartları göster/gizle ve sıralarını değiştirin. Üst alan, zil ve alt navigasyon sabittir.</p><div id="db6xLayoutRows">${rows}</div>`,o=>{
  const els=$$('.db6x-layout-row',o),order=els.map(x=>x.dataset.key),hidden=els.filter(x=>!$('input',x).checked&&!FIXED_KEYS.has(x.dataset.key)).map(x=>x.dataset.key);writeJson(LAYOUT_KEY,{order,hidden});o.remove();layoutApply();toast('Ana sayfa düzeni kaydedildi.');
 });
 function bind(){const host=$('#db6xLayoutRows',ov);$$('.db6x-layout-row',host).forEach(row=>{const up=$('[data-up]',row),down=$('[data-down]',row);if(up)up.onclick=()=>{const p=row.previousElementSibling;if(p){host.insertBefore(row,p);bind()}};if(down)down.onclick=()=>{const n=row.nextElementSibling;if(n){host.insertBefore(n,row);bind()}}});const rs=$$('.db6x-layout-row',host);rs.forEach((r,i)=>{const u=$('[data-up]',r),d=$('[data-down]',r);if(u)u.disabled=i===0;if(d)d.disabled=i===rs.length-1})}bind();
}
window.db6DashboardDuzenle=layoutEditor;

const QUICK_TEACHER=[
 {id:'sinav',icon:'📝',ad:'Sınav Ekle',run:()=>{openTab('sinavIslemleri');setTimeout(()=>{try{const f=gv('sinavModalAc');if(typeof f==='function')f()}catch(_){}},120)}},
 {id:'not',icon:'🗒️',ad:'Not Ekle',run:()=>openTab('notlar')},{id:'mesaj',icon:'💬',ad:'Mesaj Gönder',run:()=>openTab('mesajlasma')},
 {id:'program',icon:'📚',ad:'Derslerim',run:()=>openTab('dersProgrami')},{id:'takvim',icon:'📅',ad:'Takvim',run:()=>openTab('takvim')},
 {id:'nobet',icon:'🛡️',ad:'Nöbetler',run:()=>openTab('nobet')},{id:'evrak',icon:'📄',ad:'Evraklar',run:()=>openTab('evrak')},
 {id:'yillik',icon:'🎯',ad:'Yıllık Plan',run:()=>openTab('yillikPlan')},{id:'ogrenci',icon:'👥',ad:'Öğrenciler',run:()=>openTab('ogrenciler')}
];
const QUICK_ADMIN=[
 {id:'duyuru',icon:'📢',ad:'Duyuru Ekle',run:()=>openTab('duyurular')},{id:'gorev',icon:'✅',ad:'Görev Ekle',run:()=>openTab('gorevler')},
 {id:'not',icon:'🗒️',ad:'Not Ekle',run:()=>openTab('notlar')},{id:'sinav',icon:'📝',ad:'Sınav Ekle',run:()=>{openTab('sinavIslemleri');setTimeout(()=>{try{const f=gv('sinavModalAc');if(typeof f==='function')f()}catch(_){}},120)}},
 {id:'personel',icon:'👨‍🏫',ad:'Personel',run:()=>openTab('ogretmenler')},{id:'ogrenci',icon:'👥',ad:'Öğrenciler',run:()=>openTab('ogrenciler')},
 {id:'nobet',icon:'🛡️',ad:'Nöbet',run:()=>openTab('nobet')},{id:'servis',icon:'🚌',ad:'Servis',run:()=>openTab('servisler')},
 {id:'takvim',icon:'📅',ad:'Takvim',run:()=>openTab('takvim')},{id:'mesaj',icon:'💬',ad:'Mesaj',run:()=>openTab('mesajlasma')}
];
function quickPool(){return adminMi()?QUICK_ADMIN:QUICK_TEACHER}
function quickDefault(){return adminMi()?['duyuru','gorev','not','sinav']:['sinav','not','mesaj','program']}
function quickRead(){const pool=quickPool(),valid=new Set(pool.map(x=>x.id)),raw=readJson(QUICK_KEY,null),role=adminMi()?'admin':'teacher',src=raw&&raw.role===role&&Array.isArray(raw.ids)?raw.ids:quickDefault();const ids=src.filter((x,i,a)=>valid.has(x)&&a.indexOf(x)===i).slice(0,4);for(const d of quickDefault())if(ids.length<4&&valid.has(d)&&!ids.includes(d))ids.push(d);return ids}
function quickRender(){
 const grid=$('.db6-shell .db6-quick');if(!grid)return;const map=new Map(quickPool().map(x=>[x.id,x])),items=quickRead().map(id=>map.get(id)).filter(Boolean);grid.innerHTML='';items.forEach(x=>{const b=document.createElement('button');b.type='button';b.dataset.db6Quick=x.id;b.innerHTML=`<i>${x.icon}</i>${esc(x.ad)}`;b.onclick=x.run;grid.appendChild(b)});
}
function quickEditor(){
 const pool=quickPool(),chosen=quickRead();const rows=pool.map(x=>`<label class="db6x-qrow"><input type="checkbox" value="${x.id}" ${chosen.includes(x.id)?'checked':''}><span>${x.icon}</span><b>${esc(x.ad)}</b></label>`).join('');
 overlay('Hızlı İşlemleri Düzenle',`<p class="db6x-help">En fazla 4 işlem seçin. Seçim sırası ana sayfadaki sırayı belirler.</p><div class="db6x-quick-list">${rows}</div>`,o=>{const ids=$$('input:checked',o).map(x=>x.value);if(!ids.length){toast('En az bir işlem seçin.');return}if(ids.length>4){toast('En fazla 4 işlem seçebilirsiniz.');return}writeJson(QUICK_KEY,{role:adminMi()?'admin':'teacher',ids});o.remove();quickRender();toast('Hızlı işlemler kaydedildi.');});
}
window.dashboardDuzenle=quickEditor;
window.db6HizliIslemDuzenle=quickEditor;

async function ensureTeacherDeliveries(){
 if(adminMi()||!teacher())return;const shell=$('.db6-shell');if(!shell)return;
 const existing=currentSections(shell).find(s=>sectionTitle(s)==='Teslim Edilecek Evraklar');if(existing)return;
 let reminders=[];try{const f=gv('hatirlatmalariTopla');if(typeof f==='function')reminders=await f()}catch(e){console.warn('Teslim evrakları yüklenemedi',e)}
 reminders=(reminders||[]).filter(x=>!/^(gorev|gorevler|nobet|yaziliSinav|sinav)$/i.test(String(x?.kaynak||''))).slice(0,6);if(!reminders.length)return;
 const sec=document.createElement('section');sec.className='db6-section';sec.dataset.db6Key='teslimEvrak';sec.innerHTML=`<div class="db6-title"><h2>Teslim Edilecek Evraklar</h2><button type="button" class="db6-link">Tümü ›</button></div><div class="db6-card db6-list">${reminders.map((x,i)=>{const durum=String(x.teslimDurumu||x.durum||'Teslim Edilmedi');const gun=Number(x.gunFarki);const tarih=Number.isFinite(gun)?(gun<0?`${Math.abs(gun)} gün gecikti`:gun===0?'Bugün':`${gun} gün kaldı`):'';return `<button type="button" class="db6-row db6x-delivery" data-i="${i}"><div><strong>${esc(x.baslik||'Evrak')}</strong><small>${esc(x.altBaslik||tarih)}</small></div><span class="db6-chip">${esc(durum)}</span></button>`}).join('')}</div>`;
 $('.db6-link',sec).onclick=()=>openTab('evrak');$$('.db6x-delivery',sec).forEach((b,i)=>b.onclick=()=>{const x=reminders[i];if(typeof x?.git==='function')x.git();else openTab('evrak')});
 const notes=currentSections(shell).find(s=>sectionKey(s)==='notlar');if(notes)shell.insertBefore(sec,notes);else shell.appendChild(sec);layoutApply();
}

function injectLayoutButton(){
 const head=$('.db6-top .db6-headrow');if(!head||$('#db6LayoutBtn',head))return;const bell=$('.db6-bell',head);const b=document.createElement('button');b.id='db6LayoutBtn';b.type='button';b.className='db6x-layout-btn';b.title='Ana sayfayı düzenle';b.setAttribute('aria-label','Ana sayfayı düzenle');b.textContent='⚙️';b.onclick=layoutEditor;if(bell)head.insertBefore(b,bell);else head.appendChild(b)
}
function css(){if($('#db6x-css'))return;const s=document.createElement('style');s.id='db6x-css';s.textContent=`
.db6x-layout-btn{margin-left:auto;margin-right:6px;width:38px;height:38px;border:1px solid rgba(255,255,255,.18);border-radius:13px;background:rgba(255,255,255,.12);color:#fff;font-size:17px}.db6x-overlay{position:fixed;inset:0;z-index:15000;background:rgba(5,13,24,.58);display:flex;align-items:flex-end;justify-content:center}.db6x-sheet{width:min(560px,100%);max-height:86dvh;overflow:auto;background:var(--surface,#fff);color:var(--ink,#14213d);border-radius:24px 24px 0 0;padding:17px 16px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -12px 40px rgba(0,0,0,.18)}.db6x-head{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:18px}.db6x-head button{border:0;background:transparent;color:inherit;font-size:20px}.db6x-help{font-size:12px;color:var(--ink-muted,#758198);line-height:1.45;margin:8px 0 13px}.db6x-layout-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--border,#e5e9f1)}.db6x-layout-row label{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:700}.db6x-layout-row input,.db6x-qrow input{width:19px;height:19px;accent-color:var(--brand,#5b36c9)}.db6x-layout-row button{width:34px;height:32px;border:1px solid var(--border,#e5e9f1);border-radius:9px;background:var(--nm-bg,#f7f8fb);color:inherit}.db6x-layout-row button+button{margin-left:4px}.db6x-save{width:100%;margin-top:14px;border:0;border-radius:14px;background:var(--brand,#5b36c9);color:#fff;font-weight:800;padding:13px}.db6x-quick-list{display:flex;flex-direction:column;gap:7px}.db6x-qrow{display:grid;grid-template-columns:24px 30px minmax(0,1fr);align-items:center;gap:8px;border:1px solid var(--border,#e5e9f1);border-radius:13px;padding:10px 12px}.db6x-qrow b{font-size:13px}.db6x-delivery{width:100%;border:0;background:transparent;color:inherit;text-align:left}[data-theme="dark"] .db6x-sheet{background:#0d2135;color:#f6f8fc}.db6x-overlay button,.db6x-overlay label{touch-action:manipulation}
`;document.head.appendChild(s)}
function boot(){
 const shell=$('.db6-shell');if(!shell)return false;css();injectLayoutButton();currentSections(shell).forEach(sectionKey);quickRender();layoutApply();ensureTeacherDeliveries();if(!shellObserver){shellObserver=new MutationObserver(()=>{if(applying)return;setTimeout(()=>{injectLayoutButton();quickRender();layoutApply()},0)});shellObserver.observe(shell,{childList:true,subtree:false})}return true
}
let tries=0;const t=setInterval(()=>{if(boot()||++tries>180)clearInterval(t)},180);document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));window.addEventListener('load',()=>setTimeout(boot,250));
})();
