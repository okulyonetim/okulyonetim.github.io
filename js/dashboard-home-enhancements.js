/* Koruk Asistan — mobil ana sayfa iyilestirmeleri
 * 1) Ortak bolumlerde tekrar olusumunu engeller ve mevcut kopyalari temizler.
 * 2) Hizli Islemler'i kullanici bazli ozellestirilebilir yapar.
 * 3) Admin takvimine bagli ogretmenin gercek ders programini ekler.
 */
(function(){
'use strict';
if(window.__KH_HOME_ENHANCEMENTS__) return;
window.__KH_HOME_ENHANCEMENTS__=true;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
function gv(n){try{return eval(`typeof ${n}!=='undefined'?${n}:null`)}catch(_){return null}}
function arr(n){const v=gv(n);return Array.isArray(v)?v:[]}
function norm(v){return String(v||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').trim()}
function user(){return gv('AKTIF_KULLANICI')||window.AKTIF_KULLANICI||null}
function isAdmin(){return !!user()?.admin}
function teacher(){try{if(typeof bagliOgretmenimGetir==='function'){const t=bagliOgretmenimGetir();if(t)return t}}catch(_){}const u=user();return u?.bagliOgretmenId?arr('ogretmenler').find(x=>x.id===u.bagliOgretmenId)||null:null}
function openTab(name){try{if(typeof sekmeAc==='function')return sekmeAc(name)}catch(_){}document.querySelector(`[data-tab="${name}"]`)?.click()}
function dayName(d){return ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'][d.getDay()]}
function className(x){return x?.sinif||x?.sinifAdi||arr('siniflar').find(s=>s.id===x?.sinifId)?.ad||'—'}
function lessonName(x){return x?.ders||x?.dersAdi||arr('dersListesi').find(d=>d.id===x?.dersId)?.ad||'—'}
function lessonTime(no){try{if(typeof dersSaatiBilgisi==='function')return dersSaatiBilgisi(Number(no))}catch(_){}return null}
function sectionTitle(sec){const root=$('.kh-section-title',sec);if(!root)return'';const spans=$$('span',root).filter(x=>!x.classList.contains('kh-shared-title-icon'));if(spans.length)return spans[0].textContent.trim();return root.textContent.replace(/[⚡📅🛡️]/g,'').trim()}
function findSections(title){return $$('.kh-shell .kh-section').filter(s=>sectionTitle(s)===title)}
function normalizeSharedTitles(){
  $$('.kh-section.kh-shared .kh-section-title').forEach(root=>{
    const icon=$('.kh-shared-title-icon',root);
    if(!icon)return;
    const title=$$('span',root).find(x=>x!==icon);
    if(title&&root.firstElementChild===icon)root.insertBefore(title,icon);
  });
}
function dedupe(title){const list=findSections(title);list.slice(1).forEach(x=>x.remove())}
const ACTIONS={
 exam:{icon:'📝',label:'Sınav Ekle',run(){openTab('yaziliSinavlar');setTimeout(()=>{try{if(typeof yaziliSinavModalAc==='function')yaziliSinavModalAc()}catch(_){}},120)}},
 note:{icon:'🗒️',label:'Not Ekle',run(){openTab('notlar');setTimeout(()=>{try{if(typeof notlarModalAc==='function')notlarModalAc()}catch(_){}},120)}},
 message:{icon:'💬',label:'Mesaj Gönder',run(){openTab('mesajlasma')}},
 announcements:{icon:'📢',label:'Duyurular',run(){openTab('duyurular')}},
 calendar:{icon:'📅',label:'Takvim',run(){openTab('takvim')}},
 lessons:{icon:'📚',label:'Ders Programı',run(){openTab(isAdmin()?'dersProgrami':'dersNobetProgramim')}}
};
const DEFAULT=['exam','note','message','announcements'];
function quickKey(){const u=user()||{};return `kh-quick-actions:${u.uid||u.id||u.kullaniciAdi||'default'}`}
function readQuick(){try{const x=JSON.parse(localStorage.getItem(quickKey())||'null');if(Array.isArray(x)){const ok=x.filter(id=>ACTIONS[id]);if(ok.length)return ok.slice(0,6)}}catch(_){}return DEFAULT.slice()}
function saveQuick(ids){try{localStorage.setItem(quickKey(),JSON.stringify(ids))}catch(_){}}
function renderQuick(sec){
  if(!sec)return;
  let head=$('.kh-section-head',sec);
  if(head&&!$('.kh-quick-edit',head)){
    const b=document.createElement('button');b.type='button';b.className='kh-more kh-quick-edit';b.textContent='Düzenle';b.onclick=e=>{e.stopPropagation();openCustomizer(sec)};head.append(b);
  }
  let w=$('.kh-quick',sec);if(!w){w=document.createElement('div');w.className='kh-quick';sec.append(w)}
  const ids=readQuick();
  w.innerHTML=ids.map(id=>`<button type="button" data-kh-quick="${id}"><span class="kh-quick-emoji">${ACTIONS[id].icon}</span>${esc(ACTIONS[id].label)}</button>`).join('');
  $$('[data-kh-quick]',w).forEach(b=>b.onclick=()=>ACTIONS[b.dataset.khQuick]?.run());
}
function openCustomizer(sec){
  document.getElementById('khQuickCustomizer')?.remove();
  const chosen=new Set(readQuick());
  const ov=document.createElement('div');ov.id='khQuickCustomizer';
  ov.style.cssText='position:fixed;inset:0;z-index:12050;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;padding:14px';
  const panel=document.createElement('div');panel.style.cssText='width:min(520px,100%);background:var(--kh-card,var(--nm-bg,#fff));color:var(--kh-text,var(--ink,#111));border:1px solid var(--kh-border,rgba(127,127,127,.25));border-radius:22px;padding:18px;box-shadow:0 18px 60px rgba(0,0,0,.22)';
  panel.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px"><b style="font-size:18px">Hızlı İşlemleri Özelleştir</b><button type="button" data-close style="border:0;background:transparent;font-size:24px;color:inherit">×</button></div><div style="font-size:13px;opacity:.72;margin-bottom:12px">En fazla 6 işlem seçebilirsiniz.</div><div data-list style="display:grid;grid-template-columns:1fr 1fr;gap:8px"></div><div style="display:flex;gap:8px;margin-top:16px"><button type="button" data-reset class="kh-more" style="flex:1">Varsayılan</button><button type="button" data-save class="kh-plan-button" style="flex:1;margin:0">Kaydet</button></div>`;
  const list=$('[data-list]',panel);Object.entries(ACTIONS).forEach(([id,a])=>{const l=document.createElement('label');l.style.cssText='display:flex;align-items:center;gap:9px;padding:11px;border:1px solid var(--kh-border,rgba(127,127,127,.25));border-radius:14px';l.innerHTML=`<input type="checkbox" value="${id}" ${chosen.has(id)?'checked':''}><span>${a.icon}</span><span>${esc(a.label)}</span>`;list.append(l)});
  panel.onclick=e=>e.stopPropagation();ov.onclick=()=>ov.remove();$('[data-close]',panel).onclick=()=>ov.remove();$('[data-reset]',panel).onclick=()=>{$$('input[type=checkbox]',panel).forEach(x=>x.checked=DEFAULT.includes(x.value))};$('[data-save]',panel).onclick=()=>{const ids=$$('input[type=checkbox]:checked',panel).map(x=>x.value).slice(0,6);saveQuick(ids.length?ids:DEFAULT);ov.remove();renderQuick(sec)};
  ov.append(panel);document.body.append(ov);
}
function addAdminLessons(){
  if(!isAdmin())return;const t=teacher();if(!t)return;
  const sec=findSections('Takvim')[0];if(!sec)return;
  const c=$('.kh-card',sec),title=$('.kh-agenda-title',c);if(!c||!title)return;
  $$('.kh-admin-lesson',c).forEach(x=>x.remove());
  const txt=title.textContent||'';const day=['PAZAR','PAZARTESİ','SALI','ÇARŞAMBA','PERŞEMBE','CUMA','CUMARTESİ'].find(x=>txt.includes(x));if(!day)return;
  const map={PAZAR:'Pazar',PAZARTESİ:'Pazartesi',SALI:'Salı',ÇARŞAMBA:'Çarşamba',PERŞEMBE:'Perşembe',CUMA:'Cuma',CUMARTESİ:'Cumartesi'};
  const rows=arr('dersProgrami').filter(x=>x.ogretmenId===t.id&&norm(x.gun)===norm(map[day])).sort((a,b)=>Number(a.saat)-Number(b.saat));
  let ref=title;rows.forEach(x=>{const tm=lessonTime(x.saat),r=document.createElement('div');r.className='kh-row kh-admin-lesson';r.dataset.khTab='dersNobetProgramim';r.innerHTML=`<div class="kh-row-main"><b>📚 ${esc(className(x))} · ${esc(lessonName(x))}</b><small>${tm?.baslangic?esc(tm.baslangic):`${esc(x.saat)}. Ders`}</small></div>`;r.onclick=()=>openTab('dersNobetProgramim');ref.after(r);ref=r});
}
function apply(){
  const shell=$('.kh-shell');if(!shell)return;
  normalizeSharedTitles();['Hızlı İşlemler','Takvim',"Bugünün Nöbetçileri",'Haftanın Nöbet Programı'].forEach(dedupe);
  renderQuick(findSections('Hızlı İşlemler')[0]);
  addAdminLessons();
}
let busy=false;const obs=new MutationObserver(()=>{if(busy)return;busy=true;requestAnimationFrame(()=>{try{apply()}finally{busy=false}})});obs.observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('click',e=>{if(e.target.closest?.('.kh-day'))setTimeout(addAdminLessons,40)},true);
setInterval(apply,900);window.addEventListener('load',()=>setTimeout(apply,250));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(apply,80)});
})();
