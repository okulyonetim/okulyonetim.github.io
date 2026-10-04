/* Koruk Asistan — İlkokula Başlama Yaşı Hesaplama
 * 2026-2027 eğitim öğretim yılı / 30 Eylül 2026 esaslı bilgilendirme aracı.
 * MEB Okul Öncesi Eğitim ve İlköğretim Kurumları Yönetmeliği Madde 11/6 esaslıdır.
 */
(function(global){
'use strict';
if(global.SchoolAgeCalculator)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const REF=new Date(2026,8,30);
function monthsAtRef(date){let m=(REF.getFullYear()-date.getFullYear())*12+(REF.getMonth()-date.getMonth());if(REF.getDate()<date.getDate())m--;return Math.max(0,m)}
function ageText(date){const total=monthsAtRef(date),years=Math.floor(total/12),months=total%12;return `${years} yaş ${months} ay`}
function exactAge(date){let y=REF.getFullYear()-date.getFullYear(),m=REF.getMonth()-date.getMonth(),d=REF.getDate()-date.getDate();if(d<0){m--;d+=new Date(REF.getFullYear(),REF.getMonth(),0).getDate()}if(m<0){y--;m+=12}return `${y} yaş ${m} ay ${d} gün`}
function statusFor(date){
 const m=monthsAtRef(date);
 let preschool={kind:'ok',title:'Okul öncesi eğitim yaş grubundadır.',detail:'Okul öncesi kayıt durumu ilgili yaş grubu, kurum türü ve kontenjan şartlarına göre ayrıca değerlendirilir.'};
 let primary={kind:'danger',title:'İlkokul 1. sınıfa kayıt olamaz.',detail:'65 ay ve altındaki çocuklar ilkokul 1. sınıfa kaydedilemez.'};
 /*
  * MEB Okul Öncesi Eğitim ve İlköğretim Kurumları Yönetmeliği Madde 11/6:
  * - Eylül ayı sonu itibarıyla 69 ayını dolduranların 1. sınıfa kaydı yapılır.
  * - 66, 67 ve 68 aylık çocuklar veli yazılı isteğiyle 1. sınıfa kaydedilir.
  * - 69, 70 ve 71 aylık çocuklar veli yazılı talebiyle okul öncesine yönlendirilir
  *   veya kayıtları bir yıl ertelenir.
  */
 if(m>=72){
   primary={kind:'required',title:'İlkokul 1. sınıf kaydı zorunlu.',detail:'30 Eylül 2026 itibarıyla 72 ay ve üzerindeki çocukların ilkokul 1. sınıf kaydı zorunludur.'};
 }else if(m>=69){
   primary={kind:'warning',title:'İlkokul kaydı yapılır; veli talebiyle 1 yıl ertelenebilir.',detail:'30 Eylül 2026 itibarıyla 69, 70 ve 71 aylık çocukların kaydı yapılır. Velinin yazılı talebi bulunması hâlinde okul müdürlüğünce çocuk okul öncesi eğitime yönlendirilebilir veya ilkokul kaydı bir yıl ertelenebilir.'};
 }else if(m>=66){
   primary={kind:'warning',title:'Veli yazılı isteğiyle 1. sınıfa kaydedilebilir.',detail:'30 Eylül 2026 itibarıyla 66, 67 ve 68 aylık çocukların ilkokul 1. sınıfa kaydı, velisinin yazılı isteği bulunması hâlinde yapılır. Veli yazılı isteği yoksa ilkokula kayıt zorunlu değildir.'};
 }else{
   primary={kind:'danger',title:'İlkokul 1. sınıfa kayıt olamaz.',detail:'30 Eylül 2026 itibarıyla 65 ay ve altındaki çocuklar ilkokul 1. sınıfa kaydedilemez.'};
 }
 /* 2026-2027 okul öncesi bilgilendirmesi: ilkokula kayıt gruplarından ayrı gösterilir. */
 if(m>=72){
   preschool={kind:'info',title:'İlkokul çağındadır.',detail:'Çocuk ilkokul 1. sınıf kayıt grubunda olduğundan okul öncesi yerine ilkokul kaydı esas alınır.'};
 }else if(m>=69){
   preschool={kind:'warning',title:'Veli yazılı talebiyle okul öncesine yönlendirilebilir.',detail:'69, 70 ve 71 aylık çocuklar için veli yazılı talebi bulunması hâlinde okul müdürlüğünce okul öncesi eğitime yönlendirme veya ilkokul kaydının bir yıl ertelenmesi mümkündür.'};
 }else if(m>=66){
   preschool={kind:'ok',title:'Okul öncesi devamı mümkündür.',detail:'66, 67 ve 68 aylık çocuklar için ilkokula kayıt ancak velinin yazılı isteğiyle yapılır; bu nedenle okul öncesi devam seçeneği bulunmaktadır.'};
 }else if(m>=36){
   preschool={kind:'ok',title:'Okul öncesi yaş grubundadır.',detail:'Bu hesaplama ilkokula başlama yaşını düzenleyen Madde 11/6 hükümlerini esas alır; okul öncesi kurum türü ve yaş grubu için güncel MEB kayıt şartları ayrıca kontrol edilmelidir.'};
 }
 return{m,preschool,primary};
}
function palette(kind){return({required:{accent:'var(--ka-success,#22c55e)',soft:'rgba(34,197,94,.12)'},warning:{accent:'var(--ka-warning,#f59e0b)',soft:'rgba(245,158,11,.12)'},danger:{accent:'var(--ka-danger,#ef4444)',soft:'rgba(239,68,68,.12)'},ok:{accent:'var(--ka-info,#38bdf8)',soft:'rgba(56,189,248,.12)'},info:{accent:'var(--ka-muted,#94a3b8)',soft:'rgba(148,163,184,.12)'}}[kind]||{accent:'var(--ka-muted,#94a3b8)',soft:'rgba(148,163,184,.12)'})}
function badge(kind){return kind==='required'?'ZORUNLU':kind==='warning'?'KOŞULLU':kind==='danger'?'KAYIT OLAMAZ':kind==='ok'?'KAYIT UYGUN':'BİLGİ'}
function card(kind,icon,title,detail){const p=palette(kind);return `<article class="ka-card ka-age-result ka-age-result--${kind}" style="border:1px solid ${p.accent};overflow:hidden"><div class="ka-card__body" style="display:grid;gap:12px"><div class="ka-age-result__head" style="display:flex;align-items:flex-start;gap:12px"><span class="ka-age-result__icon" style="width:46px;height:46px;min-width:46px;display:grid;place-items:center;border-radius:14px;background:${p.soft};font-size:25px">${icon}</span><div class="ka-grow" style="min-width:0"><span class="ka-age-result__eyebrow" style="display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;background:${p.soft};color:${p.accent};font-size:12px;font-weight:800;letter-spacing:.03em">${badge(kind)}</span><h3 style="margin:7px 0 0;line-height:1.25">${esc(title)}</h3></div></div><p style="margin:0;line-height:1.55;color:var(--ka-text-muted,#a8a8a8)">${esc(detail)}</p></div></article>`}
function open(root){root=root||document.getElementById('v2ModuleRoot');if(!root)return false;root.innerHTML=`<section class="ka-page ka-stack" data-school-age-calculator><article class="ka-card"><div class="ka-card__body ka-stack"><div class="ka-age-hero" style="display:flex;align-items:flex-start;gap:14px"><span class="ka-age-hero__icon" style="font-size:34px;line-height:1">🎒</span><div><small style="letter-spacing:.05em;font-weight:800">2026–2027 EĞİTİM ÖĞRETİM YILI</small><h2 style="margin:6px 0 8px;line-height:1.15">İlkokula Başlama Yaşı Hesaplama</h2><p class="ka-muted" style="margin:0;line-height:1.5">30 Eylül 2026 tarihi esas alınarak okul öncesi ve ilkokul 1. sınıf kayıt durumunu ayrı ayrı gösterir.</p></div></div><label class="ka-field"><span class="ka-field__label">Çocuğun doğum tarihi</span><input class="ka-input" type="date" data-age-date max="2026-09-30"></label><button class="ka-btn" type="button" data-age-calc>Hesapla</button></div></article><div data-age-result hidden></div><article class="ka-card"><div class="ka-card__body"><div style="display:flex;gap:12px;align-items:flex-start"><span style="font-size:24px">⚖️</span><div><strong>Yasal dayanak ve önemli bilgi</strong><p class="ka-muted" style="margin:6px 0 0;line-height:1.55">MEB Okul Öncesi Eğitim ve İlköğretim Kurumları Yönetmeliği Madde 11/6 esas alınmıştır: Eylül ayı sonu itibarıyla 69 ayını dolduranların 1. sınıf kaydı yapılır; 66, 67 ve 68 aylık çocuklar velisinin yazılı isteğiyle kaydedilir; 69, 70 ve 71 aylık çocukların kaydı ise velisinin yazılı talebiyle okul öncesi eğitime yönlendirilebilir veya bir yıl ertelenebilir. Bu araç bilgilendirme amaçlıdır; kesin kayıt işlemi e-Okul/e-Kayıt ve güncel MEB uygulamalarından kontrol edilmelidir.</p></div></div></div></article></section>`;const input=root.querySelector('[data-age-date]'),out=root.querySelector('[data-age-result]');const calculate=()=>{if(!input.value){out.hidden=false;out.innerHTML='<article class="ka-card"><div class="ka-card__body">Lütfen doğum tarihini seçin.</div></article>';return}const d=new Date(input.value+'T00:00:00');if(Number.isNaN(d.getTime())||d>REF){out.hidden=false;out.innerHTML='<article class="ka-card"><div class="ka-card__body">Geçerli bir doğum tarihi seçin.</div></article>';return}const s=statusFor(d);out.hidden=false;out.innerHTML=`<div class="ka-stack" style="gap:14px"><article class="ka-card" style="border:1px solid var(--ka-border,#2d2d2d)"><div class="ka-card__body" style="display:grid;gap:10px"><div style="font-size:14px;color:var(--ka-text-muted,#a8a8a8)">30 Eylül 2026 itibarıyla</div><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><strong style="font-size:28px;line-height:1.1">${monthsAtRef(d)} ay</strong><span style="padding:7px 11px;border-radius:999px;background:var(--ka-surface-2,#202020);font-weight:700">${esc(ageText(d))}</span></div><div style="font-size:15px;color:var(--ka-text-muted,#a8a8a8)">${esc(exactAge(d))}</div></div></article><div class="ka-grid ka-age-results-grid" style="gap:14px">${card(s.preschool.kind,'🏫','OKUL ÖNCESİ KAYIT DURUMU',`${s.preschool.title} ${s.preschool.detail}`)}${card(s.primary.kind,'🎒','İLKOKUL 1. SINIF KAYIT DURUMU',`${s.primary.title} ${s.primary.detail}`)}</div></div>`;out.scrollIntoView({behavior:'smooth',block:'start'})};root.querySelector('[data-age-calc]')?.addEventListener('click',calculate);input?.addEventListener('change',calculate);return true}
function register(){const add=()=>{const groups=global.ShellUI?.MENU_GROUPS;if(!Array.isArray(groups))return false;const g=groups.find(x=>x.key==='documents');if(!g)return false;g.items=Array.isArray(g.items)?g.items:[];if(!g.items.some(x=>String(x[3]||'')==='school-age-calculator'))g.items.push(['Araçlar','🧰','documents','school-age-calculator']);global.ShellUI?.registerPageRoute?.('school-age-calculator',async({root})=>open(root));return true};if(!add())setTimeout(add,250)}
global.SchoolAgeCalculator={open};if(global.ShellUI?.registerPageRoute)register();else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',register,{once:true});else setTimeout(register,50);
})(window);