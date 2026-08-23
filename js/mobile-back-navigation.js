/* Koruk Asistan — Android/native geri tuşu için mobil katman yöneticisi
 * Mevcut geriTusuIsle() mimarisini korur; history.pushState kullanmaz.
 */
(function(){
'use strict';
if(window.__KH_MOBILE_BACK_V2__)return;window.__KH_MOBILE_BACK_V2__=true;
const oldBack=window.geriTusuIsle;
function closeQuick(){const ov=document.getElementById('khQuickNoteOverlay');if(!ov)return false;const b=ov.querySelector('.kh-qn-close');if(b)b.click();else ov.remove();return true}
function closeAttendanceAbsent(){if(!document.getElementById('yokDevamsizOverlay'))return false;if(typeof window.yoklamaDevamsizlarKapat==='function')window.yoklamaDevamsizlarKapat();else document.getElementById('yokDevamsizOverlay')?.remove();return true}
function closeAttendance(){const ov=document.getElementById('yokOverlay');if(!ov)return false;const active=ov.querySelector('.yv4-tabs [data-y-tab].active');if(active&&active.dataset.yTab&&active.dataset.yTab!=='yoklama'){const main=ov.querySelector('[data-y-tab="yoklama"]');if(main){main.click();return true}}if(typeof window.yoklamaKapat==='function')window.yoklamaKapat();else ov.remove();return true}
function closeStudentExam(){const el=document.querySelector('#khStuExamDetail,#khStuExamPanel,.kh-stu-exam-detail,.kh-stu-exam-panel,.ksd-exam-overlay');if(!el)return false;const back=el.querySelector('[data-back],.kh-stu-back,.ksd-top button,.back,.close');if(back)back.click();else el.remove();return true}
function closeStudent(){const el=document.getElementById('khStuDetail')||document.querySelector('.kh-stu-detail,.ksd-overlay');if(!el)return false;const back=el.querySelector('.kh-stu-back,[data-back],.ksd-top button');if(back)back.click();else{el.remove();document.body.classList.remove('kh-stu-detail-open','ksd-open')}return true}
function closeClass(){const el=document.getElementById('khClassDetail')||document.querySelector('.kh-class-detail');if(!el)return false;const back=el.querySelector('.kh-cd-top button:first-child,[data-back]');if(back)back.click();else{el.remove();document.body.classList.remove('kh-class-detail-open')}return true}
function closeGenericModal(){const ov=document.getElementById('modalOverlay');if(!ov||!ov.classList.contains('active'))return false;if(typeof window.modalKapat==='function')window.modalKapat();else ov.classList.remove('active');return true}
function closeDetailOverlay(){const ov=document.getElementById('detayOverlay');if(!ov||!ov.classList.contains('active'))return false;if(typeof window.detayPanelKapat==='function')window.detayPanelKapat();else ov.classList.remove('active');return true}
window.geriTusuIsle=function(){
 try{
  if(closeQuick())return 'handled';
  if(closeAttendanceAbsent())return 'handled';
  if(closeAttendance())return 'handled';
  if(closeStudentExam())return 'handled';
  if(closeStudent())return 'handled';
  if(closeClass())return 'handled';
  if(closeGenericModal())return 'handled';
  if(closeDetailOverlay())return 'handled';
  if(typeof oldBack==='function')return oldBack.apply(this,arguments);
  if(window.AltNav&&typeof AltNav.geriTusu==='function')return AltNav.geriTusu()?'handled':'exit';
 }catch(e){console.warn('[mobile-back]',e)}
 return 'exit';
};
})();
