/* Koruk Asistan — Android/native geri tuşu için mobil katman yöneticisi
 * Mevcut geriTusuIsle() mimarisini korur; history.pushState kullanmaz.
 */
(function(){
'use strict';
if(window.__KH_MOBILE_BACK_V1__)return;window.__KH_MOBILE_BACK_V1__=true;
const oldBack=window.geriTusuIsle;
function visible(el){return !!(el&&(el.classList.contains('active')||getComputedStyle(el).display!=='none'))}
function closeQuick(){const ov=document.getElementById('khQuickNoteOverlay');if(!ov)return false;const b=ov.querySelector('.kh-qn-close');if(b)b.click();else ov.remove();return true}
function closeStudentExam(){const el=document.querySelector('#khStuExamDetail,#khStuExamPanel,.kh-stu-exam-detail,.kh-stu-exam-panel');if(!el)return false;const back=el.querySelector('[data-back],.kh-stu-back,.back,.close');if(back)back.click();else el.remove();return true}
function closeStudent(){const el=document.getElementById('khStuDetail')||document.querySelector('.kh-stu-detail');if(!el)return false;const back=el.querySelector('.kh-stu-back,[data-back]');if(back)back.click();else{el.remove();document.body.classList.remove('kh-stu-detail-open')}return true}
function closeClass(){const el=document.getElementById('khClassDetail')||document.querySelector('.kh-class-detail');if(!el)return false;const back=el.querySelector('.kh-cd-top button:first-child,[data-back]');if(back)back.click();else{el.remove();document.body.classList.remove('kh-class-detail-open')}return true}
function closeGenericModal(){const ov=document.getElementById('modalOverlay');if(!ov||!ov.classList.contains('active'))return false;if(typeof window.modalKapat==='function')window.modalKapat();else ov.classList.remove('active');return true}
function closeDetailOverlay(){const ov=document.getElementById('detayOverlay');if(!ov||!ov.classList.contains('active'))return false;if(typeof window.detayPanelKapat==='function')window.detayPanelKapat();else ov.classList.remove('active');return true}
window.geriTusuIsle=function(){
 try{
  /* En üst katmandan alta doğru kapat. */
  if(closeQuick())return 'handled';
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
