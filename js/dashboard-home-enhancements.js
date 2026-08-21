/* Koruk Asistan — mobil ana sayfa iyilestirmeleri
 * 1) Ortak bolumlerde tekrar olusumunu engeller ve mevcut kopyalari temizler.
 * 2) Hizli Islemler'i kullanici bazli ozellestirilebilir yapar.
 * 3) Akilli Takvim'i ders programindan ayirir; yalnizca onemli kayitlari gosterir.
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
function iso(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function dateKey(v){if(!v)return'';try{const d=v?.toDate?v.toDate():new Date(String(v).length===10?String(v)+'T00:00:00':v);if(!isNaN(d))return iso(d)}catch(_){}return String(v).slice(0,10)}
function className(x){return x?.sinif||x?.sinifAdi||arr('siniflar').find(s=>s.id===x?.sinifId)?.ad||'—'}
function lessonName(x){return x?.ders||x?.dersAdi||arr('dersListesi').find(d=>d.id===x?.dersId)?.ad||'—'}
function sectionTitle(sec){const root=$('.kh-section-title',sec);if(!root)return'';const spans=$$('span',root).filter(x=>!x.classList.contains('kh-shared-title-icon'));if(spans.length)return spans[0].textContent.trim();return root.textContent.replace(/[⚡📅🛡️]/g,'').trim()}
function findSections(title){return $$('.kh-shell .kh-section').filter(s=>sectionTitle(s)===title)}
function normalizeSharedTitles(){
  $$('.kh-section.kh-shared .kh-section-title').forEach(root=>{
    const icon=$('.kh-shared-title-icon',root);if(!icon)return;
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
  const head=$('.kh-section-head',sec);
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

function mineExam(x){if(isAdmin())return true;const t=teacher();if(!t)return false;return [x.ogretmenId,x.sorumluOgretmenId,x.ekleyenOgretmenId].includes(t.id)}
function importantItems(date){
  const key=iso(date),out=[];
  arr('sinavlar').filter(x=>mineExam(x)&&dateKey(x.tarih||x.sinavTarihi)===key).forEach(x=>out.push({time:x.saat||'',icon:'📝',text:`${className(x)} · ${lessonName(x)} yazılısı`,tab:'yaziliSinavlar'}));
  arr('gorevler').filter(x=>dateKey(x.tarih||x.sonTarih)===key&&!x.tamamlandi&&!['tamamlandi','arsivlendi','kapali'].includes(norm(x.durum||''))).forEach(x=>out.push({time:x.saat||'',icon:'📌',text:x.baslik||x.ad||x.aciklama||'Görev',tab:'takvim'}));
  arr('hatirlaticilar').filter(x=>dateKey(x.tarih||x.sonTarih)===key&&!x.tamamlandi&&!['tamamlandi','arsivlendi','kapali'].includes(norm(x.durum||''))).forEach(x=>out.push({time:x.saat||'',icon:'⏰',text:x.baslik||x.ad||x.aciklama||'Hatırlatıcı',tab:'takvim'}));
  arr('duyurular').filter(x=>!x.arsivlendi&&x.aktif!==false&&!x.pasif&&dateKey(x.tarih)===key).forEach(x=>out.push({time:'',icon:'📢',text:x.baslik||x.ad||'Duyuru',tab:'duyurular'}));
  return out.sort((a,b)=>String(a.time).localeCompare(String(b.time),'tr'));
}
function fmtDay(d){return new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',weekday:'long'}).format(d).toLocaleUpperCase('tr')}
function renderImportantCalendar(sec){
  if(!sec)return;
  const c=$('.kh-card',sec);if(!c)return;
  if(c.dataset.khImportantCalendar==='1'&&c.dataset.khSignature===importantCalendarSignature())return;
  const base=new Date(),diff=(base.getDay()+6)%7,mon=new Date(base);mon.setDate(base.getDate()-diff);
  const dates=Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d});
  let selected=Number(c.dataset.khSelectedDay);if(!Number.isInteger(selected)||selected<0||selected>6){selected=dates.findIndex(d=>iso(d)===iso());if(selected<0)selected=0}
  function draw(){
    c.dataset.khSelectedDay=String(selected);const d=dates[selected],items=importantItems(d);
    c.innerHTML=`<div class="kh-calendar">${dates.map((x,i)=>`<button type="button" class="kh-day ${i===selected?'today':''} ${importantItems(x).length?'has':''}" data-kh-important-day="${i}">${['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'][i]}<b>${x.getDate()}</b></button>`).join('')}</div><div class="kh-agenda-title">${esc(fmtDay(d))}</div>${items.length?items.map(x=>`<div class="kh-row" data-kh-important-tab="${x.tab}"><div class="kh-row-main"><b>${x.icon} ${esc(x.text)}</b><small>${x.time?esc(x.time):'Tüm gün'}</small></div></div>`).join(''):'<div class="kh-empty">Bu gün için önemli kayıt bulunmuyor.</div>'}`;
    $$('[data-kh-important-day]',c).forEach(b=>b.onclick=()=>{selected=Number(b.dataset.khImportantDay);draw()});
    $$('[data-kh-important-tab]',c).forEach(r=>r.onclick=()=>openTab(r.dataset.khImportantTab));
    c.dataset.khImportantCalendar='1';c.dataset.khSignature=importantCalendarSignature();
  }
  draw();
}
function importantCalendarSignature(){
  const parts=[];
  ['sinavlar','gorevler','hatirlaticilar','duyurular'].forEach(n=>arr(n).forEach(x=>parts.push([n,x.id||'',x.tarih||x.sinavTarihi||x.sonTarih||'',x.saat||'',x.durum||'',x.aktif,x.arsivlendi,x.baslik||x.ad||''].join(':'))));
  return parts.join('|');
}
function apply(){
  const shell=$('.kh-shell');if(!shell)return;
  normalizeSharedTitles();['Hızlı İşlemler','Takvim',"Bugünün Nöbetçileri",'Haftanın Nöbet Programı'].forEach(dedupe);
  renderQuick(findSections('Hızlı İşlemler')[0]);
  renderImportantCalendar(findSections('Takvim')[0]);
}
let busy=false;const obs=new MutationObserver(()=>{if(busy)return;busy=true;requestAnimationFrame(()=>{try{apply()}finally{busy=false}})});obs.observe(document.documentElement,{subtree:true,childList:true});
setInterval(apply,900);window.addEventListener('load',()=>setTimeout(apply,250));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(apply,80)});
})();
