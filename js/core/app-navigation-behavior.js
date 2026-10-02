/* Koruk Asistan — uygulama geneli gezinme davranışları. */
(function(global){
'use strict';
if(global.AppNavigationBehavior)return;
let observer=null,wrapped=false;
const wrappedApis=new WeakSet();
const $=(s,r=document)=>r.querySelector(s);
const reportOverlay=()=>document.getElementById('kaReportPreview')||document.getElementById('kaPdfPreview')||document.getElementById('kaPdfTools');
function scrollTop(){try{global.scrollTo({top:0,left:0,behavior:'auto'});}catch(_){global.scrollTo?.(0,0)}document.querySelector('.ka-app-content')?.scrollTo?.(0,0);document.getElementById('v2ModuleRoot')?.scrollTo?.(0,0)}
function scrollTopSoon(){requestAnimationFrame(()=>{scrollTop();requestAnimationFrame(scrollTop)})}
function normalizeShellBack(){document.querySelectorAll('[data-ka-shell-back]').forEach(b=>{b.classList.remove('ka-shell-back');b.classList.add('ka-icon-button');b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';b.setAttribute('aria-label','Geri');b.title='Geri'})}
function visible(el){if(el.closest('[data-ka-shell-backbar]'))return false;if(el.closest('[hidden],[aria-hidden="true"]'))return false;const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'}
function isBack(el){const t=String(el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||'').replace(/\s+/g,' ').trim();return /(^|\s)geri(\s|$)/i.test(t)||/←\s*geri/i.test(t)||/‹\s*geri/i.test(t)}
function syncShellBackbar(){
 const bar=$('[data-ka-shell-backbar]');if(!bar)return;
 const content=$('.ka-app-content');const root=$('#v2ModuleRoot');
 if(!content||!root||!root.children.length){bar.hidden=true;bar.style.setProperty('display','none','important');return}
 const localBack=[...document.querySelectorAll('.ka-app-content button,.ka-app-content a,.ka-app-content [role="button"]')].find(el=>visible(el)&&isBack(el));
 if(localBack){bar.hidden=true;bar.setAttribute('aria-hidden','true');bar.style.setProperty('display','none','important')}
 else{bar.hidden=false;bar.removeAttribute('aria-hidden');bar.style.removeProperty('display')}
}
function closeReportOverlay(){const ov=reportOverlay();if(!ov)return false;if(ov.id==='kaReportPreview'&&typeof global.ReportEngine?.closePreview==='function')global.ReportEngine.closePreview();else if(ov.id==='kaPdfPreview'&&typeof global.ReportEngine?.closePdfPreview==='function')global.ReportEngine.closePdfPreview();else if(ov.id==='kaPdfTools'&&typeof global.ReportEngine?.closePdfTools==='function')global.ReportEngine.closePdfTools();else ov.remove();return true}
function protect(api){if(!api||typeof api.back!=='function'||wrappedApis.has(api))return;const old=api.back;api.back=function(...a){if(reportOverlay())return false;return old.apply(this,a)};wrappedApis.add(api)}
function protectDetails(){protect(global.TransportModule);protect(global.PeopleModule)}
function decorateOverlay(){const ov=reportOverlay();if(!ov)return;ov.classList.add('ka-modal-backdrop');ov.querySelector('[data-report-close],[data-pdf-close],[data-pdf-tools-close]')?.setAttribute('data-close','');protectDetails()}
function profileScheduleMeta(){const a=global.AppStore?.data?.('okulBilgileri');const x=Array.isArray(a)?(a.find(v=>v.id==='ayarlar')||a[0]||{}):{};const now=new Date(),y=now.getFullYear(),start=now.getMonth()>=7?y:y-1;return{school:String(x.okulAdi||x.ad||'Koruk İlkokulu - Ortaokulu').trim(),title:'Ders Programı',year:`${start}-${start+1}`,subtitle:'',showSchool:true,showTitle:false,showYear:true,showSubtitle:false}}
function profileTeacherId(){const u=global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};return String(u.bagliOgretmenId||u.ogretmenId||'').trim()}
async function openProfileScheduleReport(){const id=profileTeacherId();if(!id){global.toast?.('Bu kullanıcıya bağlı öğretmen kaydı bulunamadı.');return false}try{if(!global.ScheduleReportRedesign)await global.AppLoader?.loadScript?.('js/core/schedule-report-redesign.js?v=942');if(!global.ReportEngine?.printReport)await global.AppLoader?.loadScript?.('js/modules/report-engine.js');if(!global.ScheduleReportRedesign?.individualBody||!global.ReportEngine?.printReport)throw Error('Ders programı rapor motoru hazır değil.');const body=global.ScheduleReportRedesign.individualBody('teacher',[id],profileScheduleMeta(),'single');return await global.ReportEngine.printReport('Öğretmen Ders Programı',body,{fileName:'Öğretmen Ders Programı',yon:'yatay',logoGoster:false,tarihGoster:false,baslikGoster:false,compact:false,fontSize:7,kenarBosluk:3,extraHead:global.ScheduleReportRedesign.PRINT_STYLE})}catch(e){console.error('[Profile/ScheduleReport]',e);global.toast?.(e?.message||'Öğretmen ders programı raporu açılamadı.');return false}}
function bindProfileSchedule(){document.addEventListener('click',e=>{const b=e.target.closest?.('[data-profile-view="schedule"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();openProfileScheduleReport().catch(console.error)},true)}
function wrapShell(){if(wrapped||!global.ShellUI)return;wrapped=true;['home','routeModule','renderProfile','renderSearch'].forEach(name=>{const old=global.ShellUI[name];if(typeof old!=='function')return;global.ShellUI[name]=function(...a){const r=old.apply(this,a);normalizeShellBack();syncShellBackbar();if(r?.finally)r.finally(()=>{normalizeShellBack();syncShellBackbar();scrollTopSoon()});else scrollTopSoon();return r}})}
function observe(){if(observer||!document.body)return;observer=new MutationObserver(()=>{normalizeShellBack();syncShellBackbar();decorateOverlay();protectDetails()});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','aria-hidden','style','class']});normalizeShellBack();syncShellBackbar();decorateOverlay();protectDetails()}
function install(){
 observe();bindProfileSchedule();wrapShell();
 global.addEventListener('popstate',event=>{if(!reportOverlay()){scrollTopSoon();return}event.stopImmediatePropagation();event.preventDefault?.();closeReportOverlay();try{if(history.state?.kaShellGuard!=='active')history.pushState({...(history.state||{}),kaShellGuard:'active'},'')}catch(_){} });
 document.addEventListener('click',event=>{
  const brand=event.target.closest?.('[data-ka-home-trigger]');if(brand){setTimeout(()=>{normalizeShellBack();syncShellBackbar()},0)}
  const nav=event.target.closest?.('[data-ka-shell-route],[data-dash-route]');if(nav)scrollTopSoon();
 },true);
 global.addEventListener('koruk:app-ready',()=>{wrapShell();normalizeShellBack();syncShellBackbar();scrollTopSoon()});
 global.addEventListener('koruk:module-ready',()=>{wrapShell();normalizeShellBack();syncShellBackbar();scrollTopSoon()});
 global.AppStore?.subscribe?.('ui.route',scrollTopSoon);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
global.AppNavigationBehavior={scrollTop,scrollTopSoon,closeReportOverlay,decorateReportOverlay:decorateOverlay,protectDetailBacks:protectDetails,syncShellBackbar,clearPullRefresh:()=>{const e=$('#kaPullRefreshIndicator');if(e){e.classList.remove('is-armed','is-refreshing');e.style.setProperty('--ka-pull-y','0px');e.hidden=true}}};
})(window);
